/* eslint-disable no-console */

import fs from "fs";

/**
 * Logs what was published and, for a pull request, writes its preview package report.
 * @param {{ context: EXPECTED_ANY }} params params
 * @returns {void}
 */
export function run({ context }) {
	const output = JSON.parse(fs.readFileSync("output.json", "utf8"));

	const sha =
		context.eventName === "pull_request"
			? context.payload.pull_request.head.sha
			: context.sha;

	const commitUrl = `https://github.com/${context.repo.owner}/${context.repo.repo}/commit/${sha}`;

	const reportMarker = "<!-- pkg-pr-new-report -->";

	/**
	 * @param {number} issueNumber PR number
	 * @returns {string} report, the same for every push to the PR
	 */
	const reportBody = (issueNumber) => {
		// WHY: a URL naming the PR instead of the commit installs its latest
		// build, so later pushes leave the report as it is and notify nobody.
		const urls = output.packages
			.map((p) => p.url.replace(/@[^@/]+$/, `@${issueNumber}`))
			.join(" ");
		return `${reportMarker}
## Preview package

This PR is packaged and the instant preview of its latest commit is available.

Install it locally:

- npm

\`\`\`shell
npm i -D webpack@${urls}
\`\`\`

- yarn

\`\`\`shell
yarn add -D webpack@${urls}
\`\`\`

- pnpm

\`\`\`shell
pnpm add -D webpack@${urls}
\`\`\`
`;
	};

	/**
	 * @returns {void}
	 */
	function logPublishInfo() {
		console.log(`\n${"=".repeat(50)}`);
		console.log("Publish Information");
		console.log("=".repeat(50));
		console.log("\nPublished Packages:");
		console.log(output.packages);
		console.log("\nTemplates:");
		console.log(output.templates);
		console.log(`\nCommit URL: ${commitUrl}`);
		console.log(`\n${"=".repeat(50)}`);
	}

	logPublishInfo();

	// `pr-reports.yml` puts this in the pull request's one report comment.
	if (context.eventName === "pull_request") {
		fs.writeFileSync(
			"pkg-pr-new-report.md",
			reportBody(context.issue.number),
			"utf8"
		);
	}
}
