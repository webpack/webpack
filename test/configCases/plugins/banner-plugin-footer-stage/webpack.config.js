"use strict";

const webpack = require("../../../../");

const base = {
	mode: /** @type {const} */ ("production"),
	node: {
		__dirname: false,
		__filename: false
	},
	output: {
		filename: "[name].js"
	}
};

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		...base,
		entry: { bundle0: "./index.js", footer: "./footer.js" },
		plugins: [
			new webpack.BannerPlugin({
				banner: "banner is a string",
				footer: true,
				include: "footer.js"
			})
		]
	},
	{
		...base,
		entry: { bundle1: "./stage.js", staged: "./staged.js" },
		// The minimizer drops a plain comment, unless the banner comes after it
		optimization: { minimize: true },
		plugins: [
			new webpack.BannerPlugin({
				raw: true,
				banner: "/* banner is a string */",
				stage: webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT,
				include: "staged.js"
			})
		]
	}
];
