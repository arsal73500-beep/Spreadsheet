export interface ProjectConfig {
  id: string;
  name: string;
  slug: string;
  website: string;
  description: string;
  filePath: string;
  color: string;
  badgeClass: string;
  targetAudience: string;
}

export const PROJECTS: Record<string, ProjectConfig> = {
  "md-health-center": {
    id: "md-health-center",
    name: "MD Health Center",
    slug: "md-health-center",
    website: "https://mdhealthcenter.com.pk/",
    description: "Healthcare, wellness, preventive health & clinical diagnostics",
    filePath: "data/md-health-center/backlinks.json",
    color: "#0f9d58",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    targetAudience: "Healthcare providers, patients, wellness enthusiasts",
  },
  "aint-foundation": {
    id: "aint-foundation",
    name: "AINT Foundation",
    slug: "aint-foundation",
    website: "https://aintfoundationcic.co.uk/",
    description: "Community Interest Company (CIC) promoting mental & physical health",
    filePath: "data/aint-foundation/backlinks.json",
    color: "#1a73e8",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    targetAudience: "UK community organizations, charities, public health partners",
  },
  "dr-irshad-malik": {
    id: "dr-irshad-malik",
    name: "Dr Irshad Malik",
    slug: "dr-irshad-malik",
    website: "https://drirshadmalik.com/",
    description: "Renowned ENT surgeon, clinical research & specialist consultations",
    filePath: "data/dr-irshad-malik/backlinks.json",
    color: "#9334e9",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    targetAudience: "Medical professionals, ENT clinics, clinical research peers",
  },
};

export const DEFAULT_PROJECT_ID = "md-health-center";

export function getProjectConfig(projectId: string): ProjectConfig {
  const project = PROJECTS[projectId];
  if (!project) {
    throw new Error(`Project "${projectId}" not found or unauthorized.`);
  }
  return project;
}

export function isValidProjectId(projectId: string): boolean {
  return Boolean(PROJECTS[projectId]);
}
