/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */

"use strict";

const { ConcatSource } = require("webpack-sources");
const ModuleFilenameHelpers = require("./ModuleFilenameHelpers");
const Template = require("./Template");

const validateOptions = require("schema-utils");
const schema = require("../schemas/plugins/BannerPlugin.json");

/**
 * BannerPlugin Options class.
 * @typedef {Object=} BannerOptions
 * @property {string|Function} banner The banner as string or function():string
 * @property {boolean} raw If true, banner will not be wrapped in a comment
 * @property {boolean} entryOnly If true, the banner will only be added to the entry chunks
 * @property {string | RegExp | Array} test
 * @property {string | RegExp | Array} include
 * @property {string | RegExp | Array} exclude
 */

/**
 * @param {string} str the banner
 * @returns {string} returns the banner wrapped in a comment
 */
const wrapComment = str => {
	if (!str.includes("\n")) {
		return Template.toComment(str);
	}
	return `/*!\n * ${str
		.replace(/\*\//g, "* /")
		.split("\n")
		.join("\n * ")}\n */`;
};

/**
 * Adds a banner to the top of each generated chunk
 */
class BannerPlugin {
	/**
	 *
	 * @param {BannerOptions|string|Function} options The BannerPlugin options object
	 */
	constructor(options) {
		if (arguments.length > 1) {
			throw new Error(
				"BannerPlugin only takes one argument (pass an options object)"
			);
		}

		validateOptions(schema, options, "Banner Plugin");

		if (typeof options === "string" || typeof options === "function") {
			options = {
				banner: options
			};
		}

		this.options = options || {};

		if (typeof options.banner === "function") {
			const getBanner = this.options.banner;
			this.banner = this.options.raw
				? getBanner
				: data => wrapComment(getBanner(data));
		} else {
			const banner = this.options.raw
				? this.options.banner
				: wrapComment(this.options.banner);
			this.banner = () => banner;
		}
	}

	/**
	 * Apply the plugin
	 * @param {TODO} compiler Webpack Compiler
	 * @returns {void}
	 */
	apply(compiler) {
		const options = this.options;
		const banner = this.banner;
		const matchObject = ModuleFilenameHelpers.matchObject.bind(
			undefined,
			options
		);

		compiler.hooks.compilation.tap("BannerPlugin", compilation => {
			compilation.hooks.optimizeChunkAssets.tap("BannerPlugin", chunks => {
				for (const chunk of chunks) {
					if (options.entryOnly && !chunk.canBeInitial()) {
						continue;
					}

					for (const file of chunk.files) {
						if (!matchObject(file)) {
							continue;
						}

						let basename;
						let query = "";
						let filename = file;
						const hash = compilation.hash;
						const querySplit = filename.indexOf("?");

						if (querySplit >= 0) {
							query = filename.substr(querySplit);
							filename = filename.substr(0, querySplit);
						}

						const lastSlashIndex = filename.lastIndexOf("/");

						if (lastSlashIndex === -1) {
							basename = filename;
						} else {
							basename = filename.substr(lastSlashIndex + 1);
						}

						const data = {
							hash,
							chunk,
							filename,
							basename,
							query
						};

						const comment = compilation.getPath(banner(data), data);

						compilation.assets[file] = new ConcatSource(
							comment,
							"\n",
							compilation.assets[file]
						);
					}
				}
			});
		});
	}
}

module.exports = BannerPlugin;
