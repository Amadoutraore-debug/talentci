// usage: node render.js <firstFrame> <lastFrameExclusive> <out.mp4>
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const FF = process.env.FFMPEG, FPS = 30;
(async () => {
  const [a, b, out] = [+process.argv[2], +process.argv[3], process.argv[4]];
  const ff = spawn(FF, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS), out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const br = await chromium.launch();
  const p = await br.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.log('pageerror:', e.message));
  await p.goto('file://' + __dirname + '/index.html?render');
  await p.evaluate(() => window.ready);
  const t0 = Date.now();
  for (let f = a; f < b; f++) {
    await p.evaluate(t => window.seek(t), f / FPS);
    const buf = await p.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - a) % 150 === 0) console.log(`[${out}] frame ${f} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await br.close();
  console.log(`[${out}] done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
})();
