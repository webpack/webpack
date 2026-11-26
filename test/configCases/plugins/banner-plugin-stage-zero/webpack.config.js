"use strict";

const webpack = require("../../../../");

/** @import { Configuration, Compiler } from "../../../../" */

/** @type {string[]} */
const stages = [];

/** @type {Configuration} */
module.exports = {
	mode: "none",
	devtool: false,
	node: {
		__dirname: false
	},
	plugins: [
		...[
			{ name: "zero", stage: 0 },
			{ name: "default" },
			{ name: "negative", stage: -50 },
			{ name: "positive", stage: 50 }
		].map(
			({ name, stage }) =>
				new webpack.BannerPlugin({
					stage,
					banner: () => {
						stages.push(name);
						return name;
					}
				})
		),
		/** @param {Compiler} compiler compiler */
		(compiler) => {
			compiler.hooks.thisCompilation.tap(
				"BannerStageOrderPlugin",
				(compilation) => {
					stages.length = 0;
					/** @type {string[]} */
					let beforeZero = [];
					compilation.hooks.processAssets.tap(
						{ name: "BannerStageOrderPlugin", stage: -25 },
						() => {
							beforeZero = [...stages];
						}
					);
					compilation.hooks.processAssets.tap(
						{
							name: "BannerStageOrderPlugin",
							stage: webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT
						},
						() => {
							compilation.emitAsset(
								"stages.json",
								new webpack.sources.RawSource(
									JSON.stringify({ beforeZero, stages })
								)
							);
						}
					);
				}
			);
		}
	]
};
