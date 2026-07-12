/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

import { createRequire } from "node:module";

import { DEFAULTS } from "../config/defaults.js";
import ObjectMiddleware from "../serialization/ObjectMiddleware.js";
import memoize from "./memoize.js";

const require = createRequire(import.meta.url);

/** @typedef {import("../serialization/BinaryMiddleware.js").MEASURE_END_OPERATION_TYPE} MEASURE_END_OPERATION */
/** @typedef {import("../serialization/BinaryMiddleware.js").MEASURE_START_OPERATION_TYPE} MEASURE_START_OPERATION */
/** @typedef {import("../util/Hash.js").HashFunction} HashFunction */
/** @typedef {import("../util/fs.js").IntermediateFileSystem} IntermediateFileSystem */

/**
 * Defines the serializer type used by this module.
 * @template D, S, C
 * @typedef {import("../serialization/Serializer.js").default<D, S, C>} Serializer
 */

const getBinaryMiddleware = memoize(
	() =>
		/** @type {typeof import("../serialization/BinaryMiddleware.js").default} */ (
			require("../serialization/BinaryMiddleware.js")
		)
);
// ObjectMiddleware is imported eagerly: makeSerializable() runs at module
// evaluation of every serializable class, so it always loads anyway
const getObjectMiddleware = () => ObjectMiddleware;
const getSingleItemMiddleware = memoize(
	() =>
		/** @type {typeof import("../serialization/SingleItemMiddleware.js").default} */ (
			require("../serialization/SingleItemMiddleware.js")
		)
);
const getSerializer = memoize(() => require("../serialization/Serializer.js"));
const getSerializerMiddleware = memoize(
	() =>
		/** @type {typeof import("../serialization/SerializerMiddleware.js").default} */ (
			require("../serialization/SerializerMiddleware.js")
		)
);

const getBinaryMiddlewareInstance = memoize(
	() => new (getBinaryMiddleware())()
);

const registerSerializers = memoize(() => {
	/** @type {typeof import("./registerExternalSerializer.js")} */ (
		require("./registerExternalSerializer.js")
	);

	// Load internal paths with a relative require
	// This allows bundling all internal serializers
	const internalSerializables =
		/** @type {typeof import("./internalSerializables.js").default} */ (
			require("./internalSerializables.js")
		);

	getObjectMiddleware().registerLoader(/^webpack\/lib\//, (req) => {
		const loader =
			/** @type {Record<string, (() => EXPECTED_ANY) | undefined>} */ (
				internalSerializables
			)[req.slice("webpack/lib/".length)];
		if (loader) {
			loader();
		} else {
			// eslint-disable-next-line no-console
			console.warn(`${req} not found in internalSerializables`);
		}
		return true;
	});
});

/**
 * @type {Serializer<EXPECTED_ANY, EXPECTED_ANY, EXPECTED_ANY>}
 */
let buffersSerializer;

// Expose serialization API; getters keep the heavy serialization stack
// unloaded until first use
const serialization = {
	get register() {
		return getObjectMiddleware().register;
	},
	get registerLoader() {
		return getObjectMiddleware().registerLoader;
	},
	get registerNotSerializable() {
		return getObjectMiddleware().registerNotSerializable;
	},
	get NOT_SERIALIZABLE() {
		return getObjectMiddleware().NOT_SERIALIZABLE;
	},
	/** @type {MEASURE_START_OPERATION} */
	get MEASURE_START_OPERATION() {
		return getBinaryMiddleware().MEASURE_START_OPERATION;
	},
	/** @type {MEASURE_END_OPERATION} */
	get MEASURE_END_OPERATION() {
		return getBinaryMiddleware().MEASURE_END_OPERATION;
	},
	get buffersSerializer() {
		if (buffersSerializer !== undefined) return buffersSerializer;
		registerSerializers();
		const Serializer = getSerializer();
		const binaryMiddleware = getBinaryMiddlewareInstance();
		const SerializerMiddleware = getSerializerMiddleware();
		const SingleItemMiddleware = getSingleItemMiddleware();
		return /** @type {Serializer<EXPECTED_ANY, EXPECTED_ANY, EXPECTED_ANY>} */ (
			buffersSerializer = new Serializer([
				new SingleItemMiddleware(),
				new (getObjectMiddleware())((context) => {
					if ("write" in context) {
						context.writeLazy = (value) => {
							context.write(
								SerializerMiddleware.createLazy(value, binaryMiddleware)
							);
						};
					}
				}, DEFAULTS.HASH_FUNCTION),
				binaryMiddleware
			])
		);
	},
	/**
	 * Creates a file serializer.
	 * @template D, S, C
	 * @param {IntermediateFileSystem} fs filesystem
	 * @param {HashFunction} hashFunction hash function to use
	 * @returns {Serializer<D, S, C>} file serializer
	 */
	createFileSerializer: (fs, hashFunction) => {
		registerSerializers();
		const Serializer = getSerializer();

		const FileMiddleware =
			/** @type {typeof import("../serialization/FileMiddleware.js").default} */ (
				require("../serialization/FileMiddleware.js")
			);

		const fileMiddleware = new FileMiddleware(fs, hashFunction);
		const binaryMiddleware = getBinaryMiddlewareInstance();
		const SerializerMiddleware = getSerializerMiddleware();
		const SingleItemMiddleware = getSingleItemMiddleware();
		return /** @type {Serializer<D, S, C>} */ (
			new Serializer([
				new SingleItemMiddleware(),
				new (getObjectMiddleware())((context) => {
					if ("write" in context) {
						context.writeLazy = (value) => {
							context.write(
								SerializerMiddleware.createLazy(value, binaryMiddleware)
							);
						};
						context.writeSeparate = (value, options) => {
							const lazy = SerializerMiddleware.createLazy(
								value,
								fileMiddleware,
								options
							);
							context.write(lazy);
							return lazy;
						};
					}
				}, hashFunction),
				binaryMiddleware,
				fileMiddleware
			])
		);
	}
};

export default serialization;

export { serialization as "module.exports" };
