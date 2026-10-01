/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// Fails `yarn lint` when two classes under lib/ share a name, as AGENTS.md
// forbids: `generate-types.js` then has to invent one for the published
// `types.d.ts`, and the order-dependent names it falls back to (`…Class_1`)
// renumber when an unrelated file is added. Node builtins only.

const fs = require("fs");
const path = require("path");

const LIB_ROOT = path.resolve(__dirname, "../lib");
const CLASS_DECLARATION_REGEXP = /^class ([A-Z][A-Za-z0-9]*)/gm;

/**
 * Maps every top-level class declared under a directory to the files declaring it.
 * @param {string} directory directory to walk
 * @param {Map<string, string[]>} declarations class name to its files, relative to `LIB_ROOT`
 * @returns {Map<string, string[]>} the same map, for chaining
 */
const collectClassDeclarations = (directory, declarations = new Map()) => {
	for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
		const absolute = path.join(directory, entry.name);

		if (entry.isDirectory()) {
			collectClassDeclarations(absolute, declarations);
			continue;
		}

		if (!entry.name.endsWith(".js")) continue;

		const file = path.relative(LIB_ROOT, absolute).replace(/\\/g, "/");

		for (const [, name] of fs
			.readFileSync(absolute, "utf8")
			.matchAll(CLASS_DECLARATION_REGEXP)) {
			const files = declarations.get(name);

			if (files) {
				files.push(file);
			} else {
				declarations.set(name, [file]);
			}
		}
	}

	return declarations;
};

const declarations = collectClassDeclarations(LIB_ROOT);
const collisions = [...declarations]
	.filter(([, files]) => files.length > 1)
	.sort(([a], [b]) => a.localeCompare(b));

if (collisions.length > 0) {
	for (const [name, files] of collisions) {
		console.error(`\`${name}\` is declared in ${files.join(" and ")}`);
	}

	console.error(
		`Rename ${collisions.length === 1 ? "it" : "each"} so no two classes in lib/ share a name (see "Naming" in AGENTS.md). Keep the export key to leave the public surface unchanged.`
	);
	process.exitCode = 1;
} else {
	console.log(`lib/ declares ${declarations.size} classes, all unique`);
}
