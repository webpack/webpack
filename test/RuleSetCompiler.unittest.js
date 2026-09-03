"use strict";

const path = require("path");
const RuleSetCompiler = require("../lib/rules/RuleSetCompiler");

describe("RuleSetCompiler.hasRuleForResource", () => {
	/**
	 * @param {EXPECTED_ANY} rules module rules (may be intentionally malformed)
	 * @param {string=} resource sample resource path
	 * @returns {boolean} whether a rule handles the resource
	 */
	const has = (rules, resource = "/file.css") =>
		RuleSetCompiler.hasRuleForResource(rules, resource);

	it("returns false for missing rules", () => {
		expect(has(undefined)).toBe(false);
		expect(has([])).toBe(false);
	});

	it('skips falsy entries and the `"..."` spread placeholder', () => {
		expect(has([false, null, "...", 0])).toBe(false);
		expect(has(["...", { test: /\.css$/, use: ["css-loader"] }])).toBe(true);
	});

	it("matches a regexp `test` and requires a loader or type", () => {
		expect(has([{ test: /\.css$/ }])).toBe(false);
		expect(has([{ test: /\.css$/, use: ["css-loader"] }])).toBe(true);
		expect(has([{ test: /\.css$/, loader: "css-loader" }])).toBe(true);
		expect(has([{ test: /\.css$/, type: "asset/source" }])).toBe(true);
	});

	it("supports string, function and array conditions", () => {
		expect(has([{ resource: "/file", use: ["x"] }])).toBe(true);
		expect(
			has([
				{ test: (/** @type {string} */ r) => r.endsWith(".css"), use: ["x"] }
			])
		).toBe(true);
		expect(has([{ test: [/\.js$/, /\.css$/], use: ["x"] }])).toBe(true);
		expect(has([{ include: /\.css$/, use: ["x"] }])).toBe(true);
	});

	it("ignores loaders registered for other extensions", () => {
		expect(has([{ test: /\.js$/, use: ["babel-loader"] }])).toBe(false);
		expect(has([{ test: /\.scss$/, use: ["sass-loader"] }])).toBe(false);
	});

	it("ignores enforce:pre/post loaders (no module type)", () => {
		expect(has([{ test: /\.css$/, enforce: "pre", use: ["stylelint"] }])).toBe(
			false
		);
		expect(has([{ test: /\.css$/, enforce: "post", loader: "x" }])).toBe(false);
	});

	it("detects a filename-scoped regexp via the extension probe", () => {
		expect(has([{ test: /source\.css$/, loader: "css-loader" }])).toBe(true);
		expect(has([{ test: /\.module\.css$/, use: ["x"] }])).toBe(true);
		expect(has([{ test: { or: [/\.js$/, /source\.css$/] }, use: ["x"] }])).toBe(
			true
		);
		expect(has([{ test: { and: [/src/, /source\.css$/] }, use: ["x"] }])).toBe(
			true
		);
	});

	it("detects a path-scoped regexp spelling the extension in an alternation", () => {
		expect(
			has([{ test: /[\\/]src[\\/].*\.(css|scss)$/, use: ["css-loader"] }])
		).toBe(true);
		expect(has([{ test: /[\\/]src[\\/].*\.(?:css|less)$/, use: ["x"] }])).toBe(
			true
		);
		expect(has([{ test: /[\\/]src[\\/].*\.(sa|sc|c)ss$/, use: ["x"] }])).toBe(
			true
		);
		expect(has([{ test: /[\\/]src[\\/].*\.(scss|sass)$/, use: ["x"] }])).toBe(
			false
		);
	});

	it("detects a path-scoped regexp spelling the extension in a character class", () => {
		expect(
			has([{ test: /[\\/]src[\\/].*\.[jt]sx?$/, use: ["x"] }], "/file.ts")
		).toBe(true);
		expect(
			has([{ test: /[\\/]src[\\/].*\.[mc]?ts$/, use: ["x"] }], "/file.mts")
		).toBe(true);
		expect(
			has([{ test: /[\\/]src[\\/].*\.[jt]sx?$/, use: ["x"] }], "/file.css")
		).toBe(false);
		// a range spells no fixed extension, so it stays unexpanded
		expect(has([{ test: /[\\/]src[\\/].*\.[a-z]ss$/, use: ["x"] }])).toBe(
			false
		);
	});

	it("reads a capturing, non-capturing or named group the same way", () => {
		expect(has([{ test: /[\\/]src[\\/].*\.(css)$/, use: ["x"] }])).toBe(true);
		// built at runtime: a named group is past this project's `tsc` target
		const named = (/** @type {string} */ alternatives) =>
			new RegExp(`[\\\\/]src[\\\\/].*\\.(?<ext>${alternatives})$`);
		expect(has([{ test: named("css|scss"), use: ["x"] }])).toBe(true);
		expect(has([{ test: named("scss|sass"), use: ["x"] }])).toBe(false);
	});

	it("spells the extension in the case an `i` rule accepts", () => {
		expect(has([{ test: /[\\/]src[\\/].*\.(CSS|SCSS)$/i, use: ["x"] }])).toBe(
			true
		);
		expect(has([{ test: /[\\/]SRC[\\/].*\.Css$/i, use: ["x"] }])).toBe(true);
		// without `i` the rule really does not match `.css`
		expect(has([{ test: /[\\/]src[\\/].*\.(CSS|SCSS)$/, use: ["x"] }])).toBe(
			false
		);
	});

	it("detects an extension spelled behind an optional atom", () => {
		expect(has([{ test: /[\\/]src[\\/].*\.s?css$/, use: ["x"] }])).toBe(true);
		expect(has([{ test: /[\\/]src[\\/].*\.s?ass$/, use: ["x"] }])).toBe(false);
	});

	it("skips escapes and character classes inside an alternation", () => {
		expect(has([{ test: /[\\/]src[\\/].*(\.css|\.less)$/, use: ["x"] }])).toBe(
			true
		);
		expect(
			has([{ test: /[\\/]src[\\/].*(\.[ms]css|\.css)$/, use: ["x"] }])
		).toBe(true);
		expect(
			has([{ test: /[\\/]src[\\/].*(\.[ms]css|\.less)$/, use: ["x"] }])
		).toBe(false);
	});

	it("leaves a pattern generated from a list of paths unexpanded", () => {
		// the test262 harness builds one of these from ~200 paths; expanding it
		// costs 165ms per compilation, so past the length cap only the spelling the
		// pattern carries outright is read
		const paths = Array.from(
			{ length: 60 },
			(_, i) => `(?:case-${i}/fixture\\.js$)`
		).join("|");
		expect(
			has([
				{ test: new RegExp(`${paths}|(?:styles/x\\.(css|scss)$)`), use: ["x"] }
			])
		).toBe(false);
		// the extension is still read where the pattern spells it outright
		expect(
			has([{ test: new RegExp(`${paths}|(?:styles/x\\.css$)`), use: ["x"] }])
		).toBe(true);
	});

	it("expands past a lookaround and stops at the spelling cap", () => {
		expect(
			has([{ test: /[\\/]src[\\/](?!vendor)((.*))\.(css|scss)$/, use: ["x"] }])
		).toBe(true);
		// an expression with more spellings than the cap keeps what it reached
		expect(
			has([
				{
					test: /[\\/]src[\\/](a|b)(c|d)(e|f)(g|h)(i|j)(k|l)(m|n)\.(css|scss)$/,
					use: ["x"]
				}
			])
		).toBe(false);
	});

	it("detects a filename-scoped glob via the extension probe", () => {
		expect(has([{ test: { glob: "**/*.module.css" }, use: ["x"] }])).toBe(true);
		expect(
			has([{ test: { glob: ["**/*.js", "**/*.module.css"] }, use: ["x"] }])
		).toBe(true);
		expect(has([{ test: { glob: "**/*.scss" }, use: ["x"] }])).toBe(false);
	});

	it("detects a path-scoped glob spelling the extension in braces", () => {
		expect(has([{ test: { glob: "src/**/*.{css,scss}" }, use: ["x"] }])).toBe(
			true
		);
		expect(
			has([{ test: { glob: "src/**/*.{ts,tsx}" }, use: ["x"] }], "/file.ts")
		).toBe(true);
		expect(has([{ test: { glob: "src/**/*.{scss,sass}" }, use: ["x"] }])).toBe(
			false
		);
	});

	it("matches a rule-level glob", () => {
		expect(has([{ glob: "**/*.css", use: ["x"] }])).toBe(true);
		expect(has([{ glob: ["**/*.js", "**/*.css"], use: ["x"] }])).toBe(true);
		expect(has([{ glob: "**/*.module.css", use: ["x"] }])).toBe(true);
		expect(has([{ glob: "**/*.scss", use: ["x"] }])).toBe(false);
		expect(has([{ glob: "**/*.css" }])).toBe(false);
	});

	it("does not count a glob that subtracts the extension", () => {
		expect(has([{ glob: ["**/*", "!**/*.css"], use: ["x"] }])).toBe(false);
		expect(has([{ glob: "!**/*.css", use: ["x"] }])).toBe(false);
		expect(
			has([{ test: { glob: ["**/*", "!**/*.module.css"] }, use: ["x"] }])
		).toBe(true);
	});

	it("recurses into oneOf and nested rules", () => {
		expect(
			has([
				{
					test: /\.css$/,
					oneOf: [
						{ resourceQuery: /raw/, type: "asset/source" },
						{ use: ["css-loader"] }
					]
				}
			])
		).toBe(true);
		expect(has([{ test: /\.css$/, rules: [{ use: ["css-loader"] }] }])).toBe(
			true
		);
		expect(has([{ rules: [{ test: /\.css$/, use: ["x"] }] }])).toBe(true);
	});

	it("returns false for a condition that fails to compile", () => {
		expect(has([{ test: {}, use: ["x"] }])).toBe(false);
		expect(has([{ test: 123, use: ["x"] }])).toBe(false);
	});

	it("works for html and wasm resources", () => {
		expect(
			has([{ test: /\.html$/, loader: "html-loader" }], "/file.html")
		).toBe(true);
		expect(has([{ test: /\.wasm$/, use: ["wasm-loader"] }], "/file.wasm")).toBe(
			true
		);
		expect(has([{ test: /\.css$/, use: ["x"] }], "/file.wasm")).toBe(false);
	});
});

