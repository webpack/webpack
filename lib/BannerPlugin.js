/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */

"use strict";

const ConcatSource = require("webpack-sources").ConcatSource;
const ModuleFilenameHelpers = require("./ModuleFilenameHelpers");

const wrapComment = (str) => {
	if(!str.includes("\n")) return `/*! ${str} */`;
	return `/*!\n * ${str.split("\n").join("\n * ")}\n */`;
};

const REGEXP_HASH = /\[hash:?(\d+)?\]/gi,
	REGEXP_CHUNKHASH = /\[chunkhash:?(\d+)?\]/gi,
	REGEXP_NAME = /\[name\]/gi,
	REGEXP_EXT = /\[ext\]/gi;

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

const getReplacer = (value) => {
	return function(match) {
		return `${value}`;
	};
};

const interpolate = (banner, file, hash, chunkHash) => {
	let name, ext;
	const splitPoint = file.lastIndexOf(".");

	if(splitPoint > -1) {
		name = file.slice(0, splitPoint);
		ext = file.slice(splitPoint, -1);
	} else {
		name = file;
		ext = "";
	}

	return banner
		.replace(REGEXP_HASH, withHashLength(getReplacer(hash)))
		.replace(REGEXP_CHUNKHASH, withHashLength(getReplacer(chunkHash)))
		.replace(REGEXP_NAME, name)
		.replace(REGEXP_EXT, ext);
};

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
							const chunkHash = chunk.renderedHash || chunk.hash;
							const comment = interpolate(banner, file, compilation.hash, chunkHash);
							return compilation.assets[file] = new ConcatSource(comment, "\n", compilation.assets[file]);
						});
				});
				callback();
			});
		});
	}
}

module.exports = BannerPlugin;
