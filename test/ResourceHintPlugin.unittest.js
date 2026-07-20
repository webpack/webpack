"use strict";

const ResourceHintPlugin = require("../lib/prefetch/ResourceHintPlugin");

describe("ResourceHintPlugin", () => {
	describe("matchUrlHints", () => {
		it("returns {} for undefined/empty rules", () => {
			expect(ResourceHintPlugin.matchUrlHints(undefined, "a.png")).toEqual({});
			expect(ResourceHintPlugin.matchUrlHints([], "a.png")).toEqual({});
		});

		it("skips default-excluded extensions (webmanifest/pdf/txt)", () => {
			const rules = [{ preload: true, as: "font" }];
			expect(
				ResourceHintPlugin.matchUrlHints(rules, "site.webmanifest")
			).toEqual({});
			expect(ResourceHintPlugin.matchUrlHints(rules, "brochure.pdf")).toEqual(
				{}
			);
			expect(ResourceHintPlugin.matchUrlHints(rules, "robots.txt")).toEqual({});
			expect(
				ResourceHintPlugin.matchUrlHints(rules, "site.webmanifest?v=1")
			).toEqual({});
		});

		it("catch-all rule (no test/include/exclude) matches every request", () => {
			const rules = [{ preload: true, fetchPriority: "high", as: "image" }];
			expect(ResourceHintPlugin.matchUrlHints(rules, "any/file.jpg")).toEqual({
				preload: true,
				fetchPriority: "high",
				as: "image"
			});
		});

		it("test/include/exclude scope a rule", () => {
			const rules = [
				{ test: /\.woff2$/, preload: true, as: "font" },
				{ include: /\/hero\//, preload: true, as: "image" },
				{ test: /\.png$/, exclude: /\/hero\//, prefetch: true }
			];
			expect(
				ResourceHintPlugin.matchUrlHints(rules, "fonts/inter.woff2")
			).toEqual({
				preload: true,
				as: "font"
			});
			expect(
				ResourceHintPlugin.matchUrlHints(rules, "src/hero/banner.jpg")
			).toEqual({
				preload: true,
				as: "image"
			});
			expect(ResourceHintPlugin.matchUrlHints(rules, "thumbs/a.png")).toEqual({
				prefetch: true
			});
			// hero/*.png is excluded by rule 3 (matched only by rule 2)
			expect(
				ResourceHintPlugin.matchUrlHints(rules, "src/hero/pic.png")
			).toEqual({
				preload: true,
				as: "image"
			});
		});

		it("later matching rule overrides earlier one field-by-field", () => {
			const rules = [
				{ prefetch: true, fetchPriority: "low", as: "image" },
				{ test: /\.woff2$/, preload: true, as: "font", type: "font/woff2" }
			];
			// The catch-all sets prefetch+low+image; the woff2 rule overrides
			// preload/as, and adds type — but keeps the inherited fetchPriority.
			expect(ResourceHintPlugin.matchUrlHints(rules, "inter.woff2")).toEqual({
				prefetch: true,
				preload: true,
				fetchPriority: "low",
				as: "font",
				type: "font/woff2"
			});
		});

		it("supports all descriptor fields (as / type / media)", () => {
			const rules = [
				{
					test: /\.jpg$/,
					preload: true,
					as: "image",
					type: "image/jpeg",
					media: "(min-width: 800px)"
				}
			];
			expect(ResourceHintPlugin.matchUrlHints(rules, "a.jpg")).toEqual({
				preload: true,
				as: "image",
				type: "image/jpeg",
				media: "(min-width: 800px)"
			});
		});
	});

	describe("applyDefaults", () => {
		it("sets each field from the defaults onto the dep in place", () => {
			const dep = /** @type {EXPECTED_ANY} */ ({});
			ResourceHintPlugin.applyDefaults(dep, {
				preload: true,
				fetchPriority: "high",
				as: "font",
				type: "font/woff2",
				media: "(min-width: 800px)"
			});
			expect(dep).toEqual({
				preload: true,
				fetchPriority: "high",
				asAttribute: "font",
				typeAttribute: "font/woff2",
				mediaAttribute: "(min-width: 800px)"
			});
		});

		it("prefetch defaults set prefetch, not preload", () => {
			const dep = /** @type {EXPECTED_ANY} */ ({});
			ResourceHintPlugin.applyDefaults(dep, { prefetch: true });
			expect(dep.prefetch).toBe(true);
			expect(dep.preload).toBeUndefined();
		});

		it("empty defaults is a no-op", () => {
			const dep = /** @type {EXPECTED_ANY} */ ({});
			ResourceHintPlugin.applyDefaults(dep, {});
			expect(dep).toEqual({});
		});
	});

	describe("applyParsedHints", () => {
		it("sets fields set on the parsed comment options", () => {
			const dep = /** @type {EXPECTED_ANY} */ ({});
			ResourceHintPlugin.applyParsedHints(dep, {
				preload: true,
				fetchPriority: "high",
				as: "image",
				type: "image/webp",
				media: "screen"
			});
			expect(dep).toEqual({
				preload: true,
				fetchPriority: "high",
				asAttribute: "image",
				typeAttribute: "image/webp",
				mediaAttribute: "screen"
			});
		});

		it("magic-comment `false` overrides a rule-set flag", () => {
			// This mirrors the precedence guarantee: an explicit `webpackPrefetch:
			// false` must be able to opt out of a project-wide rule default.
			const dep = /** @type {EXPECTED_ANY} */ ({
				prefetch: true,
				preload: true
			});
			ResourceHintPlugin.applyParsedHints(dep, {
				prefetch: false,
				preload: false
			});
			expect(dep.prefetch).toBe(false);
			expect(dep.preload).toBe(false);
		});
	});

	describe("applyResourceHints", () => {
		// A minimal fake `module` with `addWarning` so parseResourceHintOptions
		// doesn't blow up on invalid comment values.
		const fakeModule = /** @type {EXPECTED_ANY} */ ({ addWarning: () => {} });
		const loc = /** @type {EXPECTED_ANY} */ ({});

		it("applies rule defaults, then magic-comment overrides", () => {
			const dep = /** @type {EXPECTED_ANY} */ ({});
			ResourceHintPlugin.applyResourceHints(
				dep,
				[{ test: /\.woff2$/, prefetch: true, as: "font" }],
				"inter.woff2",
				{ webpackPreload: true, webpackFetchPriority: "high" },
				fakeModule,
				loc
			);
			// `as` from the rule survives, `preload` from the comment wins over
			// the rule's `prefetch`, and the comment's fetchPriority applies.
			expect(dep.preload).toBe(true);
			expect(dep.prefetch).toBe(true); // rule still set it before the comment ran
			expect(dep.asAttribute).toBe("font");
			expect(dep.fetchPriority).toBe("high");
		});

		it("without comment options only applies rule defaults", () => {
			const dep = /** @type {EXPECTED_ANY} */ ({});
			ResourceHintPlugin.applyResourceHints(
				dep,
				[{ test: /\.woff2$/, preload: true, as: "font" }],
				"inter.woff2",
				null,
				fakeModule,
				loc
			);
			expect(dep).toEqual({ preload: true, asAttribute: "font" });
		});

		it("no rules + no comments = no mutation", () => {
			const dep = /** @type {EXPECTED_ANY} */ ({});
			ResourceHintPlugin.applyResourceHints(
				dep,
				undefined,
				"a.png",
				undefined,
				fakeModule,
				loc
			);
			expect(dep).toEqual({});
		});
	});

	describe("getCompilationResolver fallback", () => {
		it("returns an empty resolver when no plugin instance ran on this compilation", () => {
			const resolver = ResourceHintPlugin.getCompilationResolver(
				/** @type {EXPECTED_ANY} */ ({})
			);
			expect(resolver.hints).toBeUndefined();
			expect(resolver.getHtmlHinted("any")).toEqual([]);
			expect(resolver.isHtmlHinted(/** @type {EXPECTED_ANY} */ ({}))).toBe(
				false
			);
			expect(resolver.getEntrypointHints("any")).toEqual([]);
		});
	});
});
