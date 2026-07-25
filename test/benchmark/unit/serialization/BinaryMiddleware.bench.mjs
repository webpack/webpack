import { createRequire } from "module";

const require = createRequire(import.meta.url);

const BinaryMiddleware =
	/** @type {typeof import("../../../../lib/serialization/BinaryMiddleware")} */
	(require("../../../../lib/serialization/BinaryMiddleware.js"));

const middleware = new BinaryMiddleware();

/** @type {import("../../../../lib/serialization/BinaryMiddleware").PrimitiveSerializableType[]} */
let numericData = [];
/** @type {import("../../../../lib/serialization/BinaryMiddleware").PrimitiveSerializableType[]} */
let mixedData = [];
/** @type {import("../../../../lib/serialization/BinaryMiddleware").SerializedType} */
let numericSerialized = [];
/** @type {import("../../../../lib/serialization/BinaryMiddleware").SerializedType} */
let mixedSerialized = [];
/** @type {Buffer[]} */
let fragmentedSerialized = [];
let sink = 0;

/**
 * @param {Buffer[]} buffers buffers
 * @param {number} size chunk size
 * @returns {Buffer[]} fixed-size chunks
 */
const fragment = (buffers, size) => {
	const buffer = Buffer.concat(buffers);
	const chunks = [];
	for (let i = 0; i < buffer.length; i += size) {
		chunks.push(buffer.subarray(i, i + size));
	}
	return chunks;
};

export default {
	name: "unit/serialization/BinaryMiddleware",
	setup() {
		numericData = Array.from({ length: 60000 }, (_, i) => {
			switch (i % 6) {
				case 0:
					return i % 11;
				case 1:
					return i * 1000;
				case 2:
					return i + 0.25;
				case 3:
					return i % 2 === 0;
				case 4:
					return null;
				default:
					return BigInt(i);
			}
		});
		mixedData = Array.from({ length: 10000 }, (_, i) => {
			switch (i % 4) {
				case 0:
					return `module-${i}/src/index.js`;
				case 1:
					return Buffer.alloc(64, i);
				case 2:
					return i;
				default:
					return i % 2 === 0;
			}
		});
		numericSerialized =
			/** @type {import("../../../../lib/serialization/BinaryMiddleware").SerializedType} */ (
				middleware.serialize(numericData, {})
			);
		mixedSerialized =
			/** @type {import("../../../../lib/serialization/BinaryMiddleware").SerializedType} */ (
				middleware.serialize(mixedData, {})
			);
		fragmentedSerialized = fragment(
			/** @type {Buffer[]} */ (numericSerialized),
			64
		);
	},
	teardown() {
		numericData = [];
		mixedData = [];
		numericSerialized = [];
		mixedSerialized = [];
		fragmentedSerialized = [];
		if (sink === -1) console.log(sink);
	},
	benches: [
		{
			name: "serialize 60000 numeric values",
			fn() {
				sink =
					/** @type {Buffer[]} */ (middleware.serialize(numericData, {}))
						.length;
			}
		},
		{
			name: "deserialize 60000 numeric values",
			fn() {
				sink =
					/** @type {import("../../../../lib/serialization/BinaryMiddleware").PrimitiveSerializableType[]} */ (
						middleware.deserialize(numericSerialized, {})
					).length;
			}
		},
		{
			name: "deserialize numeric values from 64-byte chunks",
			fn() {
				sink =
					/** @type {import("../../../../lib/serialization/BinaryMiddleware").PrimitiveSerializableType[]} */ (
						middleware.deserialize(fragmentedSerialized, {})
					).length;
			}
		},
		{
			name: "serialize 10000 mixed values",
			fn() {
				sink =
					/** @type {Buffer[]} */ (middleware.serialize(mixedData, {})).length;
			}
		},
		{
			name: "deserialize 10000 mixed values",
			fn() {
				sink =
					/** @type {import("../../../../lib/serialization/BinaryMiddleware").PrimitiveSerializableType[]} */ (
						middleware.deserialize(mixedSerialized, {})
					).length;
			}
		}
	]
};
