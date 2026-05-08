"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["web", "es2020"],
	node: {
		__dirname: false,
		__filename: false
	},
	entry: {
		main: "./index.js",
		bundle: "./bundle.js"
	},
	output: {
		filename: "[name].js",
		module: true
	},
	optimization: {
		concatenateModules: true,
		usedExports: true
	},
	experiments: {
		outputModule: true,
		deferImport: true,
		sourceImport: true
	},
	externals: [
		{
			// Plain `module` externals — used at static (harmony) import sites.
			"ext-mod-defer": "module ext-mod-defer",
			"ext-mod-source": "module ext-mod-source",
			// Plain `import` externals — used at dynamic `import(…)` sites.
			"ext-import-defer": "import ext-import-defer",
			"ext-import-source": "import ext-import-source",
			// `module-import` externals resolve to `module` for static imports
			// and to `import` for dynamic imports based on the consumer.
			"ext-mi-defer-static": "module-import ext-mi-defer-static",
			"ext-mi-source-static": "module-import ext-mi-source-static",
			"ext-mi-defer-dynamic": "module-import ext-mi-defer-dynamic",
			"ext-mi-source-dynamic": "module-import ext-mi-source-dynamic",
			// Same request, imported with two different phases: must produce
			// two distinct ExternalModule instances.
			"ext-both-phases": "module ext-both-phases",
			fs: "commonjs fs",
			path: "commonjs path"
		}
	]
};
