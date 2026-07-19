"use strict";

// Overrides how a built-in `<img src>` resource is produced: instead of the
// default file passthrough, the loader generates its own custom content.
/** @type {import("../../../../").LoaderDefinition} */
module.exports = function () {
	return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><!-- generated-by-loader --></svg>';
};
