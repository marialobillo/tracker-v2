// Database schema - defines all tables for the job tracker
// Using Drizzle ORM with PostgreSQL (Neon)

import { pgTable, serial, text, integer, json, timestamp, bigint, doublePrecision, boolean } from "drizzle-orm/pg-core";

// Main table: job applications
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