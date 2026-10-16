const fs = require('fs');
const path = require('path');

const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;
const MAX_MAJOR = 1023;
const MAX_MINOR = 1023;
const MAX_PATCH = 2047;
const MAX_ANDROID_VERSION_CODE = 2100000000;

const projectRoot = path.join(__dirname, '..');
const packageJsonPath = path.join(projectRoot, 'package.json');
const appJsonPath = path.join(projectRoot, 'app.json');
const issueTemplatePaths = [
  path.join(projectRoot, '.github', 'ISSUE_TEMPLATE', 'report_issue.yml'),
  path.join(projectRoot, '.github', 'ISSUE_TEMPLATE', 'request_feature.yml'),
];

const nextVersion = process.argv[2];
const match = nextVersion?.match(VERSION_PATTERN);

if (!match) {
  console.error('Usage: pnpm release:prepare <major.minor.patch>');
  process.exit(1);
}

const [, majorText, minorText, patchText] = match;
const versionParts = [majorText, minorText, patchText].map(Number);
const [major, minor, patch] = versionParts;

if (major > MAX_MAJOR || minor > MAX_MINOR || patch > MAX_PATCH) {
  console.error(
    `Version components must fit within ${MAX_MAJOR}.${MAX_MINOR}.${MAX_PATCH}`,
  );
  process.exit(1);
}

const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
const appJsonContent = fs.readFileSync(appJsonPath, 'utf8');
const packageJson = JSON.parse(packageJsonContent);
const appJson = JSON.parse(appJsonContent);
const currentVersion = packageJson.version;
const currentMatch = currentVersion?.match(VERSION_PATTERN);

if (!currentMatch) {
  console.error(
    `Current package version is not stable semver: ${currentVersion}`,
  );
  process.exit(1);
}

const currentParts = currentMatch.slice(1).map(Number);
const versionComparison = versionParts.findIndex(
  (part, index) => part !== currentParts[index],
);

if (
  versionComparison !== -1 &&
  versionParts[versionComparison] < currentParts[versionComparison]
) {
  console.error(
    `Release version ${nextVersion} must not be older than ${currentVersion}`,
  );
  process.exit(1);
}

if (appJson.expo.version !== currentVersion) {
  console.error(
    `Version mismatch: package.json=${currentVersion}, app.json=${appJson.expo.version}`,
  );
  process.exit(1);
}

const versionCode = major * 1024 * 2048 + minor * 2048 + patch;

if (versionCode > MAX_ANDROID_VERSION_CODE) {
  console.error(
    `Android version code ${versionCode} exceeds ${MAX_ANDROID_VERSION_CODE}`,
  );
  process.exit(1);
}

const replaceSingle = (content, search, replacement, filePath) => {
  const firstMatch = content.indexOf(search);
  const secondMatch = content.indexOf(search, firstMatch + search.length);

  if (firstMatch === -1 || secondMatch !== -1) {
    console.error(`Expected exactly one "${search}" entry in ${filePath}`);
    process.exit(1);
  }

  return (
    content.slice(0, firstMatch) +
    replacement +
    content.slice(firstMatch + search.length)
  );
};

const nextPackageJsonContent = replaceSingle(
  packageJsonContent,
  `"version": "${currentVersion}"`,
  `"version": "${nextVersion}"`,
  packageJsonPath,
);
let nextAppJsonContent = replaceSingle(
  appJsonContent,
  `"version": "${currentVersion}"`,
  `"version": "${nextVersion}"`,
  appJsonPath,
);
nextAppJsonContent = replaceSingle(
  nextAppJsonContent,
  `"versionCode": ${appJson.expo.android.versionCode}`,
  `"versionCode": ${versionCode}`,
  appJsonPath,
);

const issueTemplateUpdates = issueTemplatePaths.map(issueTemplatePath => {
  const content = fs.readFileSync(issueTemplatePath, 'utf8');

  if (currentVersion !== nextVersion && !content.includes(currentVersion)) {
    console.error(
      `${path.relative(
        projectRoot,
        issueTemplatePath,
      )} does not contain ${currentVersion}`,
    );
    process.exit(1);
  }

  return {
    issueTemplatePath,
    content: content.replaceAll(currentVersion, nextVersion),
  };
});

fs.writeFileSync(packageJsonPath, nextPackageJsonContent, 'utf8');
fs.writeFileSync(appJsonPath, nextAppJsonContent, 'utf8');

for (const { issueTemplatePath, content } of issueTemplateUpdates) {
  fs.writeFileSync(issueTemplatePath, content, 'utf8');
}

console.table({
  version: nextVersion,
  androidVersionCode: versionCode,
});
