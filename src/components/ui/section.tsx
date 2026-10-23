export function Section({
  id,
  index,
  label,
  title,
  children,
  numbered = false,
}: {
  id: string;
  index: number;
  label?: string;
  title?: string;
  children: React.ReactNode;
  numbered?: boolean;
}) {
  const normalizedLabel = label?.replace(
    /^\s*\d{1,2}\s*(?:\/|[-–—:.])\s*/,
    "",
  );
  return (
    <section id={id} className="section wrap">
      <div className="section-top">
        {normalizedLabel && (
          <p className="eyebrow">
            <span>{String(index).padStart(2, "0")}</span> / {normalizedLabel}
          </p>
        )}
        {title && (
          <h2>
            {numbered && (
              <span className="heading-index" aria-hidden="true">
                {String(index).padStart(2, "0")} /{" "}
              </span>
            )}
            {title}
          </h2>
        )}
      </div>
      {children}
    </section>
  );
}
