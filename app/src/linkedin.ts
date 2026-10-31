export type WorkMode = "remote" | "hybrid" | "onsite";
export type ContractType =
  | "full-time" | "part-time" | "contract" | "temporary" | "internship" | "volunteer";

export interface LinkedInOffer {
  company: string | null;
  title: string | null;
  location: string | null;
  postedHoursAgo: number | null;
  reposted: boolean;
  applicants: number | null;
  applicantsOver: boolean; // "Over 100" -> applicants = 100, applicantsOver = true
  applicantsKind: "applicants" | "clicked_apply" | null;
  workMode: WorkMode | null;
  contractType: ContractType | null;
  easyApply: boolean | null; // false = se aplica fuera de LinkedIn
  salaryText: string | null;
  description: string;
  warnings: string[];
}

const HOURS_PER_UNIT = { minute: 1 / 60, hour: 1, day: 24, week: 168, month: 720 } as const;

const WORK_MODES: Record<string, WorkMode> = {
  Remote: "remote",
  Hybrid: "hybrid",
  "On-site": "onsite",
};

const CONTRACTS: Record<string, ContractType> = {
  "Full-time": "full-time",
  "Part-time": "part-time",
  Contract: "contract",
  Temporary: "temporary",
  Internship: "internship",
  Volunteer: "volunteer",
};

// Línea de sueldo de LinkedIn: "100K EUR/yr - 150K EUR/yr", "$60K/yr", "€70.000"
const SALARY_LINE =
  /\d[\d.,]*\s*[Kk]?\s*(EUR|USD|GBP)?\s*\/\s*(yr|year|month|mo|hr|hour)\b|[€$£]\s*\d/i;

const HEADER_LINE =
  /^(.*?)\s·\s(Reposted\s)?(\d+)\s(minute|hour|day|week|month)s?\sago(?:\s·\s(.+))?$/;

const APPLICANTS = /^(Over\s)?(\d[\d,]*)\s(applicants?|people clicked apply)/;

export function parseLinkedInOffer(text: string): LinkedInOffer {
  const offer: LinkedInOffer = {
    company: null, title: null, location: null,
    postedHoursAgo: null, reposted: false,
    applicants: null, applicantsOver: false, applicantsKind: null,
    workMode: null, contractType: null, easyApply: null,
    salaryText: null, description: "", warnings: [],
  };

  // Sin líneas vacías y sin espacios sobrantes.
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l !== "");

  const logoIdx = lines.findIndex((l) => l.startsWith("Company logo for, "));
  if (logoIdx === -1) {
    offer.warnings.push("No encontré 'Company logo for,'; no parece una oferta de LinkedIn");
    return offer;
  }

  offer.company = lines[logoIdx].replace("Company logo for, ", "").replace(/\.$/, "");
  offer.title = lines[logoIdx + 2] ?? null;
  if (!offer.title) offer.warnings.push("No encontré el puesto");

  const header = lines[logoIdx + 3]?.match(HEADER_LINE);
  if (!header) {
    offer.warnings.push("No entendí la línea de país, fecha y solicitantes");
  } else {
    offer.location = header[1];
    offer.reposted = header[2] !== undefined;
    offer.postedHoursAgo = Number(header[3]) * HOURS_PER_UNIT[header[4] as keyof typeof HOURS_PER_UNIT];

    const app = header[5]?.match(APPLICANTS);
    if (app) {
      offer.applicants = Number(app[2].replace(/,/g, ""));
      offer.applicantsOver = app[1] !== undefined;
      offer.applicantsKind = app[3].startsWith("people") ? "clicked_apply" : "applicants";
    }
  }

  // Las etiquetas (Remote, Full-time, Easy Apply, sueldo) están entre la cabecera y "Save".
  const saveIdx = lines.indexOf("Save", logoIdx);
  const chips = lines.slice(logoIdx + 4, saveIdx === -1 ? logoIdx + 14 : saveIdx);

  for (const line of chips) {
    if (line in WORK_MODES) offer.workMode = WORK_MODES[line];
    else if (line in CONTRACTS) offer.contractType = CONTRACTS[line];
    else if (line === "Easy Apply") offer.easyApply = true;
    else if (line === "Apply" && offer.easyApply === null) offer.easyApply = false;
    else if (offer.salaryText === null && SALARY_LINE.test(line)) offer.salaryText = line;
  }

  const aboutIdx = lines.indexOf("About the job");
  if (aboutIdx === -1) offer.warnings.push("No encontré 'About the job'");
  else offer.description = lines.slice(aboutIdx + 1).join("\n");

  return offer;
}