describe("RuleSetCompiler glob conditions", () => {
	const compiler = new RuleSetCompiler([]);

	/**
	 * @param {EXPECTED_ANY} condition condition (may be intentionally malformed)
	 * @returns {(value: string) => boolean} matcher
	 */
	const compile = (condition) => {
		const { fn } = compiler.compileCondition("test", condition);
		return /** @type {(value: string) => boolean} */ (fn);
	};

	it("matches the same paths on every OS", () => {
		const match = compile({ glob: "src/**/*.js" });
		expect(match("/project/src/a/b.js")).toBe(true);
		expect(match("C:\\project\\src\\a\\b.js")).toBe(true);
		expect(match("/project/lib/a.js")).toBe(false);
	});

	it("matches a relative pattern at any depth", () => {
		expect(compile({ glob: "*.css" })("/a/b/c.css")).toBe(true);
		expect(compile({ glob: "./src/**" })("/a/src/b.js")).toBe(true);
		expect(compile({ glob: "**/*.css" })("/a.css")).toBe(true);
	});

	it("anchors an absolute pattern", () => {
		const match = compile({ glob: "/project/src/**" });
		expect(match("/project/src/a.js")).toBe(true);
		expect(match("/other/project/src/a.js")).toBe(false);
		expect(compile({ glob: "C:/project/**" })("C:\\project\\a.js")).toBe(true);
	});

	it("supports braces, classes and a list of patterns", () => {
		expect(compile({ glob: "**/*.{js,ts}" })("/a/b.ts")).toBe(true);
		expect(compile({ glob: "**/[*].js" })("/a/*.js")).toBe(true);
		const match = compile({ glob: ["**/*.js", "**/*.css"] });
		expect(match("/a/b.css")).toBe(true);
		expect(match("/a/b.wasm")).toBe(false);
	});

	it("does not let `*` or `**` cross a dot directory", () => {
		expect(compile({ glob: "**/*.js" })("/a/.cache/b.js")).toBe(false);
		expect(compile({ glob: "**/.cache/**" })("/a/.cache/b.js")).toBe(true);
	});

	it("combines with the logical operators", () => {
		const match = compile({
			and: [{ glob: "**/*.js" }, { not: { glob: "**/node_modules/**" } }]
		});
		expect(match("/a/src/b.js")).toBe(true);
		expect(match("/a/node_modules/b/c.js")).toBe(false);
	});

	it("subtracts what a `!` pattern matches", () => {
		const match = compile({ glob: ["**/*.js", "!**/*.test.js"] });
		expect(match("/a/b.js")).toBe(true);
		expect(match("/a/b.test.js")).toBe(false);
	});

	it("subtracts from everything when every pattern is negated", () => {
		const match = compile({ glob: "!**/node_modules/**" });
		expect(match("/a/b.js")).toBe(true);
		expect(match("/a/node_modules/b.js")).toBe(false);
	});

	it("does not match a non-string value", () => {
		expect(
			compiler.compileCondition("test", { glob: "**/*.js" }).fn(undefined)
		).toBe(false);
	});

	it("does not match when empty", () => {
		expect(
			compiler.compileCondition("test", { glob: "**/*.js" }).matchWhenEmpty
		).toBe(false);
	});

	it("throws for an empty, invalid or non-string pattern", () => {
		expect(() => compile({ glob: "" })).toThrow(
			"Expected condition, but got empty thing"
		);
		expect(() => compile({ glob: "**/[z-a].js" })).toThrow(
			"Invalid glob pattern"
		);
		expect(() => compile({ glob: [/\.js$/] })).toThrow(
			"Unexpected object when glob pattern was expected"
		);
		expect(() => compile({ glob: [] })).toThrow(
			"Expected glob pattern, but got empty list"
		);
	});
});

