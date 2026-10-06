"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const {
	PROJECT_DIR,
	block,
	hooksDisabled,
	readInput,
	sessionFile
} = require("./common");
const { selectEditedFiles, touchesDeclaredTypes } = require("./rules");

/**
 * Stop hook: runs the `lint` stages that read single files over what this
 * session edited, plus the `types.d.ts` staleness check when a `lib/` or
 * `declarations/` file changed, and hands failures back to the model.
 */

/** @typedef {{ name: string, output: string }} Failure */

const MAX_BUFFER = 64 * 1024 * 1024;

/**
 * @param {string} name what the check is called in the report
 * @param {string[]} args the node arguments, script first
 * @param {((output: string) => string)=} filter what of the output to keep
 * @returns {Failure | undefined} the failure, or nothing when the check passed
 */
const run = (name, args, filter = (output) => output) => {
	const result = spawnSync(process.execPath, args, {
		cwd: PROJECT_DIR,
		encoding: "utf8",
		maxBuffer: MAX_BUFFER
	});
	if (result.status === 0) return undefined;
	const output = `${result.stdout || ""}${result.stderr || ""}`;
	return {
		name,
		output: filter(output).trim() || `exit code ${result.status}`
	};
};

/**
 * @param {string[]} files the edited files, relative to the repo root
 * @returns {Failure[]} every check that failed
 */
const check = (files) => {
	const failures = [];
	const scripts = files.filter((file) => /\.[cm]?js$/.test(file));
	if (scripts.length > 0) {
		failures.push(
			run("yarn lint:code", [
				"node_modules/eslint/bin/eslint.js",
				"--cache",
				"--no-warn-ignored",
				...scripts
			])
		);
	}
	failures.push(
		run("yarn fmt:check", [
			"node_modules/prettier/bin/prettier.cjs",
			"--cache",
			"--check",
			"--ignore-unknown",
			...files
		]),
		run("yarn lint:spellcheck", [
			"node_modules/cspell/bin.mjs",
			"--cache",
			"--no-must-find-files",
			"--quiet",
			...files
		])
	);
	if (touchesDeclaredTypes(files)) {
		failures.push(
			run(
				"yarn lint:special (types.d.ts)",
				["tooling/generate-types.js", "--no-template-literals"],
				(output) =>
					output
						.split("\n")
						.filter((line) => /need to be updated|error/i.test(line))
						.slice(-20)
						.join("\n")
			)
		);
	}
	return failures.filter(Boolean);
};

if (!hooksDisabled()) {
	const input = readInput();
	if (input.session_id) {
		const record = sessionFile(input.session_id, "edited");
		const reported = sessionFile(input.session_id, "reported");
		let edited = [];
		try {
			edited = fs.readFileSync(record, "utf8").split("\n");
		} catch (_err) {
			// nothing was edited since the last check
		}
		const files = selectEditedFiles(edited, (file) => {
			try {
				return fs.statSync(path.join(PROJECT_DIR, file)).isFile();
			} catch (_err) {
				return false;
			}
		});
		if (files.length > 0) {
			const failures = check(files);
			if (failures.length === 0) {
				for (const file of [record, reported]) {
					try {
						fs.unlinkSync(file);
					} catch (_err) {
						// never written
					}
				}
			} else {
				const report = failures
					.map((failure) => `## ${failure.name}\n${failure.output}`)
					.join("\n\n");
				let previous = "";
				try {
					previous = fs.readFileSync(reported, "utf8");
				} catch (_err) {
					// first report for these edits
				}
				fs.writeFileSync(record, `${files.join("\n")}\n`);
				fs.writeFileSync(reported, report);
				if (!(input.stop_hook_active && previous === report)) {
					block(
						`Lint failed on files edited this session (AGENTS.md: run every stage of lint before every push). Fix them, \`yarn fix\` handles formatting:\n\n${report}`
					);
				}
			}
		}
	}
}
