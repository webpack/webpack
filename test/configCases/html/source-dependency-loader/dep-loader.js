"use strict";

// Runs on HTML asset references selected by the `url` dependency condition
// (scoped to `.html` issuers) — the HTML analog of a `css-import`-scoped loader.
/** @type {import("../../../../").LoaderDefinition} */
module.exports = function (source) {
	return source.replace("__DEP_COLOR__", "#00ff00");
};
