"use strict";

const BinaryMiddleware = require("../lib/serialization/BinaryMiddleware");
const SerializerMiddleware = require("../lib/serialization/SerializerMiddleware");

/**
 * @param {import("../lib/serialization/BinaryMiddleware").PrimitiveSerializableType[]} base base
 * @param {number} count count
 * @returns {import("../lib/serialization/BinaryMiddleware").PrimitiveSerializableType[]} result
 */
const cont = (base, count) => {
	const result = [];
	for (let i = 0; i < count; i++) {
		result.push(base[i % base.length]);
	}
	return result;
};

const mw = new BinaryMiddleware();
/** @type {import("../lib/serialization/SerializerMiddleware").LazyTarget} */
const other = /** @type {EXPECTED_ANY} */ ({ other: true });

/**
 * @param {import("../lib/serialization/types").PrimitiveSerializableType} item item
 * @returns {unknown} resolved item
 */
const resolveLazy = (item) => {
	if (SerializerMiddleware.isLazy(item)) {
		const data = item();
		if (Array.isArray(data)) return { resolvesTo: data.map(resolveLazy) };
		return { resolvesTo: resolveLazy(data) };
	}
	return item;
};

describe("BinaryMiddleware", () => {
	const items = [
		true,
		false,
		null,
		"",
		"hi",
		"hi".repeat(200),
		"😀",
		"😀".repeat(200),
		Buffer.from("hello"),
		1,
		11,
		0x100,
		-1,
		-11,
		-0x100,
		-1.25,
		SerializerMiddleware.createLazy([5], other)
	];

	/** @type {import("../lib/serialization/types").PrimitiveSerializableType[]} */
	const itemsWithLazy = /** @type {EXPECTED_ANY} */ ([
		...items,
		SerializerMiddleware.createLazy(
			[SerializerMiddleware.createLazy([5], other)],
			mw
		),
		SerializerMiddleware.createLazy(
			[
				1,
				SerializerMiddleware.createLazy([2], mw),
				SerializerMiddleware.createLazy([5], other),
				4
			],
			mw
		)
	]);
	itemsWithLazy.push(SerializerMiddleware.createLazy([...itemsWithLazy], mw));
	itemsWithLazy.push(
		SerializerMiddleware.createLazy([...itemsWithLazy], other)
	);

	items.push(/** @type {EXPECTED_ANY} */ (undefined));

	const cases = [
		...itemsWithLazy.map((item) => [item]),
		[true, true],
		[false, true],
		[true, false],
		[false, false],
		[false, false, false],
		[false, true, false, true],
		[true, true, true],
		[false, false, false],
		cont([false, true, false, true], 5),
		cont([true], 5),
		cont([false], 5),
		cont([false, true, false, true], 6),
		cont([true], 6),
		cont([false], 6),
		cont([false, true, false, true], 7),
		cont([false, true, false, true], 8),
		cont([false, true, false, true], 9),
		cont([false, true, false, true], 132),
		cont([false, true, false, true], 133),
		cont([false, true, false, true], 134),
		cont([false, true, false, true], 135),
		cont([false, true, false, true], 10000),
		cont([true], 135),
		[null],
		[null, null],
		[null, null, null],
		cont([null], 4),
		cont([null], 100),
		cont([null], 300),
		cont([-20], 20),
		cont([400], 20),
		cont([5.5], 20)
	];

	describe("bigints", () => {
		const bigints = [
			0n,
			5n,
			10n,
			11n,
			-1n,
			-128n,
			127n,
			128n,
			-2147483648n,
			2147483647n,
			123456789012345678901234567890n,
			-987654321098765432109876543210n
		];
		for (const b of bigints) {
			it(`should serialize bigint ${b} correctly`, () => {
				const data = [b, b, "x", b, true, b];
				const serialized =
					/** @type {Buffer[]} */
					(mw.serialize(data, {}));
				expect(mw.deserialize(serialized, {})).toEqual(data);
			});
		}
	});

	describe("chunked streams", () => {
		// mixed payload without lazies so the serialized buffers can be re-split
		const data = [
			"",
			"hi",
			"hi".repeat(200),
			"😀",
			"café",
			1,
			11,
			0x100,
			-1,
			-1.25,
			...cont([3], 40),
			...cont([1000], 40),
			...cont([0.5], 40),
			...cont([true, false], 17),
			null,
			true,
			null,
			false,
			null,
			42,
			null,
			5000,
			null,
			null,
			null,
			...cont([null], 5),
			...cont([null], 300),
			7n,
			100000n,
			123456789012345678901234567890n,
			Buffer.from("hello"),
			Buffer.alloc(10000, 1)
		];
		for (const chunkSize of [1, 2, 3, 5, 8, 13, 64]) {
			it(`should deserialize a stream split into ${chunkSize}-byte chunks`, () => {
				const serialized =
					/** @type {Buffer[]} */
					(mw.serialize(data, {}));
				const whole = Buffer.concat(serialized);
				const chunks = [];
				for (let i = 0; i < whole.length; i += chunkSize) {
					chunks.push(whole.subarray(i, i + chunkSize));
				}
				expect(mw.deserialize(chunks, {})).toEqual(data);
			});
		}

		for (const chunkSize of [1, 3, 7]) {
			it(`should deserialize inlined lazy sections split into ${chunkSize}-byte chunks`, () => {
				const data = [1, SerializerMiddleware.createLazy([2, "x"], mw), true];
				const serialized =
					/** @type {Buffer[]} */
					(mw.serialize(data, {}));
				const whole = Buffer.concat(serialized);
				const chunks = [];
				for (let i = 0; i < whole.length; i += chunkSize) {
					chunks.push(whole.subarray(i, i + chunkSize));
				}
				const result =
					/** @type {import("../lib/serialization/BinaryMiddleware").DeserializedType} */ (
						mw.deserialize(chunks, {})
					);
				expect(result.map(resolveLazy)).toEqual(data.map(resolveLazy));
			});
		}
	});

	describe("invalid streams", () => {
		it("should throw on an unexpected header byte", () => {
			expect(() => mw.deserialize([Buffer.from([0x1d])], {})).toThrow(
				/Unexpected header byte/
			);
		});

		it("should throw on unexpected end of stream", () => {
			// string section claiming 10 content bytes with only 2 present
			expect(() =>
				mw.deserialize([Buffer.from([0x1e, 10, 0, 0, 0, 0x61, 0x62])], {})
			).toThrow(/Unexpected end of stream/);
		});

		it("should throw on a lazy element where bytes are expected", () => {
			const lazy = SerializerMiddleware.createLazy([5], other);
			expect(() =>
				mw.deserialize(
					[
						Buffer.from([0x1e, 10, 0, 0, 0, 0x61, 0x62]),
						/** @type {EXPECTED_ANY} */ (lazy)
					],
					{}
				)
			).toThrow(/Unexpected lazy element in stream/);
		});

		it("should throw on a non-lazy element in a lazy section", () => {
			// lazy section with one zero-length entry must be followed by a lazy fn
			expect(() =>
				mw.deserialize(
					[Buffer.from([0x0b, 1, 0, 0, 0, 0, 0, 0, 0]), Buffer.from([0x0c])],
					{}
				)
			).toThrow(/Unexpected non-lazy element in stream/);
		});
	});

	for (const c of [1, 100]) {
		for (const caseData of cases) {
			for (const prepend of items) {
				for (const append of items) {
					if (c > 1 && append !== undefined) continue;
					const data = [prepend, ...caseData, append].filter(
						(x) => x !== undefined
					);
					if (data.length * c > 200000) continue;
					if (data.length === 0) continue;
					let key = JSON.stringify(data.map(resolveLazy));
					if (key.length > 100) {
						key = `${key.slice(0, 50)} ... ${key.slice(-50)}`;
					}

					it(`should serialize ${c} x ${key} (${data.length}) correctly`, () => {
						// process.stderr.write(
						// 	`${c} x ${key.slice(0, 20)} (${data.length})\n`
						// );
						const realData = cont(data, data.length * c);
						const serialized =
							/** @type {import("../lib/serialization/BinaryMiddleware").SerializedType} */ (
								mw.serialize(realData, {})
							);
						const newData =
							/** @type {import("../lib/serialization/BinaryMiddleware").DeserializedType} */ (
								mw.deserialize(serialized, {})
							);
						expect(newData.map(resolveLazy)).toEqual(realData.map(resolveLazy));
					});
				}
			}
		}
	}
});
