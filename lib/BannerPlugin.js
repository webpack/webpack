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
		const options = this.options;
		const banner = this.banner;

		compiler.plugin("compilation", (compilation) => {
			compilation.plugin("optimize-chunk-assets", (chunks, callback) => {
				chunks.forEach((chunk) => {
					if(options.entryOnly && !chunk.isInitial()) return;
					chunk.files
						.filter(ModuleFilenameHelpers.matchObject.bind(undefined, options))
						.forEach((file) => {
							let basename;
							let query = "";
							let filename = file;
							const hash = compilation.hash;
							const querySplit = filename.indexOf("?");

							if(querySplit >= 0) {
								query = filename.substr(querySplit);
								filename = filename.substr(0, querySplit);
							}

							const lastSlashIndex = filename.lastIndexOf("/");

							if(lastSlashIndex === -1) {
								basename = filename;
							} else {
								basename = filename.substr(lastSlashIndex + 1);
							}

							const comment = compilation.getPath(banner, {
								hash,
								chunk,
								filename,
								basename,
								query,
							});

							return compilation.assets[file] = new ConcatSource(comment, "\n", compilation.assets[file]);
						});
				});
				callback();
			});
		});
	}
}

module.exports = BannerPlugin;
