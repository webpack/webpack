/** @type {(variant: boolean) => import("../../../../").Configuration} */
const config = o => ({
	externals: {
		"module-fs": o ? "module fs" : "module fs/promises",
		fs: o ? "node-commonjs fs" : "node-commonjs fs/promises",
		"module-fs-promises": o ? ["module fs", "promises"] : "module fs/promises",
		"fs-promises": o
			? ["node-commonjs fs", "promises"]
			: "node-commonjs fs/promises",
		"module-path": "module path",
		path: "node-commonjs path"
	},
	optimization: {
		concatenateModules: true,
		usedExports: true,
		providedExports: true,
		mangleExports: true
	},
	target: "node14",
	experiments: {
		outputModule: true
	}
});

module.exports = [config(false), config(true)];
