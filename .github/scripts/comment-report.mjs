/* eslint-disable camelcase */

// GitHub rejects a comment body longer than this many characters.
const MAX_COMMENT_LENGTH = 65536;

/**
 * Creates the pull request comment opening with `marker`, or updates the one this workflow wrote.
 * Only a `github-actions[bot]` comment is updated, since anyone can post the marker and pass their numbers off as CI's.
 * @param {{ github: EXPECTED_ANY, context: EXPECTED_ANY, issueNumber: number, marker: string, report: string }} params params
 * @returns {Promise<void>}
 */
export async function upsertReportComment({
	github,
	context,
	issueNumber,
	marker,
	report
}) {
	const truncated = "\n\n…truncated";
	const room = MAX_COMMENT_LENGTH - truncated.length;
	const body =
		report.length > room ? report.slice(0, room) + truncated : report;
	const comments = await github.paginate(github.rest.issues.listComments, {
		...context.repo,
		issue_number: issueNumber,
		per_page: 100
	});
	const previous = comments.find(
		(/** @type {EXPECTED_ANY} */ comment) =>
			comment.user.type === "Bot" &&
			comment.user.login === "github-actions[bot]" &&
			comment.body.startsWith(marker)
	);
	if (previous) {
		await github.rest.issues.updateComment({
			...context.repo,
			comment_id: previous.id,
			body
		});
	} else {
		await github.rest.issues.createComment({
			...context.repo,
			issue_number: issueNumber,
			body
		});
	}
}
