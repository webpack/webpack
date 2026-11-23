"use strict";

const {
	createMagicCommentContext,
	getCommentsInRange,
	parseCommentOptionsInRange,
	parseMagicComment,
	readMagicCommentLiteral
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
			expect(options).toStrictEqual({
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
		const fn = parseMagicComment("d: function f() { return 1; }", context).d;
		expect(typeof fn).toBe("function");
		expect(String(fn)).toBe("function f() { return 1; }");
	});

	it("keeps the options read before a value that cannot be read", () => {
		for (const value of [" webpackPrefetch: 1, webpackExports: [1n], webpackMode: 2 ", " webpackPrefetch: 1 + 0, webpackExports: [1n], webpackMode: 2 "]) {
			const { options, errors } = parseCommentOptionsInRange(
				[{ value, range: [0, 60] }],
				[0, 60],
				context
			);
			expect(options).toEqual({ webpackPrefetch: 1 });
			expect(errors).toHaveLength(1);
			expect(/** @type {Error[]} */ (errors)[0].message).toMatch(/BigInt/);
		}
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
		expect(() =>
			parseMagicComment("webpackChunkName: { get a() { for (;;); } }", context)
		).toThrow(/timed out/);
		expect(() =>
			parseMagicComment(
				"webpackChunkName: (() => { throw { get message() { for (;;); } }; })()",
				context
			)
		).toThrow(/timed out/);
		expect(() =>
			parseMagicComment(
				"webpackChunkName: (() => { throw { get stack() { for (;;); } }; })()",
				context
			)
		).toThrow(/timed out/);
		expect(parseMagicComment("webpackChunkName: 'ne' + 'xt'", context)).toEqual({
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

describe("readMagicCommentLiteral", () => {
	const vm = require("vm");

	/**
	 * @param {unknown} value a value
	 * @returns {string} the value with its type, comparable across realms
	 */
	const describeValue = (value) => {
		if (value instanceof RegExp || Object.prototype.toString.call(value) === "[object RegExp]") {
			return `regexp ${String(value)}`;
		}
		if (typeof value === "bigint") return `bigint ${value}`;
		if (typeof value === "number") return `number ${Object.is(value, -0) ? "-0" : value}`;
		if (typeof value === "object" && value !== null) return `object ${JSON.stringify(value)}`;
		return `${typeof value} ${JSON.stringify(value)}`;
	};

	/**
	 * @param {Record<string, unknown>} object an object
	 * @returns {string[]} its own properties, described
	 */
	const describeObject = (object) =>
		Object.keys(object).map((key) => `${key}: ${describeValue(object[key])}`);

	it.each([
		'a: "x\\x41\\u0042\\u{1F600}\\0\\n\\t\\r\\b\\f\\v\\c\\\'"',
		"a: 'it\\'s', b: \"q\\\"\"",
		'a: "line\\\ncontinued", b: "crlf\\\r\ncontinued"',
		"a: `plain`, b: `two\nlines`",
		"a: 0x1F, b: 0o17, c: 0b101, d: 1e3, e: .5, f: 5., g: -0, h: +7, i: - 2",
		"a: Infinity, b: -Infinity, c: +Infinity, d: NaN, e: -NaN",
		"a: 10n, b: -0x10n, c: 0b11n",
		"a: true, b: false, c: null, d: undefined",
		"a: /x\\/y[/]/gi, b: /\\d+/",
		"a: [1, 'two', [3], { four: 4 },], b: []",
		'a: { "b": 1, 2: "c", d: { e: null } }, f: {}',
		'"quoted": 1, \'single\': 2, 0: 3, 10: 4, $dollar_1: 5',
		"a: 1, b: 2, a: 3",
		"__proto__: { polluted: true }, a: 1",
		"a: { __proto__: { inner: 1 }, b: 2 }",
		" \n\t a: 1 , b: 2 , "
	])("reads %j as evaluating it does", (text) => {
		const literal = readMagicCommentLiteral(text);
		expect(literal).toBeDefined();
		expect(describeObject(/** @type {Record<string, unknown>} */ (literal))).toEqual(
			describeObject(vm.runInNewContext(`({${text}})`))
		);
	});

	it.each([
		"a: 1,,",
		"a: 01",
		"a: 08",
		"a: 1_000",
		"a: 1e",
		"a: .",
		"a: -",
		"a: -true",
		"a: +1n",
		"a: -Infinity_",
		"a: 3in",
		'a: "\\8"',
		'a: "\\1"',
		'a: "\\x4"',
		'a: "\\u{110000}"',
		'a: "\\u12"',
		'a: "unterminated',
		'a: "line\nbreak"',
		"a: `${1}`",
		"a: `\\n`",
		"a: [,1]",
		"a: [...b]",
		"a: [1 2]",
		"a: {b}",
		"a: {b: 1 c: 2}",
		"a: Symbol()",
		'a: "a" + "b"',
		"a: /x/gg",
		"a: /(/",
		"a: /x",
		"a: /x\\\n/",
		"a: /x/gi1",
		"__proto__: 1, __proto__: 2",
		"01: 1",
		"1.5: 1",
		"ä: 1",
		"a\\u0062: 1",
		"aä: 1",
		"a 1",
		"a: 1 }); ({ b: 2",
		"get a() { return 1 }",
		"a: true // comment"
	])("leaves %j to evaluation", (text) => {
		expect(readMagicCommentLiteral(text)).toBeUndefined();
	});
});

describe("evaluated magic comment values", () => {
	it("keeps each kind of value as evaluating it gave", () => {
		const context = createMagicCommentContext();
		const options = parseMagicComment(
			'a: new RegExp("x", "g"), b: { c: [1 + 1] }, c: 0 * -1, d: 0 / 0, e: 2n * 2n, f: void 0, g: "s" + 1, h: !0',
			context
		);
		expect(options.a).toEqual(/x/g);
		expect(options.b).toEqual({ c: [2] });
		expect(Object.is(options.c, -0)).toBe(true);
		expect(Number.isNaN(options.d)).toBe(true);
		expect(options.e).toBe(BigInt(4));
		expect(Object.prototype.hasOwnProperty.call(options, "f")).toBe(true);
		expect(options.f).toBeUndefined();
		expect(options.g).toBe("s1");
		expect(options.h).toBe(true);
	});

	it("throws what cloning a value without a JSON form throws", () => {
		const context = createMagicCommentContext();
		expect(() =>
			parseMagicComment("a: { toJSON() { return undefined; } }", context)
		).toThrow(/not valid JSON/);
	});

	it("reports a comment whose result or error cannot be read", () => {
		const context = createMagicCommentContext();
		expect(() =>
			parseMagicComment("a: (JSON.stringify = () => 1, 1 + 1)", context)
		).toThrow("A magic comment's value could not be read");
		expect(() =>
			parseMagicComment(
				'a: (() => { String = () => { throw new Error("x"); }; throw new Error("y"); })()',
				createMagicCommentContext()
			)
		).toThrow("A magic comment's value could not be read");
	});
});
