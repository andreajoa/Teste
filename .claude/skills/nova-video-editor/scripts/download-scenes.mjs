#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}
function safeId(value, index) {
  return String(value || `scene-${String(index + 1).padStart(2, "0")}`)
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function extFrom(url, type) {
  const pathExt = extname(new URL(url).pathname).toLowerCase();
  if ([".mp4", ".webm", ".mov", ".m4v"].includes(pathExt)) return pathExt;
  if ((type || "").includes("webm")) return ".webm";
  if ((type || "").includes("quicktime")) return ".mov";
  return ".mp4";
}

const manifestPath = process.argv[2];
if (!manifestPath || manifestPath.startsWith("--")) {
  console.error("Usage: download-scenes.mjs <scene-plan.json> [--out-dir dir] [--force]");
  process.exit(2);
}

const fullManifest = resolve(manifestPath);
const outDir = resolve(arg("--out-dir", join(dirname(fullManifest), "assets", "scenes")));
const force = process.argv.includes("--force");
const parsed = JSON.parse(await readFile(fullManifest, "utf8"));
const scenes = Array.isArray(parsed) ? parsed : parsed.scenes;
if (!Array.isArray(scenes) || !scenes.length) throw new Error("Manifest has no scenes.");

await mkdir(outDir, { recursive: true });

for (let i = 0; i < scenes.length; i++) {
  const scene = scenes[i];
  if (scene.localPath && !force) {
    console.log(`skip ${scene.id || i + 1}: localPath already set`);
    continue;
  }
  if (!scene.url) throw new Error(`Scene ${scene.id || i + 1} has no URL.`);

  const response = await fetch(scene.url, { redirect: "follow" });
  if (!response.ok) throw new Error(`Download failed for ${scene.id || i + 1}: HTTP ${response.status}`);

  const type = response.headers.get("content-type") || "";
  const ext = extFrom(scene.url, type);
  const filename = `${String(i + 1).padStart(3, "0")}-${safeId(scene.id, i)}${ext}`;
  const target = join(outDir, filename);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 1024) throw new Error(`Downloaded file is unexpectedly small: ${filename}`);

  await writeFile(target, bytes);
  scene.localPath = target;
  scene.status = "downloaded";
  scene.bytes = bytes.length;
  console.log(`downloaded ${filename} (${bytes.length} bytes)`);
}

const output = Array.isArray(parsed) ? scenes : { ...parsed, scenes };
await writeFile(fullManifest, JSON.stringify(output, null, 2) + "\n");
console.log(`updated manifest: ${fullManifest}`);
