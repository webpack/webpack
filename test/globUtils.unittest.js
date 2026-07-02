"use strict";

const path = require("path");
const {
	commonGlobBaseDir,
	extractGlobBaseDir,
	globMatchWithExplicitDot,
	globMatchWithOptions,
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
