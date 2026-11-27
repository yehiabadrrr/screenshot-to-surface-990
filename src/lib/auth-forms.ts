/** Center details typed at sign-up, kept until the first sign-in when email confirmation is required. */
export const PENDING_CENTER_KEY = "markazly-pending-center";

/** Branch names typed as a comma (or Arabic comma / newline) separated list. */
export const splitBranches = (s: string) =>
  s
    .split(/[,،\n]/)
    .map((x) => x.trim())
    .filter(Boolean);
