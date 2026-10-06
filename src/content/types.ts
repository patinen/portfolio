export type Copy = Record<string, string>;
export type Media = { url: string; alt: string };
export type SiteContent = {
  copy: Copy;
  githubUrl?: string;
  linkedinUrl?: string;
  email?: string;
  cvUrl?: string;
  availability: boolean;
  ogImage?: Media;
};
export type ProjectSummary = {
  id: string;
  slug: string;
  copy: Copy;
  cover?: Media;
  technologies: string[];
  liveUrl?: string;
  sourceUrl?: string;
};
export type ProjectDetail = ProjectSummary & {
  hero?: Media;
  architecture?: Media;
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
