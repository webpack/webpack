"use strict";

const parseJson = require("../lib/util/parseJson");

const currentNodeMajor = Number.parseInt(
	process.version.slice(1).split(".")[0],
	10
);

// Given an object where keys are major versions of node, this will return the
// value where the current major version is >= the latest key. eg: in node 24,
// for the input {20:1, 22:2}, this will return 2 if not match is found it will
// return the value of the `default` key.
const getLatestMatchingNode = (
	/** @type {Record<string, unknown> & { default?: unknown }} */ {
		default: defaultNode,
		...majors
	}
) => {
	for (const major of Object.keys(majors).sort(
		(a, b) =>
			/** @type {number} */ (/** @type {unknown} */ (b)) -
			/** @type {number} */ (/** @type {unknown} */ (a))
	)) {
		if (
			currentNodeMajor >= /** @type {number} */ (/** @type {unknown} */ (major))
		) {
			return majors[major];
		}
	}

	return defaultNode;
};

const expectMessage = (
	/** @type {(string | RegExp | Record<string, unknown>)[]} */ ...args
) =>
	new RegExp(
		args
			.map((rawValue) => {
				const value =
					rawValue.constructor === Object
						? getLatestMatchingNode(
								/** @type {Record<string, unknown> & { default?: unknown }} */ (
									rawValue
								)
							)
						: rawValue;
				return value instanceof RegExp ? value.source : value;
			})
			.join("")
	);

const jsonThrows = (
	/** @type {unknown} */ data,
	/** @type {unknown[]} */ ...args
) => {
	/** @type {number | undefined} */
	let context;

	if (typeof args[0] === "number") {
		context = /** @type {number} */ (args.shift());
	}

	const expected = args[0];

	// If expected is an Error constructor or instance, use it directly
	if (typeof expected === "function" || expected instanceof Error) {
		expect(() =>
			/** @type {(data: unknown, reviver: null, context: number | undefined) => unknown} */ (
				/** @type {unknown} */ (parseJson)
			)(data, null, context)
		).toThrow(/** @type {Error} */ (/** @type {unknown} */ (expected)));
		return;
	}

	/** @type {Record<string, unknown>} */
	let err = {};

	try {
		/** @type {(data: unknown, reviver: null, context: number | undefined) => unknown} */ (
			/** @type {unknown} */ (parseJson)
		)(data, null, context);
	} catch (err_) {
		err = /** @type {Record<string, unknown>} */ (err_);
	}

	const expectedObj = /** @type {Record<string, unknown>} */ (expected);

	if (expectedObj.message) {
		if (expectedObj.message instanceof RegExp) {
			expect(/** @type {string} */ (err.message)).toMatch(expectedObj.message);
		} else {
			expect(err.message).toBe(expectedObj.message);
		}
	}

	if (expectedObj.code) {
		expect(err.code).toBe(expectedObj.code);
	}

	if (expectedObj.name) {
		expect(err.name).toBe(expectedObj.name);
	}

	if (expectedObj.position !== undefined) {
		expect(err.position).toBe(expectedObj.position);
	}

	if (expectedObj.systemError) {
		expect(err.systemError).toBeInstanceOf(expectedObj.systemError);
	}
};

