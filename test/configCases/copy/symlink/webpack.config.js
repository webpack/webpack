"use strict";

const fs = require("fs");
const path = require("path");

const PLUGIN_NAME = "BuildSymlinkedTreePlugin";

// the tree carries symlinks, so it is built outside the repository
const source = path.resolve(__dirname, "../../../js/copy-symlink-source");

/**
 * Builds `real/a.txt`, a `link` to that directory, a `loop` inside it pointing
 * back at the base, and a relative link to the file.
 * @returns {void}
 */
const buildTree = () => {
	fs.rmSync(source, { recursive: true, force: true });
	fs.mkdirSync(path.join(source, "real"), { recursive: true });
	fs.writeFileSync(path.join(source, "real/a.txt"), "a");
	fs.symlinkSync(
		path.join(source, "real"),
		path.join(source, "link"),
		"junction"
	);
	fs.symlinkSync(source, path.join(source, "real/loop"), "junction");
	// relative, so it still resolves once the link and its target are copied
	fs.symlinkSync("real/a.txt", path.join(source, "relative.txt"), "file");
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		copy: [
			{ from: source },
			{ from: source, globOptions: { followSymlinks: false }, to: "no-follow" }
		]
	},
	plugins: [
		(compiler) => {
			compiler.hooks.environment.tap(PLUGIN_NAME, buildTree);
		}
	]
};
