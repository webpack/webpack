"use strict";

const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
	main,
	overLimit,
	report,
	untrackedDiff
} = require("../tooling/check-comment-length");

const SCRIPT = path.join(__dirname, "..", "tooling", "check-comment-length.js");

/**
 * @param {string[]} lines added lines, without the `+`
 * @returns {string[]} what the checker reports for them
 */
const check = (lines) =>
	overLimit(
		[
			"--- a/x.js",
			"+++ b/x.js",
			`@@ -0,0 +1,${lines.length} @@`,
			...lines.map((one) => `+${one}`)
		].join("\n")
	);

describe("check-comment-length", () => {
	it("reports a line comment run past two lines", () => {
		expect(check(["// one", "// two", "// three", "const a = 1;"])).toEqual([
			"x.js:1"
		]);
	});

	it("accepts a run of exactly two", () => {
		expect(check(["// one", "// two", "const a = 1;"])).toEqual([]);
	});

	it("reports a block comment past two lines", () => {
		expect(check(["/* one", "   two", "   three */"])).toEqual(["x.js:1"]);
	});

	it("accepts a block comment of two lines, and of one", () => {
		expect(check(["/* one", "   two */", "/* just the one */"])).toEqual([]);
	});

	it("exempts a JSDoc block however long", () => {
		expect(
			check([
				"/**",
				" * A description.",
				" * @param {string} x the thing",
				" * @returns {number} the other",
				" */",
				"const f = (x) => 1;"
			])
		).toEqual([]);
	});

	it("exempts the license header every source file opens with", () => {
		expect(
			check([
				"/*",
				"\tMIT License http://www.opensource.org/licenses/mit-license.php",
				"\tAuthor Someone @someone",
				"*/",
				'"use strict";'
			])
		).toEqual([]);
	});

	it("still reads a comment following the license header", () => {
		expect(
			check([
				"/*",
				"\tMIT License http://www.opensource.org/licenses/mit-license.php",
				"*/",
				"// one",
				"// two",
				"// three"
			])
		).toEqual(["x.js:4"]);
	});

	it("exempts an inline `/** @type */` cast", () => {
		expect(check(["/** @type {string} */ (x);"])).toEqual([]);
	});

	it("counts each run on its own, and reports where it starts", () => {
		expect(
			check([
				"const a = 1;",
				"// one",
				"// two",
				"// three",
				"const b = 2;",
				"// four",
				"// five",
				"// six"
			])
		).toEqual(["x.js:2", "x.js:6"]);
	});

	it("reads nothing out of a removed or unchanged line", () => {
		expect(
			overLimit(
				[
					"--- a/x.js",
					"+++ b/x.js",
					"@@ -1,3 +1,1 @@",
					"-// one",
					"-// two",
					"-// three",
					"+const a = 1;"
				].join("\n")
			)
		).toEqual([]);
	});

	it("names the file each run is in", () => {
		expect(
			overLimit(
				[
					"--- a/one.js",
					"+++ b/one.js",
					"@@ -0,0 +4,3 @@",
					"+// a",
					"+// b",
					"+// c",
					"--- a/two.js",
					"+++ b/two.js",
					"@@ -0,0 +9,3 @@",
					"+/* a",
					"+   b",
					"+   c */"
				].join("\n")
			)
		).toEqual(["one.js:4", "two.js:9"]);
	});

	describe("over a real repository", () => {
		/** @type {string} */
		let dir;

		const git = (/** @type {string[]} */ args) =>
			execFileSync("git", args, { cwd: dir, encoding: "utf8" });

		beforeEach(() => {
			dir = fs.mkdtempSync(path.join(os.tmpdir(), "comment-length-"));
			git(["init", "-q", "-b", "main"]);
			fs.writeFileSync(path.join(dir, "kept.js"), "const a = 1;\n");
			git(["add", "-A"]);
			git([
				"-c",
				"user.name=t",
				"-c",
				"user.email=t@t",
				"commit",
				"-qm",
				"base"
			]);
		});

		afterEach(() => {
			fs.rmSync(dir, { recursive: true, force: true });
		});

		it("reads a tracked file's added lines", () => {
			fs.appendFileSync(
				path.join(dir, "kept.js"),
				"// one\n// two\n// three\n"
			);
			expect(report("HEAD", dir)).toEqual(["kept.js:2"]);
		});

		it("reads a file git does not track yet", () => {
			fs.writeFileSync(
				path.join(dir, "new.js"),
				"/* one\n   two\n   three */\n"
			);
			expect(report("HEAD", dir)).toEqual(["new.js:1"]);
		});

		it("reports nothing when every comment is short enough", () => {
			fs.appendFileSync(path.join(dir, "kept.js"), "// one\n// two\n");
			fs.writeFileSync(path.join(dir, "new.js"), "/* just the one */\n");
			expect(report("HEAD", dir)).toEqual([]);
		});

		it("returns 1 and names each offender", () => {
			fs.writeFileSync(path.join(dir, "new.js"), "// one\n// two\n// three\n");
			/** @type {string[]} */
			const written = [];
			expect(main((text) => written.push(text), "HEAD", dir)).toBe(1);
			expect(written).toEqual(["new.js:1: comment over 2 lines\n"]);
		});

		it("returns 0 and writes nothing when the diff is clean", () => {
			fs.appendFileSync(path.join(dir, "kept.js"), "// one\n");
			/** @type {string[]} */
			const written = [];
			expect(main((text) => written.push(text), "HEAD", dir)).toBe(0);
			expect(written).toEqual([]);
		});

		it("exits 1 and names the offender when run as a command", () => {
			fs.writeFileSync(path.join(dir, "new.js"), "// one\n// two\n// three\n");
			let status = 0;
			let stderr = "";
			try {
				execFileSync(process.execPath, [SCRIPT, "HEAD"], {
					cwd: dir,
					encoding: "utf8",
					stdio: "pipe"
				});
			} catch (err) {
				status = /** @type {EXPECTED_ANY} */ (err).status;
				stderr = /** @type {EXPECTED_ANY} */ (err).stderr;
			}
			expect(status).toBe(1);
			expect(stderr).toBe("new.js:1: comment over 2 lines\n");
		});

		it("exits 0 and says nothing when the diff is clean", () => {
			fs.appendFileSync(path.join(dir, "kept.js"), "// one\n");
			const out = execFileSync(process.execPath, [SCRIPT, "HEAD"], {
				cwd: dir,
				encoding: "utf8",
				stdio: "pipe"
			});
			expect(out).toBe("");
		});
	});

	it("builds a diff naming every line of an untracked file", () => {
		expect(untrackedDiff(["a.js"], () => "x\ny")).toBe(
			"--- a/a.js\n+++ b/a.js\n@@ -0,0 +1,2 @@\n+x\n+y"
		);
	});
});
