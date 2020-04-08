/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Jason Anderson @diurnalist
*/

"use strict";

const { basename, extname } = require("path");
const util = require("util");
const Chunk = require("./Chunk");
const Module = require("./Module");

/** @typedef {import("./Compilation").AssetInfo} AssetInfo */
/** @typedef {import("./Compilation").PathData} PathData */
/** @typedef {import("./Compiler")} Compiler */

const REGEXP = /\[\\*([\w:]+)\\*\]/gi;

const prepareId = id => {
	if (typeof id !== "string") return id;

	if (/^"\s\+*.*\+\s*"$/.test(id)) {
		const match = /^"\s\+*\s*(.*)\s*\+\s*"$/.exec(id);

		return `" + (${match[1]} + "").replace(/(^[.-]|[^a-zA-Z0-9_-])+/g, "_") + "`;
	}

	return id.replace(/(^[.-]|[^a-zA-Z0-9_-])+/g, "_");
};

const hashLength = (replacer, handler, assetInfo) => {
	const fn = (match, arg, input) => {
		if (assetInfo) assetInfo.immutable = true;
		const length = arg && parseInt(arg, 10);

		if (length && handler) {
			return handler(length);
		}

		const hash = replacer(match, arg, input);

		return length ? hash.slice(0, length) : hash;
	};

	return fn;
};

const replacer = (value, allowEmpty) => {
	const fn = (match, arg, input) => {
		if (value === null || value === undefined) {
			if (!allowEmpty) {
				throw new Error(
					`Path variable ${match} not implemented in this context: ${input}`
				);
			}

			return "";
		} else {
			return `${value}`;
		}
	};

	return fn;
};

const deprecationCache = new Map();
const deprecatedFunction = (() => () => {})();
const deprecated = (fn, message, code) => {
	let d = deprecationCache.get(message);
	if (d === undefined) {
		d = util.deprecate(deprecatedFunction, message, code);
		deprecationCache.set(message, d);
	}
	return (...args) => {
		d();
		return fn(...args);
	};
};

const getFilenameReplacementObj = filename => {
	const idx = filename.indexOf("?");

	let file, query;

	if (idx >= 0) {
		file = filename.substr(0, idx);
		query = filename.substr(idx);
	} else {
		file = filename;
		query = "";
	}

	const ext = extname(file);
	const base = basename(file);
	const name = base.slice(0, base.length - ext.length);
	const path = file.slice(0, file.length - base.length);
	return {
		file,
		query,
		path,
		base,
		name,
		ext
	};
};

/**
 * @param {string | function(PathData, AssetInfo=): string} path the raw path
 * @param {PathData} data context data
 * @param {AssetInfo} assetInfo extra info about the asset (will be written to)
 * @returns {string} the interpolated path
 */
