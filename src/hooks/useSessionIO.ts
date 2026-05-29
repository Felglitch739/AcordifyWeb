import { buildSessionSnapshot, parseSessionSnapshot, serializeSessionSnapshot, type SessionSnapshot } from '../utils/sessionExporter';

export default function useSessionIO() {
  function build(params: Parameters<typeof buildSessionSnapshot>[0]): SessionSnapshot {
    return buildSessionSnapshot(params);
  }

  function serialize(snapshot: SessionSnapshot): string {
    return serializeSessionSnapshot(snapshot);
  }

  function deserialize(raw: string): SessionSnapshot {
    return parseSessionSnapshot(raw);
  }

  function slugify(title: string) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\-\s_]+/g, '')
      .trim()
      .replace(/\s+/g, '_');
  }

  function download(snapshot: SessionSnapshot) {
    const json = serialize(snapshot);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${slugify(snapshot.metadata.title)}.acordify.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return {
    build,
    serialize,
    deserialize,
    download,
    slugify,
  } as const;
}
