// eslint-disable-next-line n/no-unpublished-require
const { ProvideSharedPlugin } = require("../../../../").sharing;

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		new ProvideSharedPlugin({
			provides: ["shared"]
		})
	]
};
