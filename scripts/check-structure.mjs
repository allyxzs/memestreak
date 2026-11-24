import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const required = [
  "app/page.tsx",
  "app/layout.tsx",
  "app/globals.css",
  "components/app.tsx",
  "components/ui/button.tsx",
  "components/ui/dialog.tsx",
  "lib/engine.ts",
  "lib/store.ts",
  "lib/utils.ts",
  "public/icon.svg",
  "docs/banner.svg",
  "docs/ARCHITECTURE.md",
  "docs/VALIDATION.md",
  "tests/engine.test.ts",
  "tests/ui.test.tsx",
  "tests/e2e/app.spec.ts",
  "next.config.ts",
  "playwright.config.ts",
  "postcss.config.mjs",
  "tsconfig.json",
  "package.json",
  "package-lock.json",
  ".github/workflows/ci.yml",
  ".gitignore",
  ".prettierignore",
  "README.md",
  "LICENSE",
];
const root = new URL("../", import.meta.url);
const missing = required.filter(
  (path) => !existsSync(fileURLToPath(new URL(path, root))),
);
if (missing.length) {
  console.error("MemeStreak: o projeto está incompleto. Arquivos ausentes:");
  for (const path of missing) console.error(`  - ${path}`);
  console.error(
    "Restaure os arquivos preservando as pastas do pacote original.",
  );
  process.exitCode = 1;
} else {
  console.log(
    `Estrutura completa: ${required.length} arquivos essenciais encontrados.`,
  );
}
