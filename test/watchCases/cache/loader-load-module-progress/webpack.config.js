const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	cache: {
		type: "filesystem"
	},
	module: {
		rules: [
			{
				test: /mod\.js$/,
				use: "./loader"
			}
		]
	},
	plugins: [
		new webpack.ProgressPlugin(),
		{
			apply(compiler) {
				compiler.hooks.done.tapPromise("CacheTest", async () => {
					const cache = compiler
						.getCache("ProgressPlugin")
						.getItemCache("counts", null);

					const data = await cache.getPromise();

					if (data.modulesCount !== 4) {
						throw new Error(
							`Wrong cached value of \`ProgressPlugin.modulesCount\` - ${data.modulesCount}, expect 4`
						);
					}

					if (data.dependenciesCount !== 4) {
						throw new Error(
							`Wrong cached value of \`ProgressPlugin.dependenciesCount\` - ${data.dependenciesCount}, expect 4`
						);
					}
				});
			}
		}
	]
};
