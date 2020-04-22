const path = require("path");
const webpack = require("../../../../");
/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		output: {
			filename: "commonjs.js",
			libraryTarget: "commonjs"
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
			filename: "var.js",
			library: ["globalName", "x", "y"]
		},
		resolve: {
			alias: {
				external: "./non-external"
			}
		},
		plugins: [
			new webpack.BannerPlugin({
				raw: true,
				banner: "module.exports = () => globalName;\n"
			})
		]
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
	},
	{
		entry: {
			entryA: {
				import: "./index"
			},
			entryB: {
				import: "./index",
				library: {
					type: "umd",
					name: "umd"
				}
			},
			entryC: {
				import: "./index",
				library: {
					type: "amd"
				}
			}
		},
		output: {
			library: {
				type: "commonjs-module"
			},
			filename: "[name].js"
		},
		resolve: {
			alias: {
				external: "./non-external"
			}
		}
	}
];
