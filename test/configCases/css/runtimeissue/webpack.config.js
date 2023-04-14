const webpack = require("../../../../");
const path = require("path");

/** @type {function(any, any): import("../../../../").Configuration[]} */
module.exports =  (env, { testPath }) => [
	{
		target: "web",
		// mode: "development",
		experiments: {
			css: true
		},
		module: { 
			unsafeCache: true, 
			rules: [
				{
					test: /\.(png)$/i,
					type: 'asset/resource',
					generator: {
						filename: '[name].[hash][ext]'
					}
				},
			]
		},
		entry: {
			main: {
				import: ['../large/tailwind.module.css', './entry1'],
			},
			secondMain: {
				import: ['../large/tailwind.module.css', './entry2'],
			}
		},
		performance: {
            hints: /*flags.productionMode ? "warning" :*/ false
        },
		devtool: false,
		optimization: {
			nodeEnv:  "development",
			usedExports: 'global',
			removeAvailableModules: true,
			removeEmptyChunks: true,
			splitChunks: {
				chunks: 'all',
				cacheGroups: {
					common: {
						name: "common",
						enforce: true,
						reuseExistingChunk: true,
						minChunks: 1,
						test(module) {
							return true;
						}
					}
				}
			}
		}, 
		output: {
			// pathinfo: false,
			filename: '[name].js',
			// cssFilename: '[name].bundle.css',
			// chunkFilename: '[name].chunk.bundle.js',
			// cssChunkFilename: '[name].chunk.bundle.css',
		},
		plugins: [
			// new webpack.ids.DeterministicModuleIdsPlugin({
			// 	maxLength: 3,
			// 	failOnConflict: true,
			// 	fixedLength: true,
			// 	test: m => m.type.startsWith("css")
			// }),
			// new webpack.experiments.ids.SyncModuleIdsPlugin({
			// 	test: m => m.type.startsWith("css"),
			// 	path: path.resolve(testPath, "module-ids.json"),
			// 	mode: "create"
			// })
		]
	}
];