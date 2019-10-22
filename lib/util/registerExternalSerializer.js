/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { register } = require("./serialization");

const Position = /** @type {TODO} */ (require("acorn")).Position;
const SourceLocation = require("acorn").SourceLocation;
const {
	CachedSource,
	ConcatSource,
	OriginalSource,
	PrefixSource,
	RawSource,
	ReplaceSource,
	SourceMapSource
} = require("webpack-sources");

/** @typedef {import("acorn").Position} Position */
/** @typedef {import("../Dependency").RealDependencyLocation} RealDependencyLocation */
/** @typedef {import("../Dependency").SourcePosition} SourcePosition */
/** @typedef {import("./serialization").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("./serialization").ObjectSerializerContext} ObjectSerializerContext */

const CURRENT_MODULE = "webpack/lib/util/registerExternalSerializer";

register(
	CachedSource,
	CURRENT_MODULE,
	"webpack-sources/CachedSource",
	new (class CachedSourceSerializer {
		/**
		 * @param {CachedSource} source the cached source to be serialized
		 * @param {ObjectSerializerContext} context context
		 * @returns {void}
		 */
		serialize(source, { write }) {
			write(source._source);
			write(source._cachedBuffer);
			write(source._cachedSource);
			write(source._cachedSize);
			write(source._cachedMaps);
		}

		/**
		 * @param {ObjectDeserializerContext} context context
		 * @returns {CachedSource} cached source
		 */
		deserialize({ read }) {
			const source = new CachedSource(read());
			source._cachedBuffer = read();
			source._cachedSource = read();
			source._cachedSize = read();
			source._cachedMaps = read();
			return source;
		}
	})()
);

register(
	RawSource,
	CURRENT_MODULE,
	"webpack-sources/RawSource",
	new (class RawSourceSerializer {
		/**
		 * @param {RawSource} source the raw source to be serialized
		 * @param {ObjectSerializerContext} context context
		 * @returns {void}
		 */
		serialize(source, { write }) {
			const data = source.source();
			write(data);
		}

		/**
		 * @param {ObjectDeserializerContext} context context
		 * @returns {RawSource} raw source
		 */
		deserialize({ read }) {
			const source = read();
			return new RawSource(source);
		}
	})()
);

register(
	ConcatSource,
	CURRENT_MODULE,
	"webpack-sources/ConcatSource",
	new (class ConcatSourceSerializer {
		/**
		 * @param {ConcatSource} source the concat source to be serialized
		 * @param {ObjectSerializerContext} context context
		 * @returns {void}
		 */
		serialize(source, { write }) {
			write(source.children);
		}

		/**
		 * @param {ObjectDeserializerContext} context context
		 * @returns {ConcatSource} concat source
		 */
		deserialize({ read }) {
			const source = new ConcatSource();
			const children = read();
			source.children = children;
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
		 * @param {PrefixSource} source the prefix source to be serialized
		 * @param {ObjectSerializerContext} context context
		 * @returns {void}
		 */
		serialize(source, { write }) {
			write(source._prefix);
			write(source._source);
		}

		/**
		 * @param {ObjectDeserializerContext} context context
		 * @returns {PrefixSource} prefix source
		 */
		deserialize({ read }) {
			return new PrefixSource(read(), read());
		}
	})()
);

register(
	ReplaceSource,
	CURRENT_MODULE,
	"webpack-sources/ReplaceSource",
	new (class ReplaceSourceSerializer {
		/**
		 * @param {ReplaceSource} source the replace source to be serialized
		 * @param {ObjectSerializerContext} context context
		 * @returns {void}
		 */
		serialize(source, { write }) {
			write(source._source);
			write(source._name);
			const replacements = Array.from(source._replacements);
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
		 * @param {ObjectDeserializerContext} context context
		 * @returns {ReplaceSource} replace source
		 */
		deserialize({ read }) {
			const source = new ReplaceSource(read(), read());
			const len = read();
			for (let i = 0; i < len; i++) {
				source.replace(read(), read(), read(), read());
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
		 * @param {OriginalSource} source the original source to be serialized
		 * @param {ObjectSerializerContext} context context
		 * @returns {void}
		 */
		serialize(source, { write }) {
			write(source.source());
			write(source._name);
		}

		/**
		 * @param {ObjectDeserializerContext} context context
		 * @returns {OriginalSource} original source
		 */
		deserialize({ read }) {
			return new OriginalSource(read(), read());
		}
	})()
);

register(
	SourceLocation,
	CURRENT_MODULE,
	"acorn/SourceLocation",
	new (class SourceLocationSerializer {
		/**
		 * @param {SourceLocation} loc the location to be serialized
		 * @param {ObjectSerializerContext} context context
		 * @returns {void}
		 */
		serialize(loc, { write }) {
			write(loc.start.line);
			write(loc.start.column);
			write(loc.end.line);
			write(loc.end.column);
		}

		/**
		 * @param {ObjectDeserializerContext} context context
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
	})()
);

register(
	Position,
	CURRENT_MODULE,
	"acorn/Position",
	new (class PositionSerializer {
		/**
		 * @param {Position} pos the position to be serialized
		 * @param {ObjectSerializerContext} context context
		 * @returns {void}
		 */
		serialize(pos, { write }) {
			write(pos.line);
			write(pos.column);
		}

		/**
		 * @param {ObjectDeserializerContext} context context
		 * @returns {SourcePosition} position
		 */
		deserialize({ read }) {
			return {
				line: read(),
				column: read()
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
		 * @param {SourceMapSource} source the source map source to be serialized
		 * @param {ObjectSerializerContext} context context
		 * @returns {void}
		 */
		serialize(source, { write }) {
			const data = source.sourceAndMap({});
			write(data.source);
			write(JSON.stringify(data.map));
		}

		/**
		 * @param {ObjectDeserializerContext} context context
		 * @returns {SourceMapSource} source source map source
		 */
		deserialize({ read }) {
			const source = read();
			const map = read();
			return new SourceMapSource(source, "unknown", map);
		}
	})()
);
