/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Jason Anderson @diurnalist
*/

var REGEXP_HASH = /\[hash(?::(\d+))?\]/gi,
	REGEXP_CHUNKHASH = /\[chunkhash(?::(\d+))?\]/gi,
	REGEXP_NAME = /\[name\]/gi,
	REGEXP_ID = /\[id\]/gi,
	REGEXP_FILE = /\[file\]/gi,
	REGEXP_QUERY = /\[query\]/gi,
	REGEXP_FILEBASE = /\[filebase\]/gi;

// Using global RegExp for .test is dangerous
// We use a normal RegExp instead of .test
var REGEXP_HASH_FOR_TEST = new RegExp(REGEXP_HASH.source, "i"),
	REGEXP_CHUNKHASH_FOR_TEST = new RegExp(REGEXP_CHUNKHASH.source, "i"),
	REGEXP_NAME_FOR_TEST = new RegExp(REGEXP_NAME.source, "i");

// Backwards compatibility; expose regexes on Template object
var Template = require("./Template");
Template.REGEXP_HASH = REGEXP_HASH;
Template.REGEXP_CHUNKHASH = REGEXP_CHUNKHASH;
Template.REGEXP_NAME = REGEXP_NAME;
Template.REGEXP_ID = REGEXP_ID;
Template.REGEXP_FILE = REGEXP_FILE;
Template.REGEXP_QUERY = REGEXP_QUERY;
Template.REGEXP_FILEBASE = REGEXP_FILEBASE;

function TemplatedPathPlugin() {}

module.exports = TemplatedPathPlugin;

function withHashLength(replacer, handlerFn) {
	return function (_, hashLength) {
		var length = hashLength && parseInt(hashLength, 10);
		if(length && handlerFn) {
			return handlerFn(length);
		}
		var hash = replacer.apply(this, arguments);
		return length ? hash.slice(0, length) : hash;
	};
}

function getReplacer(value, allowEmpty) {
	return function (match) {
		// last argument in replacer is the entire input string
		var input = arguments[arguments.length - 1];
		if (value == null) {
			if (!allowEmpty) throw new Error("Path variable " + match + " not implemented in this context: " + input);
			return "";
		} else {
			return "" + value;
		}
	};
}

function replacePathVariables(path, data) {
	var chunk = data.chunk;
	var chunkId = chunk && chunk.id;
	var chunkName = chunk && (chunk.name || chunk.id);
	var chunkHash = chunk && (chunk.renderedHash || chunk.hash);
	var chunkHashWithLength = chunk && chunk.hashWithLength;

	return path
		.replace(REGEXP_HASH, withHashLength(getReplacer(data.hash), data.hashWithLength))
		.replace(REGEXP_CHUNKHASH, withHashLength(getReplacer(chunkHash), chunkHashWithLength))
		.replace(REGEXP_ID, getReplacer(chunkId))
		.replace(REGEXP_NAME, getReplacer(chunkName))
		.replace(REGEXP_FILE, getReplacer(data.filename))
		.replace(REGEXP_FILEBASE, getReplacer(data.basename))
		// query is optional, it's OK if it's in a path but there's nothing to replace it with
		.replace(REGEXP_QUERY, getReplacer(data.query, true));
}

TemplatedPathPlugin.prototype.constructor = TemplatedPathPlugin;
TemplatedPathPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation) {
		var mainTemplate = compilation.mainTemplate;

		mainTemplate.plugin("asset-path", replacePathVariables);

		mainTemplate.plugin("global-hash", function(chunk, paths) {
			var outputOptions = this.outputOptions;
			var publicPath = outputOptions.publicPath || "";
			var filename = outputOptions.filename || "";
			var chunkFilename = outputOptions.chunkFilename || "";
			if(REGEXP_HASH_FOR_TEST.test(publicPath) || REGEXP_CHUNKHASH_FOR_TEST.test(publicPath) || REGEXP_NAME_FOR_TEST.test(publicPath))
				return true;
			if(REGEXP_HASH_FOR_TEST.test(filename))
				return true;
			if(REGEXP_HASH_FOR_TEST.test(chunkFilename) || REGEXP_CHUNKHASH_FOR_TEST.test(chunkFilename) || REGEXP_NAME_FOR_TEST.test(chunkFilename))
				return true;
			if(REGEXP_HASH_FOR_TEST.test(paths.join("|")))
				return true;
		});
	});
};
