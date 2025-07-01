const path = require("path");
const { SharePlugin } = require("../../../../").sharing;

/** @type {import("../../../../").Configuration} */
module.exports = {
	context: path.resolve(__dirname, "./cjs"),
	plugins: [
		new SharePlugin({
			shared: {
				lib: {},
				transitive_lib: {}
			}
		})
	]
};
