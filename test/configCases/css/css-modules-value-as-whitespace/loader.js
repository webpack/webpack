"use strict";

// A long run of spaces inside one `@value` import item, too big to keep as a file.
/** @type {import("../../../../").LoaderDefinition} */
module.exports = function loader(content) {
	return content.replace("SPACES", " ".repeat(300000));
};
