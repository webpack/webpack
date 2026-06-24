"use strict";

const JSONParseError = require("../lib/errors/JSONParseError");
const parseJson = require("../lib/util/parseJson");

// parseJson wraps the host engine's JSON.parse error into a JSONParseError.
// JSC (Bun) and V8 (Node, Deno) word their SyntaxError messages differently, so
// the live cases assert the parts webpack itself produces — name, systemError,
// position and the appended "while parsing …" context. The normalization logic
// (token→hex, position extraction, source slicing) targets V8-shaped text, so it
// is exercised directly against synthetic messages to stay engine-independent.

const catchError = (/** @type {() => void} */ fn) => {
	try {
		fn();
	} catch (err) {
		return /** @type {JSONParseError} */ (err);
	}
	throw new Error("expected parseJson to throw");
};

describe("parseJson", () => {
	it("parses JSON", () => {
		const cases = Object.entries({
			object: { foo: 1, bar: { baz: [1, 2, 3, "four"] } },
			array: [1, 2, null, "hello", { world: true }, false],
			num: 420.69,
			null: null,
			true: true,
			false: false
		}).map(([name, obj]) => [name, JSON.stringify(obj)]);

		for (const [, data] of cases) {
			// Use JSON.stringify for comparison to ignore Symbol properties
			expect(JSON.stringify(parseJson(data))).toStrictEqual(
				JSON.stringify(JSON.parse(data))
			);
		}
	});

	it("parses JSON if it is a Buffer, removing BOM bytes", () => {
		const str = JSON.stringify({ foo: 1, bar: { baz: [1, 2, 3, "four"] } });
		const data = Buffer.from(str);
		const bom = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), data]);

		expect(JSON.stringify(parseJson(/** @type {EXPECTED_ANY} */ (data)))).toBe(
			str
		);
		expect(JSON.stringify(parseJson(/** @type {EXPECTED_ANY} */ (bom)))).toBe(
			str
		);
	});

	const str = JSON.stringify({ foo: 1, bar: { baz: [1, 2, 3, "four"] } });
	const parseErrorCases = [
		["repeated BOM bytes", `﻿﻿${str}`, null],
		["trailing control characters", `${str}\b\b\b`, null],
		["an unexpected token", "foo", "foo"],
		["an unterminated string", '{"foo: bar}', "foo: bar"],
		["an unexpected number", "[[1,2],{3,3,3,3,3}]", "[[1,2]"],
		["a broken object", '{"6543210', "6543210"],
		["characters like a string", "abcde", "abcde"],
		["a missing colon", '{"a":1,""', ":1,"]
	];

	for (const [title, data, snippet] of parseErrorCases) {
		it(`wraps a JSON.parse failure for ${title}`, () => {
			const err = catchError(() => parseJson(/** @type {string} */ (data)));

			expect(err).toBeInstanceOf(JSONParseError);
			expect(err.name).toBe("JSONParseError");
			expect(err.systemError).toBeInstanceOf(SyntaxError);
			expect(typeof err.position).toBe("number");
			expect(err.message).toMatch(/ while parsing /);
			if (snippet !== null) expect(err.message).toContain(snippet);
		});
	}

	it("reports the empty string helpfully", () => {
		const err = catchError(() => parseJson(""));

		expect(err.name).toBe("JSONParseError");
		expect(err.position).toBe(0);
		expect(err.message).toMatch(/ while parsing empty string$/);
	});

	const nonStringCases = [
		[undefined, "Cannot parse undefined"],
		[new Map(), "Cannot parse [object Map]"],
		[[], "Cannot parse an empty array"]
	];

	for (const [input, message] of nonStringCases) {
		it(`reports a helpful message for ${String(message)}`, () => {
			const err = catchError(() => parseJson(/** @type {EXPECTED_ANY} */ (input)));

			expect(err.name).toBe("JSONParseError");
			expect(err.position).toBe(0);
			expect(err.message).toBe(message);
			expect(err.systemError).toBeInstanceOf(SyntaxError);
		});
	}
});

describe("JSONParseError", () => {
	// Feed V8-shaped messages directly so the engine-specific text is fixed and the
	// transformation is checked the same way on V8 and JSC.
	const wrap = (/** @type {string} */ message, /** @type {string} */ txt) =>
		new JSONParseError(new SyntaxError(message), txt, txt);

	it("rewrites an unexpected token to include its char code", () => {
		const err = wrap('Unexpected token \'o\', "foo" is not valid JSON', "foo");

		expect(err.message).toBe(
			'Unexpected token "o" (0x6F), "foo" is not valid JSON while parsing \'foo\''
		);
		expect(err.position).toBe(0);
	});

	it("extracts the position and quotes a short source verbatim", () => {
		const err = wrap("Unexpected token x in JSON at position 1", "foo");

		expect(err.message).toBe(
			'Unexpected token "x" (0x78) in JSON at position 1 while parsing "foo"'
		);
		expect(err.position).toBe(1);
	});

	it("slices a near-context window around the error position", () => {
		const txt = "0123456789".repeat(5);
		const err = wrap("Unexpected token x in JSON at position 25", txt);

		expect(err.position).toBe(25);
		expect(err.message).toBe(
			`Unexpected token "x" (0x78) in JSON at position 25 while parsing near "...${txt.slice(
				5,
				45
			)}..."`
		);
	});

	it("derives the position for an unexpected end of input", () => {
		const err = wrap("Unexpected end of JSON input", "{");

		expect(err.message).toBe('Unexpected end of JSON input while parsing "{"');
		expect(err.position).toBe(0);
	});

	it("handles an empty source", () => {
		const err = wrap("Unexpected end of JSON input", "");

		expect(err.message).toBe(
			"Unexpected end of JSON input while parsing empty string"
		);
		expect(err.position).toBe(0);
	});
});
