"use strict";

const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { DefinePlugin, WebpackError } = require("../../../../");

const PLUGIN_NAME = "BuildLinkPlugin";

/**
 * Builds `src/index.js` requiring `src/link.txt`, a link to `outside/secret.txt`,
 * and `src/inside-link.txt`, a link to `src/real.txt`.
 * Links need rights on Windows, so the tree is built next to the suite's output.
 * @param {string} source where the tree is built
 * @returns {void}
 */
const buildTree = (source) => {
	const link = path.join(source, "src/link.txt");
	fs.mkdirSync(path.join(source, "src"), { recursive: true });
	fs.mkdirSync(path.join(source, "outside"), { recursive: true });
	fs.writeFileSync(path.join(source, "outside/secret.txt"), "secret");
	fs.writeFileSync(path.join(source, "src/real.txt"), "real");
	fs.writeFileSync(
		path.join(source, "src/index.js"),
		"require(LINK_URL);\nrequire(INSIDE_LINK_URL);\n"
	);
	if (fs.existsSync(link)) fs.unlinkSync(link);
	fs.symlinkSync(path.join(source, "outside/secret.txt"), link, "file");
	const insideLink = path.join(source, "src/inside-link.txt");
	if (fs.existsSync(insideLink)) fs.unlinkSync(insideLink);
	fs.symlinkSync(path.join(source, "src/real.txt"), insideLink, "file");
};

/** @type {(env: unknown, argv: { testPath: string }) => import("../../../../").Configuration} */
module.exports = (env, { testPath }) => {
	const source = `${testPath}-source`;
	return {
		entry: path.join(source, "src/index.js"),
		resolve: {
			restrictions: [path.join(source, "src")]
		},
		module: {
			rules: [{ test: /\.txt$/, type: "asset/source" }]
		},
		plugins: [
			new DefinePlugin({
				LINK_URL: JSON.stringify(
					pathToFileURL(path.join(source, "src/link.txt")).href
				),
				INSIDE_LINK_URL: JSON.stringify(
					pathToFileURL(path.join(source, "src/inside-link.txt")).href
				)
			}),
			(compiler) => {
				compiler.hooks.environment.tap(PLUGIN_NAME, () => buildTree(source));
				// a link read at its target is watched too, so retargeting it rebuilds
				compiler.hooks.afterCompile.tap(PLUGIN_NAME, (compilation) => {
					const insideLink = path.join(source, "src/inside-link.txt");
					if (!compilation.fileDependencies.has(insideLink)) {
						compilation.errors.push(
							new WebpackError(`${insideLink} is not watched`)
						);
					}
				});
			}
		]
	};
};
