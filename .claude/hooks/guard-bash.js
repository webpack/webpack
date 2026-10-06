"use strict";

const { execFileSync } = require("child_process");
const { PROJECT_DIR, block, hooksDisabled, readInput } = require("./common");
const { checkCommand } = require("./rules");

/**
 * PreToolUse hook for Bash: refuses the commands AGENTS.md and
 * docs/pull-requests.md forbid, before they run.
 */

/**
 * @returns {string | undefined} the author email git would use for a commit here
 */
const configuredEmail = () => {
	try {
		return execFileSync("git", ["config", "user.email"], {
			cwd: PROJECT_DIR,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"]
		}).trim();
	} catch (_err) {
		return undefined;
	}
};

if (!hooksDisabled()) {
	const input = readInput();
	const command = input.tool_input && input.tool_input.command;
	if (typeof command === "string") {
		const reason = checkCommand(command, {
			userEmail: /\bgit\s/.test(command) ? configuredEmail() : undefined
		});
		if (reason) block(reason);
	}
}
