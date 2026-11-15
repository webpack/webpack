"use strict";

const fs = require("fs");
const path = require("path");

/**
 * Writes a module into a directory whose name ends in `*` and a marker, so
 * its path in the module header comment spells `*` + marker + `/`.
 * @param {string} root where the directory is made
 * @param {string} marker the marker text
 * @param {string} name the module's name
 * @returns {string} the module's path
 */
const writeModule = (root, marker, name) => {
	const directory = path.join(root, `${name}*${marker}`);
	fs.mkdirSync(directory, { recursive: true });
	const file = path.join(directory, `${name}.js`);
	fs.writeFileSync(
		file,
		`(global.markerDirectories = global.markerDirectories || []).push(${JSON.stringify(name)});\n`
	);
	return file;
};

// A chunk holding an html module resolves the html markers; a module header
// comment naming a marker directory has to stay closed.
/** @type {(env: unknown, options: { testPath: string }) => import("../../../../").Configuration} */
module.exports = (env, { testPath }) => {
	// The output directory is emptied before the build, so the modules sit beside it.
	const root = `${testPath}-src`;
	return {
		target: "web",
		mode: "development",
		devtool: false,
		entry: [
			"./index.js",
			writeModule(root, "__WEBPACK_CSS_PUBLIC_PATH_AUTO__", "auto"),
			writeModule(root, "__WEBPACK_HTML_INLINE__00__css__END__", "inline")
		],
		node: { __dirname: false, __filename: false },
		output: { pathinfo: true },
		module: {
			rules: [{ test: /page\.html$/, generator: { extract: true } }]
		},
		experiments: { html: true }
	};
};
