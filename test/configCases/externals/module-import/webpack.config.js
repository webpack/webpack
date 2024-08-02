module.exports = {
	externals: {
		fs: "module-import fs",
		"node:fs": "module-import node:fs",
		"import-node-fs": "module-import fs",
		"import-node-path": "module-import path",
		"module-node-fs": "module-import fs",
		"module-node-path": "module-import path"
	},
	output: {
		library: {
			type: "module"
		}
	},
	target: ["node", "es2020"],
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
