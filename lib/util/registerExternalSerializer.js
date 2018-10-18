/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ObjectMiddleware = require("../serialization/ObjectMiddleware");

const SourceLocation = require("acorn").SourceLocation;
const CachedSource = require("webpack-sources").CachedSource;
const ConcatSource = require("webpack-sources").ConcatSource;
const OriginalSource = require("webpack-sources").OriginalSource;
const PrefixSource = require("webpack-sources").PrefixSource;
const RawSource = require("webpack-sources").RawSource;
const ReplaceSource = require("webpack-sources").ReplaceSource;
const SourceMapSource = require("webpack-sources").SourceMapSource;

/** @typedef {import("../Dependency").RealDependencyLocation} RealDependencyLocation */

const CURRENT_MODULE = "webpack/lib/util/registerExternalSerializer";

ObjectMiddleware.register(
	CachedSource,
	CURRENT_MODULE,
	"webpack-sources/CachedSource",
	new class CachedSourceSerializer {
		/**
		 * @param {CachedSource} source the cached source to be serialized
		 * @param {ObjectMiddleware.ObjectSerializerContext} context context
		 * @returns {void}
		 */
		serialize(source, { write }) {
			write(source._source);
			write(source._cachedSource);
			write(source._cachedSize);
			write(source._cachedMaps);
		}

		/**
		 * @param {ObjectMiddleware.ObjectDeserializerContext} context context
		 * @returns {CachedSource} cached source
		 */
		deserialize({ read }) {
			const source = new CachedSource(read());
			source._cachedSource = read();
			source._cachedSize = read();
			source._cachedMaps = read();
			return source;
		}
	}()
);

ObjectMiddleware.register(
	RawSource,
	CURRENT_MODULE,
	"webpack-sources/RawSource",
	new class RawSourceSerializer {
		/**
		 * @param {RawSource} source the raw source to be serialized
		 * @param {ObjectMiddleware.ObjectSerializerContext} context context
		 * @returns {void}
		 */
		serialize(source, { write }) {
			const data = source.source();
			write(data);
		}

		/**
		 * @param {ObjectMiddleware.ObjectDeserializerContext} context context
		 * @returns {RawSource} raw source
		 */
		deserialize({ read }) {
			const source = read();
			return new RawSource(source);
		}
	}()
);

ObjectMiddleware.register(
	ConcatSource,
	CURRENT_MODULE,
	"webpack-sources/ConcatSource",
	new class ConcatSourceSerializer {
		/**
		 * @param {ConcatSource} source the concat source to be serialized
		 * @param {ObjectMiddleware.ObjectSerializerContext} context context
		 * @returns {void}
		 */
		serialize(source, { write }) {
			write(source.children);
		}

		/**
		 * @param {ObjectMiddleware.ObjectDeserializerContext} context context
		 * @returns {ConcatSource} concat source
		 */
		deserialize({ read }) {
			const source = new ConcatSource();
			const children = read();
			source.children = children;
			return source;
		}
	}()
);

ObjectMiddleware.register(
	PrefixSource,
	CURRENT_MODULE,
	"webpack-sources/PrefixSource",
	new class PrefixSourceSerializer {
		/**
		 * @param {PrefixSource} source the prefix source to be serialized
		 * @param {ObjectMiddleware.ObjectSerializerContext} context context
		 * @returns {void}
		 */
		serialize(source, { write }) {
			write(source._prefix);
			write(source._source);
		}

		/**
		 * @param {ObjectMiddleware.ObjectDeserializerContext} context context
		 * @returns {PrefixSource} prefix source
		 */
		deserialize({ read }) {
			return new PrefixSource(read(), read());
		}
	}()
);

ObjectMiddleware.register(
	ReplaceSource,
	CURRENT_MODULE,
	"webpack-sources/ReplaceSource",
	new class ReplaceSourceSerializer {
		/**
		 * @param {ReplaceSource} source the replace source to be serialized
		 * @param {ObjectMiddleware.ObjectSerializerContext} context context
		 * @returns {void}
		 */
		serialize(source, { write }) {
			write(source._source);
			write(source._name);
			const replacements = /** @type {TODO} */ (Array.from(
				source.replacements
			));
			replacements.sort((a, b) => {
				return a.insertIndex - b.insertIndex;
			});
			write(replacements.length);
			for (const repl of replacements) {
				write(repl.start);
				write(repl.end);
				write(repl.content);
				write(repl.name);
			}
		}

		/**
		 * @param {ObjectMiddleware.ObjectDeserializerContext} context context
		 * @returns {ReplaceSource} replace source
		 */
		deserialize({ read }) {
			const source = new ReplaceSource(read(), read());
			const len = read();
			for (let i = 0; i < len; i++) {
				// @ts-ignore TODO signature is missing one argument in typings
				source.replace(read(), read(), read(), read());
			}
			return source;
		}
	}()
);

ObjectMiddleware.register(
	OriginalSource,
	CURRENT_MODULE,
	"webpack-sources/OriginalSource",
	new class OriginalSourceSerializer {
		/**
		 * @param {OriginalSource} source the original source to be serialized
		 * @param {ObjectMiddleware.ObjectSerializerContext} context context
		 * @returns {void}
		 */
		serialize(source, { write }) {
			write(source.source());
			write(source._name);
		}

		/**
		 * @param {ObjectMiddleware.ObjectDeserializerContext} context context
		 * @returns {OriginalSource} original source
		 */
		deserialize({ read }) {
			return new OriginalSource(read(), read());
		}
	}()
);

ObjectMiddleware.register(
	SourceLocation,
	CURRENT_MODULE,
	"acorn/SourceLocation",
	new class SourceLocationSerializer {
		/**
		 * @param {SourceLocation} loc the location to be serialized
		 * @param {ObjectMiddleware.ObjectSerializerContext} context context
		 * @returns {void}
		 */
		serialize(loc, { write }) {
			write(loc.start.line);
			write(loc.start.column);
			write(loc.end.line);
			write(loc.end.column);
		}

		/**
		 * @param {ObjectMiddleware.ObjectDeserializerContext} context context
		 * @returns {RealDependencyLocation} location
		 */
		deserialize({ read }) {
			return {
				start: {
					line: read(),
					column: read()
				},
				end: {
					line: read(),
					column: read()
				}
			};
		}
	}()
);

ObjectMiddleware.register(
	SourceMapSource,
	CURRENT_MODULE,
	"webpack-sources/SourceMapSource",
	new class SourceMapSourceSerializer {
		/**
		 * @param {SourceMapSource} source the source map source to be serialized
		 * @param {ObjectMiddleware.ObjectSerializerContext} context context
		 * @returns {void}
		 */
		serialize(source, { write }) {
			const data = source.sourceAndMap({});
			write(data.source);
			write(JSON.stringify(data.map));
		}

		/**
		 * @param {ObjectMiddleware.ObjectDeserializerContext} context context
		 * @returns {SourceMapSource} source source map source
		 */
		deserialize({ read }) {
			const source = read();
			const map = read();
			return new SourceMapSource(source, "unknown", map);
		}
	}()
);
