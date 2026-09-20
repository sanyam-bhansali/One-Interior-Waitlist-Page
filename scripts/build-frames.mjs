#!/usr/bin/env node
/**
 * Rebuilds the scrubbable room sequence from the raw Higgsfield renders.
 *
 *   npm run frames
 *
 * Reads  source/Gen A.mp4 + source/Gen B.mp4
 * Writes public/assets/seq/frame-001.webp ...
 * Then rewrites `count` in public/config.js so the page and the files
 * can never disagree.
 *
 * Requires ffmpeg on PATH.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, readdirSync, writeFileSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const OPTIONS = {
  clips: ['source/Gen A.mp4', 'source/Gen B.mp4'],
  outDir: 'public/assets/seq',
  configFile: 'public/config.js',
  everyNthFrame: 3,    // 24fps source -> 8fps of stored frames
  width: 1280,
  quality: 72
};

function sh(cmd, args) {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function requireFfmpeg() {
  try { sh('ffmpeg', ['-version']); }
  catch {
    console.error('ffmpeg not found on PATH.\n' +
      '  macOS    brew install ffmpeg\n' +
      '  Windows  winget install ffmpeg\n' +
      '  Linux    sudo apt install ffmpeg');
    process.exit(1);
  }
}

function checkContinuity(tmp, clips) {
  // The whole illusion depends on clip 2 starting on clip 1's last frame.
  // Worth failing loudly rather than shipping a visible cut.
  if (clips.length < 2) return;
  const a = join(tmp, 'a_last.png'), b = join(tmp, 'b_first.png');
  sh('ffmpeg', ['-v', 'error', '-sseof', '-0.1', '-i', join(ROOT, clips[0]), '-frames:v', '1', '-y', a]);
  sh('ffmpeg', ['-v', 'error', '-i', join(ROOT, clips[1]), '-frames:v', '1', '-y', b]);

  const sig = (f) => {
    const out = join(tmp, 'sig.rawvideo');
    sh('ffmpeg', ['-v', 'error', '-i', f, '-vf', 'scale=32:18,format=gray', '-f', 'rawvideo', '-y', out]);
    return readFileSync(out);
  };
  const [sa, sb] = [sig(a), sig(b)];
  let diff = 0;
  for (let i = 0; i < sa.length; i++) diff += Math.abs(sa[i] - sb[i]);
  diff /= sa.length;

  if (diff > 12) {
    console.warn(`\n  Warning: the two clips don't line up (mismatch ${diff.toFixed(1)}/255).`);
    console.warn('  The join will be visible. Re-generate clip 2 using clip 1\'s actual');
    console.warn('  last frame as its start frame — see docs/HIGGSFIELD-GUIDE.md.\n');
  } else {
    console.log(`  join mismatch ${diff.toFixed(2)}/255 — seamless`);
  }
}

function main() {
  requireFfmpeg();

  for (const c of OPTIONS.clips) {
    if (!existsSync(join(ROOT, c))) {
      console.error(`Missing ${c}. Put the Higgsfield renders in source/.`);
      process.exit(1);
    }
  }

  const tmp = mkdtempSync(join(tmpdir(), 'oi-frames-'));
  try {
    checkContinuity(tmp, OPTIONS.clips);

    // Join. Stream copy keeps it lossless; the clips come out of
    // Higgsfield with identical specs so no re-encode is needed.
    const list = join(tmp, 'list.txt');
    writeFileSync(list, OPTIONS.clips.map(c => `file '${join(ROOT, c).replace(/'/g, "'\\''")}'`).join('\n'));
    const joined = join(tmp, 'room.mp4');
    sh('ffmpeg', ['-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-y', joined]);

    const dur = sh('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', joined]).trim();
    console.log(`  joined ${OPTIONS.clips.length} clips -> ${Number(dur).toFixed(2)}s`);

    // Split to WebP. -2 keeps the height even, which some encoders require.
    const out = join(ROOT, OPTIONS.outDir);
    mkdirSync(out, { recursive: true });
    sh('ffmpeg', ['-v', 'error', '-i', joined,
      '-vf', `select='not(mod(n,${OPTIONS.everyNthFrame}))',scale=${OPTIONS.width}:-2`,
      '-vsync', '0', '-c:v', 'libwebp', '-quality', String(OPTIONS.quality),
      '-y', join(out, 'frame-%03d.webp')]);

    const files = readdirSync(out).filter(f => /^frame-\d+\.webp$/.test(f)).sort();
    const bytes = files.reduce((n, f) => n + statSync(join(out, f)).size, 0);
    console.log(`  ${files.length} frames, ${(bytes / 1e6).toFixed(1)} MB, ${Math.round(bytes / files.length / 1024)} KB each`);

    if (bytes > 4e6) {
      console.warn('  Over 4 MB total. Consider everyNthFrame: 4 or quality: 65 —');
      console.warn('  this loads on Indian 4G while someone reads the opening screen.');
    }

    // Keep config honest about how many frames exist.
    const cfgPath = join(ROOT, OPTIONS.configFile);
    const cfg = readFileSync(cfgPath, 'utf8');
    const next = cfg.replace(/(sequence:\s*\{[\s\S]*?count:\s*)\d+/, `$1${files.length}`);
    if (next !== cfg) {
      writeFileSync(cfgPath, next);
      console.log(`  config.js count -> ${files.length}`);
    }

    console.log('\nDone. Run `npm run dev` to check it.');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

main();
