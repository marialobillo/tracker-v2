// Database schema - defines all tables for the job tracker
// Using Drizzle ORM with PostgreSQL (Neon)

import {
  pgTable,
  serial,
  text,
  integer,
  json,
  timestamp,
  bigint,
  boolean,
  doublePrecision,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------
// Tablas nuevas. Van antes de "applications" porque ésta apunta a ellas.
// ---------------------------------------------------------------

// Mis CV (backend, fullstack, ai). El texto vive aquí para que la app
// funcione también en Vercel.
export const resumes = pgTable("resumes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // backend, fullstack, ai
  content: text("content").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tecnologías con nombre estándar ("Kubernetes", no "k8s") y mi nivel.
export const skills = pgTable("skills", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  myLevel: text("my_level"), // strong, some, growing, gap
});

// Cada oferta que pego, la aplique o no.
export const offers = pgTable("offers", {
  id: serial("id").primaryKey(),
  company: text("company").notNull(),
  title: text("title").notNull(),
  url: text("url"),
  source: text("source"), // linkedin, wellfound, otra
  location: text("location"),
  workMode: text("work_mode"), // remote, hybrid, onsite
  contractType: text("contract_type"),
  capturedAt: timestamp("captured_at").defaultNow(),
  applicantsCount: integer("applicants_count"),
  salaryAnnualEur: integer("salary_annual_eur"),
  decision: text("decision"), // aplicar, saltar, descartada
  discardReason: text("discard_reason"),
  fitPercent: integer("fit_percent"),
  knockoutFailed: boolean("knockout_failed").default(false),
  bestResumeId: integer("best_resume_id").references(() => resumes.id),
  rawText: text("raw_text"),
});

// Cada requisito de cada oferta, y si lo cumplo.
export const offerRequirements = pgTable("offer_requirements", {
  id: serial("id").primaryKey(),
  offerId: integer("offer_id")
    .notNull()
    .references(() => offers.id, { onDelete: "cascade" }),
  skillId: integer("skill_id").references(() => skills.id), // vacío si no es una tecnología
  requirementText: text("requirement_text").notNull(),
  kind: text("kind").notNull(), // required, preferred
  isKnockout: boolean("is_knockout").default(false), // residencia, idioma, presencial
  match: text("match").notNull(), // yes, partial, no, na
  jdQuote: text("jd_quote"),
});

// ---------------------------------------------------------------
// Main table: job applications (ya existía; solo se añaden offerId y resumeId)
// ---------------------------------------------------------------
export const applications = pgTable("applications", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  dateApplied: text("date_applied"),
  week: text("week"),
  position: text("position").notNull(),
  company: text("company").notNull(),
  location: text("location"),
  seniority: text("seniority").default("Senior"),
  specialization: text("specialization").default("Backend"),
  jobPostingUrl: text("job_posting_url"),
  status: text("status").default("Applied"),
  salary: text("salary"),
  salaryAmount: doublePrecision("salary_amount"),
  salaryAmountMax: doublePrecision("salary_amount_max"),
  salaryCurrency: text("salary_currency"),
  salaryPeriod: text("salary_period"),
  salaryInferred: boolean("salary_inferred").default(false),
  salaryAnnualEur: integer("salary_annual_eur"),
  notes: text("notes"),
  rejectionReason: text("rejection_reason"),
  interviews: json("interviews").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  // Nuevas. Vacías en las aplicaciones antiguas.
  offerId: integer("offer_id").references(() => offers.id),
  resumeId: integer("resume_id").references(() => resumes.id),
});

// ---------------------------------------------------------------
// Más tablas nuevas, que dependen de applications.
// ---------------------------------------------------------------

// Una entrevista concreta (HR, hiring manager, técnica...) de una aplicación.
// Se llama interviewEvents para no confundirla con la columna JSON
// "interviews" de applications, que sigue guardando las antiguas.
export const interviewEvents = pgTable("interview_events", {
  id: serial("id").primaryKey(),
  applicationId: bigint("application_id", { mode: "number" })
    .notNull()
    .references(() => applications.id, { onDelete: "cascade" }),
  stage: text("stage").notNull(), // HR, Scr, HM, TH, SD, LC, CF, Of
  scheduledAt: timestamp("scheduled_at"),
  outcome: text("outcome").default("pending"), // pending, passed, failed
  notes: text("notes"),
});

// Preguntas que me hacen, lo que contesté y el feedback del modelo.
export const interviewQuestions = pgTable("interview_questions", {
  id: serial("id").primaryKey(),
  interviewId: integer("interview_id")
    .notNull()
    .references(() => interviewEvents.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  myAnswer: text("my_answer"),
  feedback: text("feedback"),
});

// Mis datos fijos (residencia, idiomas, metas...).
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

// Goals: daily and weekly application targets
export const goals = pgTable("goals", {
  id: integer("id").primaryKey().default(1),
  dailyGoal: integer("daily_goal").default(5),
  weeklyGoal: integer("weekly_goal").default(25),
});

// Daily progress: tracks applications per day
export const dailyProgress = pgTable("daily_progress", {
  date: text("date").primaryKey(),
  applicationsCount: integer("applications_count").default(0),
  goalMet: integer("goal_met").default(0),
});