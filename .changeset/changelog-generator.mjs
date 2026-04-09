import { getInfo, getInfoFromPullRequest } from "@changesets/get-github-info";

/** @typedef {import("@changesets/types").ChangelogFunctions} ChangelogFunctions */

/**
 * @returns {{ GITHUB_SERVER_URL: string }} value
 */
function readEnv() {
	const GITHUB_SERVER_URL =
		process.env.GITHUB_SERVER_URL || "https://github.com";
	return { GITHUB_SERVER_URL };
}

/**
 * Validates that a string is a valid Git commit hash (7-40 hex characters).
 * @param {string} commit
 * @returns {boolean}
 */
function isValidCommitHash(commit) {
	return typeof commit === "string" && /^[0-9a-f]{7,40}$/i.test(commit);
}

/**
 * Validates that a string is a valid GitHub repository slug (owner/repo).
 * @param {string} repo
 * @returns {boolean}
 */
function isValidRepoSlug(repo) {
	return (
		typeof repo === "string" &&
		/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repo)
	);
}

/**
 * Validates that a string is a valid GitHub username (alphanumeric, hyphens).
 * @param {string} user
 * @returns {boolean}
 */
function isValidUsername(user) {
	return typeof user === "string" && /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(user);
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

		const commitLinks = (
			await Promise.all(
				changesets.map(async (cs) => {
					if (cs.commit && isValidCommitHash(cs.commit) && isValidRepoSlug(options.repo)) {
						const { links } = await getInfo({
							repo: options.repo,
							commit: cs.commit
						});
						return links.commit;
					}
				})
			)
		)
			.filter(Boolean)
			.join(", ");

		const changesetLink = "- Updated dependencies [" + commitLinks + "]:";

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
				let { links } = await getInfoFromPullRequest({
					repo: options.repo,
					pull: prFromSummary
				});
				if (commitFromSummary && isValidCommitHash(commitFromSummary) && isValidRepoSlug(options.repo)) {
					const shortCommitId = commitFromSummary.slice(0, 7);
					links = {
						...links,
						commit: `[\`${shortCommitId}\`](${GITHUB_SERVER_URL}/${options.repo}/commit/${commitFromSummary})`
					};
				}
				return links;
			}
			const commitToFetchFrom =
				(commitFromSummary && isValidCommitHash(commitFromSummary) ? commitFromSummary : null) ||
				(changeset.commit && isValidCommitHash(changeset.commit) ? changeset.commit : null);
			if (commitToFetchFrom && isValidRepoSlug(options.repo)) {
				const { links } = await getInfo({
					repo: options.repo,
					commit: commitToFetchFrom
				});
				return links;
			}
			return {
				commit: null,
				pull: null,
				user: null
			};
		})();

		const users = usersFromSummary.length
			? usersFromSummary
					.filter(isValidUsername)
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
