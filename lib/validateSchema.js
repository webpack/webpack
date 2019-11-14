/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const validate = require("schema-utils");

const validateSchema = (schema, options) => {
	validate(schema, options, {
		name: "Webpack",
		postFormatter: (formattedError, error) => {
			const children = /** @type {TODO} */ (error).children;
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

			if (error.keyword === "additionalProperties" && !error.dataPath) {
				const params =
					/** @type {import("ajv").AdditionalPropertiesParams} */ (error.params);
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

			return formattedError;
		}
	});
};
module.exports = validateSchema;
