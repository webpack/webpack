module.exports = {
	externals: {
		fs: "module-import fs",
		"node:fs": "module-import node:fs",
		"node-fs": "module-import fs"
	},
	output: {
		module: true,
		library: {
			type: "module"
		}
	},
	target: ["es2020"],
	experiments: {
		outputModule: true
	},
	optimization: {
		concatenateModules: true,
		usedExports: true,
		providedExports: true,
		mangleExports: true
	}
};
