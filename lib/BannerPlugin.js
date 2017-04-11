/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */

"use strict";

const path = require("path");
const ConcatSource = require("webpack-sources").ConcatSource;
const ModuleFilenameHelpers = require("./ModuleFilenameHelpers");

function wrapComment(str) {
	if(!str.includes("\n")) return `/*! ${str} */`;
	return `/*!\n * ${str.split("\n").join("\n * ")}\n */`;
}

/*The following tokens are replaced in the name parameter:
 *
 [name] - Returns the file name.
 [ext] - Returns the extension. [ext] works for most available fields. ExtractTextPlugin is a notable exception to this rule.
 [hash] - Returns the build hash. If any portion of the build changes, this changes as well.
 [chunkhash] - Returns an entry chunk-specific hash. Each entry defined at the configuration receives a hash of own. If any portion of the entry changes, the hash changes as well. [chunkhash] is more granular than [hash] by definition.
 */

const REGEXP_HASH = /\[hash:?(\d+)?\]/gi,
			REGEXP_CHUNKHASH = /\[chunkhash:?(\d+)?\]/gi,
			REGEXP_NAME = /\[name\]/gi,
			REGEXP_EXT = /\[ext\]/gi,
			REGEXP_PATH = /\[path\]/gi;

// withHashLength, getReplacer from lib/TemplatedPathPlugin.js
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


const interpolate = (banner, file, hash, chunkHash) => {
	const [name, ext] = file.split(".");

	return banner
		.replace(REGEXP_HASH, withHashLength(getReplacer(hash)))
		.replace(REGEXP_CHUNKHASH, withHashLength(getReplacer(chunkHash)))
		.replace(REGEXP_NAME, name)
		.replace(REGEXP_EXT, ext)
}

class BannerPlugin {
	constructor(options) {
		if(arguments.length > 1)
			throw new Error("BannerPlugin only takes one argument (pass an options object)");
		if(typeof options === "string")
			options = {
				banner: options
			};
		this.options = options || {};
		this.banner = this.options.raw ? options.banner : wrapComment(options.banner);
	}

	apply(compiler) {
		const options = this.options,
			banner = this.banner;

		compiler.plugin("compilation", (compilation) => {
			compilation.plugin("optimize-chunk-assets", (chunks, callback) => {
				chunks.forEach((chunk) => {
					if(options.entryOnly && !chunk.isInitial()) return;
					chunk.files
						.filter(ModuleFilenameHelpers.matchObject.bind(undefined, options))
						.forEach((file) => {
							const chunkHash = chunk.renderedHash || chunk.hash
							const comment = interpolate(banner, file, compilation.hash, chunkHash)
							console.log('comment: ', comment);
							return compilation.assets[file] = new ConcatSource(comment, "\n", compilation.assets[file])
						});
				});
				callback();
			});
		});
	}
}

module.exports = BannerPlugin;
