"use strict";

/**
 * Upper-cases string literals, standing in for a compile-to-JavaScript loader.
 * @type {import("../../../../").LoaderDefinition}
 */
module.exports = function upperLoader(source) {
	return source.replace(/"([^"]*)"/g, (_, text) => `"${text.toUpperCase()}"`);
};
