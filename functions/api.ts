import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { Pool } from "pg";
import { attachDatabasePool } from "@neon/functions";
import { createRemoteJWKSet, jwtVerify } from "jose";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});
attachDatabasePool(pool);

let cachedJwksUrl: string | null = null;
let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getAuthVerifier(): {
  jwks: ReturnType<typeof createRemoteJWKSet>;
  issuer: string;
} {
  const jwksUrl = process.env.NEON_AUTH_JWKS_URL;
  const baseUrl = process.env.NEON_AUTH_BASE_URL;

  if (!jwksUrl || !baseUrl) {
    throw new Error("Neon Auth environment variables are not configured");
  }

  if (!cachedJwks || cachedJwksUrl !== jwksUrl) {
    cachedJwks = createRemoteJWKSet(new URL(jwksUrl));
    cachedJwksUrl = jwksUrl;
  }

  return {
    jwks: cachedJwks,
    issuer: new URL(baseUrl).origin,
  };
}

async function requireUser(c: Context): Promise<{ userId: string } | Response> {
  const authHeader = c.req.header("authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const { jwks, issuer } = getAuthVerifier();
    const { payload } = await jwtVerify(token, jwks, { issuer });
    if (typeof payload.sub !== "string" || payload.sub.length === 0) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    return { userId: payload.sub };
  } catch {
    return c.json({ error: "Unauthorized" }, 401);
  }
}

interface ProgressionRow {
  id: string;
  name: string;
  key_root: string;
  mode: "major" | "minor";
  mood: string;
  bpm: number;
  degrees: number[];
  chord_symbols: string[];
  saved_at: Date | string;
}

function mapProgressionRow(row: ProgressionRow) {
  return {
    id: row.id,
    name: row.name,
    keyRoot: row.key_root,
    mode: row.mode,
    mood: row.mood,
    bpm: Number(row.bpm),
    degrees: Array.isArray(row.degrees) ? row.degrees.map(Number) : [],
    chordSymbols: Array.isArray(row.chord_symbols) ? row.chord_symbols : [],
    savedAt:
      row.saved_at instanceof Date
        ? row.saved_at.toISOString()
        : String(row.saved_at),
  };
}

interface GatewayModelEntry {
  id?: string;
  enabled?: boolean;
  unavailable_reason?: string | null;
  recovery_url?: string | null;
}

interface GatewayStatus {
  configured: boolean;
  enabledModels: string[];
  preferredModel: string | null;
  unavailableReason: string | null;
  recoveryUrl: string | null;
}

async function resolveGatewayStatus(): Promise<GatewayStatus> {
  const baseUrl = process.env.NEON_AI_GATEWAY_BASE_URL;
  const token = process.env.NEON_AI_GATEWAY_TOKEN;

  if (!baseUrl || !token) {
    return {
      configured: false,
      enabledModels: [],
      preferredModel: null,
      unavailableReason: "not_configured",
      recoveryUrl: null,
    };
  }

  const res = await fetch(`${baseUrl}/v1/models`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    return {
      configured: true,
      enabledModels: [],
      preferredModel: null,
      unavailableReason: `gateway_http_${res.status}`,
      recoveryUrl: null,
    };
  }

  const payload = (await res.json()) as { data?: GatewayModelEntry[] };
  const entries = Array.isArray(payload.data) ? payload.data : [];
  const enabledModels = entries
    .filter((entry) => entry.enabled === true && typeof entry.id === "string")
    .map((entry) => entry.id as string);

  const preferredModel =
    enabledModels.find((id) => id.includes("gemini") && id.includes("flash")) ??
    enabledModels.find((id) => id.includes("gemini")) ??
    enabledModels[0] ??
    null;

  const firstRestricted = entries.find((entry) => entry.enabled === false);

  return {
    configured: true,
    enabledModels,
    preferredModel,
    unavailableReason:
      enabledModels.length > 0 ? null : firstRestricted?.unavailable_reason ?? null,
    recoveryUrl:
      enabledModels.length > 0 ? null : firstRestricted?.recovery_url ?? null,
  };
}

