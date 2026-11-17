"use strict";

const fs = require("fs");
const path = require("path");

const PLUGIN_NAME = "BuildTreePlugin";

/**
 * Removes the tree; `fs.rmSync` is newer than the Node a fixture runs on.
 * @param {string} target path to remove
 * @returns {void}
 */
const removeTree = (target) => {
	try {
		fs.lstatSync(target);
	} catch (_err) {
		return;
	}
	if (fs.lstatSync(target).isDirectory()) {
		for (const entry of fs.readdirSync(target)) {
			removeTree(path.join(target, entry));
		}
		fs.rmdirSync(target);
		return;
	}
	fs.unlinkSync(target);
};

/**
 * Builds `images/cat.png` beside a directory named `*.png`, and a `[id]`
 * directory a char class does not match, and a link named `*.png` beside
 * `links/dog.png`. Names with `*` cannot be checked out on Windows, so the
 * tree is built next to the suite's output.
 * @param {string} source where the tree is built
 * @returns {void}
 */
const buildTree = (source) => {
	removeTree(source);
	fs.mkdirSync(path.join(source, "images/*.png"), { recursive: true });
	fs.writeFileSync(path.join(source, "images/cat.png"), "cat");
	fs.writeFileSync(path.join(source, "images/*.png/page.html"), "page");
	fs.mkdirSync(path.join(source, "pages/[id]"), { recursive: true });
	fs.writeFileSync(path.join(source, "pages/[id]/index.html"), "id");
	fs.mkdirSync(path.join(source, "links"));
	fs.writeFileSync(path.join(source, "links/dog.png"), "dog");
	fs.symlinkSync("dog.png", path.join(source, "links/*.png"), "file");
};

/** @type {(env: unknown, argv: { testPath: string }) => import("../../../../").Configuration} */
module.exports = (env, { testPath }) => {
	const source = `${testPath}-source`;
	return {
		output: {
			copy: [
				{ from: path.join(source, "images/*.png"), to: "img" },
				{ from: path.join(source, "pages/[id]"), to: "id" },
				{
					from: path.join(source, "links/*.png"),
					globOptions: { followSymlinks: false },
					to: "links"
				}
			]
		},
		plugins: [
			(compiler) => {
				compiler.hooks.environment.tap(PLUGIN_NAME, () => buildTree(source));
			}
		]
	};
};
