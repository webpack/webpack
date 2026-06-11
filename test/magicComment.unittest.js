"use strict";

const {
	createMagicCommentContext,
	parseMagicComment
} = require("../lib/util/magicComment");

describe("parseMagicComment", () => {
	const context = createMagicCommentContext();

	it("parses a single boolean pair without vm (fast path)", () => {
		expect(parseMagicComment(" webpackIgnore: true ", context)).toEqual({
			webpackIgnore: true
		});
		expect(parseMagicComment("webpackIgnore: false", context)).toEqual({
			webpackIgnore: false
		});
	});

	it("parses numbers and null via the fast path", () => {
		expect(parseMagicComment("webpackPrefetch: 5", context)).toEqual({
			webpackPrefetch: 5
		});
		expect(parseMagicComment("webpackPrefetch: -1.5", context)).toEqual({
			webpackPrefetch: -1.5
		});
		expect(parseMagicComment("webpackMode: null", context)).toEqual({
			webpackMode: null
		});
	});

	it("evaluates multi-option comments via vm", () => {
		expect(
			parseMagicComment(
				'webpackChunkName: "foo", webpackPrefetch: true',
				context
			)
		).toEqual({ webpackChunkName: "foo", webpackPrefetch: true });
	});

	it("detaches RegExp and object values from the vm context", () => {
		const options = parseMagicComment(
			"webpackInclude: /\\.json$/, webpackExports: ['a', 'b']",
			context
		);
		expect(options.webpackInclude).toBeInstanceOf(RegExp);
		expect(options.webpackInclude.source).toBe("\\.json$");
		expect(options.webpackExports).toEqual(["a", "b"]);
	});

	it("throws on a malformed comment body", () => {
		expect(() => parseMagicComment("webpackIgnore: )", context)).toThrow(
			/Unexpected token/
		);
	});
});
