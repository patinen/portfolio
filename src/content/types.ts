export type Copy = Record<string, string>;
export type Media = { url: string; alt: string; caption?: string };
export type SiteContent = {
  copy: Copy;
  githubUrl?: string;
  linkedinUrl?: string;
  email?: string;
  ogImage?: Media;
};
export type ProjectSummary = {
  id: string;
  slug: string;
  copy: Copy;
  cover?: Media;
  technologies: string[];
  stack: TechnologyReference[];
  liveUrl?: string;
  sourceUrl?: string;
};
export type ProjectDetail = ProjectSummary & {
  architecture?: Media;
  systemFlow?: Media;
  gallery: Media[];
};
export type ExperienceItem = {
  id: string;
  organization: string;
  url?: string;
  start?: string;
  end?: string;
  current: boolean;
  copy: Copy;
};
export type EducationItem = ExperienceItem;

export type TechnologyReference = {
  id: string;
  slug: string;
  name: string;
  category?: string;
};
export type TechnologySummary = TechnologyReference & {
  definition?: string;
  icon?: Media;
  copy: Copy;
};
export type TechnologyDetail = TechnologySummary & {
  projects: ProjectSummary[];
};
