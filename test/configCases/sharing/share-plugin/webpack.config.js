// eslint-disable-next-line node/no-unpublished-require
const { SharePlugin } = require("../../../../").sharing;

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	plugins: [
		new SharePlugin({
			shared: {
				lib1: "^1.0.0",
				"lib-two": {
					import: "lib2",
					requiredVersion: "^1.0.0",
					version: "1.3.4",
					strictVersion: true,
					eager: true
				},
				lib3: {
					shareScope: "other"
				},
				"./relative1": {
					import: "./relative1",
					version: false
				},
				"./relative2": {
					import: false,
					shareKey: "store",
					version: "0",
					requiredVersion: "0",
					strictVersion: true
				},
				store: "0"
			}
		})
	]
};
