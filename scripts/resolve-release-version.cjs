const fs = require('fs');
const path = require('path');

const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;
const BUMP_TYPES = new Set(['major', 'minor', 'patch']);

const bumpType = process.argv[2]?.toLowerCase();

if (!BUMP_TYPES.has(bumpType)) {
  console.error('Usage: node scripts/resolve-release-version.cjs <bump-type>');
  console.error('Bump type must be one of: major, minor, patch');
  process.exit(1);
}

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version;
const match = currentVersion?.match(VERSION_PATTERN);

if (!match) {
  console.error(
    `Current package version is not stable semver: ${currentVersion}`,
  );
  process.exit(1);
}

let [, major, minor, patch] = match.map(Number);

if (bumpType === 'major') {
  major += 1;
  minor = 0;
  patch = 0;
} else if (bumpType === 'minor') {
  minor += 1;
  patch = 0;
} else {
  patch += 1;
}

process.stdout.write(`${major}.${minor}.${patch}`);
