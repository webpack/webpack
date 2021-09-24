const path = require("path");
const webpack = require("../../../../");
/** @type {function(any, any): import("../../../../").Configuration[]} */
module.exports = (env, { testPath }) => [
	{
		output: {
			uniqueName: "esm",
			filename: "esm.js",
			libraryTarget: "module"
		},
		target: "node14",
		resolve: {
			alias: {
				external: "./non-external"
			}
		},
		experiments: {
			outputModule: true
		}
	},
	{
		output: {
			uniqueName: "esm-runtimeChunk",
			filename: "esm-runtimeChunk/[name].js",
			libraryTarget: "module"
		},
		target: "node14",
		resolve: {
			alias: {
				external: "./non-external"
			}
		},
		optimization: {
			runtimeChunk: "single"
		},
		experiments: {
			outputModule: true
		}
	},
	{
		output: {
			uniqueName: "commonjs",
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
			uniqueName: "commonjs-iife",
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
			uniqueName: "amd",
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
			uniqueName: "amd-iife",
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
			uniqueName: "amd-runtimeChunk",
			filename: "amd-runtimeChunk/[name].js",
			libraryTarget: "amd",
			globalObject: "global",
			iife: false
		},
		target: "web",
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
			uniqueName: "amd-iife-runtimeChunk",
			filename: "amd-iife-runtimeChunk/[name].js",
			libraryTarget: "amd",
			globalObject: "global",
			iife: true
		},
		target: "web",
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
			uniqueName: "umd",
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
			uniqueName: "umd-default",
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
			uniqueName: "this",
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
			uniqueName: "this-iife",
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
			uniqueName: "var",
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
			uniqueName: "var-iife",
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
			uniqueName: "commonjs-nested",
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
			uniqueName: "commonjs-nested-iife",
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
			uniqueName: "commonjs2-external",
			filename: "commonjs2-external.js",
			libraryTarget: "commonjs2",
			iife: false
		},
		externals: ["external"]
	},
	{
		output: {
			uniqueName: "commonjs2-external-no-concat",
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
			uniqueName: "commonjs2-iife-external",
			filename: "commonjs2-iife-external.js",
			libraryTarget: "commonjs2",
			iife: true
		},
		externals: ["external"]
	},
	{
		mode: "development",
		output: {
			uniqueName: "commonjs2-external-eval",
			filename: "commonjs2-external-eval.js",
			libraryTarget: "commonjs2"
		},
		externals: ["external"]
	},
	{
		mode: "development",
		output: {
			uniqueName: "commonjs2-external-eval-source-map",
			filename: "commonjs2-external-eval-source-map.js",
			libraryTarget: "commonjs2"
		},
		devtool: "eval-source-map",
		externals: ["external"]
	},
	{
		output: {
			uniqueName: "index",
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
			uniqueName: "commonjs2-runtimeChunk",
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
			uniqueName: "commonjs2-iife-runtimeChunk",
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
		output: {
			uniqueName: "global-runtimeChunk",
			filename: "global-runtimeChunk/[name].js",
			library: ["globalName", "x", "y"],
			libraryTarget: "global",
			iife: false
		},
		target: "web",
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
			uniqueName: "global-iife-runtimeChunk",
			filename: "global-iife-runtimeChunk/[name].js",
			library: ["globalName", "x", "y"],
			libraryTarget: "global",
			iife: true
		},
		target: "web",
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
			uniqueName: "commonjs-module",
			filename: "[name].js"
		},
		resolve: {
			alias: {
				external: "./non-external"
			}
		}
	}
];
