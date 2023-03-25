/** @type {import("../../../types").Configuration} */
module.exports = {
	mode: "production",
	entry: "./index.js",
	output: {
		filename: "[name]-[contenthash].js"
	}
};
