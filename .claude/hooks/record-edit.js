"use strict";

const fs = require("fs");
const path = require("path");
const {
	hooksDisabled,
	readInput,
	sessionFile,
	toRelative
} = require("./common");

/**
 * PostToolUse hook for Edit, Write and MultiEdit: records the edited file so
 * `stop-lint.js` lints exactly what this session changed.
 */

if (!hooksDisabled()) {
	const input = readInput();
	const filePath = input.tool_input && input.tool_input.file_path;
	if (typeof filePath === "string" && input.session_id) {
		const record = sessionFile(input.session_id, "edited");
		fs.mkdirSync(path.dirname(record), { recursive: true });
		fs.appendFileSync(record, `${toRelative(filePath)}\n`);
	}
}
