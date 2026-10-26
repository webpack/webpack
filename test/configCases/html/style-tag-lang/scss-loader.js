"use strict";

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function scssLoader(source) {
	/** @type {Record<string, string>} */
	const variables = {};
	return source
		.replace(/\$([\w-]+):\s*([^;]+);/g, (_, name, value) => {
			variables[name] = value;
			return "";
		})
		.replace(/\$([\w-]+)/g, (_, name) => variables[name]);
};
