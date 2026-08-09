"use strict";

// The rule matching and the hint precedence are covered by a real build in
// `configCases/html/url-hints-rules`. Only the fallback below stays here: it is
// returned for a `Compilation` the plugin never processed, which no build
// produces (its `compilation` hook taps are copied into child compilers too).
const ResourceHintPlugin = require("../lib/prefetch/ResourceHintPlugin");

describe("ResourceHintPlugin.getCompilationResolver", () => {
	it("returns an empty resolver when no plugin instance ran on this compilation", () => {
		const resolver = ResourceHintPlugin.getCompilationResolver(
			/** @type {EXPECTED_ANY} */ ({})
		);
		expect(resolver.hints).toBeUndefined();
		expect(resolver.getHtmlHinted("any")).toEqual([]);
		expect(resolver.isHtmlHinted(/** @type {EXPECTED_ANY} */ ({}))).toBe(false);
		expect(resolver.getEntrypointHints("any")).toEqual([]);
	});
});
