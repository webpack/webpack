/** @type {import("../../").Configuration} */
module.exports = {
	entry: {
		page: {
			import: "./page.js",
			layer: "server",
			library: {
				type: "commonjs-module",
				export: "default"
			}
		}
	},
	target: "node",
	output: {
		filename: "[name].js",
		chunkFilename: "[name].js"
	},
	module: {
		parser: {
			javascript: {
				entries: {
					CLIENT: {
						entryOptions: {
							name: "client",
							layer: "client",
							chunkLoading: "jsonp",
							chunkFormat: "array-push",
							initialChunkFilename: "client/[name].js",
							chunkFilename: "client/[name].js"
						},
						return: "files"
					},
					CLIENT_MODERN: {
						entryOptions: {
							name: "modern",
							layer: "modern",
							chunkLoading: "jsonp",
							chunkFormat: "array-push",
							initialChunkFilename: "client/modern-[name].js",
							chunkFilename: "client/modern-[name].js"
						},
						return: "files"
					},
					API: {
						entryOptions: {
							layer: "server",
							chunkLoading: "require",
							chunkFormat: "commonjs",
							runtime: "api-runtime",
							library: {
								type: "commonjs-module",
								export: "default"
							}
						},
						byArguments: (info, request, name) => ({
							entryOptions: {
								name: `api/${name}`
							},
							value: `/${name}`
						})
					}
				}
			}
		}
	},
	optimization: {
		splitChunks: {
			cacheGroups: {
				merge: {
					name: "merged",
					test: /helper/,
					layer: "server",
					enforce: true
				}
			}
		}
	},
	externals: {
		byLayer: {
			server: {
				react: "react"
			}
		}
	},
	experiments: {
		topLevelAwait: true,
		layers: true,
		asyncEntries: true
	}
};
