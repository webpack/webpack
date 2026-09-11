import { getCommitInfo, getPullRequestInfo } from "@changesets/get-github-info";

/** @import { ChangelogFunctions } from "@changesets/types" */
/** @import { CommitInfo, PullRequestInfo } from "@changesets/get-github-info" */

/**
 * @typedef {object} Links
 * @property {string | null} commit markdown link to the commit
 * @property {string | null} pull markdown link to the pull request
 * @property {string | null} user markdown link to the author
 */

/**
 * @returns {{ GITHUB_SERVER_URL: string }} value
 */
function readEnv() {
	const GITHUB_SERVER_URL =
		process.env.GITHUB_SERVER_URL || "https://github.com";
	return { GITHUB_SERVER_URL };
}

// Retry GitHub API calls so a transient drop (e.g. GraphQL "Premature close") doesn't fail the release.
/**
 * @template T
 * @param {() => Promise<T>} fn operation to retry
 * @returns {Promise<T>} result
 */
async function withRetry(fn) {
	const maxAttempts = 5;
	let lastError;
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return await fn();
		} catch (err) {
			lastError = err;
			if (attempt === maxAttempts) break;
			const delay = Math.min(1000 * 2 ** (attempt - 1), 8000);
			await new Promise((resolve) => {
				setTimeout(resolve, delay);
			});
		}
	}
	throw lastError;
}

/**
 * Flattens a lookup result into the markdown links a changelog line is built
 * from; a lookup that found nothing leaves every link `null`.
 * @param {CommitInfo | PullRequestInfo | undefined} info lookup result
 * @returns {Links} links
 */
function toLinks(info) {
	return {
		commit: info && info.commit ? info.commit.markdownLink : null,
		pull: info && info.pull ? info.pull.markdownLink : null,
		user: info && info.author ? info.author.markdownLink : null
	};
}

/** @type {ChangelogFunctions} */
const changelogFunctions = {
	getDependencyReleaseLine: async (
		changesets,
		dependenciesUpdated,
		options
	) => {
		if (!options.repo) {
			throw new Error(
				'Please provide a repo to this changelog generator like this:\n"changelog": ["@changesets/changelog-github", { "repo": "org/repo" }]'
			);
		}
		if (dependenciesUpdated.length === 0) return "";

		const changesetLink = `- Updated dependencies [${(
			await Promise.all(
				changesets.map(async (cs) => {
					if (cs.commit) {
						const info = await withRetry(() =>
							getCommitInfo({
								repo: options.repo,
								commit: cs.commit
							})
						);
						return toLinks(info).commit;
					}
				})
			)
		)
			.filter(Boolean)
			.join(", ")}]:`;

		const updatedDependenciesList = dependenciesUpdated.map(
			(dependency) => `  - ${dependency.name}@${dependency.newVersion}`
		);

		return [changesetLink, ...updatedDependenciesList].join("\n");
	},
	getReleaseLine: async (changeset, type, options) => {
		const { GITHUB_SERVER_URL } = readEnv();
		if (!options || !options.repo) {
			throw new Error(
				'Please provide a repo to this changelog generator like this:\n"changelog": ["@changesets/changelog-github", { "repo": "org/repo" }]'
			);
		}

		/** @type {number | undefined} */
		let prFromSummary;
		/** @type {string | undefined} */
		let commitFromSummary;
		/** @type {string[]} */
		const usersFromSummary = [];

		const replacedChangelog = changeset.summary
			.replace(/^\s*(?:pr|pull|pull\s+request):\s*#?(\d+)/im, (_, pr) => {
				const num = Number(pr);
				if (!Number.isNaN(num)) prFromSummary = num;
				return "";
			})
			.replace(/^\s*commit:\s*([^\s]+)/im, (_, commit) => {
				commitFromSummary = commit;
				return "";
			})
			.replace(/^\s*(?:author|user):\s*@?([^\s]+)/gim, (_, user) => {
				usersFromSummary.push(user);
				return "";
			})
			.trim();

		const [firstLine, ...futureLines] = replacedChangelog
			.split("\n")
			.map((l) => l.trimEnd());

		const links = await (async () => {
			if (prFromSummary !== undefined) {
				const info = await withRetry(() =>
					getPullRequestInfo({
						repo: options.repo,
						pull: prFromSummary
					})
				);
				const links = toLinks(info);
				if (commitFromSummary) {
					const shortCommitId = commitFromSummary.slice(0, 7);
					links.commit = `[\`${shortCommitId}\`](${GITHUB_SERVER_URL}/${options.repo}/commit/${commitFromSummary})`;
				}
				return links;
			}
			const commitToFetchFrom = commitFromSummary || changeset.commit;
			if (commitToFetchFrom) {
				const info = await withRetry(() =>
					getCommitInfo({
						repo: options.repo,
						commit: commitToFetchFrom
					})
				);
				return toLinks(info);
			}
			return {
				commit: null,
				pull: null,
				user: null
			};
		})();

		const users = usersFromSummary.length
			? usersFromSummary
					.map(
						(userFromSummary) =>
							`[@${userFromSummary}](${GITHUB_SERVER_URL}/${userFromSummary})`
					)
					.join(", ")
			: links.user;

		let suffix = "";
		if (links.pull || links.commit || users) {
			suffix = `(${users ? `by ${users} ` : ""}in ${
				links.pull || links.commit
			})`;
		}

		return `\n\n- ${firstLine} ${suffix}\n${futureLines
			.map((l) => `  ${l}`)
			.join("\n")}`;
	}
};

export default changelogFunctions;
