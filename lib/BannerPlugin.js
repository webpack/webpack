/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import { createRequire } from "node:module";

import Compilation from "./Compilation.js";
import ModuleFilenameHelpers from "./ModuleFilenameHelpers.js";
import Template from "./Template.js";
import { ConcatSource } from "./util/webpack-sources.js";

const require = createRequire(import.meta.url);

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../declarations/plugins/BannerPlugin.js").BannerPluginArgument} BannerPluginArgument */
/** @typedef {import("../declarations/plugins/BannerPlugin.js").BannerPluginOptions} BannerPluginOptions */
/** @typedef {import("./Compilation.js").PathDataChunk} PathDataChunk */
/** @typedef {import("./Compiler.js").default} Compiler */
/** @typedef {import("./Chunk.js").default} Chunk */

/** @typedef {(data: { hash?: string, chunk: Chunk, filename: string }) => string} BannerFunction */

/**
 * Wraps banner text in a JavaScript block comment, preserving multi-line
 * formatting and escaping accidental comment terminators.
 * @param {string} str string to wrap
 * @returns {string} wrapped string
 */
const wrapComment = (str) => {
	if (!str.includes("\n")) {
		return Template.toComment(str);
	}
	return `/*!\n * ${str
		.replaceAll("*/", "* /")
		.split("\n")
		.join("\n * ")
		.replaceAll(/\s+\n/g, "\n")
		.trimEnd()}\n */`;
};

const PLUGIN_NAME = "BannerPlugin";

/**
 * Prepends or appends banner text to emitted assets that match the configured
 * file filters.
 */
class BannerPlugin {
	/**
	 * Normalizes banner options and compiles the configured banner source into a
	 * function that can render per-asset banner text.
	 * @param {BannerPluginArgument} options options object
	 */
	constructor(options) {
		if (typeof options === "string" || typeof options === "function") {
			options = {
				banner: options
			};
		}

		/** @type {BannerPluginOptions} */
		this.options = options;

		const bannerOption = options.banner;
		if (typeof bannerOption === "function") {
			const getBanner = bannerOption;
			/** @type {BannerFunction} */
			this.banner = this.options.raw
				? getBanner
				: /** @type {BannerFunction} */ (data) => wrapComment(getBanner(data));
		} else {
			const banner = this.options.raw
				? bannerOption
				: wrapComment(bannerOption);
			/** @type {BannerFunction} */
			this.banner = () => banner;
		}
	}

	/**
	 * Validates the configured options and injects rendered banner comments into
	 * matching compilation assets at the configured process-assets stage.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.validate.tap(PLUGIN_NAME, () => {
			compiler.validate(
				() => require("../schemas/plugins/BannerPlugin.json"),
				this.options,
				{
					name: "Banner Plugin",
					baseDataPath: "options"
				},
				(options) =>
					/** @type {typeof import("../schemas/plugins/BannerPlugin.check.js")} */ (
						require("../schemas/plugins/BannerPlugin.check.js")
					)(options)
			);
		});
		const options = this.options;
		const banner = this.banner;
		const matchObject = ModuleFilenameHelpers.matchObject.bind(
			undefined,
			options
		);
		/** @type {WeakMap<Source, { source: ConcatSource, comment: string }>} */
		const cache = new WeakMap();
		const stage =
			this.options.stage || Compilation.PROCESS_ASSETS_STAGE_ADDITIONS;

		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			compilation.hooks.processAssets.tap({ name: PLUGIN_NAME, stage }, () => {
				for (const chunk of compilation.chunks) {
					if (options.entryOnly && !chunk.canBeInitial()) {
						continue;
					}

					for (const file of chunk.files) {
						if (!matchObject(file)) {
							continue;
						}

						/** @type {PathDataChunk} */
						const data = { chunk, filename: file };

						const comment = compilation.getPath(
							/** @type {string | import("./TemplatedPathPlugin.js").TemplatePathFn<PathDataChunk>} */
							(banner),
							data
						);

						compilation.updateAsset(file, (old) => {
							const cached = cache.get(old);
							if (!cached || cached.comment !== comment) {
								const source = options.footer
									? new ConcatSource(old, "\n", comment)
									: new ConcatSource(comment, "\n", old);
								cache.set(old, { source, comment });
								return source;
							}
							return cached.source;
						});
					}
				}
			});
		});
	}
}

export default BannerPlugin;

export { BannerPlugin as "module.exports" };
