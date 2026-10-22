"use strict";

const codeSizeCommitLink = require("./codeSizeCommitLink");

/**
 * Why the baseline a size report compares against is not the `main` commit the
 * run measured. A pull request is built from its merge ref, so the diff is only
 * this pull request's when the baseline is that same commit; when it is an
 * older one, whatever landed on `main` in between reads as the author's work.
 * @param {string=} baselineCommit commit the baseline report was produced at
 * @param {string=} measuredBase `main` commit the measured tree carries
 * @param {string=} repositoryUrl repository the commits belong to, when known
 * @returns {string | undefined} the note, or undefined when the two line up
 */
const codeSizeBaselineDrift = (baselineCommit, measuredBase, repositoryUrl) => {
	if (!baselineCommit || !measuredBase || baselineCommit === measuredBase) {
		return undefined;
	}
	return `> [!WARNING]\n> The baseline is ${codeSizeCommitLink(
		baselineCommit,
		repositoryUrl
	)}, not ${codeSizeCommitLink(
		measuredBase,
		repositoryUrl
	)} — the \`main\` commit this run was merged with. Everything that landed on \`main\` in between is counted below and is not this pull request's.`;
};

module.exports = codeSizeBaselineDrift;
