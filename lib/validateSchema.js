/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const validate = require("schema-utils");

/* cSpell:disable */
const DID_YOU_MEAN = {
	rules: "module.rules",
	loaders: "module.rules or module.rules.*.use",
	noParse: "module.noParse",
	filename: "output.filename or module.rules.*.generator.filename",
	file: "output.filename",
	jsonpFunction: "output.chunkLoadingGlobal",
	chunkCallbackName: "output.chunkLoadingGlobal",
	hotUpdateFunction: "output.hotUpdateGlobal",
	chunkFilename: "output.chunkFilename",
	chunkfilename: "output.chunkFilename",
	ecmaVersion: "output.ecmaVersion",
	ecmaversion: "output.ecmaVersion",
	ecma: "output.ecmaVersion",
	path: "output.path",
	pathinfo: "output.pathinfo",
	pathInfo: "output.pathinfo",
	splitChunks: "optimization.splitChunks",
	immutablePaths: "snapshot.immutablePaths",
	managedPaths: "snapshot.managedPaths",
	hashedModuleIds:
		'optimization.moduleIds: "hashed" (BREAKING CHANGE since webpack 5)',
	namedChunks:
		'optimization.chunkIds: "named" (BREAKING CHANGE since webpack 5)',
	occurrenceOrder:
		'optimization.chunkIds: "size" and optimization.moduleIds: "size" (BREAKING CHANGE since webpack 5)',
	automaticNamePrefix:
		"optimization.splitChunks.[cacheGroups.*].idHint (BREAKING CHANGE since webpack 5)",
	noEmitOnErrors:
		"optimization.emitOnErrors (BREAKING CHANGE since webpack 5: logic is inverted to avoid negative flags)"
};
/* cSpell:enable */

const validateSchema = (schema, options) => {
	validate(schema, options, {
		name: "Webpack",
		postFormatter: (formattedError, error) => {
			const children = error.children;
			if (
				children &&
				children.some(
					child =>
						child.keyword === "absolutePath" &&
						child.dataPath === ".output.filename"
				)
			) {
				return `${formattedError}\nPlease use output.path to specify absolute path and output.filename for the file name.`;
			}

			if (
				children &&
				children.some(
					child => child.keyword === "pattern" && child.dataPath === ".devtool"
				)
			) {
				return (
					`${formattedError}\n` +
					"BREAKING CHANGE since webpack 5: The devtool option is more strict.\n" +
					"Please strictly follow the order of the keywords in the pattern."
				);
			}

			if (error.keyword === "additionalProperties") {
				const params = /** @type {import("ajv").AdditionalPropertiesParams} */ (error.params);
				if (
					Object.prototype.hasOwnProperty.call(
						DID_YOU_MEAN,
						params.additionalProperty
					)
				) {
					return `${formattedError}\nDid you mean ${
						DID_YOU_MEAN[params.additionalProperty]
					}?`;
				}

				if (!error.dataPath) {
					if (params.additionalProperty === "debug") {
						return (
							`${formattedError}\n` +
							"The 'debug' property was removed in webpack 2.0.0.\n" +
							"Loaders should be updated to allow passing this option via loader options in module.rules.\n" +
							"Until loaders are updated one can use the LoaderOptionsPlugin to switch loaders into debug mode:\n" +
							"plugins: [\n" +
							"  new webpack.LoaderOptionsPlugin({\n" +
							"    debug: true\n" +
							"  })\n" +
							"]"
						);
					}

					if (params.additionalProperty) {
						return (
							`${formattedError}\n` +
							"For typos: please correct them.\n" +
							"For loader options: webpack >= v2.0.0 no longer allows custom properties in configuration.\n" +
							"  Loaders should be updated to allow passing options via loader options in module.rules.\n" +
							"  Until loaders are updated one can use the LoaderOptionsPlugin to pass these options to the loader:\n" +
							"  plugins: [\n" +
							"    new webpack.LoaderOptionsPlugin({\n" +
							"      // test: /\\.xxx$/, // may apply this only for some modules\n" +
							"      options: {\n" +
							`        ${params.additionalProperty}: …\n` +
							"      }\n" +
							"    })\n" +
							"  ]"
						);
					}
				}
			}

			return formattedError;
		}
	});
};
module.exports = validateSchema;
