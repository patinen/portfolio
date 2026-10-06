"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { ProjectSummary } from "@/content/types";
import type { Locale } from "@/lib/locale";
import { clampIndex } from "@/lib/carousel";
export function ProjectCarousel({
  projects,
  locale,
  previousLabel,
  nextLabel,
  label,
}: {
  projects: ProjectSummary[];
  locale: Locale;
  previousLabel?: string;
  nextLabel?: string;
  label?: string;
}) {
  const [index, setIndex] = useState(0);
  const start = useRef<number | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const swiped = useRef(false);
  const active = clampIndex(index, projects.length);
  function move(delta: number) {
    const next = clampIndex(active + delta, projects.length);
    if (next !== active && document.activeElement?.closest(".project-card"))
      container.current?.focus({ preventScroll: true });
    setIndex(next);
  }
  if (!projects.length) return null;
  return (
    <div
      ref={container}
      className="carousel"
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          move(event.key === "ArrowRight" ? 1 : -1);
        }
      }}
      onClickCapture={(event) => {
        if (swiped.current) {
          event.preventDefault();
          event.stopPropagation();
          swiped.current = false;
        }
      }}
      onPointerDown={(event) => {
        swiped.current = false;
        start.current = event.clientX;
      }}
      onPointerCancel={() => {
        start.current = null;
      }}
      onPointerUp={(event) => {
        if (
          start.current !== null &&
          Math.abs(event.clientX - start.current) > 55
        ) {
          swiped.current = true;
          move(event.clientX < start.current ? 1 : -1);
        }
        start.current = null;
      }}
    >
      <div className="deck">
        {projects.map((project, i) => {
          const offset = i - active;
          return (
            <article
              key={project.id}
              className={`project-card ${offset === 0 ? "active" : "neighbor"}`}
              style={{
                transform: `translateX(${offset * 88}%) scale(${offset === 0 ? 1 : 0.92})`,
                opacity: Math.abs(offset) > 1 ? 0 : offset === 0 ? 1 : 0.4,
                zIndex: offset === 0 ? 2 : 1,
              }}
              inert={offset !== 0}
              aria-hidden={offset !== 0}
            >
              <Link
                href={`/${locale}/projects/${project.slug}`}
                draggable={false}
              >
                {project.cover ? (
                  <div className="cover">
                    <Image
                      src={project.cover.url}
                      alt={project.cover.alt}
                      fill
                      sizes="(max-width: 700px) 90vw, 70vw"
                    />
                  </div>
                ) : (
                  <div className="cover empty-cover" aria-hidden="true" />
                )}
                <div className="card-copy">
                  <div className="card-heading">
                    <h3>{project.copy.title}</h3>
                    <span aria-hidden="true">&#8599;</span>
                  </div>
                  {project.copy.short_description && (
                    <p>{project.copy.short_description}</p>
                  )}
                  <ul className="technologies">
                    {project.technologies.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                </div>
              </Link>
            </article>
          );
        })}
        {active > 0 && previousLabel && (
          <button
            className="neighbor-hit previous-hit"
            aria-label={previousLabel}
            onClick={() => move(-1)}
            tabIndex={-1}
          />
        )}
        {active < projects.length - 1 && nextLabel && (
          <button
            className="neighbor-hit next-hit"
            aria-label={nextLabel}
            onClick={() => move(1)}
            tabIndex={-1}
          />
        )}
      </div>
      <div className="carousel-controls">
        <span className="counter" aria-live="polite" aria-atomic="true">
          {String(active + 1).padStart(2, "0")} /{" "}
          {String(projects.length).padStart(2, "0")}
        </span>
        <div>
          {previousLabel && (
            <button
              aria-label={previousLabel}
              disabled={active === 0}
              onClick={() => move(-1)}
            >
              <span aria-hidden="true">&#8592;</span>
            </button>
          )}
          {nextLabel && (
            <button
              aria-label={nextLabel}
              disabled={active === projects.length - 1}
              onClick={() => move(1)}
            >
              <span aria-hidden="true">&#8594;</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
