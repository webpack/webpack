"use strict";

const WebpackError = require("../../../../lib/WebpackError");

const PLUGIN_NAME = "PrepareModuleTypeTestPlugin";

/** @type {import("../../../../types").Configuration} */
module.exports = {
	module: {
		rules: [{ test: /\.custom$/, type: "asset/source" }]
	},
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.compilation.tap(
					PLUGIN_NAME,
					(compilation, { normalModuleFactory }) => {
						let prepareCalls = 0;
						let prepared = false;
						let parsersCreated = 0;
						let parsersCreatedAfterPrepare = 0;
						normalModuleFactory.hooks.prepareModuleType
							.for("asset/source")
							.tapPromise(
								PLUGIN_NAME,
								() =>
									new Promise((resolve) => {
										prepareCalls++;
										// resolve late so the second module of this type has to
										// queue behind the in-flight preparation
										setTimeout(() => {
											prepared = true;
											resolve();
										}, 50);
									})
							);
						normalModuleFactory.hooks.parser
							.for("asset/source")
							.tap(PLUGIN_NAME, () => {
								parsersCreated++;
								if (prepared) parsersCreatedAfterPrepare++;
							});
						compilation.hooks.finishModules.tap(PLUGIN_NAME, () => {
							compilation.warnings.push(
								new WebpackError(
									`prepareCalls=${prepareCalls} parsersCreated=${parsersCreated} afterPrepare=${parsersCreatedAfterPrepare}`
								)
							);
						});
					}
				);
			}
		}
	]
};
