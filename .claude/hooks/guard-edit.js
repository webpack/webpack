"use strict";

const fs = require("fs");
const { block, hooksDisabled, readInput, toRelative } = require("./common");
const { checkEdit } = require("./rules");

/**
 * PreToolUse hook for Edit, Write and MultiEdit: refuses edits to what
 * `yarn fix:special` generates and to files AGENTS.md says live elsewhere.
 */

if (!hooksDisabled()) {
	const input = readInput();
	const filePath = input.tool_input && input.tool_input.file_path;
	if (typeof filePath === "string") {
		const reason = checkEdit(toRelative(filePath), {
			exists: fs.existsSync(filePath)
		});
		if (reason) block(reason);
	}
}
