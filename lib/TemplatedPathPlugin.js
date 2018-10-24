/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Jason Anderson @diurnalist
*/

"use strict";

const Module = require("./Module");

/** @typedef {import("./Compilation").PathData} PathData */

const REGEXP_HASH = /\[hash(?::(\d+))?\]/gi,
	REGEXP_CHUNKHASH = /\[chunkhash(?::(\d+))?\]/gi,
	REGEXP_MODULEHASH = /\[modulehash(?::(\d+))?\]/gi,
	REGEXP_CONTENTHASH = /\[contenthash(?::(\d+))?\]/gi,
	REGEXP_NAME = /\[name\]/gi,
	REGEXP_ID = /\[id\]/gi,
	REGEXP_MODULEID = /\[moduleid\]/gi,
	REGEXP_FILE = /\[file\]/gi,
	REGEXP_QUERY = /\[query\]/gi,
	REGEXP_FILEBASE = /\[filebase\]/gi;

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

const withHashLength = (replacer, handlerFn) => {
	const fn = (match, hashLength, ...args) => {
		const length = hashLength && parseInt(hashLength, 10);
		if (length && handlerFn) {
			return handlerFn(length);
		}
		const hash = replacer(match, hashLength, ...args);
		return length ? hash.slice(0, length) : hash;
	};
	return fn;
};

const getReplacer = (value, allowEmpty) => {
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
	const chunk = data.chunk;
	const chunkId = chunk && chunk.id;
	const chunkName = chunk && (chunk.name || chunk.id);
	const chunkHash = chunk && (chunk.renderedHash || chunk.hash);
	const chunkHashWithLength =
		chunk && "hashWithLength" in chunk && chunk.hashWithLength;
	const contentHashType = data.contentHashType;
	const contentHash =
		data.contentHash ||
		(chunk &&
			contentHashType &&
			chunk.contentHash &&
			chunk.contentHash[contentHashType]);
	const contentHashWithLength =
		data.contentHashWithLength ||
		(chunk && "contentHashWithLength" in chunk
			? chunk.contentHashWithLength[contentHashType]
			: undefined);
	const module = data.module;
	const moduleId =
		module &&
		(module instanceof Module ? chunkGraph.getModuleId(module) : module.id);
	const moduleHash =
		module &&
		(module instanceof Module
			? chunkGraph.getRenderedModuleHash(module)
			: module.renderedHash || module.hash);
	const moduleHashWithLength =
		module && "hashWithLength" in module && module.hashWithLength;

	if (typeof path === "function") {
		path = path(data);
	}

	return (
		path
			.replace(
				REGEXP_HASH,
				withHashLength(getReplacer(data.hash), data.hashWithLength)
			)
			.replace(
				REGEXP_CHUNKHASH,
				withHashLength(getReplacer(chunkHash), chunkHashWithLength)
			)
			.replace(
				REGEXP_CONTENTHASH,
				withHashLength(getReplacer(contentHash), contentHashWithLength)
			)
			.replace(
				REGEXP_MODULEHASH,
				withHashLength(getReplacer(moduleHash), moduleHashWithLength)
			)
			.replace(REGEXP_ID, getReplacer(chunkId))
			.replace(REGEXP_MODULEID, getReplacer(prepareId(moduleId)))
			.replace(REGEXP_NAME, getReplacer(chunkName))
			.replace(REGEXP_FILE, getReplacer(data.filename))
			.replace(REGEXP_FILEBASE, getReplacer(data.basename))
			// query is optional, it's OK if it's in a path but there's nothing to replace it with
			.replace(REGEXP_QUERY, getReplacer(data.query, true))
	);
};

class TemplatedPathPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("TemplatedPathPlugin", compilation => {
			const mainTemplate = compilation.mainTemplate;

			mainTemplate.hooks.assetPath.tap(
				"TemplatedPathPlugin",
				replacePathVariables
			);
		});
	}
}

module.exports = TemplatedPathPlugin;
