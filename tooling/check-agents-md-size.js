/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

// Fails `yarn lint` when AGENTS.md outgrows the budget its "Editing this guide"
// section states. Node builtins only, so it runs on every OS CI uses.

const fs = require("fs");
const path = require("path");

// Keep in sync with the budget stated in AGENTS.md.
const LIMIT = 40000;

const file = path.resolve(__dirname, "../AGENTS.md");
// UTF-16 length, as Claude Code measures it; CRLF from a Windows checkout counts as LF.
const { length } = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");

if (length > LIMIT) {
	console.error(
		`AGENTS.md is ${length} characters, over its ${LIMIT} budget. Move a task-specific section to docs/ (see "Editing this guide" in AGENTS.md).`
	);
	process.exitCode = 1;
} else {
	console.log(`AGENTS.md: ${length} / ${LIMIT} characters`);
}