describe("parseJson", () => {
	it("parses JSON", () => {
		const cases = Object.entries({
			object: {
				foo: 1,
				bar: {
					baz: [1, 2, 3, "four"]
				}
			},
			array: [1, 2, null, "hello", { world: true }, false],
			num: 420.69,
			null: null,
			true: true,
			false: false
		}).map(([name, obj]) => [name, JSON.stringify(obj)]);

		for (const [_, data] of cases) {
			// Use JSON.stringify for comparison to ignore Symbol properties
			expect(JSON.stringify(parseJson(data))).toStrictEqual(
				JSON.stringify(JSON.parse(data))
			);
		}
	});

	it("parses JSON if it is a Buffer, removing BOM bytes", () => {
		const str = JSON.stringify({
			foo: 1,
			bar: {
				baz: [1, 2, 3, "four"]
			}
		});
		const data = Buffer.from(str);
		const bom = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), data]);

		expect(
			JSON.stringify(
				parseJson(/** @type {string} */ (/** @type {unknown} */ (data)))
			)
		).toBe(str);
		expect(
			JSON.stringify(
				parseJson(/** @type {string} */ (/** @type {unknown} */ (bom)))
			)
		).toBe(str);
	});

	it("better errors when faced with repeated BOM bytes and trailing \\b characters", () => {
		const str = JSON.stringify({
			foo: 1,
			bar: {
				baz: [1, 2, 3, "four"]
			}
		});
		const doubleBomBuffer = Buffer.concat([
			Buffer.from([0xef, 0xbb, 0xbf, 0xef, 0xbb, 0xbf]),
			Buffer.from(str)
		]);

		jsonThrows(doubleBomBuffer.toString(), {
			message: /Unexpected token "." \(0xFEFF\)/
		});

		jsonThrows(`${str}\b\b\b\b\b\b\b\b\b\b\b\b`, {
			message: expectMessage(
				"Unexpected ",
				{
					20: "non-whitespace character after JSON",
					default: /token "\\b" \(0x08\) in JSON/
				},
				/ at position.*\\b"/
			)
		});
	});

	it("throws SyntaxError for unexpected token", () => {
		const data = "foo";

		jsonThrows(data, {
			message: expectMessage(
				/Unexpected token "o" \(0x6F\)/,
				{
					20: ', "foo" is not valid JSON',
					default: " in JSON at position 1"
				},
				/ while parsing .foo./
			),
			position: getLatestMatchingNode({ 20: 0, default: 1 }),
			name: "JSONParseError",
			systemError: SyntaxError
		});
	});

	it("throws SyntaxError for unexpected end of JSON", () => {
		const data = '{"foo: bar}';

		jsonThrows(data, {
			message: expectMessage(
				{
					20: /Unterminated string in JSON at position \d+/,
					default: /Unexpected end of JSON input/
				},
				/.* while parsing "{\\"foo: bar}"/
			),
			position: getLatestMatchingNode({ 20: 11, default: 10 }),
			name: "JSONParseError",
			systemError: SyntaxError
		});
	});

	it("throws SyntaxError for unexpected number", () => {
		const data = "[[1,2],{3,3,3,3,3}]";

		jsonThrows(data, {
			message: expectMessage(
				{
					20: "Expected property name or '}'",
					default: "Unexpected number"
				},
				" in JSON at position 8"
			),
			position: 8,
			name: "JSONParseError",
			systemError: SyntaxError
		});
	});

	it("throws SyntaxError for broken object", () => {
		const data = '{"6543210';

		jsonThrows(data, {
			message: expectMessage(
				{
					20: "Unterminated string in JSON at position 9",
					default: "Unexpected end of JSON input"
				},
				/.* while parsing .*/
			),
			position: getLatestMatchingNode({ 20: 9, default: 8 }),
			name: "JSONParseError",
			systemError: SyntaxError
		});
	});

	it("throws SyntaxError with characters like a string", () => {
		const data = "abcde";

		jsonThrows(data, {
			message: expectMessage(
				/Unexpected token "a" \(0x61\)/,
				{
					20: ', "abcde" is not valid JSON',
					default: " in JSON at position 0"
				},
				/.* while parsing .*/,
				{
					20: "'abcde'",
					default: 'near "ab..."'
				}
			),
			position: 0,
			name: "JSONParseError",
			systemError: SyntaxError
		});
	});

	it("throws for end of input", () => {
		const data = '{"a":1,""';

		jsonThrows(data, {
			message: expectMessage({
				22: "Expected ':' after property name in JSON at",
				default: "Unexpected end of JSON input while parsing"
			}),
			position: getLatestMatchingNode({ 22: 9, default: 8 }),
			name: "JSONParseError",
			systemError: SyntaxError
		});
	});

	it("throws TypeError for undefined", () => {
		jsonThrows(undefined, {
			message: "Cannot parse undefined",
			position: 0,
			name: "JSONParseError",
			systemError: SyntaxError
		});
	});

	it("throws TypeError for non-strings", () => {
		jsonThrows(new Map(), {
			message: "Cannot parse [object Map]",
			position: 0,
			name: "JSONParseError",
			systemError: SyntaxError
		});
	});

	it("throws TypeError for empty arrays", () => {
		jsonThrows([], {
			message: "Cannot parse an empty array",
			position: 0,
			name: "JSONParseError",
			systemError: SyntaxError
		});
	});

	it("handles empty string helpfully", () => {
		jsonThrows("", {
			message: "Unexpected end of JSON input while parsing empty string",
			name: "JSONParseError",
			position: 0,
			systemError: SyntaxError
		});
	});
});