function extractJsonObject(raw: string): Record<string, unknown> {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
    }
    throw new Error("Model output was not valid JSON");
  }
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const app = new Hono();

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return "*";
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
        return origin;
      }
      if (/^https:\/\/(www\.)?acordify\.felixmf\.lat$/i.test(origin)) {
        return origin;
      }
      if (/^https:\/\/acordify[a-z0-9-]*\.vercel\.app$/i.test(origin)) {
        return origin;
      }
      return undefined;
    },
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

app.get("/health", async (c) => {
  try {
    await pool.query("SELECT 1 AS ok");
    return c.json({
      ok: true,
      db: "connected",
      branch: process.env.NEON_BRANCH ?? null,
      authConfigured: Boolean(
        process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_JWKS_URL,
      ),
      aiGatewayConfigured: Boolean(
        process.env.NEON_AI_GATEWAY_BASE_URL && process.env.NEON_AI_GATEWAY_TOKEN,
      ),
    });
  } catch (err) {
    return c.json(
      {
        ok: false,
        db: "error",
        message: err instanceof Error ? err.message : "Database check failed",
      },
      500,
    );
  }
});

app.get("/ai/status", async (c) => {
  try {
    const status = await resolveGatewayStatus();
    return c.json(status);
  } catch (err) {
    return c.json(
      {
        configured: false,
        enabledModels: [],
        preferredModel: null,
        unavailableReason: err instanceof Error ? err.message : "unknown_error",
        recoveryUrl: null,
      },
      500,
    );
  }
});

app.get("/progressions", async (c) => {
  const authResult = await requireUser(c);
  if (authResult instanceof Response) return authResult;

  const { rows } = await pool.query<ProgressionRow>(
    `SELECT id, name, key_root, mode, mood, bpm, degrees, chord_symbols, saved_at
     FROM saved_progressions
     WHERE user_id = $1
     ORDER BY saved_at DESC
     LIMIT 100`,
    [authResult.userId],
  );

  return c.json({ progressions: rows.map(mapProgressionRow) });
});

