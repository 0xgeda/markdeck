export function Brand() {
  return <span className="website-brand"><svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="10" fill="currentColor"/><path d="M10 29V11h4l6 9 6-9h4v18h-4V18l-6 9-6-9v11Z" fill="var(--brand-letter, #f4f4ea)"/></svg><span>Markdeck</span></span>;
}

export function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <svg className="website-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{diagonal ? <path d="M6 18 18 6M6 6h12v12"/> : <path d="M4 12h15m-6-6 6 6-6 6"/>}</svg>;
}
