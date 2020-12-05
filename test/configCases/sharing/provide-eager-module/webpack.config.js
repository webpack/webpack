// eslint-disable-next-line node/no-unpublished-require
const { ProvideSharedPlugin } = require("../../../../").sharing;

/** @type {import("../../../../types").Configuration} */
module.exports = {
	mode: "development",
	plugins: [
		new ProvideSharedPlugin({
			shareScope: "default",
			provides: {
				common: {
					shareKey: "common",
					eager: true
				},
				uncommon: {
					shareKey: "uncommon"
				}
			}
		})
	]
};
