"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		copy: ["files", "single.txt", { from: "files/*.txt", to: "globbed" }]
	}
};
