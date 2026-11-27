"use strict";

// Custom media too long to keep as files.
/** @type {import("../../../../").LoaderDefinition} */
module.exports = function loader(content) {
	return content
		.replace("BIG", `${"(min-width: 1px) and ".repeat(5000)}(min-width: 1px)`)
		.replace("LONG", `${"(min-width: 1px) and ".repeat(28000)}(min-width: 1px)`)
		.replace("LIST", Array.from({ length: 20000 }, () => "(--big)").join(", "));
};
