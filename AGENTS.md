# NOVA video editing test workspace

When the user asks to generate and assemble a video with NOVA, use the repository skill `nova-video-editor`.

Rules:
- NOVA is read-only external infrastructure. Never modify the NOVA repository or server.
- Use existing NOVA MCP tools for generation only.
- Download generated media into the current workspace.
- Perform assembly/editing locally.
- Preserve generated source clips.
- Use FFmpeg for straightforward normalization/concatenation.
- Use HyperFrames only when the requested edit needs motion graphics, captions, overlays, or designed transitions.
