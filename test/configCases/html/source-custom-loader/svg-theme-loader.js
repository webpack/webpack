"use strict";

// Custom loader for the resource pulled in by a specific HTML tag/attribute
// (`<img data-themed>`); proves such references flow through `module.rules`.
/** @type {import("../../../../").LoaderDefinition} */
module.exports = function (source) {
	return source.replace("__THEME_COLOR__", "#ff0000");
};
