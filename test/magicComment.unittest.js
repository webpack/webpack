"use strict";

const {
	createMagicCommentContext,
	getCommentsInRange,
	parseCommentOptionsInRange,
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

describe("getCommentsInRange", () => {
	/** @type {{ value: string, range: [number, number] }[]} */
	const comments = [
		{ value: " a ", range: [0, 5] },
		{ value: " b ", range: [10, 15] },
		{ value: " c ", range: [20, 25] }
	];

	it("returns an empty array when there are no comments", () => {
		expect(getCommentsInRange([], [0, 100])).toEqual([]);
	});

	it("returns comments fully inside the range", () => {
		expect(getCommentsInRange(comments, [8, 22])).toEqual([comments[1]]);
	});
});

describe("parseCommentOptionsInRange", () => {
	const context = createMagicCommentContext();

	it("merges webpack magic comments inside the range", () => {
		/** @type {{ value: string, range: [number, number] }[]} */
		const comments = [
			{ value: " note ", range: [0, 8] },
			{ value: " webpackIgnore: true ", range: [10, 33] }
		];
		expect(parseCommentOptionsInRange(comments, [0, 40], context)).toEqual({
			options: { webpackIgnore: true },
			errors: []
		});
	});
});
