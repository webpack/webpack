/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Florent Cailhol @ooflorent
*/

"use strict";

const NonEsmSourceTypeWarning = require("./NonEsmSourceTypeWarning");
const createSchemaValidation = require("./util/create-schema-validation");

/** @typedef {import("../declarations/plugins/WarnNonEsmSourceTypePlugin").WarnNonEsmSourceTypePlugin} WarnNonEsmSourceTypePluginOptions */
/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./NormalModule")} NormalModule */

const validate = createSchemaValidation(
	require("../schemas/plugins/WarnNonEsmSourceTypePlugin.check.js"),
	() => require("../schemas/plugins/WarnNonEsmSourceTypePlugin.json"),
	{
		name: "Warn non esm source type plugin",
		baseDataPath: "filter"
	}
);

class WarnNonEsmSourceTypePlugin {
	/**
	 * @param {WarnNonEsmSourceTypePluginOptions=} filter filter
	 */
	constructor(filter) {
		this.filterFunction = undefined;

		if (filter) {
			validate(filter);

			if (typeof filter === "string") {
				this.filterFunction = resource => resource.startsWith(filter);
			} else {
				this.filterFunction = resource => filter.test(resource);
			}
		}
	}

	/**
	 * @param {NormalModule} module module
	 */
	warn(module) {
		// TODO add type reason to NormalModule ?
		module.addWarning(new NonEsmSourceTypeWarning(module.type));
	}

	/**
	 * @param {Compiler} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(
			"WarnNonEsmSourceTypePlugin",
			compilation => {
				compilation.hooks.finishModules.tap(
					"WarnNonEsmSourceTypePlugin",
					modules => {
						for (const module of modules) {
							const type = module.type;
							if (type !== "javascript/esm" && type.startsWith("javascript/")) {
								const normalModule = /** @type {NormalModule} */ (module);
								if (this.filterFunction) {
									if (this.filterFunction(normalModule.resource)) {
										this.warn(normalModule);
									}
								} else {
									this.warn(normalModule);
								}
							}
						}
					}
				);
			}
		);
	}
}

module.exports = WarnNonEsmSourceTypePlugin;
