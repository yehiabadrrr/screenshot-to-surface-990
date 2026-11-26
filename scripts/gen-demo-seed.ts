// Regenerates the Demo Center seed migration from src/lib/data.ts. Usage: bun scripts/gen-demo-seed.ts
import { writeFileSync } from "node:fs";
import { demoSeedSql } from "../src/lib/db/demo-seed-sql";

const path = new URL("../supabase/migrations/20261126000200_demo_center_seed.sql", import.meta.url);
writeFileSync(path, demoSeedSql());
console.log("wrote", path.pathname);
