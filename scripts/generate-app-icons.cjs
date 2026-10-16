const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.join(__dirname, '..');
const LOGO_DIR = path.join(PROJECT_ROOT, 'assets', 'logo');
const NATIVE_DIR = path.join(PROJECT_ROOT, 'assets', 'native');
const VARIANTS_DIR = path.join(PROJECT_ROOT, 'assets', 'android-icons');
const README_IMAGES_DIR = path.join(PROJECT_ROOT, '.github', 'readme-images');

const VARIANTS = ['release', 'preview', 'debug'];
const DENSITY_SCALES = {
  mdpi: 1,
  hdpi: 1.5,
  xhdpi: 2,
  xxhdpi: 3,
  xxxhdpi: 4,
};

const run = (command, args) => {
  const result = spawnSync(command, args, { encoding: 'utf8' });

  if (result.error) {
    throw new Error(`${command} is required to generate app icons`);
  }

  if (result.status !== 0) {
    throw new Error(`${command} failed: ${result.stderr.trim()}`);
  }
};

const renderSvg = (svgPath, size, targetPath) => {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  run('rsvg-convert', [
    '-w',
    String(size),
    '-h',
    String(size),
    svgPath,
    '-o',
    targetPath,
  ]);

  const rgbaPath = `${targetPath}.rgba.png`;
  run('magick', [targetPath, '-define', 'png:color-type=6', rgbaPath]);
  fs.renameSync(rgbaPath, targetPath);
};

const renderRoundSvg = (svgPath, size, targetPath) => {
  const squarePath = `${targetPath}.square.png`;

  renderSvg(svgPath, size, squarePath);

  const radius = size / 2;
  run('magick', [
    squarePath,
    '(',
    '-size',
    `${size}x${size}`,
    'xc:none',
    '-fill',
    'white',
    '-draw',
    `circle ${radius},${radius} ${radius},0`,
    ')',
    '-alpha',
    'off',
    '-compose',
    'CopyOpacity',
    '-composite',
    targetPath,
  ]);

  fs.rmSync(squarePath, { force: true });
};

const render = (svgPath, size, targetPath, { round = false } = {}) => {
  if (round) {
    renderRoundSvg(svgPath, size, targetPath);
    return;
  }

  renderSvg(svgPath, size, targetPath);
};

const icon = path.join(LOGO_DIR, 'capread-icon.svg');
const mark = path.join(LOGO_DIR, 'capread-mark.svg');
const background = path.join(LOGO_DIR, 'capread-background.svg');
const monochrome = path.join(LOGO_DIR, 'capread-monochrome.svg');
const splash = path.join(LOGO_DIR, 'capread-splash.svg');

const nativeTargets = [
  { svg: icon, size: 192, name: 'ic_launcher.png' },
  { svg: icon, size: 192, name: 'ic_launcher_round.png', round: true },
  { svg: background, size: 432, name: 'ic_launcher_background.png' },
  { svg: mark, size: 432, name: 'ic_launcher_foreground.png' },
  { svg: monochrome, size: 432, name: 'ic_launcher_monochrome.png' },
  { svg: monochrome, size: 24, name: 'notification_icon.png' },
  { svg: splash, size: 1152, name: 'splash_icon.png' },
];

for (const target of nativeTargets) {
  render(target.svg, target.size, path.join(NATIVE_DIR, target.name), {
    round: target.round,
  });
}

for (const variant of VARIANTS) {
  const resDir = path.join(VARIANTS_DIR, variant, 'res');

  for (const [density, scale] of Object.entries(DENSITY_SCALES)) {
    const mipmapDir = path.join(resDir, `mipmap-${density}`);
    const drawableDir = path.join(resDir, `drawable-${density}`);
    const launcherSize = 48 * scale;

    renderSvg(icon, launcherSize, path.join(mipmapDir, 'ic_launcher.png'));
    renderRoundSvg(
      icon,
      launcherSize,
      path.join(mipmapDir, 'ic_launcher_round.png'),
    );
    renderSvg(
      background,
      108 * scale,
      path.join(mipmapDir, 'ic_launcher_background.png'),
    );
    renderSvg(
      mark,
      108 * scale,
      path.join(mipmapDir, 'ic_launcher_foreground.png'),
    );
    renderSvg(
      monochrome,
      108 * scale,
      path.join(mipmapDir, 'ic_launcher_monochrome.png'),
    );
    renderSvg(
      monochrome,
      24 * scale,
      path.join(drawableDir, 'notification_icon.png'),
    );
    renderSvg(splash, 288 * scale, path.join(drawableDir, 'splash_icon.png'));
  }
}

for (const variant of VARIANTS) {
  const webDir = path.join(VARIANTS_DIR, variant, 'web');

  renderSvg(icon, 1024, path.join(webDir, 'ic_launcher-1024.png'));
  renderSvg(icon, 512, path.join(webDir, 'ic_launcher-playstore.png'));
  renderSvg(splash, 1152, path.join(webDir, 'splash_icon.png'));
}

render(icon, 256, path.join(README_IMAGES_DIR, 'capread-icon.png'));

console.log('Generated Capread app icons.');
