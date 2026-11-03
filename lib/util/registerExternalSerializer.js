/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ValidationError = require("schema-utils").ValidationError;
const {
	CachedSource,
	ConcatSource,
	OriginalSource,
	PrefixSource,
	RawSource,
	ReplaceSource,
	SourceMapSource
} = require("webpack-sources");
const ParserPosition = require("../javascript/syntax-parser").ParserPosition;
const { register } = require("./serialization");

/** @import { SourcePosition } from "../graph/Dependency" */
/** @import { Source } from "webpack-sources" */
/**
 * What a replace source writes: its original source and name, the replacement
 * count, each replacement's start and end, then each one's content and name.
 * @typedef {Source | string | number | undefined} ReplaceSourceStreamValue
 */
/**
 * @import {
 * 	ObjectDeserializerContext,
 * 	ObjectSerializerContext
 * } from "../serialization/ObjectMiddleware"
 */

const CURRENT_MODULE = "webpack/lib/util/registerExternalSerializer";

register(
	CachedSource,
	CURRENT_MODULE,
	"webpack-sources/CachedSource",
	new (class CachedSourceSerializer {
		/**
		 * Serializes this instance into the provided serializer context.
		 * @param {CachedSource} source the cached source to be serialized
		 * @param {ObjectSerializerContext<readonly (Source | ReturnType<CachedSource["getCachedData"]>)[]>} context context
		 * @returns {void}
		 */
		serialize(source, { write, writeLazy }) {
			if (writeLazy) {
				writeLazy(source.originalLazy());
			} else {
				write(source.original());
			}
			write(source.getCachedData());
		}

		/**
		 * Restores this instance from the provided deserializer context.
		 * @param {ObjectDeserializerContext<[Source | (() => Source), ReturnType<CachedSource["getCachedData"]>]>} context context
		 * @returns {CachedSource} cached source
		 */
		deserialize(context) {
			return new CachedSource(context.read(), context.rest.read());
		}
	})()
);

register(
	RawSource,
	CURRENT_MODULE,
	"webpack-sources/RawSource",
	new (class RawSourceSerializer {
		/**
		 * Serializes this instance into the provided serializer context.
		 * @param {RawSource} source the raw source to be serialized
		 * @param {ObjectSerializerContext<[Buffer, boolean]>} context context
		 * @returns {void}
		 */
		serialize(source, context) {
			context.write(source.buffer()).write(!source.isBuffer());
		}

		/**
		 * Restores this instance from the provided deserializer context.
		 * @param {ObjectDeserializerContext<[Buffer, boolean]>} context context
		 * @returns {RawSource} raw source
		 */
		deserialize(context) {
			return new RawSource(context.read(), context.rest.read());
		}
	})()
);

register(
	ConcatSource,
	CURRENT_MODULE,
	"webpack-sources/ConcatSource",
	new (class ConcatSourceSerializer {
		/**
		 * Serializes this instance into the provided serializer context.
		 * @param {ConcatSource} source the concat source to be serialized
		 * @param {ObjectSerializerContext<[ReturnType<ConcatSource["getChildren"]>]>} context context
		 * @returns {void}
		 */
		serialize(source, context) {
			context.write(source.getChildren());
		}

		/**
		 * Restores this instance from the provided deserializer context.
		 * @param {ObjectDeserializerContext<[ReturnType<ConcatSource["getChildren"]>]>} context context
		 * @returns {ConcatSource} concat source
		 */
		deserialize(context) {
			const source = new ConcatSource();
			source.addAllSkipOptimizing(context.read());
			return source;
		}
	})()
);

register(
	PrefixSource,
	CURRENT_MODULE,
	"webpack-sources/PrefixSource",
	new (class PrefixSourceSerializer {
		/**
		 * Serializes this instance into the provided serializer context.
		 * @param {PrefixSource} source the prefix source to be serialized
		 * @param {ObjectSerializerContext<[string, Source]>} context context
		 * @returns {void}
		 */
		serialize(source, context) {
			context.write(source.getPrefix()).write(source.original());
		}

		/**
		 * Restores this instance from the provided deserializer context.
		 * @param {ObjectDeserializerContext<[string, Source]>} context context
		 * @returns {PrefixSource} prefix source
		 */
		deserialize(context) {
			return new PrefixSource(context.read(), context.rest.read());
		}
	})()
);

