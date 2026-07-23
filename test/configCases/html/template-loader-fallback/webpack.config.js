"use strict";

const path = require("path");

const PLUGIN = "MiniHtmlWebpackPlugin";
const CHILD = "MiniHtmlWebpackCompiler";

/** @typedef {(templateParameters: { title: string }) => string} Render */

// A faithful miniature of html-webpack-plugin: it compiles the HTML template in
// a *child compiler* via `templateLoader!template.html`, evaluates the resulting
// JS module to a render function, and emits the rendered page. `experiments.html`
// stays at its "auto" default (no `.html` rule), so this reproduces the real
// regression: the child module for `template.html` must be parsed as JavaScript
// (a loader is applied) and not as the built-in HTML type, or the loader's JS
// output is misparsed and the build breaks.
class MiniHtmlWebpackPlugin {
	/**
	 * @param {{ template: string, filename: string, templateParameters: { title: string } }} options options
	 */
	constructor(options) {
		this.options = options;
	}

	/**
	 * @param {import("../../../../").Compiler} compiler compiler
	 */
	apply(compiler) {
		const {
			EntryPlugin,
			node: { NodeTemplatePlugin, NodeTargetPlugin },
			library: { EnableLibraryPlugin },
			LoaderTargetPlugin,
			optimize: { LimitChunkCountPlugin },
			Compilation,
			sources: { RawSource }
		} = compiler.webpack;
		const { template, filename, templateParameters } = this.options;
		const loader = path.resolve(__dirname, "template-loader.js");

		compiler.hooks.thisCompilation.tap(PLUGIN, (compilation) => {
			compilation.hooks.processAssets.tapAsync(
				{ name: PLUGIN, stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL },
				(assets, callback) => {
					const childCompiler = compilation.createChildCompiler(
						CHILD,
						{ filename: "__child-[name]", library: { type: "commonjs2" } },
						[
							new NodeTemplatePlugin(),
							new NodeTargetPlugin(),
							new EnableLibraryPlugin("commonjs2"),
							new LoaderTargetPlugin("node"),
							new EntryPlugin(
								compiler.context,
								`${loader}!${template}`,
								"html"
							),
							new LimitChunkCountPlugin({ maxChunks: 1 })
						]
					);

					/** @type {string | undefined} */
					let source;
					childCompiler.hooks.compilation.tap(CHILD, (childCompilation) => {
						childCompilation.hooks.processAssets.tap(
							{
								name: CHILD,
								stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
							},
							() => {
								const asset = childCompilation.assets["__child-html"];
								source = asset && asset.source().toString();
								for (const chunk of childCompilation.chunks) {
									for (const file of chunk.files) {
										childCompilation.deleteAsset(file);
									}
								}
							}
						);
					});

					childCompiler.runAsChild((err, _entries, childCompilation) => {
						if (err) return callback(err);
						if (childCompilation && childCompilation.errors.length > 0) {
							return callback(childCompilation.errors[0]);
						}
						if (!source) {
							return callback(new Error("No result from child compiler"));
						}
						/** @type {{ exports: { default?: Render } & Render }} */
						const module = { exports: /** @type {EXPECTED_ANY} */ ({}) };
						// eslint-disable-next-line no-new-func
						new Function("module", "exports", "require", source)(
							module,
							module.exports,
							require
						);
						const render = module.exports.default || module.exports;
						compilation.emitAsset(
							filename,
							new RawSource(render(templateParameters))
						);
						callback();
					});
				}
			);
		});
	}
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	plugins: [
		new MiniHtmlWebpackPlugin({
			template: path.resolve(__dirname, "template.html"),
			filename: "index.html",
			templateParameters: { title: "Hello" }
		})
	]
};
