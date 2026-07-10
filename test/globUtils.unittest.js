"use strict";

const path = require("path");
const {
	commonGlobBaseDir,
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

const defaultOptions = {};

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
});
