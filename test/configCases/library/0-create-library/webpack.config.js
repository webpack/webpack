const path = require("path");
const webpack = require("../../../../");
/** @type {function(any, any): import("../../../../").Configuration[]} */
module.exports = (env, { testPath }) => [
	{
		output: {
			filename: "commonjs.js",
			libraryTarget: "commonjs",
			iife: false
		},
		resolve: {
			alias: {
				external: "./non-external"
			}
		}
	},
	{
		output: {
			filename: "commonjs-iife.js",
			libraryTarget: "commonjs",
			iife: true
		},
		resolve: {
			alias: {
				external: "./non-external"
			}
		}
	},
	{
		output: {
			filename: "amd.js",
			libraryTarget: "amd",
			iife: false
		},
		resolve: {
			alias: {
				external: "./non-external"
			}
		}
	},
	{
		output: {
			filename: "amd-iife.js",
			libraryTarget: "amd",
			iife: true
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
			libraryTarget: "this",
			iife: false
		},
		resolve: {
			alias: {
				external: "./non-external"
			}
		}
	},
	{
		output: {
			filename: "this-iife.js",
			libraryTarget: "this",
			iife: true
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
			library: ["globalName", "x", "y"],
			iife: false
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
			filename: "var-iife.js",
			library: ["globalName", "x", "y"],
			iife: true
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
		entry: "./nested.js",
		output: {
			filename: "commonjs-nested.js",
			libraryTarget: "commonjs",
			libraryExport: "NS",
			iife: false
		},
		resolve: {
			alias: {
				external: "./non-external"
			}
		}
	},
	{
		entry: "./nested.js",
		output: {
			filename: "commonjs-nested-iife.js",
			libraryTarget: "commonjs",
			libraryExport: "NS",
			iife: true
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
			libraryTarget: "commonjs2",
			iife: false
		},
		externals: ["external"]
	},
	{
		output: {
			filename: "commonjs2-external-no-concat.js",
			libraryTarget: "commonjs2",
			iife: false
		},
		optimization: {
			concatenateModules: false
		},
		externals: ["external"]
	},
	{
		output: {
			filename: "commonjs2-iife-external.js",
			libraryTarget: "commonjs2",
			iife: true
		},
		externals: ["external"]
	},
	{
		mode: "development",
		output: {
			filename: "commonjs2-external-eval.js",
			libraryTarget: "commonjs2"
		},
		externals: ["external"]
	},
	{
		mode: "development",
		output: {
			filename: "commonjs2-external-eval-source-map.js",
			libraryTarget: "commonjs2"
		},
		devtool: "eval-source-map",
		externals: ["external"]
	},
	{
		output: {
			filename: "index.js",
			path: path.resolve(testPath, "commonjs2-split-chunks"),
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
		output: {
			filename: "commonjs2-runtimeChunk/[name].js",
			libraryTarget: "commonjs2",
			iife: false
		},
		resolve: {
			alias: {
				external: "./non-external"
			}
		},
		optimization: {
			runtimeChunk: "single"
		}
	},
	{
		output: {
			filename: "commonjs2-iife-runtimeChunk/[name].js",
			libraryTarget: "commonjs2",
			iife: true
		},
		resolve: {
			alias: {
				external: "./non-external"
			}
		},
		optimization: {
			runtimeChunk: "single"
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
