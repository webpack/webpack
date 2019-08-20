var path = require("path");

module.exports = [
	{
		mode: "development",
		entry: {
			bundle: "coffee-loader!./example.coffee"
		},
		output: {
			path: path.join(__dirname, "dist"),
			filename: "./[name]-cheap-eval-source-map.js"
		},
		// cheap-eval-source-map build fast to support development.
		devtool: "cheap-eval-source-map",
		optimization: {
			runtimeChunk: true
		}
	},
	{
		mode: "production",
		entry: {
			bundle: "coffee-loader!./example.coffee"
		},
		output: {
			path: path.join(__dirname, "dist"),
			filename: "./[name]-source-map.js"
		},
		// source-map is full emitted as a separate file, but your server disallow access to the source map.
		devtool: "source-map",
		optimization: {
			runtimeChunk: true
		}
	}
];
