"use strict";

const path = require("path");
const webpack = require("../../../../");
const supportsAsync = require("../../../helpers/supportsAsync");

/** @type {(env: Env, options: TestOptions) => import("../../../../").Configuration[]} */
module.exports = (env, { testPath }) => [
	{
		output: {
			uniqueName: "modern-module",
			filename: "modern-module.js",
			library: {
				type: "modern-module"
			}
		},
		target: "node14",
		resolve: {
			alias: {
				external: "./non-external",
				"external-named": "./non-external-named"
			}
		},
		experiments: {
			outputModule: true
		}
	},
	{
		output: {
			uniqueName: "esm",
			filename: "esm.js",
			library: {
				type: "module"
			}
		},
		target: "node14",
		resolve: {
			alias: {
				external: "./non-external",
				"external-named": "./non-external-named"
			}
		},
		experiments: {
			outputModule: true
		}
	},
	{
		entry: "./esm-with-commonjs.js",
		output: {
			uniqueName: "esm-with-commonjs",
			filename: "esm-with-commonjs.js",
			library: {
				type: "module"
			}
		},
		target: "node14",
		resolve: {
			alias: {
				external: "./non-external",
				"external-named": "./non-external-named"
			}
		},
		experiments: {
			outputModule: true
		}
	},
	{
		entry: "./esm-with-commonjs.js",
		output: {
			uniqueName: "esm-with-commonjs",
			filename: "esm-with-commonjs-avoid-entry-iife.js",
			library: {
				type: "module"
			}
		},
		target: "node14",
		resolve: {
			alias: {
				external: "./non-external",
				"external-named": "./non-external-named"
			}
		},
		optimization: {
			avoidEntryIife: false
		},
		experiments: {
			outputModule: true
		}
	},
	{
		output: {
			uniqueName: "esm-export",
			filename: "esm-export.js",
			library: {
				type: "module",
				export: ["a"]
			}
		},
		target: "node14",
		resolve: {
			alias: {
				external: "./non-external",
				"external-named": "./non-external-named"
			}
		},
		experiments: {
			outputModule: true
		}
	},
	...(supportsAsync()
		? [
				{
					entry: "./index-async.js",
					output: {
						uniqueName: "esm-async",
						filename: "esm-async.js",
						library: {
							type: "module"
						}
					},
					optimization: {
						concatenateModules: true
					},
					target: "node14",
					resolve: {
						alias: {
							external: "./non-external",
							"external-named": "./non-external-named"
						}
					},
					experiments: {
						outputModule: true
					}
				},
				{
					entry: "./index-async.js",
					output: {
						uniqueName: "esm-async-no-concatenate-modules",
						filename: "esm-async-no-concatenate-modules.js",
						library: {
							type: "module"
						}
					},
					optimization: {
						concatenateModules: false
					},
					resolve: {
						alias: {
							external: "./non-external",
							"external-named": "./non-external-named"
						}
					},
					experiments: {
						outputModule: true
					}
				}
			]
		: []),
	{
		output: {
			uniqueName: "esm-export-no-concatenate-modules",
			filename: "esm-export-no-concatenate-modules.js",
			library: {
				type: "module",
				export: ["a"]
			}
		},
		target: "node14",
		optimization: {
			concatenateModules: false
		},
		resolve: {
			alias: {
				external: "./non-external",
				"external-named": "./non-external-named"
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
			library: {
				type: "module"
			}
		},
		target: "node14",
		resolve: {
			alias: {
				external: "./non-external",
				"external-named": "./non-external-named"
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
			uniqueName: "esm-runtimeChunk-concatenateModules",
			filename: "esm-runtimeChunk-concatenateModules/[name].js",
			library: {
				type: "module"
			}
		},
		target: "node14",
		resolve: {
			alias: {
				external: "./non-external",
				"external-named": "./non-external-named"
			}
		},
		optimization: {
			runtimeChunk: "single",
			concatenateModules: true
		},
		experiments: {
			outputModule: true
		}
	},
	{
		output: {
			uniqueName: "esm-runtimeChunk-no-concatenateModules",
			filename: "esm-runtimeChunk-no-concatenateModules/[name].js",
			library: {
				type: "module"
			}
		},
		target: "node14",
		resolve: {
			alias: {
				external: "./non-external",
				"external-named": "./non-external-named"
			}
		},
		optimization: {
			runtimeChunk: "single",
			concatenateModules: false
		},
		experiments: {
			outputModule: true
		}
	},
	{
		output: {
			uniqueName: "esm-runtimeChunk-concatenateModules-splitChunks",
			filename: "esm-runtimeChunk-concatenateModules-splitChunks/[name].js",
			library: {
				type: "module"
			}
		},
		target: "node14",
		resolve: {
			alias: {
				external: "./non-external",
				"external-named": "./non-external-named"
			}
		},
		optimization: {
			runtimeChunk: "single",
			concatenateModules: true,
			splitChunks: {
				cacheGroups: {
					module: {
						test: /a\.js$/,
						chunks: "all",
						enforce: true,
						reuseExistingChunk: true
					}
				}
			}
		},
		experiments: {
			outputModule: true
		}
	},
	{
		entry: ["./foo.js", "./index.js"],
		output: {
			uniqueName: "esm-multiple-entry-modules",
			filename: "esm-multiple-entry-modules.js",
			library: {
				type: "module"
			}
		},
		target: "node14",
		resolve: {
			alias: {
				external: "./non-external",
				"external-named": "./non-external-named"
			}
		},
		experiments: {
			outputModule: true
		}
	},
	{
		output: {
			uniqueName: "commonjs",
			filename: "commonjs.js",
			library: {
				type: "commonjs"
			},
			iife: false
		},
		resolve: {
			alias: {
				external: "./non-external",
				"external-named": "./non-external-named"
			}
		}
	},
	{
		output: {
			uniqueName: "commonjs-iife",
			filename: "commonjs-iife.js",
			library: {
				type: "commonjs"
			},
			iife: true
		},
		resolve: {
			alias: {
				external: "./non-external",
				"external-named": "./non-external-named"
			}
		}
	},
	{
		output: {
			uniqueName: "amd",
			filename: "amd.js",
			library: {
				type: "amd"
			},
			iife: false
		},
		resolve: {
			alias: {
				external: "./non-external",
				"external-named": "./non-external-named"
			}
		}
	},
	{
		output: {
			uniqueName: "amd-iife",
			filename: "amd-iife.js",
			library: {
				type: "amd"
			},
			iife: true
		},
		resolve: {
			alias: {
				external: "./non-external",
				"external-named": "./non-external-named"
			}
		}
	},
	{
		output: {
			uniqueName: "amd-runtimeChunk",
			filename: "amd-runtimeChunk/[name].js",
			library: {
				type: "amd"
			},
			globalObject: "global",
			iife: false
		},
		target: "web",
		resolve: {
			alias: {
				external: "./non-external",
				"external-named": "./non-external-named"
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
			library: {
				type: "amd"
			},
			globalObject: "global",
			iife: true
		},
		target: "web",
		resolve: {
			alias: {
				external: "./non-external",
				"external-named": "./non-external-named"
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
			library: {
				type: "umd"
			}
		},
		resolve: {
			alias: {
				external: "./non-external",
				"external-named": "./non-external-named"
			}
		}
	},
	{
		output: {
			uniqueName: "true-iife-umd",
			filename: "true-iife-umd.js",
			library: {
				type: "umd"
			},
			iife: true
		},
		resolve: {
			alias: {
				external: "./non-external",
				"external-named": "./non-external-named"
			}
		}
	},
	{
		output: {
			uniqueName: "false-iife-umd",
			filename: "false-iife-umd.js",
			library: {
				type: "umd"
			},
			iife: false
		},
		resolve: {
			alias: {
				external: "./non-external",
				"external-named": "./non-external-named"
			}
		},
		ignoreWarnings: [(error) => error.name === "FalseIIFEUmdWarning"]
	},
	{
		output: {
			uniqueName: "false-iife-umd2",
			filename: "false-iife-umd2.js",
			library: {
				type: "umd2"
			},
			iife: false
		},
		resolve: {
			alias: {
				external: "./non-external",
				"external-named": "./non-external-named"
			}
		},
		ignoreWarnings: [(error) => error.name === "FalseIIFEUmdWarning"]
	},
	{
		output: {
			uniqueName: "umd-default",
			filename: "umd-default.js",
			library: {
				type: "umd",
				export: "default"
			}
		},
		resolve: {
			alias: {
				external: "./non-external",
				"external-named": "./non-external-named"
			}
		}
	},
	{
		output: {
			uniqueName: "this",
			filename: "this.js",
			library: {
				type: "this"
			},
			iife: false
		},
		resolve: {
			alias: {
				external: "./non-external",
				"external-named": "./non-external-named"
			}
		}
	},
	{
		output: {
			uniqueName: "this-iife",
			filename: "this-iife.js",
			library: {
				type: "this"
			},
			iife: true
		},
		resolve: {
			alias: {
				external: "./non-external",
				"external-named": "./non-external-named"
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
				external: "./non-external",
				"external-named": "./non-external-named"
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
				external: "./non-external",
				"external-named": "./non-external-named"
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
			library: {
				type: "commonjs",
				export: "NS"
			},
			iife: false
		},
		resolve: {
			alias: {
				external: "./non-external",
				"external-named": "./non-external-named"
			}
		}
	},
	{
		entry: "./nested.js",
		output: {
			uniqueName: "commonjs-nested-iife",
			filename: "commonjs-nested-iife.js",
			library: {
				type: "commonjs",
				export: "NS"
			},
			iife: true
		},
		resolve: {
			alias: {
				external: "./non-external",
				"external-named": "./non-external-named"
			}
		}
	},
	{
		output: {
			uniqueName: "commonjs2-external",
			filename: "commonjs2-external.js",
			library: {
				type: "commonjs2"
			},
			iife: false
		},
		externals: ["external", "external-named"]
	},
	{
		output: {
			uniqueName: "commonjs2-external-no-concat",
			filename: "commonjs2-external-no-concat.js",
			library: {
				type: "commonjs2"
			},
			iife: false
		},
		optimization: {
			concatenateModules: false
		},
		externals: ["external", "external-named"]
	},
	{
		output: {
			uniqueName: "commonjs2-iife-external",
			filename: "commonjs2-iife-external.js",
			library: {
				type: "commonjs2"
			},
			iife: true
		},
		externals: ["external", "external-named"]
	},
	{
		mode: "development",
		output: {
			uniqueName: "commonjs2-external-eval",
			filename: "commonjs2-external-eval.js",
			library: {
				type: "commonjs2"
			}
		},
		externals: ["external", "external-named"]
	},
	{
		mode: "development",
		output: {
			uniqueName: "commonjs2-external-eval-source-map",
			filename: "commonjs2-external-eval-source-map.js",
			library: {
				type: "commonjs2"
			}
		},
		devtool: "eval-source-map",
		externals: ["external", "external-named"]
	},
	{
		output: {
			uniqueName: "commonjs-static-external",
			filename: "commonjs-static-external.js",
			library: {
				type: "commonjs-static"
			},
			iife: false
		},
		externals: ["external", "external-named"]
	},
	{
		output: {
			uniqueName: "index",
			filename: "index.js",
			path: path.resolve(testPath, "commonjs2-split-chunks"),
			library: {
				type: "commonjs2"
			}
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
				external: "./non-external",
				"external-named": "./non-external-named"
			}
		}
	},
	{
		output: {
			uniqueName: "commonjs2-runtimeChunk",
			filename: "commonjs2-runtimeChunk/[name].js",
			library: {
				type: "commonjs2"
			},
			iife: false
		},
		resolve: {
			alias: {
				external: "./non-external",
				"external-named": "./non-external-named"
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
			library: {
				type: "commonjs2"
			},
			iife: true
		},
		resolve: {
			alias: {
				external: "./non-external",
				"external-named": "./non-external-named"
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
				external: "./non-external",
				"external-named": "./non-external-named"
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
				external: "./non-external",
				"external-named": "./non-external-named"
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
				external: "./non-external",
				"external-named": "./non-external-named"
			}
		}
	},
	{
		entry: "./class-commonjs",
		output: {
			uniqueName: "class-commonjs",
			filename: "commonjs-bundle-to-esm-1.mjs",
			module: true,
			library: {
				type: "module"
			}
		},
		experiments: {
			outputModule: true
		}
	},
	{
		entry: "./exports-shortcut-cjs",
		output: {
			uniqueName: "exports-shortcut-cjs",
			filename: "commonjs-bundle-to-esm-2.mjs",
			module: true,
			library: {
				type: "module"
			}
		},
		experiments: {
			outputModule: true
		}
	},
	{
		entry: "./overrides-exports-cjs",
		output: {
			uniqueName: "overrides-exports-cjs",
			filename: "commonjs-bundle-to-esm-3.mjs",
			module: true,
			library: {
				type: "module"
			}
		},
		experiments: {
			outputModule: true
		}
	},
	{
		entry: "./self-reference-cjs",
		output: {
			uniqueName: "self-reference-cjs",
			filename: "commonjs-bundle-to-esm-4.mjs",
			module: true,
			library: {
				type: "module"
			}
		},
		experiments: {
			outputModule: true
		}
	},
	{
		entry: "./adding-exports-cjs",
		output: {
			uniqueName: "adding-exports-cjs",
			filename: "commonjs-bundle-to-esm-5.mjs",
			module: true,
			library: {
				type: "module"
			}
		},
		experiments: {
			outputModule: true
		}
	},
	{
		entry: "./define-module-property-cjs",
		output: {
			uniqueName: "define-module-property-cjs",
			filename: "commonjs-bundle-to-esm-6.mjs",
			module: true,
			library: {
				type: "module"
			}
		},
		experiments: {
			outputModule: true
		}
	},
	{
		entry: "./reexport-define-module-property-cjs",
		output: {
			uniqueName: "reexport-define-module-property-cjs",
			filename: "commonjs-bundle-to-esm-7.mjs",
			module: true,
			library: {
				type: "module"
			}
		},
		experiments: {
			outputModule: true
		}
	},
	{
		entry: "./define-this-exports-cjs",
		output: {
			uniqueName: "define-this-exports-cjs",
			filename: "commonjs-bundle-to-esm-8.mjs",
			module: true,
			library: {
				type: "module"
			}
		},
		experiments: {
			outputModule: true
		}
	}
];