describe("RuleSetCompiler glob conditions against path.matchesGlob", () => {
	// `path.matchesGlob` is Node.js >= 22.5, and Bun ships its own engine under
	// that name — the parity claimed here is with Node's
	const itMatchesGlob =
		typeof path.matchesGlob === "function" && !process.versions.bun
			? it
			: it.skip;

	const PATHS = [
		"h.js",
		"h.css",
		"src/a.js",
		"src/b.test.js",
		"src/nested/c.js",
		"src/nested/deep/d.js",
		"src/.cache/e.js",
		"src/styles/f.module.css",
		"src/styles/g.css",
		"vendor/i.js",
		"node_modules/x/j.js",
		"node_modules/.pnpm/k.js",
		".hidden/l.js",
		"pages/[slug].tsx",
		"a b/m.js",
		"src/ab.js",
		"src/].js"
	];

	// every pattern is written the way `path.matchesGlob` reads it, so both
	// sides get the same string
	const CASES = [
		["**/*.js"],
		["**/*.js", "!**/*.test.js"],
		["**/*.js", "!**/node_modules/**", "!**/vendor/**"],
		["**/src/**/*.js"],
		["**/src/**/*.{css,js}", "!**/*.module.css"],
		["**/*.css", "**/*.tsx"],
		["**/*", "!**/*.js"],
		["**/.pnpm/**"],
		["**/[[]slug].tsx"],
		["**/a b/*.js"],
		["**"],
		["**/src/**", "!**/src/nested/**"],
		["**/deep/*.js", "!**/d.js"],
		["**/[!a]*.js"],
		["**/!(a)*.js"],
		["**/*.js", "!**/src/*.js"]
	];

	itMatchesGlob(
		"selects what the patterns match minus what `!` subtracts",
		() => {
			const compiler = new RuleSetCompiler([]);
			for (const patterns of CASES) {
				const { fn } = compiler.compileCondition("test", { glob: patterns });
				const actual = PATHS.filter((testedPath) =>
					/** @type {(value: string) => boolean} */ (fn)(testedPath)
				);
				/**
				 * @param {string} pattern glob pattern
				 * @param {string} testedPath path
				 * @returns {boolean} matches
				 */
				const matches = (pattern, testedPath) =>
					path.matchesGlob(testedPath, pattern);
				const expected = PATHS.filter(
					(testedPath) =>
						patterns
							.filter((pattern) => !pattern.startsWith("!"))
							.some((pattern) => matches(pattern, testedPath)) &&
						!patterns
							.filter((pattern) => pattern.startsWith("!"))
							.some((pattern) => matches(pattern.slice(1), testedPath))
				);
				expect({ patterns, paths: actual }).toEqual({
					patterns,
					paths: expected
				});
			}
		}
	);
});
