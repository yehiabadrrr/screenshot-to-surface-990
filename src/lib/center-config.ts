/** Sample identity only; not an authenticated session or permission grant. */
export const centerProfile = {
  name: "Nile Academy",
  branches: ["Nasr City", "Heliopolis", "Maadi"] as const,
  currentUser: { name: "Yehia Hazem", role: "Owner" },
  isDemo: true,
} as const;

export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();