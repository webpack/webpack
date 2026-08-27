"use strict";

const { Logger } = require("../lib/logging/Logger");
const ObjectMiddleware = require("../lib/serialization/ObjectMiddleware");
const SerializerMiddleware = require("../lib/serialization/SerializerMiddleware");

const middleware = new ObjectMiddleware(() => {}, "xxhash64");
// Only the error paths log, so a sink is enough
/** @type {Logger} */
const logger = new Logger(
	() => {},
	() => logger
);
const context = { logger };

/**
 * @param {EXPECTED_ANY} value the value to round-trip
 * @returns {EXPECTED_ANY} what came back
 */
const roundTrip = (value) => {
	const serialized = middleware.serialize([value], context);
	expect(serialized).not.toBeNull();
	const deserialized = middleware.deserialize(
		/** @type {EXPECTED_ANY} */ (serialized),
		context
	);
	return /** @type {EXPECTED_ANY[]} */ (deserialized)[0];
};

describe("ObjectMiddleware", () => {
	// One case per branch of the item dispatch, since the format is positional:
	// a value written on the wrong branch corrupts everything after it.
	const cases = {
		"a small integer": 42,
		"a negative integer": -7,
		"a float": 1.5,
		zero: 0,
		true: true,
		false: false,
		undefined,
		null: null,
		"an empty string": "",
		"a one character string": "a",
		"a short string": "ab",
		"a long string": "webpack".repeat(500),
		"a multibyte string": "😀 üñî",
		"a plain object": { a: 1, b: "two", c: false, d: undefined, e: null },
		"a nested object": { a: { b: { c: [1, 2, 3] } } },
		"an array of mixed items": [1, "two", true, null, undefined, { x: 1 }],
		"an empty array": [],
		"a Map": new Map([
			["a", 1],
			["b", 2]
		]),
		"a Set": new Set([1, "two", false]),
		"a Date": new Date(1600000000000),
		"a RegExp": /ab+c/gi,
		"a null prototype object": Object.assign(Object.create(null), { a: 1 }),
		"a buffer": Buffer.from("hello webpack"),
		"an empty buffer": Buffer.alloc(0)
	};

	for (const name of Object.keys(cases)) {
		it(`round-trips ${name}`, () => {
			const value = cases[/** @type {keyof typeof cases} */ (name)];
			expect(roundTrip(value)).toStrictEqual(value);
		});
	}

	it("round-trips an Error with its message", () => {
		const result = roundTrip(new TypeError("nope"));
		expect(result).toBeInstanceOf(TypeError);
		expect(result.message).toBe("nope");
	});

	it("keeps a repeated string equal on both sides", () => {
		const long = "a-repeated-request-string";
		expect(roundTrip([long, long, long])).toStrictEqual([long, long, long]);
	});

	it("restores a repeated object as one shared reference", () => {
		const shared = { shared: true };
		const result = roundTrip([shared, shared]);
		expect(result[0]).toStrictEqual(shared);
		expect(result[1]).toBe(result[0]);
	});

	it("restores equal buffers written twice", () => {
		const buffer = Buffer.from("some buffer content");
		const result = roundTrip([buffer, Buffer.from(buffer)]);
		expect(result[0]).toStrictEqual(buffer);
		expect(result[1]).toStrictEqual(buffer);
	});

	it("round-trips a lazy value", () => {
		// Targets another middleware, as a real lazy targets the binary one
		const lazy = SerializerMiddleware.createLazy(
			() => [{ inside: "the lazy" }],
			/** @type {EXPECTED_ANY} */ ({ other: true })
		);
		const result = roundTrip(lazy);
		expect(SerializerMiddleware.isLazy(result)).toBe(true);
		expect(result()).toStrictEqual([{ inside: "the lazy" }]);
	});

	it("rejects a function that is not lazy", () => {
		expect(() =>
			middleware.serialize([/** @type {EXPECTED_ANY} */ (() => {})], context)
		).toThrow(/Unexpected function/);
	});

	it("rejects a circular reference", () => {
		/** @type {EXPECTED_ANY} */
		const circular = {};
		circular.self = circular;
		expect(() => middleware.serialize([circular], context)).toThrow(
			/circular references/
		);
	});
});
