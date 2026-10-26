"use strict";

/**
 * Inlines `$name: value;` variables, standing in for a preprocessor's loader.
 * @type {import("../../../../").LoaderDefinition<{ marker: string }>}
 */
module.exports = function variablesLoader(source) {
	/** @type {Record<string, string>} */
	const variables = {};
	const css = source
		.replace(/\$([\w-]+):\s*([^;]+);/g, (_, name, value) => {
			variables[name] = value;
			return "";
		})
		.replace(/\$([\w-]+)/g, (_, name) => variables[name]);
	return `${css}\n.${this.getOptions().marker} {}`;
};
