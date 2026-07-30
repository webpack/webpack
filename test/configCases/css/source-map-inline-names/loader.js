"use strict";

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function loader(source) {
	// Reports a source for a file that never becomes a module, like a less/sass
	// partial does.
	this.callback(null, source, {
		version: 3,
		sources: ["./virtual-partial.css"],
		sourcesContent: [".virtual-rule {\n\tcolor: red;\n}\n"],
		names: [],
		mappings: "AAAA"
	});
};
