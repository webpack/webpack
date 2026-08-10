"use strict";

// Rules and precedence are covered by `configCases/html/url-hints-rules`.
// No build reaches this fallback: the taps are copied into child compilers too.
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
