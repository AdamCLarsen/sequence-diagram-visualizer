#!/usr/bin/env node
/**
 * Take a screenshot of the visualizer with optional file, zoom, and center.
 *
 * Usage:
 *   node scripts/screenshot.mjs [options]
 *
 * Options:
 *   --file <path>       Load a .mmd/.md file into the viewer
 *   --zoom <number>     Zoom level (e.g. 0.5, 1, 2)
 *   --cx <number>       Camera X (world coordinates)
 *   --cy <number>       Camera Y (world coordinates)
 *   --width <number>    Viewport width  (default: 1280)
 *   --height <number>   Viewport height (default: 720)
 *   --out <path>        Output file (default: /tmp/screenshot.png)
 *   --wait <ms>         Extra wait after load (default: 500)
 */

import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    file: null,
    zoom: null,
    cx: null,
    cy: null,
    width: 1280,
    height: 720,
    out: '/tmp/screenshot.png',
    wait: 500,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--file':   opts.file = args[++i]; break;
      case '--zoom':   opts.zoom = parseFloat(args[++i]); break;
      case '--cx':     opts.cx = parseFloat(args[++i]); break;
      case '--cy':     opts.cy = parseFloat(args[++i]); break;
      case '--width':  opts.width = parseInt(args[++i]); break;
      case '--height': opts.height = parseInt(args[++i]); break;
      case '--out':    opts.out = args[++i]; break;
      case '--wait':   opts.wait = parseInt(args[++i]); break;
    }
  }
  return opts;
}

const opts = parseArgs();

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: opts.width, height: opts.height },
});

await page.goto('http://localhost:5173/');
await page.waitForTimeout(300);

// Load file if specified
if (opts.file) {
  const filePath = resolve(opts.file);
  const content = readFileSync(filePath, 'utf-8');
  await page.evaluate((text) => {
    const v = (window).__viewer;
    if (v) v.load(text);
  }, content);
}

// Set camera if specified
await page.evaluate(({ zoom, cx, cy }) => {
  const v = (window).__viewer;
  if (!v) return;
  if (zoom != null) v.zoomTo(zoom);
  if (cx != null || cy != null) {
    const cam = v.camera;
    v.panTo(cx ?? cam.x, cy ?? cam.y);
  }
}, { zoom: opts.zoom, cx: opts.cx, cy: opts.cy });

await page.waitForTimeout(opts.wait);
await page.screenshot({ path: opts.out });
await browser.close();

console.log(`Screenshot saved to ${opts.out}`);
