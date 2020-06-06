/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const BinaryMiddleware = require("../serialization/BinaryMiddleware");
const FileMiddleware = require("../serialization/FileMiddleware");
const ObjectMiddleware = require("../serialization/ObjectMiddleware");
const Serializer = require("../serialization/Serializer");
const SerializerMiddleware = require("../serialization/SerializerMiddleware");
const SingleItemMiddleware = require("../serialization/SingleItemMiddleware");
const internalSerializables = require("./internalSerializables");

/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */

const { register, registerLoader, registerNotSerializable } = ObjectMiddleware;

const binaryMiddleware = new BinaryMiddleware();

// Expose serialization API
exports.register = register;
exports.registerLoader = registerLoader;
exports.registerNotSerializable = registerNotSerializable;
exports.NOT_SERIALIZABLE = ObjectMiddleware.NOT_SERIALIZABLE;
exports.MEASURE_START_OPERATION = BinaryMiddleware.MEASURE_START_OPERATION;
exports.MEASURE_END_OPERATION = BinaryMiddleware.MEASURE_END_OPERATION;
exports.buffersSerializer = new Serializer([
	new SingleItemMiddleware(),
	new ObjectMiddleware(context => {
		if (context.write) {
			context.writeLazy = value => {
				context.write(SerializerMiddleware.createLazy(value, binaryMiddleware));
			};
		}
	}),
	binaryMiddleware
]);
exports.createFileSerializer = fs => {
	const fileMiddleware = new FileMiddleware(fs);
	return new Serializer([
		new SingleItemMiddleware(),
		new ObjectMiddleware(context => {
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
};

require("./registerExternalSerializer");

// Load internal paths with a relative require
// This allows bundling all internal serializers
registerLoader(/^webpack\/lib\//, req => {
	const loader = internalSerializables[req.slice("webpack/lib/".length)];
	if (loader) {
		loader();
	} else {
		console.warn(`${req} not found in internalSerializables`);
	}
	return true;
});
