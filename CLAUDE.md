# Project Instructions

## Temporary Files

Use `./tmp/` in the project root for temporary files, scratch data, and throwaway output — not `/tmp` or the system temp directory. The `tmp/` folder is gitignored and stays local to the project.

## Browser Automation

Use the Chrome MCP tools (`mcp__claude-in-chrome__*`) for browser inspection and screenshots instead of Playwright. The app exposes `window.__viewer` for programmatic control.

### Common workflow:
1. `mcp__claude-in-chrome__tabs_context_mcp` — get/create tab context
2. `mcp__claude-in-chrome__navigate` — navigate to `http://localhost:5173`
3. `mcp__claude-in-chrome__javascript_tool` — interact with `window.__viewer` API:
   - `__viewer.load(diagramText)` — load a diagram
   - `__viewer.zoomTo(level)` — set zoom (0.1–4.0)
   - `__viewer.panTo(x, y)` — set camera position
   - `__viewer.camera` — read current `{x, y, zoom}`
4. `mcp__claude-in-chrome__computer` with `action: "screenshot"` — capture the current state

### Dev server
Run `npm run dev` to start Vite on `http://localhost:5173`.
