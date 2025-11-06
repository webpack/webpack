/* eslint-disable no-console */
/* eslint-disable camelcase */

import fs from "fs";

/**
 * @param {{github: EXPECTED_ANY, context: EXPECTED_ANY}} params params
 */
export async function run({ github, context }) {
	const output = JSON.parse(fs.readFileSync("output.json", "utf8"));

	const sha =
		context.eventName === "pull_request"
			? context.payload.pull_request.head.sha
			: context.sha;

	const commitUrl = `https://github.com/${context.repo.owner}/${context.repo.repo}/commit/${sha}`;

	const botCommentIdentifier = "<!-- posted by pkg.pr.new -->";
	const body = `${botCommentIdentifier}
            This PR is packaged and the instant preview is available (${commitUrl}).

            Install it locally:

            - npm

            \`\`\`shell
            npm i -D ${output.packages.map((p) => p.url).join(" ")}
            \`\`\`

            - yarn

            \`\`\`shell
            yarn add -D ${output.packages.map((p) => p.url).join(" ")}
            \`\`\`

            - pnpm

            \`\`\`shell
            pnpm add -D ${output.packages.map((p) => p.url).join(" ")}
            \`\`\`
            `;

	/**
	 * @param {number=} issueNumber PR number
	 * @returns {Promise<EXPECTED_ANY[]>} comments
	 */
	async function findBotComment(issueNumber) {
		if (!issueNumber) return null;
		const comments = await github.rest.issues.listComments({
			owner: context.repo.owner,
			repo: context.repo.repo,
			issue_number: issueNumber
		});
		return comments.data.find((comment) =>
			comment.body.includes(botCommentIdentifier)
		);
	}

	/**
	 * @param {number=} issueNumber issue number
	 * @returns {Promise<void>}
	 */
	async function createOrUpdateComment(issueNumber) {
		if (!issueNumber) {
			console.log("No issue number provided. Cannot post or update comment.");
			return;
		}

		const existingComment = await findBotComment(issueNumber);

		if (existingComment) {
			await github.rest.issues.updateComment({
				owner: context.repo.owner,
				repo: context.repo.repo,
				comment_id: existingComment.id,
				body
			});
		} else {
			await github.rest.issues.createComment({
				issue_number: issueNumber,
				owner: context.repo.owner,
				repo: context.repo.repo,
				body
			});
		}
	}

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

	if (context.eventName === "pull_request") {
		if (context.issue.number) {
			await createOrUpdateComment(context.issue.number);
		}
	} else if (context.eventName === "push") {
		const { data: prs } =
			await github.rest.repos.listPullRequestsAssociatedWithCommit({
				owner: context.repo.owner,
				repo: context.repo.repo,
				commit_sha: sha
			});

		if (prs.length > 0) {
			await createOrUpdateComment(prs[0].number);
		} else {
			console.log(
				"No open pull request found for this push. Logging publish information to console:"
			);
			logPublishInfo();
		}
	}
}
