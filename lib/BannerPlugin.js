/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */

"use strict";

const ConcatSource = require("webpack-sources").ConcatSource;
const ModuleFilenameHelpers = require("./ModuleFilenameHelpers");

function wrapComment(str) {
	if(!str.includes("\n")) return `/*! ${str} */`;
	return `/*!\n * ${str.split("\n").join("\n * ")}\n */`;
}

/*The following tokens are replaced in the name parameter:
 *
 *[ext] the extension of the resource
 *[name] the basename of the resource
 *[path] the path of the resource relative to the context query parameter or option.
 *[folder] the folder of the resource is in.
 *[emoji] a random emoji representation of options.content
 *[emoji:<length>] same as above, but with a customizable number of emojis
 *[hash] the hash of options.content (Buffer) (by default it's the hex digest of the md5 hash)
 *[<hashType>:hash:<digestType>:<length>] optionally one can configure
 *other hashTypes, i. e. sha1, md5, sha256, sha512
 *other digestTypes, i. e. hex, base26, base32, base36, base49, base52, base58, base62, base64
 *and length the length in chars
 *[N] the N-th match obtained from matching the current file name against options.regExp
 */

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
			console.log('compilation: ', JSON.stringify(compilation));
			compilation.plugin("optimize-chunk-assets", (chunks, callback) => {
				chunks.forEach((chunk) => {
					if(options.entryOnly && !chunk.isInitial()) return;

					chunk.files
						.filter(ModuleFilenameHelpers.matchObject.bind(undefined, options))
						.forEach((file) => {
							return compilation.assets[file] = new ConcatSource(
								banner, "\n", compilation.assets[file]
							)
						});
				});
				callback();
			});
		});
	}
}

module.exports = BannerPlugin;
