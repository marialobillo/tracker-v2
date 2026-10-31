import { describe, it, expect } from "vitest";
import { parseLinkedInOffer } from "./linkedin";

// Cada fixture es la cabecera real de una oferta pegada de LinkedIn,
// con la descripción recortada a dos líneas.
const dawn = `
Company logo for, Dawn Technology.
Dawn Technology


Backend Software Developer

Netherlands · 7 hours ago · 63 applicants

No response insights available yet

Remote
Full-time

Easy Apply

Save
Use AI to assess how you fit
About the job
We build custom software.
You will work with Node.js.
`;

const ciklum = `
Company logo for, Ciklum.
Ciklum


Senior Full Stack Engineer 

Poland · 2 hours ago · 9 people clicked apply

Responses managed off LinkedIn

Remote
Full-time
Apply

Save
About the job
Ciklum is looking for a Senior Full Stack Engineer.
`;

const oracraft = `
Company logo for, ORAcraft.
ORAcraft


Software Engineer (Mid/Senior), Node.js & TypeScript

Corbeanca, Ilfov, Romania · 3 hours ago · 9 applicants

Company review time is typically 1 week

On-site
Contract

Easy Apply

Save
About the job
On-site in Romania.
`;

const talentco = `
Company logo for, TalentCo.
TalentCo


Senior Backend Engineer (Remote in Portugal)

Portugal · Reposted 6 hours ago · Over 100 applicants

Actively reviewing applicants

100K EUR/yr - 150K EUR/yr
Remote
Full-time

Easy Apply

Save
About the job
Great job.
`;

const intellias = `
Company logo for, Intellias.
Intellias


Senior Interoperability Engineer (Python, Kafka) 

Spain · 6 days ago · 35 applicants

Actively reviewing applicants

Remote
Full-time

Easy Apply

Save
About the job
Interoperability.
`;

const soda = `
Company logo for, Trust In SODA.
Trust In SODA


Back End Developer

Bratislava, Slovakia · 3 hours ago · 4 applicants

No response insights available yet

Hybrid
Full-time

Easy Apply

Save
About the job
Hybrid role.
`;

const agency = `
Company logo for, Zero to One Search | Recruitment Agency.
Zero to One Search | Recruitment Agency


Backend Developer Node.js (Portugal, remote) 

Portugal · 6 hours ago · 40 applicants

Remote
Full-time

Easy Apply

Save
About the job
Agency role.
`;

describe("parseLinkedInOffer", () => {
  it("oferta normal: empresa, puesto, país, solicitantes, modo, contrato", () => {
    const o = parseLinkedInOffer(dawn);
    expect(o.company).toBe("Dawn Technology");
    expect(o.title).toBe("Backend Software Developer");
    expect(o.location).toBe("Netherlands");
    expect(o.postedHoursAgo).toBe(7);
    expect(o.applicants).toBe(63);
    expect(o.applicantsKind).toBe("applicants");
    expect(o.workMode).toBe("remote");
    expect(o.contractType).toBe("full-time");
    expect(o.easyApply).toBe(true);
    expect(o.warnings).toEqual([]);
  });

  it("quita los espacios sobrantes del puesto", () => {
    expect(parseLinkedInOffer(ciklum).title).toBe("Senior Full Stack Engineer");
  });

  it("'people clicked apply' y sin Easy Apply: se aplica fuera de LinkedIn", () => {
    const o = parseLinkedInOffer(ciklum);
    expect(o.applicants).toBe(9);
    expect(o.applicantsKind).toBe("clicked_apply");
    expect(o.easyApply).toBe(false);
  });

  it("presencial y contrato; ubicación con comas", () => {
    const o = parseLinkedInOffer(oracraft);
    expect(o.workMode).toBe("onsite");
    expect(o.contractType).toBe("contract");
    expect(o.location).toBe("Corbeanca, Ilfov, Romania");
    expect(o.title).toBe("Software Engineer (Mid/Senior), Node.js & TypeScript");
  });

  it("Reposted, Over 100 y sueldo en la cabecera", () => {
    const o = parseLinkedInOffer(talentco);
    expect(o.reposted).toBe(true);
    expect(o.postedHoursAgo).toBe(6);
    expect(o.applicants).toBe(100);
    expect(o.applicantsOver).toBe(true);
    expect(o.salaryText).toBe("100K EUR/yr - 150K EUR/yr");
  });

  it("sin Reposted ni sueldo", () => {
    const o = parseLinkedInOffer(dawn);
    expect(o.reposted).toBe(false);
    expect(o.applicantsOver).toBe(false);
    expect(o.salaryText).toBeNull();
  });

  it("días y semanas se pasan a horas", () => {
    expect(parseLinkedInOffer(intellias).postedHoursAgo).toBe(144);
    expect(
      parseLinkedInOffer(intellias.replace("6 days ago", "2 weeks ago")).postedHoursAgo
    ).toBe(336);
  });

  it("minutos se pasan a horas (fracción)", () => {
    const o = parseLinkedInOffer(dawn.replace("7 hours ago", "30 minutes ago"));
    expect(o.postedHoursAgo).toBe(0.5);
  });

  it("híbrido", () => {
    expect(parseLinkedInOffer(soda).workMode).toBe("hybrid");
  });

  it("nombre de empresa con barra vertical y punto final del logo", () => {
    expect(parseLinkedInOffer(agency).company).toBe("Zero to One Search | Recruitment Agency");
  });

  it("la descripción es lo que va después de 'About the job'", () => {
    const o = parseLinkedInOffer(dawn);
    expect(o.description).toBe("We build custom software.\nYou will work with Node.js.");
  });

  it("texto que no es de LinkedIn: no revienta, avisa", () => {
    const o = parseLinkedInOffer("hola esto no es una oferta");
    expect(o.company).toBeNull();
    expect(o.title).toBeNull();
    expect(o.warnings.length).toBeGreaterThan(0);
  });

    it("la descripción termina en 'Set alert for similar jobs'", () => {
    const o = parseLinkedInOffer(
      dawn + "Set alert for similar jobs\nSimilar role\nAbout the company\nDawn Technology"
    );
    expect(o.description).toBe("We build custom software.\nYou will work with Node.js.");
  });

  it("si no está ese aviso, termina en 'About the company'", () => {
    const o = parseLinkedInOffer(dawn + "About the company\nDawn Technology\nGo to your Settings.");
    expect(o.description).toBe("We build custom software.\nYou will work with Node.js.");
  });
});