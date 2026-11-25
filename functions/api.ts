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

export default app;
