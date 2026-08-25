"use strict";

const fs = require("fs");
const path = require("path");

// a workspace package: installed as a symlink, so its own files resolve to a
// real path outside node_modules while the package request resolves through it
const modulesDirectory = path.resolve(
	__dirname,
	"../../../js/side-effects-symlinked/node_modules"
);

fs.mkdirSync(modulesDirectory, { recursive: true });

try {
	fs.symlinkSync(
		path.join(__dirname, "package"),
		path.join(modulesDirectory, "symlinked-sef"),
		"junction"
	);
} catch (err) {
	if (/** @type {NodeJS.ErrnoException} */ (err).code !== "EEXIST") throw err;
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	resolve: {
		modules: [modulesDirectory, "node_modules"]
	},
	optimization: {
		sideEffects: true,
		usedExports: true,
		providedExports: true,
		concatenateModules: false,
		minimize: false
	}
};
