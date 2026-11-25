export function AcordifyLogo({ size = 28 }: { size?: number }) {
  return <img src="/favicon.svg?v=3" alt="" width={size} height={size} className="shrink-0" />;
}

export function AcordifyWordmark() {
  return <span className="acordify-wordmark" role="img" aria-label="Acordify" />;
}
