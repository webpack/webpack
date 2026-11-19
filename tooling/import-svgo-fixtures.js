/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// Copies svgo's plugin test cases into `test/fixtures/xml/svgo-*`: each input
// as `index.xml`, svgo's expected output as `svgo.xml` and its plugin
// parameters as `svgo.json`, printed with every SVG switch of `xmlMinify`.
//
//   git clone --depth 1 https://github.com/svg/svgo <dir>
//   node tooling/import-svgo-fixtures.js <dir>

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const FIXTURES = path.join(__dirname, "../test/fixtures/xml");

// Every `xmlMinify` switch, so the snapshot is the most webpack writes.
const OPTIONS = [
	{
		print: "xmlMinify",
		minimizer: { asset: "index.svg" },
		collapseWhitespace: true,
		sortAttributes: true,
		removeMetadata: true,
		removeEditorData: true,
		removeEmptyAttributes: true,
		removeEmptyElements: true,
		shortenColors: true,
		shortenNumbers: true,
		shortenPathData: true,
		sortSymbols: true,
		convertShapes: true,
		cleanupStructure: true,
		mergePaths: true,
		reusePaths: true,
		sortDefinitions: true,
		removeUnusedNamespaces: true
	}
];

/**
 * @param {string} name a camelCase svgo plugin name
 * @returns {string} it in kebab case
 */
const kebab = (name) =>
	name
		.replace(/([a-z\d])([A-Z])/g, "$1-$2")
		.replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
		.toLowerCase();

/**
 * @param {string} file a path
 * @param {string} text its contents, ending in one newline
 * @returns {void}
 */
const write = (file, text) => {
	fs.writeFileSync(file, `${text.replace(/\s+$/, "")}\n`);
};

const root = process.argv[2];
if (root === undefined) {
	throw new Error(
		"usage: node tooling/import-svgo-fixtures.js <svgo checkout>"
	);
}
const plugins = path.join(root, "test/plugins");
const commit = execFileSync("git", ["-C", root, "rev-parse", "HEAD"], {
	encoding: "utf8"
}).trim();

for (const name of fs.readdirSync(FIXTURES)) {
	if (!name.startsWith("svgo-")) continue;
	const dir = path.join(FIXTURES, name);
	for (const file of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, file));
	fs.rmdirSync(dir);
}
let count = 0;
for (const file of fs.readdirSync(plugins).sort()) {
	const match = /^(\w+)\.(\d+)\.svg\.txt$/.exec(file);
	if (match === null) continue;
	const [test, expected, params] = fs
		.readFileSync(path.join(plugins, file), "utf8")
		.split(/\r?\n\s*@@@\s*\r?\n/);
	// A case may open with what it checks, above a `===` line.
	const parts = test.split(/^===\r?$/m);
	const input = parts[parts.length - 1].replace(/^\s+/, "");
	const dir = path.join(FIXTURES, `svgo-${kebab(match[1])}-${match[2]}`);
	fs.mkdirSync(dir);
	write(path.join(dir, "index.xml"), input);
	if (parts.length > 1) {
		write(
			path.join(dir, "README.md"),
			parts
				.slice(0, -1)
				.join("===")
				.trim()
				.replace(/\s*\r?\n\s*/g, " ")
		);
	}
	write(path.join(dir, "svgo.xml"), expected);
	if (params !== undefined) write(path.join(dir, "svgo.json"), params);
	write(path.join(dir, "options.json"), JSON.stringify(OPTIONS, null, "\t"));
	count++;
}
const license = fs.readFileSync(path.join(root, "LICENSE"), "utf8");
fs.mkdirSync(path.join(FIXTURES, "svgo"), { recursive: true });
write(
	path.join(FIXTURES, "svgo/README.md"),
	`The \`svgo-*\` fixtures are svgo's plugin tests (https://github.com/svg/svgo/tree/${commit}/test/plugins), copied by \`tooling/import-svgo-fixtures.js\`: \`index.xml\` is the input, \`svgo.xml\` svgo's expected output and \`svgo.json\` the plugin's parameters. They are used under svgo's license:\n\n${license}`
);
console.log(`${count} fixtures from svgo ${commit}`);
