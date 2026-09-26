---
name: nova-video-editor
description: Use the existing NOVA MCP as a media generator, then download, organize, normalize, edit, concatenate, and render the generated scenes locally. Use when Codex or Claude Code is asked to create a multi-scene video with NOVA, assemble NOVA outputs, or finish a video from generated clips. Never modify the NOVA repository or NOVA server.
---

# NOVA Video Editor

NOVA is an external media generator. Treat it as read-only infrastructure.

## Hard boundary

- NEVER edit, patch, refactor, migrate, or reconfigure the NOVA repository.
- NEVER create NOVA routes, endpoints, database changes, or provider changes.
- Use the NOVA connector exactly as it already exists.
- Use NOVA to generate media. Perform assembly and editing in the current workspace.
- Preserve every downloaded source clip. Render to new files.

## Expected NOVA tools

Prefer the existing MCP tools when available:

- `nova_generate_video`
- `nova_generate_image`

Do not require new NOVA tools. If a requested edit can be completed from already-generated media, do not call NOVA again.

## Default workflow

### 1. Plan the scenes

Create `video-projects/<slug>/scene-plan.json` before generation.

Each scene should contain:

```json
{
  "id": "scene-01",
  "purpose": "What this scene contributes",
  "prompt": "Exact NOVA generation prompt",
  "seconds": 5,
  "aspectRatio": "9:16",
  "status": "planned",
  "url": null,
  "localPath": null
}
```

Keep prompts visually continuous when the scenes belong to one sequence. Repeat stable character, wardrobe, location, lighting, lens, and art-direction details when continuity matters.

### 2. Generate only missing media with NOVA

For every planned scene without a usable local file:

1. Call `nova_generate_video` with the exact prompt, requested duration, model when the user named one, and aspect ratio.
2. If the connector accepts both conventions, send `aspectRatio` and `aspect_ratio` with the same value. Also state the orientation in the prompt so the intended framing remains explicit.
3. Read the returned NOVA payload and extract the generated video URL.
4. Store the URL in `scene-plan.json`.
5. Do not ask NOVA to merge or edit the clips.

For image-led scenes, use `nova_generate_image` only when the user's concept actually needs a generated still. Do not generate filler assets.

### 3. Download the generated clips

Run:

```bash
node .agents/skills/nova-video-editor/scripts/download-scenes.mjs \
  video-projects/<slug>/scene-plan.json \
  --out-dir video-projects/<slug>/assets/scenes
```

The downloader updates `localPath` in the manifest.

### 4. Inspect before editing

Run:

```bash
node .agents/skills/nova-video-editor/scripts/probe-scenes.mjs \
  video-projects/<slug>/scene-plan.json
```

Check duration, dimensions, frame rate, codec, and audio presence. Do not concatenate incompatible raw files directly.

### 5. Assemble the first cut

For a clean scene-to-scene assembly, normalize and concatenate locally:

```bash
node .agents/skills/nova-video-editor/scripts/render-scenes.mjs \
  video-projects/<slug>/scene-plan.json \
  --output video-projects/<slug>/renders/final.mp4 \
  --ratio 9:16 \
  --fps 30
```

Default framing is `cover`: fill the frame and center-crop excess. Use `--fit contain` only when the full source frame must remain visible.

### 6. Use HyperFrames only when the edit needs it

Plain joining, normalization, trims, and delivery do not require HyperFrames.

Use HyperFrames when the user asks for designed motion, animated titles, overlays, captions, complex transitions, composited layouts, or other timeline graphics.

Typical commands:

```bash
npx hyperframes doctor
npx hyperframes init video-projects/<slug>/hyperframes --non-interactive
npx hyperframes lint video-projects/<slug>/hyperframes
npx hyperframes render video-projects/<slug>/hyperframes --output ../renders/final-designed.mp4
```

Follow any installed HyperFrames skills for composition authoring. Keep NOVA-generated clips as local media assets.

## Editorial rules

- Put scenes in story order, not generation order.
- Remove unusable or obviously failed generations instead of forcing every clip into the final.
- Prefer hard cuts for the first assembly. Add transitions only when they improve continuity.
- Never invent a successful generation. If NOVA returns no usable URL, mark that scene failed and retry only that scene.
- Never claim the final render is valid until the output file is probed successfully.
- When audio is absent from a source clip, the local renderer may add silent audio so concatenation remains stable.

## Deliverables

Return:

1. final MP4 path;
2. scene plan path;
3. downloaded source directory;
4. any failed/retried scene IDs;
5. a concise note of edits performed.

Do not publish or upload the final video anywhere unless the user explicitly requests it.
