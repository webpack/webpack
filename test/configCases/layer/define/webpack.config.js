const { DefinePlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		paid: { import: "./paid.js", layer: "paid" },
		free: { import: "./free.js", layer: "free" }
	},
	experiments: {
		layers: true
	},
	output: {
		filename: "[name].js"
	},
	plugins: [
		new DefinePlugin({
			FREE_VERSION: DefinePlugin.runtimeValue(
				ctx => ctx.module.layer === "free"
			)
		})
	]
};
