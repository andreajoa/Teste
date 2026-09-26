#!/usr/bin/env node
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

function option(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}
function run(bin, args) {
  const r = spawnSync(bin, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (r.error?.code === "ENOENT") throw new Error(`${bin} was not found in PATH.`);
  if (r.status !== 0) throw new Error(`${bin} failed:\n${r.stderr || r.stdout}`);
  return r.stdout;
}
function inspect(file) {
  return JSON.parse(run("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration:stream=codec_type",
    "-of", "json",
    file
  ]));
}
function dims(ratio) {
  if (ratio === "16:9") return [1920, 1080];
  if (ratio === "1:1") return [1080, 1080];
  return [1080, 1920];
}
function quoteConcat(path) {
  return path.replaceAll("'", "'\\''");
}

const manifestPath = process.argv[2];
if (!manifestPath) {
  console.error("Usage: render-scenes.mjs <scene-plan.json> --output final.mp4 [--ratio 9:16] [--fps 30] [--fit cover|contain] [--keep-temp]");
  process.exit(2);
}

const ratio = option("--ratio", "9:16");
const fps = Math.max(1, Number(option("--fps", "30")) || 30);
const fit = option("--fit", "cover");
if (!["cover", "contain"].includes(fit)) throw new Error("--fit must be cover or contain");
const output = resolve(option("--output", "final.mp4"));
const [width, height] = dims(ratio);
const parsed = JSON.parse(await readFile(resolve(manifestPath), "utf8"));
const scenes = (Array.isArray(parsed) ? parsed : parsed.scenes).filter(s => s.localPath);
if (!scenes.length) throw new Error("No downloaded scenes with localPath.");

await mkdir(dirname(output), { recursive: true });
const work = await mkdtemp(join(tmpdir(), "nova-video-editor-"));

try {
  const normalized = [];
  for (let i = 0; i < scenes.length; i++) {
    const input = resolve(scenes[i].localPath);
    const info = inspect(input);
    const hasAudio = info.streams?.some(s => s.codec_type === "audio");
    const target = join(work, `normalized-${String(i + 1).padStart(3, "0")}.mp4`);
    const vf = fit === "contain"
      ? `fps=${fps},scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,format=yuv420p`
      : `fps=${fps},scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,format=yuv420p`;

    const common = [
      "-vf", vf,
      "-c:v", "libx264", "-preset", "medium", "-crf", "20",
      "-c:a", "aac", "-ar", "48000", "-ac", "2",
      "-movflags", "+faststart"
    ];

    const args = hasAudio
      ? ["-y", "-i", input, "-map", "0:v:0", "-map", "0:a:0", ...common, target]
      : ["-y", "-i", input, "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
         "-map", "0:v:0", "-map", "1:a:0", ...common, "-shortest", target];

    run("ffmpeg", args);
    normalized.push(target);
    console.log(`normalized ${i + 1}/${scenes.length}: ${scenes[i].id || input}`);
  }

  const list = join(work, "concat.txt");
  await writeFile(list, normalized.map(p => `file '${quoteConcat(p)}'`).join("\n") + "\n");
  run("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", output]);

  const finalInfo = inspect(output);
  const duration = Number(finalInfo.format?.duration || 0);
  if (!duration) throw new Error("Final render was created but ffprobe found no duration.");
  console.log(JSON.stringify({ output, duration, scenes: scenes.length, ratio, fps, fit }, null, 2));
} finally {
  if (!process.argv.includes("--keep-temp")) await rm(work, { recursive: true, force: true }).catch(() => {});
}
