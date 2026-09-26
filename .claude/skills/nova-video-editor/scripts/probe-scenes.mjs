#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const manifestPath = process.argv[2];
if (!manifestPath) {
  console.error("Usage: probe-scenes.mjs <scene-plan.json> [--write]");
  process.exit(2);
}
function ffprobe(file) {
  const r = spawnSync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration:stream=index,codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels",
    "-of", "json",
    file
  ], { encoding: "utf8" });
  if (r.error?.code === "ENOENT") throw new Error("ffprobe was not found in PATH.");
  if (r.status !== 0) throw new Error(`ffprobe failed for ${file}: ${r.stderr}`);
  return JSON.parse(r.stdout);
}
function summarize(info) {
  const video = info.streams?.find(s => s.codec_type === "video") || null;
  const audio = info.streams?.find(s => s.codec_type === "audio") || null;
  return {
    duration: Number(info.format?.duration || 0),
    width: video?.width || null,
    height: video?.height || null,
    fps: video?.r_frame_rate || null,
    videoCodec: video?.codec_name || null,
    hasAudio: Boolean(audio),
    audioCodec: audio?.codec_name || null,
    sampleRate: audio?.sample_rate ? Number(audio.sample_rate) : null,
    channels: audio?.channels || null
  };
}

const full = resolve(manifestPath);
const parsed = JSON.parse(await readFile(full, "utf8"));
const scenes = Array.isArray(parsed) ? parsed : parsed.scenes;
if (!Array.isArray(scenes) || !scenes.length) throw new Error("Manifest has no scenes.");

for (const scene of scenes) {
  if (!scene.localPath) {
    console.log(`${scene.id}: no localPath`);
    continue;
  }
  scene.media = summarize(ffprobe(scene.localPath));
  console.log(JSON.stringify({ id: scene.id, localPath: scene.localPath, ...scene.media }));
}

if (process.argv.includes("--write")) {
  const output = Array.isArray(parsed) ? scenes : { ...parsed, scenes };
  await writeFile(full, JSON.stringify(output, null, 2) + "\n");
}
