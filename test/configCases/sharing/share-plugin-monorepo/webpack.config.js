const path = require("path");
const { SharePlugin } = require("../../../../").sharing;

/** @type {import("../../../../").Configuration} */
module.exports = {
	context: path.resolve(__dirname, "./app1"),
	plugins: [
		new SharePlugin({
			shared: {
				lib1: {},
				lib2: {
					singleton: true
				}
			}
		})
	]
};
