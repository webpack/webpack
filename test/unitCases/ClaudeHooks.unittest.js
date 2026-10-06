"use strict";

const { spawnSync } = require("child_process");
const path = require("path");
const {
	checkCommand,
	checkEdit,
	selectEditedFiles,
	touchesDeclaredTypes
} = require("../../.claude/hooks/rules");

const HOOKS_DIR = path.resolve(__dirname, "../../.claude/hooks");

/**
 * Runs a hook the way Claude Code does: the event as JSON on stdin.
 * @param {string} hook the script name
 * @param {object} input the hook event
 * @param {NodeJS.ProcessEnv} [env] extra environment
 * @returns {{ status: number | null, stderr: string }} how it ended
 */
const runHook = (hook, input, env = {}) => {
	const result = spawnSync(process.execPath, [path.join(HOOKS_DIR, hook)], {
		input: JSON.stringify(input),
		encoding: "utf8",
		env: {
			...process.env,
			CLAUDE_PROJECT_DIR: path.resolve(__dirname, "../.."),
			...env
		}
	});
	return { status: result.status, stderr: result.stderr };
};

describe("Claude Code hooks", () => {
	describe("checkCommand", () => {
		it.each([
			["yarn jest --testPathPatterns=css", "never run jest directly"],
			["npx jest test/unitCases", "never run jest directly"],
			["cd lib && node node_modules/.bin/jest", "never run jest directly"],
			["npm install", "use yarn, not npm"],
			["npm run lint", "use yarn, not npm"],
			["yarn test", "runs the full suite"],
			["yarn run test && echo ok", "runs the full suite"],
			["yarn test:test262", "run only in CI"],
			["yarn cover:integration:b", "run only in CI"],
			[
				"yarn test:base --testPathPatterns=css 2>&1 | tail -20",
				"through a pipe"
			],
			["yarn test:basic -t css | grep Tests", "through a pipe"],
			["sed -i 's/a/b/' types.d.ts", "types.d.ts is generated"],
			["echo x >> lib/css/data.js", "lib/css/data.js is generated"],
			["node gen.js | tee schemas/plugins/BannerPlugin.json", "is generated"],
			["git merge origin/main", "never merge `main`"],
			["git merge --no-ff main", "never merge `main`"],
			["git pull origin main", "never merge `main`"],
			[
				'git commit -m "fix: x" -m "Co-Authored-By: Claude <noreply@anthropic.com>"',
				"no `Co-authored-by` trailers"
			]
		])("blocks %j", (command, reason) => {
			expect(checkCommand(command)).toContain(reason);
		});

		it.each([
			'yarn test:base --testPathPatterns="configCases/css"',
			'yarn test:basic --testNamePattern="ConfigTestCases css urls" -u',
			"yarn test:unit",
			"yarn test:base --testPathPatterns=css 2>&1 | tee /tmp/out.log",
			"yarn lint && yarn fix",
			"npm view webpack version",
			"npm --version",
			"grep -n jest package.json",
			"git diff types.d.ts > /tmp/types.diff",
			"cat schemas/WebpackOptions.json | head",
			"git pull --rebase origin main",
			"git rebase origin/main",
			"git merge feature-branch",
			'git commit -m "fix: co-authors list"',
			"yarn test262:update"
		])("allows %j", (command) => {
			expect(checkCommand(command)).toBeUndefined();
		});

		it("blocks authoring with a bot identity unless overridden", () => {
			const bot = { userEmail: "noreply@anthropic.com" };
			expect(checkCommand('git commit -m "x"', bot)).toContain("is a bot");
			expect(checkCommand("git rebase origin/main", bot)).toContain("is a bot");
			expect(
				checkCommand(
					'git -c user.name=me -c user.email=1+me@users.noreply.github.com commit -m "x"',
					bot
				)
			).toBeUndefined();
			expect(
				checkCommand('GIT_AUTHOR_EMAIL=me@example.com git commit -m "x"', bot)
			).toBeUndefined();
			expect(checkCommand("git status", bot)).toBeUndefined();
			expect(
				checkCommand('git commit -m "x"', {
					userEmail: "1+me@users.noreply.github.com"
				})
			).toBeUndefined();
			expect(checkCommand('git commit -m "x"', {})).toBeUndefined();
		});
	});

	describe("checkEdit", () => {
		const existing = { exists: true };
		const fresh = { exists: false };

		it.each([
			["types.d.ts", "generated"],
			["schemas/WebpackOptions.json", "generated"],
			["schemas/plugins/BannerPlugin.check.js", "generated"],
			["schemas/plugins/BannerPlugin.check.d.ts", "generated"],
			["lib/css/data.js", "generated"],
			["lib/javascript/syntax-printer-data.js", "generated"],
			["lib/util/internalSerializables.js", "generated"],
			["lib/css/README.md", "documentation lives in docs/"]
		])("blocks editing %s", (file, reason) => {
			expect(checkEdit(file, existing)).toContain(reason);
		});

		it("blocks a new plugin in lib/ root but not an existing one", () => {
			expect(checkEdit("lib/MyPlugin.js", fresh)).toContain("lib/ root");
			expect(checkEdit("lib/ProgressPlugin.js", existing)).toBeUndefined();
			expect(checkEdit("lib/output/MyPlugin.js", fresh)).toBeUndefined();
		});

		it.each([
			"lib/Compilation.js",
			"declarations/WebpackOptions.ts",
			"docs/architecture.md",
			"tooling/generate-css-data.js",
			"test/configCases/css/urls/index.js",
			"lib/css/CssParser.js",
			"lib/javascript/data-helpers.js",
			"../outside/types.d.ts"
		])("allows editing %s", (file) => {
			expect(checkEdit(file, existing)).toBeUndefined();
		});
	});

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

	describe("the guards as Claude Code runs them", () => {
		it("guard-bash exits 2 with the reason for a forbidden command", () => {
			const result = runHook("guard-bash.js", {
				tool_name: "Bash",
				tool_input: { command: "npx jest" }
			});
			expect(result.status).toBe(2);
			expect(result.stderr).toContain("never run jest directly");
		});

		it("guard-bash exits 0 for an allowed command and for no input", () => {
			expect(
				runHook("guard-bash.js", {
					tool_name: "Bash",
					tool_input: { command: "yarn lint" }
				}).status
			).toBe(0);
			expect(runHook("guard-bash.js", {}).status).toBe(0);
		});

		it("guard-bash reads git's identity only for git commands", () => {
			const result = runHook("guard-bash.js", {
				tool_name: "Bash",
				tool_input: { command: "git status" }
			});
			expect(result.status).toBe(0);
		});

		it("guard-edit exits 2 for a generated file", () => {
			const result = runHook("guard-edit.js", {
				tool_name: "Edit",
				tool_input: {
					file_path: path.resolve(__dirname, "../../types.d.ts")
				}
			});
			expect(result.status).toBe(2);
			expect(result.stderr).toContain("generated");
		});

		it("guard-edit exits 0 for a source file", () => {
			const result = runHook("guard-edit.js", {
				tool_name: "Edit",
				tool_input: {
					file_path: path.resolve(__dirname, "../../lib/Compilation.js")
				}
			});
			expect(result.status).toBe(0);
		});

		it("every hook is off under WEBPACK_CLAUDE_HOOKS=off", () => {
			const input = {
				tool_name: "Bash",
				tool_input: { command: "npx jest" }
			};
			expect(
				runHook("guard-bash.js", input, { WEBPACK_CLAUDE_HOOKS: "off" }).status
			).toBe(0);
		});
	});
});
