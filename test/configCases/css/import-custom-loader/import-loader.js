"use strict";

// Custom loader scoped to `@import`ed CSS via `dependency: "css-import"`.
// Proves developers can preprocess a specific `@import` request.
/** @type {import("../../../../").LoaderDefinition} */
module.exports = function (source) {
	return source.replace("__IMPORT_LOADER_COLOR__", "green");
};
