const path = require("path");
module.exports = [
	{
		output: {
			filename: "commonjs.js",
			libraryTarget: "commonjs-module"
		},
		resolve: {
			alias: {
				external: "./non-external"
			}
		}
	},
	{
		output: {
			filename: "umd.js",
			libraryTarget: "umd"
		},
		resolve: {
			alias: {
				external: "./non-external"
			}
		}
	},
	{
		output: {
			filename: "umd-default.js",
			libraryTarget: "umd",
			libraryExport: "default"
		},
		resolve: {
			alias: {
				external: "./non-external"
			}
		}
	},
	{
		output: {
			filename: "this.js",
			libraryTarget: "this"
		},
		resolve: {
			alias: {
				external: "./non-external"
			}
		}
	},
	{
		output: {
			filename: "global.js",
			library: "globalName"
		},
		resolve: {
			alias: {
				external: "./non-external"
			}
		}
	},
	{
		output: {
			filename: "commonjs2-external.js",
			libraryTarget: "commonjs2"
		},
		externals: ["external"]
	},
	{
		output: {
			filename: "index.js",
			path: path.resolve(
				__dirname,
				"../../../js/config/library/0-create-library/commonjs2-split-chunks"
			),
			libraryTarget: "commonjs2"
		},
		target: "node",
		optimization: {
			splitChunks: {
				cacheGroups: {
					test: {
						enforce: true,
						chunks: "all",
						test: /a\.js$/,
						filename: "part.js"
					}
				}
			}
		},
		resolve: {
			alias: {
				external: "./non-external"
			}
		}
	}
];
