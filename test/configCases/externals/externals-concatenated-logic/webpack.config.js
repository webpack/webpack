"use strict";

const ExternalModule = require("../../../../lib/ExternalModule");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "node",
	optimization: {
		minimize: false
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
					compilation.hooks.finishModules.tap(
						"ExternalsTestPlugin",
						(modules) => {
							for (const m of modules) {
								if (m instanceof ExternalModule && m.userRequest === "path") {
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
