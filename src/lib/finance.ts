export type CompensationModel =
  | { type: "monthly"; amount: number }
  | { type: "per_session"; amount: number }
  | { type: "per_student"; amount: number }
  | { type: "percentage"; percent: number };

export interface PayoutInputs {
  sessions: number;
  attendingStudentSessions: number;
  collectedTuition: number;
}

/** Teacher payable for a period, rounded to whole EGP. */
export function teacherPayout(model: CompensationModel, i: PayoutInputs): number {
  switch (model.type) {
    case "monthly":
      return Math.round(model.amount);
    case "per_session":
      return Math.round(model.amount * i.sessions);
    case "per_student":
      return Math.round(model.amount * i.attendingStudentSessions);
    case "percentage":
      return Math.round((model.percent / 100) * i.collectedTuition);
  }
}

/** Positive = student owes; negative = prepaid credit. */
export function studentBalance(charges: number, payments: number, discounts = 0, refunds = 0): number {
  return charges - discounts - payments + refunds;
}

export function attendanceRate(present: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((present / total) * 1000) / 10;
}

export function pctChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
