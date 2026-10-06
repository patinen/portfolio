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
  return (
    <section id={id} className="section wrap">
      <div className="section-top">
        {label && (
          <p className="eyebrow">
            <span>{String(index).padStart(2, "0")}</span> / {label}
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
