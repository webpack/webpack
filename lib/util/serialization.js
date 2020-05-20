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
const { contextify, absolutify } = require("../util/identifier");
const internalSerializables = require("./internalSerializables");

/** @typedef {{context: string, portable: boolean, associatedObjectForCache: object}} FileSerializerOptions */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("./fs").IntermediateFileSystem} IntermediateFileSystem */
/**
 * @param {FileSerializerOptions} options options
 * @returns {{writeAbsolutePath(s: string): string, readAbsolutePath(s: string): string}} context
 */
const createAbsolutePathsWriteReadMethods = ({
	context,
	portable,
	associatedObjectForCache
}) => {
	if (portable === false) {
		// write/read paths as is
		return {
			writeAbsolutePath: p => p,
			readAbsolutePath: p => p
		};
	}

	const writeAbsolutePath = path => {
		if (!path) return path;

		return contextify(context, path, associatedObjectForCache);
	};
	const readAbsolutePath = path => {
		if (!path) return path;

		return absolutify(context, path, associatedObjectForCache);
	};

	return {
		writeAbsolutePath,
		readAbsolutePath
	};
};

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

/**
 * @param {IntermediateFileSystem} fs filesystem
 * @param {FileSerializerOptions} options options
 * @returns {Serializer} serializer instance
 */
exports.createFileSerializer = (fs, options) => {
	const fileMiddleware = new FileMiddleware(fs);
	const {
		writeAbsolutePath,
		readAbsolutePath
	} = createAbsolutePathsWriteReadMethods(options);

	const extendContext = context => {
		if (context.write) {
			context.writeLazy = value => {
				context.write(SerializerMiddleware.createLazy(value, binaryMiddleware));
			};
			context.writeSeparate = (value, options) => {
				context.write(
					SerializerMiddleware.createLazy(value, fileMiddleware, options)
				);
			};
			context.writePath = value => {
				const contextified = writeAbsolutePath(value);
				const isAbsolute = contextified !== value;

				context.write(isAbsolute);
				context.write(contextified);
			};
			context.writePathSet = value => {
				context.write(value.size);

				const flags = [];

				for (const path of value) {
					const contextified = writeAbsolutePath(path);

					flags.push(contextified !== path);
					context.write(contextified);
				}

				for (const flag of flags) {
					context.write(flag);
				}
			};
			context.writePathArray = value => {
				context.write(value.length);

				const flags = [];

				for (const path of value) {
					const contextified = writeAbsolutePath(path);

					flags.push(contextified !== path);
					context.write(contextified);
				}

				for (const flag of flags) {
					context.write(flag);
				}
			};
		} else if (context.read) {
			context.readPath = () => {
				const isAbsolute = context.read();
				const path = context.read();

				return isAbsolute ? readAbsolutePath(path) : path;
			};
			context.readPathSet = () => {
				const size = context.read();
				const paths = [];

				for (let i = 0; i < size; i++) {
					paths.push(context.read());
				}

				const set = new Set();

				for (let i = 0; i < size; i++) {
					const isAbsolute = context.read();
					set.add(isAbsolute ? readAbsolutePath(paths[i]) : paths[i]);
				}

				return set;
			};
			context.readPathArray = () => {
				const size = context.read();
				const paths = [];

				for (let i = 0; i < size; i++) {
					paths.push(context.read());
				}

				for (let i = 0; i < size; i++) {
					const isAbsolute = context.read();

					if (isAbsolute) {
						paths[i] = readAbsolutePath(paths[i]);
					}
				}

				return paths;
			};
		}
	};

	return new Serializer([
		new SingleItemMiddleware(),
		new ObjectMiddleware(extendContext),
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
