"use strict";

// Runs on CSS `url()` assets selected by the `url` dependency condition
// (scoped to `.css` issuers) — the same mechanism as the HTML `url` case.
/** @type {import("../../../../").LoaderDefinition} */
module.exports = function (source) {
	return source.replace("__DEP_COLOR__", "#00ff00");
};
