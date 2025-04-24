/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "none",
	entry: { main: "./index.ts" },
	ignoreWarnings: [
		warning => {
			// when using swc-loader or `transpileOnly: true` with ts-loader, the warning is expected
			expect(warning.message).toContain(
				"export 'T' (reexported as 'T') was not found in './re-export' (possible exports: value)"
			);
			return true;
		}
	],
	output: {
		module: true,
		library: {
			type: "modern-module"
		},
		chunkFormat: "module"
	},
	experiments: {
		outputModule: true
	},
	resolve: {
		extensions: [".ts"]
	},
	optimization: {
		concatenateModules: true
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				loader: "ts-loader",
				options: {
					transpileOnly: true
				}
			}
		]
	}
};
