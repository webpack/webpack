"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "node",
	performance: {
		hints: "warning",
		unusedConfig: true
	},
	externals: {
		path: "commonjs path",
		os: "commonjs os",
		"also-path": "commonjs path",
		"never-imported": "commonjs never-imported",
		"also-never-imported": "var AlsoNever"
	},
	plugins: [
		(compiler) => {
			compiler.hooks.compilation.tap("ExternalReasonPlugin", (compilation) => {
				compilation.hooks.finishModules.tap(
					"ExternalReasonPlugin",
					(modules) => {
						for (const module of modules) {
							if (module.is("external")) {
								const connections =
									compilation.moduleGraph.getIncomingConnections(module);
								const dependencies = [...connections];
								compilation.moduleGraph.addExtraReason(
									module,
									"External test reason"
								);
								// An explanation may precede the actual dependencies.
								if (connections instanceof Set) {
									for (const connection of dependencies) {
										connections.delete(connection);
										connections.add(connection);
									}
								}
							}
						}
					}
				);
			});
		}
	]
};
