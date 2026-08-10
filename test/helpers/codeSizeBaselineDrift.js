"use strict";

/**
 * Why the baseline a size report compares against is not the `main` commit the
 * run measured. A pull request is built from its merge ref, so the diff is only
 * this pull request's when the baseline is that same commit; when it is an
 * older one, whatever landed on `main` in between reads as the author's work.
 * @param {string=} baselineCommit commit the baseline report was produced at
 * @param {string=} measuredBase `main` commit the measured tree carries
 * @returns {string | undefined} the note, or undefined when the two line up
 */
const codeSizeBaselineDrift = (baselineCommit, measuredBase) => {
	if (!baselineCommit || !measuredBase || baselineCommit === measuredBase) {
		return undefined;
	}
	return `> [!WARNING]\n> The baseline is \`${baselineCommit.slice(
		0,
		7
	)}\`, not \`${measuredBase.slice(
		0,
		7
	)}\` — the \`main\` commit this run was merged with. Everything that landed on \`main\` in between is counted below and is not this pull request's.`;
};

module.exports = codeSizeBaselineDrift;
