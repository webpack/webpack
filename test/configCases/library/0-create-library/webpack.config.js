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
	}
];
