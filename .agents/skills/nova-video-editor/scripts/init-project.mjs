#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";

const slug = process.argv[2];
if (!slug) {
  console.error("Usage: init-project.mjs <slug-or-project-path>");
  process.exit(2);
}
const root = slug.includes("/") || slug.includes("\\") ? resolve(slug) : resolve("video-projects", slug);
for (const p of ["assets/scenes", "renders", "notes"]) await mkdir(join(root, p), { recursive: true });
const manifest = join(root, "scene-plan.json");
const template = {
  title: slug.split(/[\\/]/).filter(Boolean).pop(),
  aspectRatio: "9:16",
  scenes: [
    {
      id: "scene-01",
      purpose: "Opening scene",
      prompt: "",
      seconds: 5,
      aspectRatio: "9:16",
      status: "planned",
      url: null,
      localPath: null
    }
  ]
};
await writeFile(manifest, JSON.stringify(template, null, 2) + "\n", { flag: "wx" }).catch(err => {
  if (err.code !== "EEXIST") throw err;
});
console.log(root);
