/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		app: "./app.js",
		home: {
			import: "./home.js",
			dependOn: "app"
		}
	},
	output: {
		pathinfo: "verbose",
		filename: "[name].js"
	},
	optimization: {
		runtimeChunk: "single"
	}
};
