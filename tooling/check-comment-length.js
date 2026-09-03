/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

// Report every plain comment a change grows past two lines, over a diff's added
// lines. JSDoc and the license header are exempt.

const { execFileSync } = require("child_process");
const fs = require("fs");

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

module.exports.overLimit = overLimit;

if (require.main === module) {
	const base =
		process.argv[2] ||
		execFileSync("git", ["merge-base", "HEAD", "origin/main"], {
			encoding: "utf8"
		}).trim();
	const parts = [
		execFileSync("git", ["diff", "-U0", base, "--", "*.js", "*.mjs", "*.cjs"], {
			encoding: "utf8",
			maxBuffer: MAX_BUFFER
		})
	];
	// A file git does not track yet is in no diff, so read it as all added —
	// otherwise a new file passes until the commit that would have caught it.
	const untracked = execFileSync(
		"git",
		["ls-files", "--others", "--exclude-standard", "*.js", "*.mjs", "*.cjs"],
		{ encoding: "utf8", maxBuffer: MAX_BUFFER }
	)
		.split("\n")
		.filter(Boolean);
	for (const one of untracked) {
		const body = fs.readFileSync(one, "utf8").split("\n");
		parts.push(
			`--- a/${one}\n+++ b/${one}\n@@ -0,0 +1,${body.length} @@\n${body
				.map((line) => `+${line}`)
				.join("\n")}`
		);
	}
	const found = overLimit(parts.join("\n"));
	for (const one of found) {
		process.stderr.write(`${one}: comment over ${LIMIT} lines\n`);
	}
	if (found.length > 0) process.exitCode = 1;
}
