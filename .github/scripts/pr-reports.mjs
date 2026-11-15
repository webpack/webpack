/* eslint-disable camelcase */

import fs from "fs";
import path from "path";
import { upsertReportComment } from "./comment-report.mjs";

// GitHub rejects a comment body longer than this many characters.
const MAX_COMMENT_LENGTH = 65536;

const MARKER = "<!-- pr-reports -->";

/**
 * @typedef {object} ReportSource
 * @property {string} key artifact suffix and output name
 * @property {string} workflow workflow file name
 * @property {string} title section heading while no report is there
 * @property {string} file report file inside the artifact
 * @property {string} marker the line the report file must open with
 */

/** @type {ReportSource[]} */
export const REPORT_SOURCES = [
	{
		key: "pkg-pr-new",
		workflow: "publish-to-pkg-pr-new.yml",
		title: "Preview package",
		file: "pkg-pr-new-report.md",
		marker: "<!-- pkg-pr-new-report -->"
	},
	{
		key: "code-size",
		workflow: "code-size.yml",
		title: "Generated code size",
		file: "code-size-report.md",
		marker: "<!-- code-size-report -->"
	},
	{
		key: "types-coverage",
		workflow: "types-coverage.yml",
		title: "Types Coverage",
		file: "types-coverage-report.md",
		marker: "<!-- types-coverage-report -->"
	},
	{
		key: "module-loading",
		workflow: "module-loading.yml",
		title: "Module loading",
		file: "module-loading-report.md",
		marker: "<!-- module-loading-report -->"
	},
	{
		key: "dependency",
		workflow: "dependency-report.yml",
		title: "Dependencies",
		file: "dependency-report-comment.md",
		marker: "<!-- dependency-report -->"
	}
];

/**
 * Finds the open pull request whose head is still the commit `run` measured, so a stale run cannot overwrite a newer report.
 * @param {{ github: EXPECTED_ANY, context: EXPECTED_ANY, run: EXPECTED_ANY }} params params
 * @returns {Promise<EXPECTED_ANY>} the pull request, or `undefined`
 */
export async function findPullRequest({ github, context, run }) {
	// WHY: `workflow_run.pull_requests` is empty for a fork, so the pull
	// request is looked up by head branch and owner.
	const { data: pulls } = await github.rest.pulls.list({
		...context.repo,
		state: "open",
		base: "main",
		head: `${run.head_repository.owner.login}:${run.head_branch}`,
		per_page: 100
	});
	return pulls.find(
		(/** @type {EXPECTED_ANY} */ candidate) =>
			candidate.base.ref === "main" &&
			candidate.head.sha === run.head_sha &&
			candidate.head.repo &&
			candidate.head.repo.id === run.head_repository.id &&
			candidate.base.repo.id === run.repository.id
	);
}

/**
 * Finds the latest pull request run of every report workflow for the head `run` measured.
 * @param {{ github: EXPECTED_ANY, context: EXPECTED_ANY, run: EXPECTED_ANY }} params params
 * @returns {Promise<Record<string, EXPECTED_ANY>>} the run of each report source by key; a workflow that never ran for the commit is missing
 */
export async function findReportRuns({ github, context, run }) {
	/** @type {Record<string, EXPECTED_ANY>} */
	const runs = {};
	for (const source of REPORT_SOURCES) {
		const { data } = await github.rest.actions.listWorkflowRuns({
			...context.repo,
			workflow_id: source.workflow,
			head_sha: run.head_sha,
			event: "pull_request",
			per_page: 100
		});
		/** @type {EXPECTED_ANY} */
		let reportRun;
		for (const candidate of data.workflow_runs) {
			// Another pull request can share the commit, e.g. a fork of the same branch.
			if (
				candidate.head_branch !== run.head_branch ||
				!candidate.head_repository ||
				candidate.head_repository.id !== run.head_repository.id
			) {
				continue;
			}
			// WHY: the list is ordered by creation, so a re-run of an older run
			// is newer than its position says.
			if (!reportRun || candidate.run_started_at > reportRun.run_started_at) {
				reportRun = candidate;
			}
		}
		if (!reportRun) continue;
		const { id, name, run_number, html_url, status, conclusion } = reportRun;
		runs[source.key] = { id, name, run_number, html_url, status, conclusion };
	}
	return runs;
}

/**
 * Reads a report file written by the pull request's own run, which a fork controls, so it is checked as untrusted data.
 * @param {string} reportPath path of the report file
 * @param {string} marker the line the report must open with
 * @param {(message: string) => void} warn reports a rejected file
 * @returns {string | undefined} the report without its marker
 */
const readReport = (reportPath, marker, warn) => {
	let stat;
	try {
		stat = fs.lstatSync(reportPath);
	} catch (_err) {
		return;
	}
	// A symlink could point the read at a file on the runner.
	if (!stat.isFile() || stat.size > 1024 * 1024) {
		warn(`Ignoring ${reportPath}: not a plain file under 1 MiB.`);
		return;
	}
	const report = fs.readFileSync(reportPath, "utf8");
	if (!report.startsWith(marker)) {
		warn(`Ignoring ${reportPath}: it does not open with ${marker}.`);
		return;
	}
	return report.slice(marker.length).trim();
};

