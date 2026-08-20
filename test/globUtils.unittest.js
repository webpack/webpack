"use strict";

const path = require("path");
const {
	commonGlobBaseDir,
	createPathGlobMatcher,
	extractGlobBaseDir,
	globMatchWithExplicitDot,
	globMatchWithOptions,
	globPatternBaseReachesDir,
	globPatternsAreRecursive,
	globUserRequest,
	normalizePathSeparators,
	normalizePathSeparatorsForPath,
	patternHasExplicitDotFor,
	resolveContextModuleGlobPattern,
	unescapeGlobPath
} = require("../lib/util/globUtils");
const {
	ABSOLUTE_PATH_REGEXP,
	WINDOWS_PATH_SEPARATOR_REGEXP
} = require("../lib/util/identifier");

const defaultOptions = {};

/**
 * The two rules `createPathGlobMatcher` applies before matching.
 * @param {string} pattern glob pattern
 * @returns {string} pattern as `path.matchesGlob` reads it
 */
const effectivePattern = (pattern) => {
	let effective = pattern.replace(WINDOWS_PATH_SEPARATOR_REGEXP, "/");
	while (effective.startsWith("./")) effective = effective.slice(2);
	if (!ABSOLUTE_PATH_REGEXP.test(effective) && !effective.startsWith("**/")) {
		effective = `**/${effective}`;
	}
	return effective;
};

const PARENT_SEGMENT_REGEXP = /(?:^|\/)\.\.(?:\/|$)/;

// Where this matcher stands when the glob tools disagree, and why:
//   `..`     matched literally — resolving it names another file through a
//            symlink, where `dir/link/../b` is the `b` beside the link's target
//   `.` `//` collapsed with a trailing `/`, since all three name the same file
//   `[!a]`   a negated class, as POSIX reads it — picomatch takes `!` for a
//            member unless asked for `{ posix: true }`, which fast-glob does
//   `!(a)`   "not exactly a", so `ab` matches — picomatch and tiny-glob test a
//            prefix instead and reject it
//   `!(@(a))` still a negation — minimatch, and so `path.matchesGlob`, matches
//            every name once a group nests inside the alternatives
//   `{a,[b,c]}` two alternatives, since a `,` in a class is a member — as
//            `braces` and picomatch read it, where bash and minimatch split it
//   `*`      never an empty segment, and `a/**` is not `a` itself
//   case     always sensitive — `path.matchesGlob` reads it off the host, so it
//            ignores case on macOS and Windows
//
// The corpus below therefore stays lowercase and skips `..`, so that comparing
// it against `path.matchesGlob` answers the same on every host.

const PATTERNS = [
	"**/*.css",
	"*.css",
	"src/**/*.js",
	"**/node_modules/**",
	"a/b/c.js",
	"**/*.{js,ts}",
	"[abc].js",
	"[!a]*.js",
	"?.js",
	"a/*/c.js",
	"**",
	"**/*",
	"a**b",
	"*.[jt]s",
	"src/*",
	"src/**",
	"src/**/",
	"**/*.test.js",
	"{a,b}/c.js",
	"a/{b,c}/*.js",
	"*",
	"**/.*",
	".*",
	"**/*.*",
	"a?c",
	"[a-c]*.js",
	"[!a-c]*.js",
	"**/a/**/b.js",
	"a/**",
	"a/**/**",
	"*/*",
	"x[*].js",
	"**/[[]a].js",
	"***",
	"**/**",
	"**/**/*.js",
	"/a/**",
	"/a/**/",
	"/a/b/*.js",
	"/**/*.js",
	"/**",
	"/*",
	"/a/*",
	"/a/**/*",
	"/a/*/*/d.js",
	"/a/**/b/*.{js,mjs}",
	"/a/.*/b.js",
	"/a/[!.]*/b.js",
	"/a/b?c/*.js",
	"/a/b.js",
	"/a/b.js/",
	"/a/{b,c}",
	"/a/[]].js",
	"/a/[!]].js",
	"/a/x{1,2}y/*.js",
	"/a/**/.hidden/*",
	"/a/./b.js",
	"**/{a,{b,c}}/*.js",
	"**/*[0-9].js",
	"**/[^a]b.js",
	"**/*?.js",
	"**/@scope/**",
	"**/.pnpm/**",
	".cache/**",
	"{,a}/b.js",
	"?/?/?.js",
	"C:/a/**/*.js",
	"C:\\a\\**\\*.js",
	"/a/b\\c/*.js",
	"**/!(a).js",
	"**/x!(a).js",
	"**/!(a|b)*.js",
	"**/!(*.d).ts",
	"**/+(a|b).js",
	"**/+(a|b)/!(c).js",
	"**/*(ab).js",
	"**/*(a|b|c).js",
	"**/?(a|b)c.js",
	"**/?(x)y?(z).js",
	"**/@(a|b)c.js",
	"**/@(a|b)*.js",
	"**/@(a|b)/*.js",
	"**/@(a|).js",
	"**/*(a).b",
	"**/+([a-c]|z).js",
	"**/+(a.js",
	"**/!(a.js",
	"**/x[?(]y.js",
	"!(x)/a",
	"*(a)/b",
	"?(a)/b",
	"@(a|)/a",
	"+(a|)/b",
	"a/!(x)",
	"**/a?c/x.js",
	"/a/./b.js",
	"**/a/../b.js",
	"**/./*.js",
	"**/../b.js",
	"a//b.js"
];

