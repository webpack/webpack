/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Jason Anderson @diurnalist
*/
"use strict";

const REGEXP_HASH = /\[hash(?::(\d+))?\]/gi,
	REGEXP_CHUNKHASH = /\[chunkhash(?::(\d+))?\]/gi,
	REGEXP_NAME = /\[name\]/gi,
	REGEXP_ID = /\[id\]/gi,
	REGEXP_FILE = /\[file\]/gi,
	REGEXP_QUERY = /\[query\]/gi,
	REGEXP_FILEBASE = /\[filebase\]/gi;

// Using global RegExp for .test is dangerous
// We use a normal RegExp instead of .test
const REGEXP_HASH_FOR_TEST = new RegExp(REGEXP_HASH.source, "i"),
	REGEXP_CHUNKHASH_FOR_TEST = new RegExp(REGEXP_CHUNKHASH.source, "i"),
	REGEXP_NAME_FOR_TEST = new RegExp(REGEXP_NAME.source, "i");

// TODO: remove in webpack 3
// Backwards compatibility; expose regexes on Template object
const Template = require("./Template");
Template.REGEXP_HASH = REGEXP_HASH;
Template.REGEXP_CHUNKHASH = REGEXP_CHUNKHASH;
Template.REGEXP_NAME = REGEXP_NAME;
Template.REGEXP_ID = REGEXP_ID;
Template.REGEXP_FILE = REGEXP_FILE;
Template.REGEXP_QUERY = REGEXP_QUERY;
Template.REGEXP_FILEBASE = REGEXP_FILEBASE;

const withHashLength = (replacer, handlerFn) => {
	return function(_, hashLength) {
		const length = hashLength && parseInt(hashLength, 10);
		if(length && handlerFn) {
			return handlerFn(length);
		}
		const hash = replacer.apply(this, arguments);
		return length ? hash.slice(0, length) : hash;
	};
};

const getReplacer = (value, allowEmpty) => {
	return function(match) {
		// last argument in replacer is the entire input string
		const input = arguments[arguments.length - 1];
		if(value === null || value === undefined) {
			if(!allowEmpty) throw new Error(`Path variable ${match} not implemented in this context: ${input}`);
			return "";
		} else {
			return `${value}`;
		}
	};
};

const replacePathVariables = (path, data) => {
	const chunk = data.chunk;
	const chunkId = chunk && chunk.id;
	const chunkName = chunk && (chunk.name || chunk.id);
	const chunkHash = chunk && (chunk.renderedHash || chunk.hash);
	const chunkHashWithLength = chunk && chunk.hashWithLength;

	if(data.noChunkHash && REGEXP_CHUNKHASH_FOR_TEST.test(path)) {
		throw new Error(`Cannot use [chunkhash] for chunk in '${path}' (use [hash] instead)`);
	}

	return path
		.replace(REGEXP_HASH, withHashLength(getReplacer(data.hash), data.hashWithLength))
		.replace(REGEXP_CHUNKHASH, withHashLength(getReplacer(chunkHash), chunkHashWithLength))
		.replace(REGEXP_ID, getReplacer(chunkId))
		.replace(REGEXP_NAME, getReplacer(chunkName))
		.replace(REGEXP_FILE, getReplacer(data.filename))
		.replace(REGEXP_FILEBASE, getReplacer(data.basename))
		// query is optional, it's OK if it's in a path but there's nothing to replace it with
		.replace(REGEXP_QUERY, getReplacer(data.query, true));
};

class TemplatedPathPlugin {
	apply(compiler) {
		compiler.plugin("compilation", compilation => {
			const mainTemplate = compilation.mainTemplate;

			mainTemplate.plugin("asset-path", replacePathVariables);

			mainTemplate.plugin("global-hash", function(chunk, paths) {
				const outputOptions = this.outputOptions;
				const publicPath = outputOptions.publicPath || "";
				const filename = outputOptions.filename || "";
				const chunkFilename = outputOptions.chunkFilename || outputOptions.filename;
				if(REGEXP_HASH_FOR_TEST.test(publicPath) || REGEXP_CHUNKHASH_FOR_TEST.test(publicPath) || REGEXP_NAME_FOR_TEST.test(publicPath))
					return true;
				if(REGEXP_HASH_FOR_TEST.test(filename))
					return true;
				if(REGEXP_HASH_FOR_TEST.test(chunkFilename))
					return true;
				if(REGEXP_HASH_FOR_TEST.test(paths.join("|")))
					return true;
			});

			mainTemplate.plugin("hash-for-chunk", function(hash, chunk) {
				const outputOptions = this.outputOptions;
				const chunkFilename = outputOptions.chunkFilename || outputOptions.filename;
				if(REGEXP_CHUNKHASH_FOR_TEST.test(chunkFilename))
					hash.update(JSON.stringify(chunk.getChunkMaps(true, true).hash));
				if(REGEXP_NAME_FOR_TEST.test(chunkFilename))
					hash.update(JSON.stringify(chunk.getChunkMaps(true, true).name));
			});
		});
	}
}

module.exports = TemplatedPathPlugin;
