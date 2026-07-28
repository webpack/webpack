"use strict";

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function loader(source) {
	return `${source}\n.appended {\n\tcolor: teal;\n}\n`;
};
