export function PrivacyPolicy({ body }: { body: string }) {
  const blocks = body.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
  return <div className="privacy-policy">{blocks.map((block, index) => {
    const heading = block.match(/^##\s+(.+)$/m);
    const text = heading ? block.replace(/^##\s+.+\n?/, "").trim() : block;
    return <section key={`${heading?.[1] ?? "policy"}-${index}`} className="privacy-policy-section">
      {heading && <h2>{heading[1]}</h2>}
      {text && <p>{text}</p>}
    </section>;
  })}</div>;
}
