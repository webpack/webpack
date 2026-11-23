"use strict";

const {
	createMagicCommentContext,
	getCommentsInRange,
	parseCommentOptionsInRange,
	parseMagicComment
} = require("../../lib/util/magicComment");

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
		expect(/** @type {RegExp} */ (options.webpackInclude).source).toBe(
			"\\.json$"
		);
		expect(options.webpackExports).toEqual(["a", "b"]);
	});

	it("reads plain literals as data", () => {
		const vm = require("vm");

		const runInContext = jest.spyOn(vm, "runInContext");
		try {
			const options = parseMagicComment(
				"webpackChunkName: 'a\\'b', webpackMode: `lazy`, webpackInclude: /\\.js$/i, webpackExports: ['x', 'y',], webpackFetchPriority: \"high\", a: { b: [1, -0x10, .5, null] }, c: 10n, d: undefined, __proto__: { polluted: true },",
				context
			);
			expect(runInContext).not.toHaveBeenCalled();
			expect(options).toEqual({
				webpackChunkName: "a'b",
				webpackMode: "lazy",
				webpackInclude: /\.js$/i,
				webpackExports: ["x", "y"],
				webpackFetchPriority: "high",
				a: { b: [1, -16, 0.5, null] },
				c: BigInt(10),
				d: undefined
			});
			expect(Object.getPrototypeOf(options)).toBe(Object.prototype);
			expect(/** @type {EXPECTED_ANY} */ ({}).polluted).toBeUndefined();
		} finally {
			runInContext.mockRestore();
		}
	});

	it("evaluates other values as before", () => {
		expect(
			parseMagicComment('webpackChunkName: "a" + "b", n: Math.max(1, 2)', context)
		).toEqual({ webpackChunkName: "ab", n: 2 });
		expect(typeof parseMagicComment("a: Symbol()", context).a).toBe("symbol");
	});

	it("does not reach webpack's own Function from a comment", () => {
		expect(() =>
			parseMagicComment(
				'webpackChunkName: this.constructor.constructor("return 1")()',
				context
			)
		).toThrow(/Code generation from strings disallowed/);
	});

	it("stops a comment that does not finish", () => {
		expect(() =>
			parseMagicComment("webpackChunkName: (() => { for (;;); })()", context)
		).toThrow(/timed out/);
		expect(parseMagicComment("webpackChunkName: 'next'", context)).toEqual({
			webpackChunkName: "next"
		});
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
