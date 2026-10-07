"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { sessionFile } = require("../../.claude/hooks/common");
const {
	selectEditedFiles,
	touchesDeclaredTypes
} = require("../../.claude/hooks/rules");

const HOOKS_DIR = path.resolve(__dirname, "../../.claude/hooks");
const PROJECT_DIR = path.resolve(__dirname, "../..");

/**
 * Runs a hook the way Claude Code does: the event as JSON on stdin.
 * @param {string} hook the script name
 * @param {object} input the hook event
 * @param {NodeJS.ProcessEnv} env extra environment
 * @returns {number | null} the exit code
 */
const runHook = (hook, input, env = {}) =>
	spawnSync(process.execPath, [path.join(HOOKS_DIR, hook)], {
		input: JSON.stringify(input),
		encoding: "utf8",
		env: { ...process.env, CLAUDE_PROJECT_DIR: PROJECT_DIR, ...env }
	}).status;

describe("Claude Code hooks", () => {
	describe("selectEditedFiles", () => {
		it("keeps repo files once, in order, and drops the rest", () => {
			/**
			 * @param {string} file a recorded path
			 * @returns {boolean} whether it still exists
			 */
			const exists = (file) => file !== "gone.js";
			expect(
				selectEditedFiles(
					[
						"lib/a.js",
						"",
						"../elsewhere.js",
						"..",
						"gone.js",
						"lib/a.js",
						"docs/x.md"
					],
					exists
				)
			).toEqual(["lib/a.js", "docs/x.md"]);
		});
	});

	describe("touchesDeclaredTypes", () => {
		it("answers for lib sources and declarations only", () => {
			expect(touchesDeclaredTypes(["lib/Compilation.js"])).toBe(true);
			expect(touchesDeclaredTypes(["declarations/WebpackOptions.ts"])).toBe(
				true
			);
			expect(touchesDeclaredTypes(["lib/css/data.js.md", "docs/a.md"])).toBe(
				false
			);
			expect(touchesDeclaredTypes(["test/unitCases/a.unittest.js"])).toBe(
				false
			);
		});
	});

	describe("record-edit as Claude Code runs it", () => {
		const sessionId = `unittest-${process.pid}/${Date.now()}`;
		const record = sessionFile(sessionId, "edited");

		afterEach(() => {
			try {
				fs.unlinkSync(record);
			} catch (_err) {
				// never written
			}
		});

		it("appends each edited file relative to the repo root", () => {
			/**
			 * @param {string} file the edited path, relative to the repo root
			 * @returns {number | null} the hook's exit code
			 */
			const edit = (file) =>
				runHook("record-edit.js", {
					session_id: sessionId,
					tool_name: "Edit",
					tool_input: { file_path: path.join(PROJECT_DIR, file) }
				});
			expect(edit("lib/Compilation.js")).toBe(0);
			expect(edit(path.join("docs", "architecture.md"))).toBe(0);
			expect(fs.readFileSync(record, "utf8")).toBe(
				"lib/Compilation.js\ndocs/architecture.md\n"
			);
		});

		it("records nothing without a file, a session, or when switched off", () => {
			expect(
				runHook("record-edit.js", { session_id: sessionId, tool_input: {} })
			).toBe(0);
			expect(
				runHook("record-edit.js", {
					tool_input: { file_path: path.join(PROJECT_DIR, "lib/a.js") }
				})
			).toBe(0);
			expect(
				runHook(
					"record-edit.js",
					{
						session_id: sessionId,
						tool_input: { file_path: path.join(PROJECT_DIR, "lib/a.js") }
					},
					{ WEBPACK_CLAUDE_HOOKS: "off" }
				)
			).toBe(0);
			expect(runHook("record-edit.js", {})).toBe(0);
			expect(fs.existsSync(record)).toBe(false);
		});
	});
});
