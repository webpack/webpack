/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Jason Anderson @diurnalist
*/

"use strict";

const { basename, extname } = require("path");

const Module = require("./Module");

/** @typedef {import("./Compilation").PathData} PathData */

const REGEXP_ID = /\[id\]/gi;
const REGEXP_EXT = /\[ext\]/gi;
const REGEXP_NAME = /\[name\]/gi;
const REGEXP_HASH = /\[hash(?::(\d+))?\]/gi;
const REGEXP_QUERY = /\[query\]/gi;
const REGEXP_FILE = /\[file\]/gi;
const REGEXP_FILEBASE = /\[filebase\]/gi;
// Chunks
const REGEXP_CHUNKHASH = /\[chunkhash(?::(\d+))?\]/gi;
const REGEXP_CONTENTHASH = /\[contenthash(?::(\d+))?\]/gi;
// Modules
const REGEXP_MODULEID = /\[moduleid\]/gi;
const REGEXP_MODULEHASH = /\[modulehash(?::(\d+))?\]/gi;

const prepareId = id => {
	if (typeof id !== "string") return id;

	if (/^"\s\+*.*\+\s*"$/.test(id)) {
		const match = /^"\s\+*\s*(.*)\s*\+\s*"$/.exec(id);

		return `" + (${
			match[1]
		} + "").replace(/(^[.-]|[^a-zA-Z0-9_-])+/g, "_") + "`;
	}

	return id.replace(/(^[.-]|[^a-zA-Z0-9_-])+/g, "_");
};

const hashLength = (replacer, handler) => {
	const fn = (match, hashLength, ...args) => {
		const length = hashLength && parseInt(hashLength, 10);

		if (length && handler) {
			return handler(length);
		}

		const hash = replacer(match, hashLength, ...args);

		return length ? hash.slice(0, length) : hash;
	};

	return fn;
};

const replacer = (value, allowEmpty) => {
	const fn = (match, ...args) => {
		// last argument in replacer is the entire input string
		const input = args[args.length - 1];

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

/**
 * @param {string | function(PathData): string} path the raw path
 * @param {PathData} data context data
 * @returns {string} the interpolated path
 */
const replacePathVariables = (path, data) => {
	const chunkGraph = data.chunkGraph;

	let file = {};

	const replacements = new Map();

	if (data.filename) {
		if (typeof data.filename === "string") {
			const idx = data.filename.indexOf("?");

			if (idx >= 0) {
				file.path = data.filename.substr(0, idx);
				file.query = data.filename.substr(idx);
			} else {
				file.path = data.filename;
				file.query = "";
			}

			file.ext = extname(file.path);
			file.base = basename(file.path);
			file.name = file.base.replace(file.ext, "");
		}
	}

	// Chunk Context
	//
	// Placeholders
	//
	// [id] - chunk.id (0.js)
	// [ext] - file.ext (app.{js, css, ...})
	// [name] - chunk.name (app.js)
	// [hash] - data.hash (53276435.js)
	// [chunkhash] - chunk.hash (7823t4t4.js)
	// [contenthash] - chunk.contentHash[type] (3256urzg.js)
	// [query] - data.query (app.js?v=1.0.0)
	// [file] - file.path (/context/file.map.js)
	// [filebase] - file.base (file.map.js)
	if (data.chunk) {
		const chunk = data.chunk;

		const id = chunk.id;
		const name = chunk.name || chunk.id;

		const chunkHash = chunk.renderedHash || chunk.hash;
		// @ts-ignore
		const chunkHashWithLength = chunk.hashWithLength || undefined;

		const contentHashType = data.contentHashType;
		const contentHash =
			data.contentHash ||
			(contentHashType &&
				chunk.contentHash &&
				chunk.contentHash[contentHashType]);
		const contentHashWithLength =
			data.contentHashWithLength ||
			// @ts-ignore
			(chunk.contentHashWithLength &&
				// @ts-ignore
				chunk.contentHashWithLength[contentHashType]) ||
			undefined;

		replacements.set(REGEXP_ID, replacer(id));
		replacements.set(REGEXP_EXT, replacer(file.ext));
		replacements.set(REGEXP_NAME, replacer(name));
		replacements.set(
			REGEXP_HASH,
			hashLength(replacer(data.hash), data.hashWithLength)
		);
		replacements.set(
			REGEXP_CHUNKHASH,
			hashLength(replacer(chunkHash), chunkHashWithLength)
		);
		replacements.set(
			REGEXP_CONTENTHASH,
			hashLength(replacer(contentHash), contentHashWithLength)
		);
		// query is optional, it's OK if it's in a path
		// but there's nothing to replace it with
		replacements.set(REGEXP_QUERY, replacer(file.query, true));
		replacements.set(REGEXP_FILE, replacer(file.path));
		replacements.set(REGEXP_FILEBASE, replacer(file.base));
	}

	// Module Context
	//
	// Placeholders
	//
	// [id] - module.id (2.png)
	// [ext] - file.ext (file.{png, svg, ...})
	// [hash] - module.hash (6237543873.png)
	// [name] - file.name (file)
	// [file] - file.base (file.png)
	//
	// Legacy Placeholders
	//
	// [moduleid] - module.id (2.png)
	// [modulehash] - module.hash (6237543873.png)
	if (data.module) {
		const module = data.module;

		const id =
			module instanceof Module ? chunkGraph.getModuleId(module) : module.id;

		const hash =
			module instanceof Module
				? chunkGraph.getRenderedModuleHash(module)
				: module.renderedHash || module.hash;
		// @ts-ignore
		const hashWithLength = module.hashWithLength || undefined;

		replacements.set(REGEXP_ID, replacer(prepareId(id)));
		replacements.set(REGEXP_EXT, replacer(file.ext));
		replacements.set(REGEXP_NAME, replacer(file.name));
		replacements.set(REGEXP_FILE, replacer(file.base));
		replacements.set(REGEXP_HASH, hashLength(replacer(hash), hashWithLength));
		// Legacy
		replacements.set(REGEXP_MODULEID, replacer(prepareId(id)));
		replacements.set(
			REGEXP_MODULEHASH,
			hashLength(replacer(hash), hashWithLength)
		);
	}

	if (typeof path === "function") {
		path = path(data);
	}

	for (const [regExp, replacer] of replacements) {
		path = path.replace(regExp, replacer);
	}

	return path;
};

const plugin = "TemplatedPathPlugin";

class TemplatedPathPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap(plugin, compilation => {
			const mainTemplate = compilation.mainTemplate;

			mainTemplate.hooks.assetPath.tap(plugin, replacePathVariables);
		});
	}
}

module.exports = TemplatedPathPlugin;
