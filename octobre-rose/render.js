// usage: node render.js <firstFrame> <lastFrameExclusive> <out.mp4> [page]
// Motion blur: each output frame averages SUB sub-frames spread over half a frame (180° shutter).
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const FF = process.env.FFMPEG, FPS = 30, SUB = 8, SHUTTER = 0.5;
(async () => {
  const [a, b, out] = [+process.argv[2], +process.argv[3], process.argv[4]];
  const page = process.argv[5] || 'index.html';
  const ff = spawn(FF, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS * SUB), '-i', '-',
    '-vf', `tmix=frames=${SUB},select='not(mod(n+1\\,${SUB}))',setpts=N/${FPS}/TB`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS), out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const br = await chromium.launch();
  const p = await br.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on('pageerror', e => console.log('pageerror:', e.message));
  await p.goto('file://' + __dirname + '/' + page + '?render', { waitUntil: 'domcontentloaded' });
  await p.evaluate(() => window.ready);
  const t0 = Date.now();
  for (let f = a; f < b; f++) {
    for (let k = 0; k < SUB; k++) {
      await p.evaluate(t => window.seek(t), f / FPS + k * SHUTTER / (FPS * SUB));
      const buf = await p.screenshot({ type: 'jpeg', quality: 93 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    }
    if ((f - a) % 90 === 0) console.log(`[${out}] frame ${f} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await br.close();
  console.log(`[${out}] done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
})();
