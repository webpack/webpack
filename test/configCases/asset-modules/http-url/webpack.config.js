const {
	experiments: {
		schemes: { HttpUriPlugin }
	}
} = require("../../../../");
const ServerPlugin = require("./server");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	module: {
		rules: [
			{
				test: /\.css$/,
				loader: "./loaders/css-loader"
			}
		]
	},
	plugins: [new ServerPlugin(9990), new HttpUriPlugin()]
};
