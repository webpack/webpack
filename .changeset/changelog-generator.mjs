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
				let { links } = await getInfoFromPullRequest({
					repo: options.repo,
					pull: prFromSummary
				});
				if (commitFromSummary) {
					const shortCommitId = commitFromSummary.slice(0, 7);
					links = {
						...links,
						commit: `[\`${shortCommitId}\`](${GITHUB_SERVER_URL}/${options.repo}/commit/${commitFromSummary})`
					};
				}
				return links;
			}
			const commitToFetchFrom = commitFromSummary || changeset.commit;
			if (commitToFetchFrom) {
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
					.map(
						(userFromSummary) =>
							`[@${userFromSummary}](${GITHUB_SERVER_URL}/${userFromSummary})`
					)
					.join(", ")
			: links.user;

		let suffix = "";
		if (links.pull || links.commit || users) {
			suffix = `(${users ? `by ${users} ` : ""}in ${links.pull || links.commit})`;
		}

		return `\n\n- ${firstLine} ${suffix}\n${futureLines.map((l) => `  ${l}`).join("\n")}`;
	}
};

export default changelogFunctions;