const replacePathVariables = (path, data, assetInfo) => {
	const chunkGraph = data.chunkGraph;

	/** @type {Map<string, Function>} */
	const replacements = new Map();

	// Filename context
	//
	// Placeholders
	//
	// for /some/path/file.js?query:
	// [file] - /some/path/file.js
	// [query] - ?query
	// [base] - file.js
	// [path] - /some/path/
	// [name] - file
	// [ext] - .js
	if (data.filename || data.filenameMap) {
		let replacementObj;
		if (typeof data.filename === "string") {
			replacementObj = getFilenameReplacementObj(data.filename);
		} else if (data.filenameMap) {
			// this map is of the form {moduleId: filename}
			const map = data.filenameMap.map;
			replacementObj = {};
			// convert this map into a form where each filename placeholder (file, base, etc.),
			// has an associated map of form {moduleId: strValue}
			Object.keys(map).forEach(assetId => {
				let filename = map[assetId];
				let rep = getFilenameReplacementObj(filename);
				Object.keys(rep).forEach(fileKey => {
					if (!replacementObj[fileKey]) {
						replacementObj[fileKey] = {};
					}
					replacementObj[fileKey][assetId] = rep[fileKey];
				});
			});

			// convert these filename placeholder maps into strings
			Object.keys(replacementObj).forEach(fileKey => {
				replacementObj[fileKey] = data.filenameMap.placeholderMapToStr(
					replacementObj[fileKey]
				);
			});
		}

		if (replacementObj) {
			replacements.set("file", replacer(replacementObj.file));
			replacements.set("query", replacer(replacementObj.query, true));
			replacements.set("path", replacer(replacementObj.path, true));
			replacements.set("base", replacer(replacementObj.base));
			replacements.set("name", replacer(replacementObj.name));
			replacements.set("ext", replacer(replacementObj.ext, true));
			// Legacy
			replacements.set(
				"filebase",
				deprecated(
					replacer(replacementObj.base),
					"[filebase] is now [base]",
					"DEP_WEBPACK_TEMPLATE_PATH_PLUGIN_REPLACE_PATH_VARIABLES_FILENAME"
				)
			);
		}
	}

	// Compilation context
	//
	// Placeholders
	//
	// [fullhash] - data.hash (3a4b5c6e7f)
	//
	// Legacy Placeholders
	//
	// [hash] - data.hash (3a4b5c6e7f)
	if (data.hash) {
		const hashReplacer = hashLength(
			replacer(data.hash),
			data.hashWithLength,
			assetInfo
		);

		replacements.set("fullhash", hashReplacer);

		// Legacy
		replacements.set(
			"hash",
			deprecated(
				hashReplacer,
				"[hash] is now [fullhash] (also consider using [chunkhash] or [contenthash], see documentation for details)",
				"DEP_WEBPACK_TEMPLATE_PATH_PLUGIN_REPLACE_PATH_VARIABLES_HASH"
			)
		);
	}

	// Chunk Context
	//
	// Placeholders
	//
	// [id] - chunk.id (0.js)
	// [name] - chunk.name (app.js)
	// [chunkhash] - chunk.hash (7823t4t4.js)
	// [contenthash] - chunk.contentHash[type] (3256u3zg.js)
	if (data.chunk) {
		const chunk = data.chunk;

		const contentHashType = data.contentHashType;

		const idReplacer = replacer(chunk.id);
		const nameReplacer = replacer(chunk.name || chunk.id);
		const chunkhashReplacer = hashLength(
			replacer(chunk instanceof Chunk ? chunk.renderedHash : chunk.hash),
			"hashWithLength" in chunk ? chunk.hashWithLength : undefined,
			assetInfo
		);
		const contenthashReplacer = hashLength(
			replacer(
				data.contentHash ||
					(contentHashType &&
						chunk.contentHash &&
						chunk.contentHash[contentHashType])
			),
			data.contentHashWithLength ||
				("contentHashWithLength" in chunk && chunk.contentHashWithLength
					? chunk.contentHashWithLength[contentHashType]
					: undefined),
			assetInfo
		);

		replacements.set("id", idReplacer);
		replacements.set("name", nameReplacer);
		replacements.set("chunkhash", chunkhashReplacer);
		replacements.set("contenthash", contenthashReplacer);
	}

	// Module Context
	//
	// Placeholders
	//
	// [id] - module.id (2.png)
	// [hash] - module.hash (6237543873.png)
	//
	// Legacy Placeholders
	//
	// [moduleid] - module.id (2.png)
	// [modulehash] - module.hash (6237543873.png)
	if (data.module) {
		const module = data.module;

		const idReplacer = replacer(
			prepareId(
				module instanceof Module ? chunkGraph.getModuleId(module) : module.id
			)
		);
		const hashReplacer = hashLength(
			replacer(
				module instanceof Module
					? chunkGraph.getRenderedModuleHash(module)
					: module.hash
			),
			"hashWithLength" in module ? module.hashWithLength : undefined,
			assetInfo
		);

		replacements.set("id", idReplacer);
		replacements.set("hash", hashReplacer);
		// Legacy
		replacements.set(
			"moduleid",
			deprecated(
				idReplacer,
				"[moduleid] is now [id]",
				"DEP_WEBPACK_TEMPLATE_PATH_PLUGIN_REPLACE_PATH_VARIABLES_MODULE_ID"
			)
		);
		replacements.set(
			"modulehash",
			deprecated(
				hashReplacer,
				"[modulehash] is now [hash]",
				"DEP_WEBPACK_TEMPLATE_PATH_PLUGIN_REPLACE_PATH_VARIABLES_MODULE_HASH"
			)
		);
	}

	// Other things
	if (data.url) {
		replacements.set("url", replacer(data.url));
	}

	if (typeof path === "function") {
		path = path(data, assetInfo);
	}

	path = path.replace(REGEXP, (match, content) => {
		if (content.length + 2 === match.length) {
			const contentMatch = /^(\w+)(?::(\w+))?$/.exec(content);
			if (!contentMatch) return match;
			const [, kind, arg] = contentMatch;
			const replacer = replacements.get(kind);
			if (replacer !== undefined) {
				return replacer(match, arg, path);
			}
		} else if (match.startsWith("[\\") && match.endsWith("\\]")) {
			return `[${match.slice(2, -2)}]`;
		}
		return match;
	});

	return path;
};

const plugin = "TemplatedPathPlugin";

class TemplatedPathPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(plugin, compilation => {
			compilation.hooks.assetPath.tap(plugin, replacePathVariables);
		});
	}
}

module.exports = TemplatedPathPlugin;
