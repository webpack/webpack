"use strict";

/**
 * Inlines `$name: value;` variables, standing in for a preprocessor's loader.
 * @type {import("../../../../").LoaderDefinition}
 */
module.exports = function variablesLoader(source) {
	/** @type {Record<string, string>} */
	const variables = {};
	return source
		.replace(/\$([\w-]+):\s*([^;]+);/g, (_, name, value) => {
			variables[name] = value;
			return "";
		})
		.replace(/\$([\w-]+)/g, (_, name) => variables[name]);
};