const PATHS = [
	"",
	"a",
	"ab",
	"abc",
	"aXXb",
	"a*b",
	"a.js",
	"b.js",
	"ab.js",
	"a.ts",
	"c.js",
	"abc.js",
	"x*.js",
	"[a].js",
	"a.css",
	"a/b",
	"a/b/",
	"a/b.css",
	"a/b/c.css",
	"a/b/c.js",
	"a/b/b.js",
	"a/x/b.js",
	"a/b/c/",
	"a/.b/c.js",
	"a//b.css",
	"a/node_modules/x.js",
	"node_modules/x/y.js",
	".hidden",
	".hidden/a.js",
	".cache/a.js",
	"src/",
	"src/a.js",
	"src/a/b.js",
	"src/a/b/c.js",
	"/",
	"/a",
	"/a/",
	"/a.css",
	"/a/b",
	"/a/b/",
	"/a/b.css",
	"/a/b.js",
	"/a/b.js/",
	"/a/.b",
	"/.a/b",
	"/a/b1.js",
	"/a/bb.js",
	"/a/].js",
	"/a/x1y/b.js",
	"/a/bxc/d.js",
	"/a/b/c.js",
	"/a/b/c/d.js",
	"/a/b/c/d/e/f.js",
	"/a/x/b/c.mjs",
	"/a/.x/b.js",
	"/a/b/.hidden/x.js",
	"/a//b/c.js",
	"/a/node_modules/b/c.js",
	"/a/.pnpm/x/y.js",
	"/a/@scope/x/y.js",
	"/.cache/a.js",
	"/src/a.js",
	"/a/b\\c/d.js",
	"C:/a/b/c.js",
	"C:\\a\\b\\c.js",
	"x/a.js",
	"x/ab.js",
	"x/aa.js",
	"x/abab.js",
	"x/b.js",
	"x/bc.js",
	"x/c.js",
	"x/ac.js",
	"x/xa.js",
	"x/xab.js",
	"x/xb.js",
	"x/xyz.js",
	"x/y.js",
	"x/.js",
	"x/a.d.ts",
	"x/e.ts",
	"x/a/c.js",
	"x/a/d.js",
	"x/a/y.js",
	"/b",
	"a/",
	"b/a",
	"a/c/x.js",
	"x/bb.js",
	"x/].js",
	"/a/./b.js",
	"/a/../a/b.js",
	"/a/x/../b.js",
	"/a/b/..",
	"a/b//",
	"//a/b",
	"/a/b.js//",
	"./a.js"
];

