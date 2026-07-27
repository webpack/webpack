/* eslint-disable no-console */

import fs from "fs";

const output = JSON.parse(fs.readFileSync("output.json", "utf8"));
const outputPath = process.env.OUTPUT_PATH;
const sha = process.env.COMMIT_SHA;

if (!outputPath || !sha) {
	throw new Error("OUTPUT_PATH and COMMIT_SHA must both be provided");
}

const commitUrl = `https://github.com/${process.env.GITHUB_REPOSITORY}/commit/${sha}`;
const packages = output.packages.map((p) => p.url).join(" ");

fs.writeFileSync(
	outputPath,
	`#### 📦 Package preview

This PR is packaged and the instant preview is available (${commitUrl}).

Install it locally:

- npm

\`\`\`shell
npm i -D webpack@${packages}
\`\`\`

- yarn

\`\`\`shell
yarn add -D webpack@${packages}
\`\`\`

- pnpm

\`\`\`shell
pnpm add -D webpack@${packages}
\`\`\`
`
);

console.log(`\n${"=".repeat(50)}`);
console.log("Publish Information");
console.log("=".repeat(50));
console.log("\nPublished Packages:");
console.log(output.packages);
console.log("\nTemplates:");
console.log(output.templates);
console.log(`\nCommit URL: ${commitUrl}`);
console.log(`\n${"=".repeat(50)}`);
