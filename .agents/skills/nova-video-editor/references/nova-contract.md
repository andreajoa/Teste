# NOVA contract used by this skill

This skill intentionally depends only on the NOVA behavior that already exists.

## Generation

Use the existing remote MCP server and its current tools. The skill does not require changes to NOVA.

Expected video call:
- tool: `nova_generate_video`
- required input: `prompt`
- useful inputs: `model`, `seconds`, `aspectRatio`
- output: a JSON/text result containing a generated video URL

Expected image call:
- tool: `nova_generate_image`
- required input: `prompt`
- useful inputs: `model`, `aspectRatio`
- output: a JSON/text result containing a generated image URL

## Authentication

Keep NOVA credentials outside the repository. For Codex, configure the existing NOVA MCP URL in the user's Codex MCP settings and read the bearer token from an environment variable such as `NOVA_API_KEY`.

Never write the key to `scene-plan.json`, logs, source files, or prompts.

## Failure handling

If generation fails:
1. preserve the scene plan;
2. record the error on that scene;
3. retry only that scene when appropriate;
4. do not modify NOVA to work around the failure.