describe("globUtils", () => {
	describe("extractGlobBaseDir", () => {
		it("skips escaped metacharacters", () => {
			expect(extractGlobBaseDir("./fixtures/a\\[b\\]/file")).toBe(
				"./fixtures/a\\[b\\]/"
			);
			expect(extractGlobBaseDir("./fixtures/a\\[b\\]/**/*.js")).toBe(
				"./fixtures/a\\[b\\]/"
			);
			expect(extractGlobBaseDir("./fixtures/file\\*.js")).toBe("./fixtures/");
			expect(extractGlobBaseDir("./fixtures/directory\\?1/**/*.js")).toBe(
				"./fixtures/directory\\?1/"
			);
		});
	});

	describe("normalizePathSeparators", () => {
		it("preserves glob escapes", () => {
			expect(normalizePathSeparators("./fixtures/a\\[b\\]/**/*.js")).toBe(
				"./fixtures/a\\[b\\]/**/*.js"
			);
			expect(normalizePathSeparators("./fixtures/file\\*.js")).toBe(
				"./fixtures/file\\*.js"
			);
			expect(normalizePathSeparators("./fixtures/file\\?.js")).toBe(
				"./fixtures/file\\?.js"
			);
			expect(normalizePathSeparators("C:\\fixtures\\a\\[b\\]\\file.js")).toBe(
				"C:/fixtures/a\\[b\\]/file.js"
			);
			expect(normalizePathSeparators("C:\\repo\\src/*.js")).toBe(
				"C:/repo/src/*.js"
			);
		});
	});

	describe("normalizePathSeparatorsForPath", () => {
		it("treats glob chars as literals", () => {
			expect(
				normalizePathSeparatorsForPath("C:\\fixtures\\a\\[b]\\file.js")
			).toBe("C:/fixtures/a/[b]/file.js");
			expect(
				normalizePathSeparatorsForPath("C:\\fixtures\\a\\{b}\\file.js")
			).toBe("C:/fixtures/a/{b}/file.js");
		});
	});

	describe("unescapeGlobPath", () => {
		it("restores literal path segments", () => {
			expect(unescapeGlobPath("./fixtures/a\\[b\\]/")).toBe("./fixtures/a[b]/");
			expect(unescapeGlobPath("./fixtures/file\\*.js")).toBe(
				"./fixtures/file*.js"
			);
			expect(unescapeGlobPath("./fixtures/directory\\?1/")).toBe(
				"./fixtures/directory?1/"
			);
		});
	});

	describe("globMatchWithOptions", () => {
		it("does not match path separators with a single star", () => {
			expect(
				globMatchWithOptions("./other/*.js", "./other/x.js", defaultOptions)
			).toBe(true);
			expect(
				globMatchWithOptions("./other/*.js", "./other/sub/x.js", defaultOptions)
			).toBe(false);
			expect(
				globMatchWithOptions(
					"./pages/*/index.js",
					"./pages/a/b/index.js",
					defaultOptions
				)
			).toBe(false);
		});

		it("matches nested path segments with globstar", () => {
			expect(
				globMatchWithOptions("./dir/**/*.js", "./dir/a/b/c.js", defaultOptions)
			).toBe(true);
			expect(
				globMatchWithOptions("./dir/**/*.js", "./dir/c.js", defaultOptions)
			).toBe(true);
		});

		it("matches a single non-separator character with question mark", () => {
			expect(globMatchWithOptions("./d/?.js", "./d/a.js", defaultOptions)).toBe(
				true
			);
			expect(
				globMatchWithOptions("./d/?.js", "./d/日.js", defaultOptions)
			).toBe(true);
			expect(globMatchWithOptions("./a?c", "./a/c", defaultOptions)).toBe(
				false
			);
		});

		// A `,` inside a character class is a member, not a separator, so the
		// alternatives of `{a,[b,c]}` are `a` and `[b,c]`. That is what `braces`,
		// and so micromatch, picomatch and fast-glob, read — `import.meta.glob`
		// and `require.context` patterns are written against those. bash expands
		// braces textually before globbing, and minimatch (so `path.matchesGlob`)
		// follows it, splitting the class into `[b` and `c]`.
		it("keeps a `,` inside a character class out of the brace split", () => {
			for (const str of ["a", "b", "c", ","]) {
				expect(
					globMatchWithOptions("{a,[b,c]}.js", `${str}.js`, defaultOptions)
				).toBe(true);
			}
			for (const str of ["[b", "c]"]) {
				expect(
					globMatchWithOptions("{a,[b,c]}.js", `${str}.js`, defaultOptions)
				).toBe(false);
			}
		});

		it("expands nested brace alternatives", () => {
			expect(
				globMatchWithOptions("a.{js,{ts,tsx}}", "a.ts", defaultOptions)
			).toBe(true);
			expect(
				globMatchWithOptions("a.{js,{ts,tsx}}", "a.tsx", defaultOptions)
			).toBe(true);
			expect(
				globMatchWithOptions("a.{js,{ts,tsx}}", "a.jsx", defaultOptions)
			).toBe(false);
			expect(globMatchWithOptions("{a,{b,c},d}/x", "d/x", defaultOptions)).toBe(
				true
			);
			expect(globMatchWithOptions("{a,{b,c},d}/x", "c/x", defaultOptions)).toBe(
				true
			);
			expect(globMatchWithOptions("{a,{b,c},d}/x", "e/x", defaultOptions)).toBe(
				false
			);
		});

		it("treats unmatched braces as literals", () => {
			expect(globMatchWithOptions("./a{b.js", "./a{b.js", defaultOptions)).toBe(
				true
			);
			expect(globMatchWithOptions("./a}b.js", "./a}b.js", defaultOptions)).toBe(
				true
			);
		});

		it("supports character classes without crossing separators", () => {
			expect(globMatchWithOptions("a[bc]d", "abd", defaultOptions)).toBe(true);
			expect(globMatchWithOptions("a[a-z]c", "amc", defaultOptions)).toBe(true);
			expect(globMatchWithOptions("a[!b]c", "aXc", defaultOptions)).toBe(true);
			expect(globMatchWithOptions("a[!b]c", "abc", defaultOptions)).toBe(false);
			expect(globMatchWithOptions("a[!b]c", "a/c", defaultOptions)).toBe(false);
		});

		it("matches escaped star and question as literals", () => {
			expect(
				globMatchWithOptions(
					"./fixtures/file\\*.js",
					"./fixtures/file*.js",
					defaultOptions
				)
			).toBe(true);
			expect(
				globMatchWithOptions(
					"./fixtures/file\\*.js",
					"./fixtures/file-a.js",
					defaultOptions
				)
			).toBe(false);
			expect(
				globMatchWithOptions(
					"./fixtures/directory\\?1/**/*.js",
					"./fixtures/directory?1/index.js",
					defaultOptions
				)
			).toBe(true);
			expect(
				globMatchWithOptions(
					"./fixtures/directory\\?1/**/*.js",
					"./fixtures/directory-a1/index.js",
					defaultOptions
				)
			).toBe(false);
		});

		it("does not let single * match across path separators", () => {
			expect(
				globMatchWithOptions("./other/*.js", "./other/foo.js", defaultOptions)
			).toBe(true);
			expect(
				globMatchWithOptions(
					"./other/*.js",
					"./other/sub/foo.js",
					defaultOptions
				)
			).toBe(false);
		});
	});

	describe("globPatternsAreRecursive", () => {
		it("does not treat bracket path segments as recursive patterns", () => {
			const root = path.resolve("test/proj/[app]");
			const patterns = [resolveContextModuleGlobPattern("./*.js", root, root)];
			expect(globPatternsAreRecursive(patterns, `${root}/`)).toBe(false);
		});

		it("does not treat parenthesis path segments as recursive patterns", () => {
			const root = path.resolve("test/proj/(group)");
			const patterns = [resolveContextModuleGlobPattern("./*.js", root, root)];
			expect(globPatternsAreRecursive(patterns, `${root}/`)).toBe(false);
		});

		it("detects recursive patterns from unescaped suffix slashes", () => {
			const root = path.resolve("test/cases/context/import-meta-glob");
			const patterns = [
				resolveContextModuleGlobPattern("./pages/*/index.js", root, root)
			];
			expect(globPatternsAreRecursive(patterns, `${root}/`)).toBe(true);
		});
	});

	describe("patternHasExplicitDotFor", () => {
		const baseDir = "./fixtures/";

		it("allows wildcard dot segments when pattern is explicit", () => {
			expect(
				patternHasExplicitDotFor(
					"./fixtures/**/.*",
					baseDir,
					"./fixtures/.env",
					defaultOptions
				)
			).toBe(true);
			expect(
				patternHasExplicitDotFor(
					"./fixtures/**/.*/index.js",
					baseDir,
					"./fixtures/.cache/index.js",
					defaultOptions
				)
			).toBe(true);
			expect(
				patternHasExplicitDotFor(
					"./fixtures/**/index.js",
					baseDir,
					"./fixtures/.cache/index.js",
					defaultOptions
				)
			).toBe(false);
		});

		it("respects case insensitive matching", () => {
			expect(
				patternHasExplicitDotFor(
					"./fixtures/**/.ENV",
					baseDir,
					"./fixtures/.env",
					{ caseSensitive: false, requireLiteralLeadingDot: true }
				)
			).toBe(true);
		});
	});

	describe("globMatchWithExplicitDot", () => {
		it("treats windows path separators as separators", () => {
			expect(
				globMatchWithExplicitDot(
					"C:/repo/escape/**/glob.js",
					"C:\\repo\\escape\\[brackets]\\glob.js",
					"C:/repo/escape/",
					defaultOptions
				)
			).toBe(true);
			expect(
				globMatchWithExplicitDot(
					"C:/repo/escape/**/glob.js",
					"C:\\repo\\escape\\{curlies}\\glob.js",
					"C:/repo/escape/",
					defaultOptions
				)
			).toBe(true);
		});

		it("requires literal dot segments", () => {
			expect(
				globMatchWithExplicitDot(
					"./fixtures/.*.js",
					"./fixtures/.hidden.js",
					"./fixtures/",
					defaultOptions
				)
			).toBe(true);
			expect(
				globMatchWithExplicitDot(
					"./fixtures/*.js",
					"./fixtures/.hidden.js",
					"./fixtures/",
					defaultOptions
				)
			).toBe(false);
		});
	});

	describe("resolveContextModuleGlobPattern", () => {
		it("resolves custom base relative patterns", () => {
			const baseContext = path.join(
				path.resolve("test/cases"),
				"context/import-meta-glob/base"
			);
			const resolved = resolveContextModuleGlobPattern(
				"../dir/*.js",
				baseContext,
				baseContext
			);
			expect(resolved.absolutePattern).toBe(
				`${path.resolve("test/cases/context/import-meta-glob")}/dir/*.js`
			);
			expect(resolved.base).toBe("../dir/");
			expect(resolved.absoluteBase).toBe(
				`${path.resolve("test/cases/context/import-meta-glob")}/dir/`
			);
		});

		it("preserves escaped brackets in absolute pattern", () => {
			const brackets = path.resolve(
				"test/cases/context/import-meta-glob/escape/[brackets]"
			);
			const resolved = resolveContextModuleGlobPattern(
				"./mod/**/*.js",
				brackets,
				brackets
			);
			expect(resolved.absolutePattern).toBe(
				`${brackets.replace("[brackets]", "\\[brackets\\]")}/mod/**/*.js`
			);
			expect(resolved.absoluteBase).toBe(`${brackets}/mod/`);
		});
	});

	describe("globUserRequest", () => {
		it("returns user-facing keys for matched files", () => {
			const brackets = path.resolve(
				"test/cases/context/import-meta-glob/escape/[brackets]"
			);
			const patterns = [
				resolveContextModuleGlobPattern("./mod/**/*.js", brackets, brackets)
			];
			const mod = path.join(brackets, "mod/index.js");
			expect(globUserRequest(patterns, mod, false)).toBe("./mod/index.js");
		});

		it("matches unicode filenames", () => {
			const root = path.resolve("test/cases/context/import-meta-glob/unicode");
			const patterns = [resolveContextModuleGlobPattern("./*.js", root, root)];
			const file = path.join(root, "日.js");
			expect(globUserRequest(patterns, file, false)).toBe("./日.js");
		});

		it("honors the caseSensitive flag", () => {
			const root = path.resolve("test/cases/context/import-meta-glob/dir");
			const patterns = [resolveContextModuleGlobPattern("./*.JS", root, root)];
			const file = path.join(root, "foo.js");
			expect(globUserRequest(patterns, file, false, true)).toBeUndefined();
			expect(globUserRequest(patterns, file, false, false)).toBe("./foo.js");
		});
	});

	describe("globPatternBaseReachesDir", () => {
		const root = path.resolve("test/cases/context/import-meta-glob");

		it("is true when a dir is within a positive pattern's literal base", () => {
			const patterns = [
				resolveContextModuleGlobPattern("./.foo/*.js", root, root),
				resolveContextModuleGlobPattern("./dir/node_modules/**", root, root)
			];
			expect(globPatternBaseReachesDir(patterns, path.join(root, ".foo"))).toBe(
				true
			);
			expect(
				globPatternBaseReachesDir(patterns, path.join(root, "dir/node_modules"))
			).toBe(true);
		});

		it("is false for dirs only reachable through a wildcard segment", () => {
			const patterns = [
				resolveContextModuleGlobPattern("./**/*.js", root, root)
			];
			expect(globPatternBaseReachesDir(patterns, path.join(root, ".foo"))).toBe(
				false
			);
		});

		it("ignores negative patterns", () => {
			const patterns = [
				resolveContextModuleGlobPattern("!./.foo/*.js", root, root)
			];
			expect(globPatternBaseReachesDir(patterns, path.join(root, ".foo"))).toBe(
				false
			);
		});
	});

	describe("commonGlobBaseDir", () => {
		it("finds common base across patterns", () => {
			const root = path.resolve("test/cases/context/import-meta-glob");
			const patterns = [
				resolveContextModuleGlobPattern("./dir/*.js", root, root),
				resolveContextModuleGlobPattern("./other/*.js", root, root)
			];
			expect(commonGlobBaseDir(patterns, root)).toBe(`${root}/`);
		});

		// Vite #22170 / getCommonBase: a shared name prefix (foo vs foobar) must
		// not collapse the common base into the shorter directory.
		it("does not treat a name prefix as a shared directory", () => {
			const root = path.resolve("test/cases/context/import-meta-glob-parity");
			const patterns = [
				resolveContextModuleGlobPattern("./pfx/foo/*.js", root, root),
				resolveContextModuleGlobPattern("./pfx/foobar/*.js", root, root)
			];
			expect(commonGlobBaseDir(patterns, root)).toBe(`${root}/pfx/`);
		});
	});

	describe("parse and factory resolve consistency", () => {
		it("matches when resolving with compilerContext vs baseDir", () => {
			const compilerContext = path.resolve("test/cases");
			const globContext = path.join(
				compilerContext,
				"context/import-meta-glob"
			);
			const patterns = [
				"/context/import-meta-glob/dir/*.js",
				"./other/**/*.js",
				"!**/ignored.js"
			];
			const resolvedAtParse = patterns.map((pattern) =>
				resolveContextModuleGlobPattern(pattern, globContext, compilerContext)
			);
			const baseDir = commonGlobBaseDir(resolvedAtParse, globContext);
			const resolvedAtFactory = patterns.map((pattern) =>
				resolveContextModuleGlobPattern(pattern, globContext, baseDir)
			);

			expect(
				resolvedAtFactory.map((pattern) => pattern.absolutePattern)
			).toEqual(resolvedAtParse.map((pattern) => pattern.absolutePattern));
			expect(resolvedAtFactory.map((pattern) => pattern.absoluteBase)).toEqual(
				resolvedAtParse.map((pattern) => pattern.absoluteBase)
			);
		});
	});

	// `path.matchesGlob` is Node.js >= 22.5
	const describeMatchesGlob =
		typeof path.matchesGlob === "function" ? describe : describe.skip;

	/**
	 * @param {string} pattern glob pattern
	 * @returns {(str: string) => boolean} matcher
	 */
	const createMatcher = (pattern) => {
		const match = createPathGlobMatcher(pattern);
		if (match === null) throw new Error(`${pattern} did not compile`);
		return match;
	};

	describeMatchesGlob("createPathGlobMatcher", () => {
		it("matches every pattern the way path.matchesGlob does", () => {
			/** @type {string[]} */
			const mismatches = [];
			for (const pattern of PATTERNS) {
				const match = createMatcher(pattern);
				for (const testedPath of PATHS) {
					// `..` is the one construct we read differently, above
					if (
						PARENT_SEGMENT_REGEXP.test(pattern) ||
						PARENT_SEGMENT_REGEXP.test(testedPath)
					) {
						continue;
					}
					// `\` is a separator here, which is how `path.win32` reads it
					const platform = testedPath.includes("\\") ? path.win32 : path.posix;
					const expected = platform.matchesGlob(
						testedPath,
						effectivePattern(pattern)
					);
					const actual = match(testedPath);
					if (actual !== expected) {
						mismatches.push(
							`${JSON.stringify(pattern)} vs ${JSON.stringify(
								testedPath
							)}: expected ${expected}, got ${actual}`
						);
					}
				}
			}
			expect(mismatches).toEqual([]);
		});

		it("matches case-sensitively whatever the host is", () => {
			expect(createMatcher("**/*.css")("a/b.css")).toBe(true);
			expect(createMatcher("**/*.css")("a/B.CSS")).toBe(false);
			expect(createMatcher("**/*.CSS")("a/b.css")).toBe(false);
			expect(createMatcher("/a/**")("/A/b.js")).toBe(false);
		});

		it("drops the `.` and empty segments of both sides", () => {
			expect(createMatcher("/a/b.js")("/a/./b.js")).toBe(true);
			expect(createMatcher("/a/./b.js")("/a/./b.js")).toBe(true);
			expect(createMatcher("**/*.js")("/a/./b.js")).toBe(true);
			expect(createMatcher("**/a/b/c.js")("/a//b/c.js")).toBe(true);
			// a path of nothing but `.` segments is the context directory
			expect(createMatcher(".")("./")).toBe(true);
			expect(createMatcher(".")("./.")).toBe(true);
			expect(path.posix.matchesGlob("./.", ".")).toBe(true);
		});

		it("matches a `..` segment literally, where path.matchesGlob resolves it", () => {
			// `dir/link/../b.js` is `b.js` beside the symlink's target, not
			// `dir/b.js`, so resolving `..` in a matcher answers about a file the
			// caller did not name
			expect(createMatcher("/a/b.js")("/a/../a/b.js")).toBe(false);
			expect(createMatcher("**/a/../b.js")("/b.js")).toBe(false);
			expect(path.posix.matchesGlob("/a/../a/b.js", "/a/b.js")).toBe(true);
			// what the pattern says is still what it matches
			expect(createMatcher("/a/../a/b.js")("/a/../a/b.js")).toBe(true);
		});

		it("supports extended globs", () => {
			expect(createMatcher("**/+(a|b).js")("x/ab.js")).toBe(true);
			expect(createMatcher("**/@(a|b).js")("x/ab.js")).toBe(false);
			expect(createMatcher("**/?(a)b.js")("x/b.js")).toBe(true);
			expect(createMatcher("**/*(ab).js")("x/abab.js")).toBe(true);
			expect(createMatcher("**/!(a).js")("x/ab.js")).toBe(true);
			expect(createMatcher("**/!(a).js")("x/a.js")).toBe(false);
		});

		// `path.matchesGlob` compiles through minimatch, which stops negating a
		// `!(…)` whose alternatives hold a group: it answers true for every name,
		// the excluded ones included. glibc `fnmatch(3)`, bash and picomatch read
		// these the way this matcher does.
		it("nests extended globs, where path.matchesGlob stops negating", () => {
			expect(createMatcher("**/@(a|@(b|c)).js")("x/b.js")).toBe(true);
			expect(createMatcher("**/@(a|@(b|c)).js")("x/d.js")).toBe(false);
			expect(createMatcher("**/!(a|@(b|c)).js")("x/d.js")).toBe(true);
			expect(createMatcher("**/!(a|@(b|c)).js")("x/b.js")).toBe(false);
			expect(createMatcher("**/!(@(a|b)).js")("x/a.js")).toBe(false);
			expect(path.posix.matchesGlob("x/b.js", "**/!(a|@(b|c)).js")).toBe(true);
			expect(path.posix.matchesGlob("x/a.js", "**/!(@(a|b)).js")).toBe(true);
		});

		it("lets a group that quantifies match an empty path segment", () => {
			// `!(…)`, `*(…)` and `?(…)` match nothing, so they match an empty
			// segment; `@(a|)` and a bare `*` do not
			expect(createMatcher("!(x)/a")("/a")).toBe(true);
			expect(createMatcher("*(a)/b")("/b")).toBe(true);
			expect(createMatcher("?(a)/b")("/b")).toBe(true);
			expect(createMatcher("a/!(x)")("a/")).toBe(true);
			expect(createMatcher("@(a|)/a")("/a")).toBe(false);
			expect(createMatcher("*/a")("/a")).toBe(false);
		});

		// each expectation below was checked against POSIX `fnmatch(3)` with
		// FNM_PATHNAME | FNM_PERIOD | FNM_EXTMATCH
		it("follows the POSIX reading of classes, `?` and extended globs", () => {
			// a `!`/`^` class is negated, a leading `]` is a member
			expect(createMatcher("**/[!a]b.js")("x/bb.js")).toBe(true);
			expect(createMatcher("**/[!a]b.js")("x/ab.js")).toBe(false);
			expect(createMatcher("**/[^a]b.js")("x/bb.js")).toBe(true);
			expect(createMatcher("**/[]].js")("x/].js")).toBe(true);
			// and stays a member while a group or a brace list is scanned past it
			expect(createMatcher("**/@([]|]|c).js")("x/|.js")).toBe(true);
			expect(createMatcher("**/@([]|]|c).js")("x/c.js")).toBe(true);
			expect(createMatcher("**/{a,[],]b}.js")("x/]b.js")).toBe(true);
			expect(createMatcher("**/{a,[],]b}.js")("x/,b.js")).toBe(true);
			expect(createMatcher("**/{a,[b,c]}.js")("x/,.js")).toBe(true);
			// `?` is one character, never a separator
			expect(createMatcher("**/a?c/x.js")("a/c/x.js")).toBe(false);
			// `!(a)` is "not exactly a", so it matches `ab`
			expect(createMatcher("**/!(a).js")("x/ab.js")).toBe(true);
			expect(createMatcher("**/!(a).js")("x/a.js")).toBe(false);
			// a dot segment needs a literal dot in the pattern, unless a group
			// that matched nothing put one there
			expect(createMatcher("**/x/*/y.js")("x/.d/y.js")).toBe(false);
			expect(createMatcher("**/x/.*/y.js")("x/.d/y.js")).toBe(true);
			expect(createMatcher("**/*(a).b")("x/.b")).toBe(true);
		});

		it("reads a `\\` in the pattern as a separator on every platform", () => {
			const match = createMatcher("/a\\b\\**\\*.js");
			expect(match("/a/b/c/d.js")).toBe(true);
			expect(match("/a/b/d.js")).toBe(true);
			expect(path.win32.matchesGlob("\\a\\b\\c\\d.js", "/a/b/**/*.js")).toBe(
				true
			);
		});

		it("matches a relative pattern at any depth", () => {
			const match = createMatcher("src/**/*.js");
			expect(match("/project/src/a/b.js")).toBe(true);
			expect(match("src/a.js")).toBe(true);
			// the same pattern is anchored for `path.matchesGlob`
			expect(path.posix.matchesGlob("/project/src/a/b.js", "src/**/*.js")).toBe(
				false
			);
		});

		it("returns null for an un-compilable pattern", () => {
			expect(createPathGlobMatcher("**/[z-a].js")).toBeNull();
		});
	});
});
