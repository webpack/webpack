"use strict";

const acorn = require("acorn");

/**
 * Replace every `import.meta` meta-property in ESM source with a reference to a
 * prepended `__vm_import_meta` object. Only real syntax is touched (parsed via
 * acorn), so string/comment text containing "import.meta" is left intact. Used
 * to work around Deno 2.8.3 hard-panicking on `import.meta` inside `vm`.
 * @param {string} content module source
 * @param {() => Record<string, string>} makeMeta builds the import.meta value
 * @returns {string} rewritten source
 */
module.exports = (content, makeMeta) => {
	let ast;
	try {
		ast = acorn.parse(content, {
			ecmaVersion: "latest",
			sourceType: "module",
			allowReturnOutsideFunction: true
		});
	} catch (_err) {
		// A parse failure here is unexpected; leave the source as-is.
		return content;
	}

	/** @type {[number, number][]} */
	const ranges = [];
	(function walk(/** @type {EXPECTED_ANY} */ node) {
		if (!node || typeof node.type !== "string") return;
		if (
			node.type === "MetaProperty" &&
			node.meta &&
			node.meta.name === "import" &&
			node.property.name === "meta"
		) {
			ranges.push([node.start, node.end]);
		}
		for (const key of Object.keys(node)) {
			const value = node[key];
			if (Array.isArray(value)) {
				for (const child of value) walk(child);
			} else if (value && typeof value.type === "string") {
				walk(value);
			}
		}
	})(ast);

	if (ranges.length === 0) return content;

	let src = content;
	// apply from the end so earlier offsets stay valid
	ranges.sort((a, b) => b[0] - a[0]);
	for (const [start, end] of ranges) {
		src = src.slice(0, start) + "__vm_import_meta" + src.slice(end);
	}
	return `const __vm_import_meta = ${JSON.stringify(makeMeta())};\n${src}`;
};
