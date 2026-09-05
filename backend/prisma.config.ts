import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: process.env.NODE_ENV === "test" ? ".env.test" : ".env", quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
