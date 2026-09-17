"use strict";

/**
 * How a size report names a commit: its short sha, linked to the repository
 * tree at that commit when the run knows which repository it measured.
 * @param {string=} commit commit to name, when the report carries one
 * @param {string=} repositoryUrl repository the commit belongs to, when known
 * @returns {string} markdown naming that commit
 */
const codeSizeCommitLink = (commit, repositoryUrl) => {
	if (!commit) return "unknown";
	const short = `\`${commit.slice(0, 7)}\``;
	return repositoryUrl ? `[${short}](${repositoryUrl}/tree/${commit})` : short;
};

module.exports = codeSizeCommitLink;
