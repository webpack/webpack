/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const memoize = require("./memoize");

/** @typedef {import("../serialization/BinaryMiddleware").MEASURE_END_OPERATION_TYPE} MEASURE_END_OPERATION */
/** @typedef {import("../serialization/BinaryMiddleware").MEASURE_START_OPERATION_TYPE} MEASURE_START_OPERATION */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("../serialization/Serializer")} Serializer */

const getBinaryMiddleware = memoize(() =>
	require("../serialization/BinaryMiddleware")
);
const getObjectMiddleware = memoize(() =>
	require("../serialization/ObjectMiddleware")
);
const getSingleItemMiddleware = memoize(() =>
	require("../serialization/SingleItemMiddleware")
);
const getSerializer = memoize(() => require("../serialization/Serializer"));
const getSerializerMiddleware = memoize(() =>
	require("../serialization/SerializerMiddleware")
);

const getBinaryMiddlewareInstance = memoize(
	() => new (getBinaryMiddleware())()
);

const registerSerializers = memoize(() => {
	require("./registerExternalSerializer");

	// Load internal paths with a relative require
	// This allows bundling all internal serializers
	const internalSerializables = require("./internalSerializables");
	getObjectMiddleware().registerLoader(/^webpack\/lib\//, req => {
		const loader = internalSerializables[req.slice("webpack/lib/".length)];
		if (loader) {
			loader();
		} else {
			console.warn(`${req} not found in internalSerializables`);
		}
		return true;
	});
});

/** @type {Serializer} */
let buffersSerializer;

// Expose serialization API
module.exports = {
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
		return (buffersSerializer = new Serializer([
			new SingleItemMiddleware(),
			new (getObjectMiddleware())(context => {
				if (context.write) {
					context.writeLazy = value => {
						context.write(
							SerializerMiddleware.createLazy(value, binaryMiddleware)
						);
					};
				}
			}),
			binaryMiddleware
		]));
	},
	createFileSerializer: fs => {
		registerSerializers();
		const Serializer = getSerializer();
		const FileMiddleware = require("../serialization/FileMiddleware");
		const fileMiddleware = new FileMiddleware(fs);
		const binaryMiddleware = getBinaryMiddlewareInstance();
		const SerializerMiddleware = getSerializerMiddleware();
		const SingleItemMiddleware = getSingleItemMiddleware();
		return new Serializer([
			new SingleItemMiddleware(),
			new (getObjectMiddleware())(context => {
				if (context.write) {
					context.writeLazy = value => {
						context.write(
							SerializerMiddleware.createLazy(value, binaryMiddleware)
						);
					};
					context.writeSeparate = (value, options) => {
						context.write(
							SerializerMiddleware.createLazy(value, fileMiddleware, options)
						);
					};
				}
			}),
			binaryMiddleware,
			fileMiddleware
		]);
	}
};
