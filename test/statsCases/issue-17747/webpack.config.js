const Issue17747Plugin = require("./plugin.js");

/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: "./index.js",
	plugins: [new Issue17747Plugin()],
	module: {
		rules: [
			{
				test: /\.(json|txt)$/,
				type: "asset/resource"
			}
		]
	}
};
