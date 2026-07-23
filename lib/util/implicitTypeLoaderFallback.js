/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { JAVASCRIPT_MODULE_TYPE_AUTO } = require("../ModuleTypeConstants");
const { parseResource } = require("./identifier");

/** @typedef {import("../NormalModuleFactory")} NormalModuleFactory */

/**
 * When a built-in module type is only enabled implicitly (`experiments.css` /
 * `experiments.html` resolved from their `"auto"` default), modules that reach
 * the factory with loaders applied — an inline request or loaders injected via
 * hooks (e.g. html-webpack-plugin's template loader) — keep the pre-existing
 * behavior: the loader result is parsed as JavaScript, not as the built-in type.
 * A `!=!` matchResource is an explicit re-type of the loader result and wins.
 *
 * TODO webpack 6: css/html are enabled unconditionally (`experiments.*: true`),
 * so this implicit-only workaround can be removed together with the `"auto"`
 * marker in `applyExperimentsDefaults`.
 * @param {NormalModuleFactory} normalModuleFactory the normal module factory
 * @param {string} pluginName name of the calling plugin, used for the tap
 * @param {RegExp} test resource path test of the built-in default rule
 * @param {string} type built-in module type assigned by that default rule
 * @returns {void}
 */
module.exports = (normalModuleFactory, pluginName, test, type) => {
	normalModuleFactory.hooks.createModule.tap(
		pluginName,
		(createData, _resolveData) => {
			if (
				createData.settings.type !== type ||
				createData.loaders.length === 0 ||
				createData.matchResource !== undefined ||
				!test.test(parseResource(createData.resource).path)
			) {
				return;
			}
			// Drop the default rule's type-specific effects along with the type
			createData.settings = {
				...createData.settings,
				type: JAVASCRIPT_MODULE_TYPE_AUTO,
				parser: undefined,
				generator: undefined,
				resolve: undefined
			};
			createData.type = JAVASCRIPT_MODULE_TYPE_AUTO;
			createData.parser = normalModuleFactory.getParser(
				JAVASCRIPT_MODULE_TYPE_AUTO
			);
			createData.parserOptions = undefined;
			createData.generator = normalModuleFactory.getGenerator(
				JAVASCRIPT_MODULE_TYPE_AUTO
			);
			createData.generatorOptions = undefined;
			createData.resolveOptions = undefined;
		}
	);
};
