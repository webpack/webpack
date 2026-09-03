/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

// Report every plain comment a change grows past two lines, over a diff's added
// lines. JSDoc and the license header are exempt.

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const LIMIT = 2;
const MAX_BUFFER = 1024 * 1024 * 256;
const ADDED_RE = /^\+/;
const LINE_COMMENT_RE = /^\+[ \t]*\/\//;
const BLOCK_OPEN_RE = /^\+[ \t]*\/\*/;
const JSDOC_OPEN_RE = /^\+[ \t]*\/\*\*/;
const BLOCK_CLOSE_RE = /\*\//;
const LICENSE_RE = /MIT License/;
const HUNK_RE = /^@@ -\d+(?:,\d+)? \+(\d+)/;
const FILE_RE = /^\+\+\+ b\/(.*)$/;

/**
 * @param {string} diff unified diff to read, with no context lines
 * @returns {string[]} one `<file>:<line>` per comment over the limit
 */
const overLimit = (diff) => {
	/** @type {string[]} */
	const found = [];
	let file = "";
	let lineNumber = 0;
	let lineRun = 0;
	let blockRun = 0;
	let blockStart = 0;
	for (const line of diff.split("\n")) {
		const hunk = HUNK_RE.exec(line);
		if (hunk) {
			lineNumber = Number(hunk[1]);
			lineRun = 0;
			blockRun = 0;
			continue;
		}
		const named = FILE_RE.exec(line);
		if (named) {
			file = named[1];
			continue;
		}
		if (!ADDED_RE.test(line) || line.startsWith("+++")) continue;
		if (blockRun !== 0) {
			if (blockRun > 0) blockRun++;
			if (LICENSE_RE.test(line)) blockRun = -1;
			if (BLOCK_CLOSE_RE.test(line)) {
				if (blockRun > LIMIT) found.push(`${file}:${blockStart}`);
				blockRun = 0;
			}
		} else if (JSDOC_OPEN_RE.test(line)) {
			lineRun = 0;
		} else if (BLOCK_OPEN_RE.test(line)) {
			if (!BLOCK_CLOSE_RE.test(line)) {
				blockRun = 1;
				blockStart = lineNumber;
			}
			lineRun = 0;
		} else if (LINE_COMMENT_RE.test(line)) {
			if (++lineRun === LIMIT + 1) found.push(`${file}:${lineNumber - LIMIT}`);
		} else {
			lineRun = 0;
		}
		lineNumber++;
	}
	return found;
};

/**
 * A file git does not track yet is in no diff, so read it as all added —
 * otherwise a new file passes until the commit that would have caught it.
 * @param {string[]} files paths git does not track yet
 * @param {(path: string) => string} read reads one of them
 * @returns {string} a diff naming every line of each as added
 */
const untrackedDiff = (files, read) =>
	files
		.map((one) => {
			const body = read(one).split("\n");
			return `--- a/${one}\n+++ b/${one}\n@@ -0,0 +1,${body.length} @@\n${body
				.map((line) => `+${line}`)
				.join("\n")}`;
		})
		.join("\n");

/**
 * @param {string=} from base to diff against, defaulting to the merge base
 * @param {string=} cwd repository to read, defaulting to the current directory
 * @returns {string[]} one `<file>:<line>` per comment over the limit
 */
const report = (from, cwd) => {
	const run = (/** @type {string[]} */ args) =>
		execFileSync("git", args, { encoding: "utf8", maxBuffer: MAX_BUFFER, cwd });
	const base = from || run(["merge-base", "HEAD", "origin/main"]).trim();
	const globs = ["*.js", "*.mjs", "*.cjs"];
	const untracked = run([
		"ls-files",
		"--others",
		"--exclude-standard",
		...globs
	])
		.split("\n")
		.filter(Boolean);
	return overLimit(
		`${run(["diff", "-U0", base, "--", ...globs])}\n${untrackedDiff(
			untracked,
			(one) => fs.readFileSync(cwd ? path.join(cwd, one) : one, "utf8")
		)}`
	);
};

/**
 * @param {(text: string) => void} write receives one line per offender
 * @param {string=} from base to diff against, defaulting to the merge base
 * @param {string=} cwd repository to read, defaulting to the current directory
 * @returns {number} the exit code, non-zero where a comment is over the limit
 */
const main = (write, from, cwd) => {
	const found = report(from, cwd);
	for (const one of found) write(`${one}: comment over ${LIMIT} lines\n`);
	return found.length > 0 ? 1 : 0;
};

module.exports.main = main;
module.exports.overLimit = overLimit;
module.exports.report = report;
module.exports.untrackedDiff = untrackedDiff;

if (require.main === module) {
	process.exitCode = main(
		(text) => process.stderr.write(text),
		process.argv[2]
	);
}
