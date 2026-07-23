"use strict";

// Minimal stand-in for html-webpack-plugin's lodash template loader: turns the
// HTML source into a JS module exporting a template function. The source is
// embedded only as a JSON data literal (never into the constructed function
// body), so this stays an executable JS module without tripping code scanners.
/** @type {import("../../../../").LoaderDefinition} */
module.exports = function (source) {
	return [
		`var template = ${JSON.stringify(source)};`,
		'module.exports = function (params) { return template.replace("{title}", params.title); };'
	].join("\n");
};
