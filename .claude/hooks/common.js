"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

/**
 * What every hook reads first: the tool call Claude Code wrote to stdin and the
 * repo it runs in. `WEBPACK_CLAUDE_HOOKS=off` turns the hooks off for a contributor
 * who wants none of them.
 */

/** @typedef {{ session_id?: string, stop_hook_active?: boolean, tool_name?: string, tool_input?: { command?: string, file_path?: string } }} HookInput */

const PROJECT_DIR =
	process.env.CLAUDE_PROJECT_DIR || path.resolve(__dirname, "..", "..");

/**
 * @returns {boolean} whether the contributor switched the hooks off
 */
const hooksDisabled = () =>
	/^(?:off|0|false)$/i.test(process.env.WEBPACK_CLAUDE_HOOKS || "");

/**
 * @returns {HookInput} the hook event, empty when stdin held no JSON
 */
const readInput = () => {
	try {
		return JSON.parse(fs.readFileSync(0, "utf8"));
	} catch (_err) {
		return {};
	}
};

/**
 * @param {string} filePath an absolute path from a tool call
 * @returns {string} the path relative to the repo root with `/` separators
 */
const toRelative = (filePath) =>
	path.relative(PROJECT_DIR, filePath).split(path.sep).join("/");

/**
 * @param {string} sessionId the Claude Code session
 * @param {string} kind which record of the session
 * @returns {string} where the hooks keep that record between calls
 */
const sessionFile = (sessionId, kind) =>
	path.join(
		os.tmpdir(),
		"webpack-claude-hooks",
		`${sessionId.replace(/[^\w.-]/g, "_")}.${kind}`
	);

/**
 * Ends the hook refusing the tool call, with the reason Claude Code shows the model.
 * @param {string} reason what to tell the model
 * @returns {void}
 */
const block = (reason) => {
	process.stderr.write(`${reason}\n`);
	process.exitCode = 2;
};

module.exports = {
	PROJECT_DIR,
	block,
	hooksDisabled,
	readInput,
	sessionFile,
	toRelative
};
