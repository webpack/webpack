// eslint-disable-next-line node/no-unpublished-require
const { SharePlugin } = require("../../../../").sharing;

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	plugins: [
		new SharePlugin({
			shared: {
				common: {
					eager: true,
					import: "./common",
					requiredVersion: "1.1.1"
				}
			}
		})
	]
};
