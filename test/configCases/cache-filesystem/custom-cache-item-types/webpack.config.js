"use strict";

const assert = require("assert");

const hasBigInt = typeof BigInt !== "undefined";
const hasErrorCause =
	typeof new Error("test", { cause: new Error("cause") }).cause !== "undefined";
const hasAggregateError = typeof AggregateError !== "undefined";

/**
 * @returns {Record<string, EXPECTED_ANY>} every value kind the cache has to restore
 */
const createValue = () => {
	/** @type {Record<string, EXPECTED_ANY>} */
	const value = { number: 42, number1: 3.14, number2: 6.2, string: "string" };
	if (hasErrorCause) {
		value.error = new Error("error", { cause: new Error("cause") });
		value.error1 = new Error("error", {
			cause: { string: "string", number: 42 }
		});
	}
	if (hasAggregateError) {
		value.aggregateError = new AggregateError(
			[new Error("first", { cause: "nested cause" }), "second"],
			"aggregate error",
			{ cause: new Error("cause") }
		);
	}
	if (hasBigInt) {
		value.bigint = BigInt(5);
		value.bigint1 = BigInt(124);
		value.bigint2 = BigInt(125);
		value.bigint3 = BigInt("12345678901234567890");
		value.bigint4 = BigInt(5);
		value.bigint5 = BigInt(1000000);
		value.bigint6 = BigInt(128);
		value.bigint7 = BigInt(2147483647);
		value.obj = { foo: BigInt(-10) };
		value.set = new Set([BigInt(1), BigInt(2)]);
		value.arr = [BigInt(256), BigInt(257), BigInt(258)];
	}
	return value;
};

/**
 * @param {Record<string, EXPECTED_ANY>} restored what the cache gave back
 * @returns {void}
 */
const assertRestored = (restored) => {
	const expected = createValue();
	for (const key of ["number", "number1", "number2", "string", "obj", "arr"]) {
		if (key in expected) assert.deepStrictEqual(restored[key], expected[key]);
	}
	for (let i = 0; i < 8; i++) {
		const key = i === 0 ? "bigint" : `bigint${i}`;
		if (key in expected) assert.strictEqual(restored[key], expected[key]);
	}
	if (hasBigInt) assert.deepStrictEqual([...restored.set], [...expected.set]);
	if (hasErrorCause) {
		assert.strictEqual(restored.error.cause.message, "cause");
		assert.deepStrictEqual(restored.error1.cause, {
			string: "string",
			number: 42
		});
	}
	if (hasAggregateError) {
		const { aggregateError } = restored;
		assert.strictEqual(aggregateError.message, "aggregate error");
		assert.strictEqual(aggregateError.cause.message, "cause");
		assert.strictEqual(aggregateError.errors[0].message, "first");
		assert.strictEqual(aggregateError.errors[0].cause, "nested cause");
		assert.strictEqual(aggregateError.errors[1], "second");
	}
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	plugins: [
		(compiler) => {
			const name = "CustomCacheItemTypes";
			compiler.hooks.thisCompilation.tap(name, (compilation) => {
				compilation.hooks.processAssets.tapPromise(
					{
						name,
						stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
					},
					async () => {
						const cacheItem = compilation
							.getCache(name)
							.getItemCache("test.ext", null);
						const restored = await cacheItem.getPromise();
						if (restored) {
							try {
								assertRestored(/** @type {EXPECTED_ANY} */ (restored));
							} catch (err) {
								compilation.errors.push(
									new compiler.webpack.WebpackError(
										`restored cache item differs: ${
											/** @type {Error} */ (err).message
										}`
									)
								);
							}
						} else {
							await cacheItem.storePromise(createValue());
						}
						const { cache } = compiler.options;
						compilation.emitAsset(
							"cache-result.json",
							new compiler.webpack.sources.RawSource(
								JSON.stringify({
									filesystem:
										typeof cache === "object" && cache.type === "filesystem",
									restored: Boolean(restored)
								})
							)
						);
					}
				);
			});
		}
	]
};