register(
	ReplaceSource,
	CURRENT_MODULE,
	"webpack-sources/ReplaceSource",
	new (class ReplaceSourceSerializer {
		/**
		 * Serializes this instance into the provided serializer context.
		 * @param {ReplaceSource} source the replace source to be serialized
		 * @param {ObjectSerializerContext<readonly ReplaceSourceStreamValue[]>} context context
		 * @returns {void}
		 */
		serialize(source, { write }) {
			write(source.original());
			write(source.getName());
			const replacements = source.getReplacements();
			write(replacements.length);
			for (const repl of replacements) {
				write(repl.start);
				write(repl.end);
			}
			for (const repl of replacements) {
				write(repl.content);
				write(repl.name);
			}
		}

		/**
		 * Restores this instance from the provided deserializer context.
		 * @param {ObjectDeserializerContext<readonly ReplaceSourceStreamValue[]>} context context
		 * @returns {ReplaceSource} replace source
		 */
		deserialize({ read }) {
			const source = new ReplaceSource(
				/** @type {Source} */ (read()),
				/** @type {string | undefined} */ (read())
			);
			const len = /** @type {number} */ (read());
			/** @type {number[]} */
			const startEndBuffer = [];
			for (let i = 0; i < len; i++) {
				startEndBuffer.push(
					/** @type {number} */ (read()),
					/** @type {number} */ (read())
				);
			}
			let j = 0;
			for (let i = 0; i < len; i++) {
				source.replace(
					startEndBuffer[j++],
					startEndBuffer[j++],
					/** @type {string} */ (read()),
					/** @type {string | undefined} */ (read())
				);
			}
			return source;
		}
	})()
);

register(
	OriginalSource,
	CURRENT_MODULE,
	"webpack-sources/OriginalSource",
	new (class OriginalSourceSerializer {
		/**
		 * Serializes this instance into the provided serializer context.
		 * @param {OriginalSource} source the original source to be serialized
		 * @param {ObjectSerializerContext<[Buffer, string]>} context context
		 * @returns {void}
		 */
		serialize(source, context) {
			context.write(source.buffer()).write(source.getName());
		}

		/**
		 * Restores this instance from the provided deserializer context.
		 * @param {ObjectDeserializerContext<[Buffer, string]>} context context
		 * @returns {OriginalSource} original source
		 */
		deserialize(context) {
			return new OriginalSource(context.read(), context.rest.read());
		}
	})()
);

register(
	ParserPosition,
	CURRENT_MODULE,
	"webpack/ParserPosition",
	new (class ParserPositionSerializer {
		/**
		 * Serializes this instance into the provided serializer context.
		 * @param {ParserPosition} pos the position to be serialized
		 * @param {ObjectSerializerContext<[number, number]>} context context
		 * @returns {void}
		 */
		serialize(pos, context) {
			context.write(pos.line).write(pos.column);
		}

		/**
		 * Restores this instance from the provided deserializer context.
		 * @param {ObjectDeserializerContext<[number, number]>} context context
		 * @returns {SourcePosition} position
		 */
		deserialize(context) {
			return {
				line: context.read(),
				column: context.rest.read()
			};
		}
	})()
);

register(
	SourceMapSource,
	CURRENT_MODULE,
	"webpack-sources/SourceMapSource",
	new (class SourceMapSourceSerializer {
		/**
		 * Serializes this instance into the provided serializer context.
		 * @param {SourceMapSource} source the source map source to be serialized
		 * @param {ObjectSerializerContext<[ReturnType<SourceMapSource["getArgsAsBuffers"]>]>} context context
		 * @returns {void}
		 */
		serialize(source, context) {
			context.write(source.getArgsAsBuffers());
		}

		/**
		 * Restores this instance from the provided deserializer context.
		 * @param {ObjectDeserializerContext<[ReturnType<SourceMapSource["getArgsAsBuffers"]>]>} context context
		 * @returns {SourceMapSource} source source map source
		 */
		deserialize(context) {
			return new SourceMapSource(...context.read());
		}
	})()
);

register(
	ValidationError,
	CURRENT_MODULE,
	"schema-utils/ValidationError",
	new (class ValidationErrorSerializer {
		/**
		 * Serializes this instance into the provided serializer context.
		 * @param {ValidationError} error the source map source to be serialized
		 * @param {ObjectSerializerContext<ConstructorParameters<typeof ValidationError>>} context context
		 * @returns {void}
		 */
		serialize(error, context) {
			context
				.write(error.errors)
				.write(error.schema)
				.write({
					name: error.headerName,
					baseDataPath: error.baseDataPath,
					postFormatter: error.postFormatter || undefined
				});
		}

		/**
		 * Restores this instance from the provided deserializer context.
		 * @param {ObjectDeserializerContext<ConstructorParameters<typeof ValidationError>>} context context
		 * @returns {ValidationError} error
		 */
		deserialize(context) {
			const c1 = context.rest;
			return new ValidationError(context.read(), c1.read(), c1.rest.read());
		}
	})()
);