/**
 * Cuts a report to `room` characters and closes what the cut, or the report itself, left open, so it cannot swallow the sections after it.
 * @param {string} report report markdown
 * @param {number} room maximum length before the closing tags
 * @returns {string} the contained report
 */
const containReport = (report, room) => {
	let text =
		report.length > room ? `${report.slice(0, room)}\n\n…truncated` : report;
	if (text.lastIndexOf("<!--") > text.lastIndexOf("-->")) text += " -->";
	// A fence closes only on a bare line of its own character, at least as long.
	let fence = "";
	for (const [, marker, rest] of text.matchAll(/^ {0,3}(`{3,}|~{3,})(.*)$/gm)) {
		if (!fence) {
			if (!(marker[0] === "`" && rest.includes("`"))) fence = marker;
		} else if (
			marker[0] === fence[0] &&
			marker.length >= fence.length &&
			!rest.trim()
		) {
			fence = "";
		}
	}
	if (fence) text += `\n${fence}`;
	const open =
		(text.match(/<details\b/g) || []).length -
		(text.match(/<\/details>/g) || []).length;
	for (let i = 0; i < open; i++) text += "\n\n</details>";
	return text;
};

/**
 * Builds the one comment holding every report for the pull request, each section from the latest run of its workflow.
 * @param {{ runs: Record<string, EXPECTED_ANY>, reportsDir: string, headSha: string, warn: (message: string) => void }} params params
 * @returns {string} the comment body
 */
export function formatReportsComment({ runs, reportsDir, headSha, warn }) {
	/** @type {{ text: string, link?: string }[]} */
	const sections = [];
	for (const source of REPORT_SOURCES) {
		const run = runs[source.key];
		// The dependency report only runs when dependencies change.
		if (!run) continue;
		// WHY: not `run.name`, which a fork sets in its own workflow file.
		const link = `[${source.title} run #${run.run_number}](${run.html_url})`;
		if (run.status !== "completed") {
			sections.push({
				text: `## ${source.title}\n\n⏳ ${link} is still running.`
			});
			continue;
		}
		const report = readReport(
			path.join(reportsDir, source.key, source.file),
			source.marker,
			warn
		);
		if (report !== undefined) {
			sections.push({ text: report, link });
		} else if (run.conclusion !== "success" && run.conclusion !== "skipped") {
			sections.push({
				text: `## ${source.title}\n\n❌ ${link} ended \`${run.conclusion}\` without a report.`
			});
		}
		// A successful run without a report has nothing to say, e.g. no preview
		// package is published for a fork.
	}
	const header = `${MARKER}\n<sub>Reports for ${headSha}, computed by this pull request's own code. Each section updates when its workflow finishes.</sub>`;
	const footer = (/** @type {string | undefined} */ link) =>
		link ? `\n\n<sub>From ${link}.</sub>` : "";
	const separator = "\n\n---\n\n";
	const overhead =
		header.length +
		sections.reduce(
			(sum, section) =>
				sum + separator.length + footer(section.link).length + 64,
			0
		);
	const compose = (/** @type {number} */ room) =>
		[
			header,
			...sections.map(
				(section) =>
					// A zero-width space after a mention's `@` keeps a report from pinging
					// anyone; `webpack@<url>` in an install command stays copyable.
					containReport(section.text, room).replace(
						/(?<!\w)@(?=\w)/g,
						"@\u200B"
					) + footer(section.link)
			)
		].join(separator);
	let room = Math.floor(
		(MAX_COMMENT_LENGTH - overhead) / Math.max(sections.length, 1)
	);
	let body = compose(room);
	// WHY: escaped mentions and closed tags can outgrow the cushion; shrinking
	// every section keeps each footer, where a cut of the tail would drop it.
	while (body.length > MAX_COMMENT_LENGTH && room > 0) {
		room = Math.max(0, room - (body.length - MAX_COMMENT_LENGTH));
		body = compose(room);
	}
	return body;
}

/**
 * Posts or updates the pull request's report comment, then deletes the separate comments each report used to have.
 * @param {{ github: EXPECTED_ANY, context: EXPECTED_ANY, issueNumber: number, body: string }} params params
 * @returns {Promise<void>}
 */
export async function commentReports({ github, context, issueNumber, body }) {
	await upsertReportComment({
		github,
		context,
		issueNumber,
		marker: MARKER,
		report: body
	});
	const comments = await github.paginate(github.rest.issues.listComments, {
		...context.repo,
		issue_number: issueNumber,
		per_page: 100
	});
	const oldMarkers = [
		...REPORT_SOURCES.map((source) => source.marker),
		"<!-- posted by pkg.pr.new -->"
	];
	for (const comment of comments) {
		if (
			comment.user.type === "Bot" &&
			comment.user.login === "github-actions[bot]" &&
			oldMarkers.some((marker) => comment.body.startsWith(marker))
		) {
			await github.rest.issues.deleteComment({
				...context.repo,
				comment_id: comment.id
			});
		}
	}
}
