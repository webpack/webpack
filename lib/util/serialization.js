/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { DEFAULTS } = require("../config/defaults");
const ObjectMiddleware = require("../serialization/ObjectMiddleware");
const SerializerMiddleware = require("../serialization/SerializerMiddleware");
const memoize = require("./memoize");

const getSerializer = memoize(() => require("../serialization/Serializer"));

const getSingleItemMiddleware = memoize(() =>
	require("../serialization/SingleItemMiddleware")
);

const getBinaryMiddleware = memoize(() =>
	require("../serialization/BinaryMiddleware")
);

const getBinaryMiddlewareInstance = memoize(
	() => new (getBinaryMiddleware())()
);

const registerSerializers = memoize(() => {
	require("./registerExternalSerializer");

	// Load internal paths with a relative require
	// This allows bundling all internal serializers
	const internalSerializables = require("./internalSerializables");

	ObjectMiddleware.registerLoader(/^webpack\/lib\//, (req) => {
		const loader =
			internalSerializables[
				/** @type {keyof import("./internalSerializables")} */
				(req.slice("webpack/lib/".length))
			];
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
 * @import {
 * 	MEASURE_END_OPERATION_TYPE as MEASURE_END_OPERATION,
 * 	MEASURE_START_OPERATION_TYPE as MEASURE_START_OPERATION
 * } from "../serialization/BinaryMiddleware"
 */
/** @import { HashFunction } from "../util/Hash" */
/** @import { IntermediateFileSystem } from "../util/fs" */

/**
 * Defines the serializer type used by this module.
 * @template D, S, C
 * @typedef {import("../serialization/Serializer")<D, S, C>} Serializer
 */

/**
 * @type {Serializer<EXPECTED_ANY, EXPECTED_ANY, EXPECTED_ANY>}
 */
let buffersSerializer;

// Expose serialization API
module.exports = {
	get register() {
		return ObjectMiddleware.register;
	},
	get registerLoader() {
		return ObjectMiddleware.registerLoader;
	},
	get registerNotSerializable() {
		return ObjectMiddleware.registerNotSerializable;
	},
	get NOT_SERIALIZABLE() {
		return ObjectMiddleware.NOT_SERIALIZABLE;
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
		const SingleItemMiddleware = getSingleItemMiddleware();
		return /** @type {Serializer<EXPECTED_ANY, EXPECTED_ANY, EXPECTED_ANY>} */ (
			buffersSerializer = new Serializer([
				new SingleItemMiddleware(),
				new ObjectMiddleware((context) => {
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

		const FileMiddleware = require("../serialization/FileMiddleware");

		const fileMiddleware = new FileMiddleware(fs, hashFunction);
		const binaryMiddleware = getBinaryMiddlewareInstance();
		const SingleItemMiddleware = getSingleItemMiddleware();
		return /** @type {Serializer<D, S, C>} */ (
			new Serializer([
				new SingleItemMiddleware(),
				new ObjectMiddleware((context) => {
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
