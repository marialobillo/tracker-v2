// Estado de cada interview individual
export type InterviewStatus = 'pending' | 'passed' | 'failed';

// Una interview individual dentro del pipeline
export interface Interview {
  date: string;
  status: InterviewStatus;
  rating: string;
  notes: string;
  color: string;
}

// Todas las etapas del pipeline
export interface Interviews {
  hrCall: Interview;
  screeningCall: Interview;
  hiringManager: Interview;
  takeHome: Interview;
  systemDesign: Interview;
  liveCoding: Interview;
  culturalFit: Interview;
  offer: Interview;
}

// Estado global de una aplicación
export type AppStatus = 'Applied' | 'In Process' | 'Rejected' | 'Offer' | 'Archived';

// Una aplicación de trabajo completa
export interface JobApplication {
  id: number;
  dateApplied: string;
  week: string;
  position: string;
  company: string;
  location: string;
  seniority: string;
  specialization: string;
  jobPostingUrl: string;
  status: AppStatus;
  salary: string;
  notes: string;
  rejectionReason: string;
  interviews: Interviews;
}

// Una etapa del pipeline (para el loop de INTERVIEW_STAGES)
export interface InterviewStage {
  key: keyof Interviews;
  label: string;
  short: string;
}

// Una empresa con datos calculados para la vista de empresas
export interface CompanyInfo {
  company: string;
  lastDate: string;
  count: number;
  months: number;
}