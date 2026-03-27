"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "node14",
	optimization: {
		concatenateModules: true,
		minimize: false,
		usedExports: true,
		providedExports: true,
		mangleExports: true
	},
	externals: {
		"external-1": "module path"
	},
	externalsType: "module",
	experiments: {
		outputModule: true
	},
	output: {
		module: true,
		library: {
			type: "module"
		}
	},
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.compilation.tap("ExternalsTestPlugin", (compilation) => {
					// Force 'provided' status for external exports to enable concatenation
					compilation.hooks.finishModules.tap(
						"ExternalsTestPlugin",
						(modules) => {
							for (const m of modules) {
								if (
									m.constructor.name === "ExternalModule" &&
									m.request === "path"
								) {
									const exportsInfo = compilation.moduleGraph.getExportsInfo(m);
									exportsInfo.getExportInfo("join").provided = true;
								}
							}
						}
					);
				});
			}
		}
	]
};