app.post("/progressions", async (c) => {
  const authResult = await requireUser(c);
  if (authResult instanceof Response) return authResult;

  let body: Record<string, unknown>;
  try {
    body = (await c.req.json()) as Record<string, unknown>;
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const keyRoot = typeof body.keyRoot === "string" ? body.keyRoot.trim() : "";
  const mode = body.mode;
  const mood = typeof body.mood === "string" ? body.mood.trim() : "";
  const bpm = typeof body.bpm === "number" ? Math.round(body.bpm) : NaN;
  const degrees = Array.isArray(body.degrees) ? body.degrees : [];
  const chordSymbols = Array.isArray(body.chordSymbols) ? body.chordSymbols : [];

  if (
    !name ||
    name.length > 120 ||
    !keyRoot ||
    (mode !== "major" && mode !== "minor") ||
    !mood ||
    !Number.isFinite(bpm) ||
    bpm < 40 ||
    bpm > 220 ||
    degrees.length !== 4 ||
    !degrees.every((d) => typeof d === "number" && Number.isInteger(d) && d >= 1 && d <= 7) ||
    chordSymbols.length !== 4 ||
    !chordSymbols.every((s) => typeof s === "string" && s.trim().length > 0)
  ) {
    return c.json({ error: "Invalid progression payload" }, 400);
  }

  const { rows } = await pool.query<ProgressionRow>(
    `INSERT INTO saved_progressions (user_id, name, key_root, mode, mood, bpm, degrees, chord_symbols)
     VALUES ($1, $2, $3, $4, $5, $6, $7::integer[], $8::text[])
     RETURNING id, name, key_root, mode, mood, bpm, degrees, chord_symbols, saved_at`,
    [
      authResult.userId,
      name,
      keyRoot,
      mode,
      mood,
      bpm,
      degrees,
      chordSymbols.map((s) => String(s).trim()),
    ],
  );

  return c.json({ progression: mapProgressionRow(rows[0]) }, 201);
});

app.delete("/progressions/:id", async (c) => {
  const authResult = await requireUser(c);
  if (authResult instanceof Response) return authResult;

  const id = c.req.param("id");
  if (!UUID_REGEX.test(id)) {
    return c.json({ error: "Invalid progression id" }, 400);
  }

  const result = await pool.query<{ id: string }>(
    `DELETE FROM saved_progressions
     WHERE id = $1 AND user_id = $2
     RETURNING id`,
    [id, authResult.userId],
  );

  if (result.rowCount === 0) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.json({ deleted: true, id: result.rows[0].id });
});

app.post("/ai/inspiration", async (c) => {
  const authResult = await requireUser(c);
  if (authResult instanceof Response) return authResult;

  let body: Record<string, unknown>;
  try {
    body = (await c.req.json()) as Record<string, unknown>;
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const chords = Array.isArray(body.chords)
    ? body.chords.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, 8)
    : [];
  const keyRoot = typeof body.keyRoot === "string" ? body.keyRoot.trim() : "C";
  const mode = body.mode === "minor" ? "minor" : "major";
  const mood = typeof body.mood === "string" ? body.mood.trim() : "calm";
  const bpm = typeof body.bpm === "number" && Number.isFinite(body.bpm) ? Math.round(body.bpm) : 80;
  const theme = typeof body.theme === "string" ? body.theme.trim().slice(0, 140) : "";

  if (chords.length === 0) {
    return c.json({ error: "chords array is required" }, 400);
  }

  const status = await resolveGatewayStatus();
  const baseUrl = process.env.NEON_AI_GATEWAY_BASE_URL;
  const gatewayToken = process.env.NEON_AI_GATEWAY_TOKEN;

  if (!baseUrl || !gatewayToken) {
    return c.json({ error: "AI Gateway is not configured" }, 503);
  }

  if (!status.preferredModel) {
    return c.json(
      {
        error: "AI Gateway credits required",
        unavailableReason: status.unavailableReason ?? "paid_plan_required",
        recoveryUrl: status.recoveryUrl,
      },
      402,
    );
  }

  const prompt = [
    `Tono: ${keyRoot} ${mode === "minor" ? "menor" : "mayor"}`,
    `Ánimo: ${mood}`,
    `Tempo: ${bpm} BPM`,
    `Acordes en loop: ${chords.join(" - ")}`,
    theme ? `Tema o imagen deseada: ${theme}` : "Tema libre, honesto y acústico en español.",
    "",
    'Devuelve ÚNICAMENTE un JSON válido sin markdown con esta estructura exacta:',
    '{"title":"Título corto en español","lyrics":"[Acorde1]verso 1\\n[Acorde2]verso 2\\n[Acorde3]verso 3\\n[Acorde4]verso 4","strumTip":"Un consejo práctico de rasgueo o punteo para guitarra en 1 frase"}',
  ].join("\n");

  const aiRes = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${gatewayToken}`,
    },
    body: JSON.stringify({
      model: status.preferredModel,
      temperature: 0.8,
      max_tokens: 350,
      messages: [
        {
          role: "system",
          content:
            "Eres un compositor de guitarra acústica e indie en español. Evita rimas cliché. Responde solo JSON puro.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!aiRes.ok) {
    const errBody = await aiRes.text();
    let parsedErr: Record<string, unknown> | null = null;
    try {
      parsedErr = JSON.parse(errBody) as Record<string, unknown>;
    } catch {
      parsedErr = null;
    }

    if (aiRes.status === 402 || aiRes.status === 403) {
      return c.json(
        {
          error: "AI Gateway credits required",
          unavailableReason:
            (parsedErr?.unavailable_reason as string | undefined) ?? "paid_plan_required",
          recoveryUrl:
            (parsedErr?.recovery_url as string | undefined) ?? status.recoveryUrl,
        },
        402,
      );
    }

    return c.json(
      { error: `AI Gateway request failed (${aiRes.status})` },
      502,
    );
  }

  const completion = (await aiRes.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = completion.choices?.[0]?.message?.content;
  if (!content) {
    return c.json({ error: "Empty AI response" }, 502);
  }

  try {
    const parsed = extractJsonObject(content);
    const title = typeof parsed.title === "string" ? parsed.title.trim() : "Idea sin título";
    const lyrics = typeof parsed.lyrics === "string" ? parsed.lyrics.trim() : "";
    const strumTip =
      typeof parsed.strumTip === "string"
        ? parsed.strumTip.trim()
        : "Deja respirar el rasgueo marcando el pulso 1 y 3 suavemente.";

    return c.json({
      model: status.preferredModel,
      title,
      lyrics,
      strumTip,
    });
  } catch {
    return c.json({ error: "Failed to parse AI JSON response" }, 502);
  }
});

export default app;
