// @ts-nocheck
/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const Serializer = require("../serialization/Serializer");
const TypeRegistry = require("../serialization/TypeRegistry");
const memoize = require("./memoize");

/** @typedef {import("../util/Hash").HashFunction} HashFunction */
/** @typedef {import("../util/fs").IntermediateFileSystem} IntermediateFileSystem */

const MEASURE_START_OPERATION = Symbol("MEASURE_START_OPERATION");
const MEASURE_END_OPERATION = Symbol("MEASURE_END_OPERATION");

/**
 * @param {EXPECTED_ANY} serializer serializer or codec
 * @returns {{ encode: EXPECTED_FUNCTION, decode: EXPECTED_FUNCTION }} codec
 */
const normalizeCodec = (serializer) => {
	if (serializer.encode && serializer.decode) return serializer;
	return {
		encode: (value, encoder) => serializer.serialize(value, encoder),
		decode: (decoder) => serializer.deserialize(decoder)
	};
};

const registerSerializers = memoize(() => {
	require("./registerExternalSerializer");

	const internalSerializables = require("./internalSerializables");

	TypeRegistry.registerLoader(/^webpack\/lib\//, (req) => {
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

/** @type {Serializer | undefined} */
let buffersSerializer;

module.exports = {
	register(Constructor, request, name, serializer) {
		TypeRegistry.register(
			Constructor,
			request,
			name,
			normalizeCodec(serializer)
		);
	},
	registerLoader: TypeRegistry.registerLoader,
	registerNotSerializable: TypeRegistry.registerNotSerializable,
	NOT_SERIALIZABLE: TypeRegistry.NOT_SERIALIZABLE,
	MEASURE_START_OPERATION,
	MEASURE_END_OPERATION,
	get buffersSerializer() {
		if (buffersSerializer !== undefined) return buffersSerializer;
		registerSerializers();
		return (buffersSerializer = new Serializer());
	},
	/**
	 * Creates a file serializer.
	 * @template D, S, C
	 * @param {IntermediateFileSystem} fs filesystem
	 * @param {HashFunction} hashFunction hash function to use
	 * @returns {{ serialize: (value: D, context: C) => Promise<true | null>, deserialize: (value: S, context: C) => Promise<D> }} file serializer
	 */
	createFileSerializer: (fs, hashFunction) => {
		registerSerializers();

		const FileStore = require("../serialization/FileStore");

		return new FileStore(fs, hashFunction);
	}
};
