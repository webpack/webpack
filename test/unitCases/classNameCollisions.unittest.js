"use strict";

const fs = require("fs");
const path = require("path");

// Two classes sharing a name cost more than style: `generate-types.js` has to
// invent one, so `types.d.ts` grew names like `WebAssemblyParserClass` and the
// order-dependent `SourceProcessorSyntaxClass_1`. A stack trace is as ambiguous.
const LIB_ROOT = path.join(__dirname, "..", "..", "lib");
const CLASS_DECLARATION_REGEXP = /^class ([A-Z][A-Za-z0-9]*)/gm;

/**
 * Collects every `.js` file under a directory.
 * @param {string} directory directory to walk
 * @param {string[]} files collected paths
 * @returns {string[]} the collected paths
 */
const collectJsFiles = (directory, files = []) => {
	for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
		const absolute = path.join(directory, entry.name);
		if (entry.isDirectory()) {
			collectJsFiles(absolute, files);
		} else if (entry.name.endsWith(".js")) {
			files.push(absolute);
		}
	}
	return files;
};

describe("class names in lib/", () => {
	/** @type {Map<string, string[]>} */
	const declarations = new Map();

	for (const file of collectJsFiles(LIB_ROOT)) {
		const relative = path.relative(LIB_ROOT, file).replace(/\\/g, "/");
		const source = fs.readFileSync(file, "utf8");
		for (const [, name] of source.matchAll(CLASS_DECLARATION_REGEXP)) {
			const files = declarations.get(name);
			if (files) {
				files.push(relative);
			} else {
				declarations.set(name, [relative]);
			}
		}
	}

	it("should have found the classes to check", () => {
		expect(declarations.size).toBeGreaterThan(500);
	});

	it("should never declare one name in two files", () => {
		const collisions = [...declarations]
			.filter(([, files]) => files.length > 1)
			.map(([name, files]) => `${name}: ${files.join(", ")}`)
			.sort();

		expect(collisions).toEqual([]);
	});
});
