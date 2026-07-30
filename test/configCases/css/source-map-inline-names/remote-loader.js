"use strict";

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function loader(source) {
	// Reports an absolute URL source, like a loader pulling in a remote stylesheet.
	this.callback(null, source, {
		version: 3,
		file: "",
		sources: ["https://example.com/remote.css"],
		sourcesContent: [".remote-rule {\n\tcolor: red;\n}\n"],
		names: [],
		mappings: "AAAA"
	});
};
