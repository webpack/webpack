const { ProvideSharedPlugin } = require("../../../../").sharing;

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		new ProvideSharedPlugin({
			provides: ["package"]
		})
	]
};
