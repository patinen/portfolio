"use client";
import Image from "next/image";
import Link from "next/link";
import { useId, useRef, useState, type CSSProperties } from "react";
import type { Copy, ProjectSummary } from "@/content/types";
import type { Locale } from "@/lib/locale";
import {
  clampCarouselIndex,
  carouselKeyDelta,
  swipeDelta,
} from "@/lib/carousel";
import { ProjectMetadata } from "./project-metadata";
export function ProjectCarousel({
  projects,
  locale,
  labels: c,
}: {
  projects: ProjectSummary[];
  locale: Locale;
  labels: Copy;
}) {
  const [active, setActive] = useState(0);
  const region = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ x: number; y: number; id: number } | null>(null);
  const suppressClick = useRef(false);
  const id = useId();
  function move(delta: number) {
    const next = clampCarouselIndex(active + delta, projects.length);
    if (next === active) return;
    if (
      region.current
        ?.querySelector(".carousel-slide[data-active='true']")
        ?.contains(document.activeElement)
    )
      region.current.focus({ preventScroll: true });
    setActive(next);
  }
  if (!projects.length) return null;
  return (
    <div
      className="carousel"
      ref={region}
      role="region"
      aria-label={
        c.projects_section_title ||
        c.projects_section_label ||
        projects[0].copy.title
      }
      tabIndex={0}
      onKeyDown={(event) => {
        const delta = carouselKeyDelta(event.key);
        if (delta) {
          event.preventDefault();
          move(delta);
        }
      }}
      onPointerDown={(event) => {
        if (event.isPrimary) {
          suppressClick.current = false;
          gesture.current = {
            x: event.clientX,
            y: event.clientY,
            id: event.pointerId,
          };
        }
      }}
      onPointerCancel={() => {
        gesture.current = null;
      }}
      onPointerUp={(event) => {
        const start = gesture.current;
        gesture.current = null;
        if (start?.id !== event.pointerId) return;
        const delta = swipeDelta(
          event.clientX - start.x,
          event.clientY - start.y,
        );
        if (delta) {
          suppressClick.current = true;
          move(delta);
        }
      }}
      onClickCapture={(event) => {
        if (suppressClick.current) {
          event.preventDefault();
          event.stopPropagation();
          suppressClick.current = false;
        }
      }}
    >
      <div className="carousel-viewport">
        <div className="carousel-stage">
          {projects.map((project, index) => (
            <article
              key={project.id}
              className="carousel-slide"
              data-active={index === active}
              inert={index !== active}
              aria-hidden={index !== active}
              aria-labelledby={`${id}-${index}`}
              style={{ "--offset": index - active } as CSSProperties}
            >
              {project.cover && (
                <div className="carousel-cover">
                  <Image
                    src={project.cover.url}
                    alt={project.cover.alt}
                    fill
                    sizes="(max-width: 700px) 76vw, (max-width: 1216px) 70vw, 850px"
                  />
                </div>
              )}
              <div className="carousel-body">
                <p className="entry-number">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 id={`${id}-${index}`}>
                  <Link href={`/${locale}/projects/${project.slug}`}>
                    {project.copy.title}
                    <span aria-hidden="true"> &#8599;</span>
                  </Link>
                </h3>
                {project.copy.short_description && (
                  <p className="prose">{project.copy.short_description}</p>
                )}
                <ProjectMetadata project={project} labels={c} />
              </div>
            </article>
          ))}
        </div>
        {active > 0 && (
          <button
            className="carousel-neighbor previous"
            tabIndex={-1}
            aria-label={projects[active - 1].copy.title}
            onClick={() => move(-1)}
          />
        )}
        {active < projects.length - 1 && (
          <button
            className="carousel-neighbor next"
            tabIndex={-1}
            aria-label={projects[active + 1].copy.title}
            onClick={() => move(1)}
          />
        )}
      </div>
      <div className="carousel-controls">
        <button
          type="button"
          disabled={active === 0}
          aria-label={
            c.carousel_previous_label ||
            projects[Math.max(0, active - 1)].copy.title
          }
          onClick={() => move(-1)}
        >
          &#8592;
        </button>
        <output aria-live="polite" aria-atomic="true">
          <span className="sr-only">{projects[active].copy.title} </span>
          {String(active + 1).padStart(2, "0")} /{" "}
          {String(projects.length).padStart(2, "0")}
        </output>
        <button
          type="button"
          disabled={active === projects.length - 1}
          aria-label={
            c.carousel_next_label ||
            projects[Math.min(projects.length - 1, active + 1)].copy.title
          }
          onClick={() => move(1)}
        >
          &#8594;
        </button>
      </div>
    </div>
  );
}
