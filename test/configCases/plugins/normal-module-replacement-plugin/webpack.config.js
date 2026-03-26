"use strict";

const path = require("path");
const NormalModuleReplacementPlugin =
	require("../../../../").NormalModuleReplacementPlugin;

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	plugins: [
		new NormalModuleReplacementPlugin(/before-string\.js/, "./b.js"),
		new NormalModuleReplacementPlugin(/before-function\.js/, (result) => {
			result.request = "./c.js";
		}),
		new NormalModuleReplacementPlugin(/[/\\]after-function\.js$/, (result) => {
			if (result.createData && result.createData.resource) {
				const dir = path.dirname(result.createData.resource);
				result.createData.resource = path.join(dir, "after.js");
			}
		}),
		new NormalModuleReplacementPlugin(/[/\\]after-relative\.js$/, "./after.js")
	]
};
