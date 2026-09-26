# NOVA Video Editor Skill

Isolated test implementation for Codex and Claude Code.

The NOVA project is not modified. This repository branch only teaches an agent to use the existing NOVA MCP for media generation and to do post-production locally.

## What v1 does

1. Plan a multi-scene video.
2. Call the existing NOVA `nova_generate_video` tool for missing scenes.
3. Save returned URLs to a scene manifest.
4. Download all generated clips.
5. Probe and normalize them with FFmpeg.
6. Concatenate them into a stable H.264/AAC MP4.
7. Optionally hand the local clips to HyperFrames for designed motion/overlays.

## Codex

Codex reads the repository skill from:

`.agents/skills/nova-video-editor/SKILL.md`

Configure NOVA as an MCP server in your Codex environment. Keep the API key in an environment variable, never in this repository.

Example user-level Codex configuration:

```toml
[mcp_servers.nova]
url = "https://www.novvideos.online/api/claude/mcp"
bearer_token_env_var = "NOVA_API_KEY"
```

Then start a fresh Codex session in this branch and ask:

```text
Use $nova-video-editor.
Create a 3-scene vertical 9:16 video.
Use NOVA to generate each scene, download the results, and render them in order to final.mp4.
Do not modify NOVA.
```

## Claude Code

The same skill is mirrored at:

`.claude/skills/nova-video-editor/SKILL.md`

## Local requirements

- Node.js 22+
- FFmpeg and ffprobe in PATH
- NOVA MCP configured for generation
- HyperFrames only when advanced designed edits are requested

## Smoke test

The GitHub Actions workflow generates two synthetic video clips, one silent and one with audio, then uses the same renderer to normalize and concatenate them. It never calls NOVA and therefore spends no generation credits.
