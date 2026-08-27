"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		copy: [
			{
				from: "src/k*.txt",
				to: "out",
				transform: (content, absoluteFilename) =>
					`${content.toString().toUpperCase()}:${path.basename(absoluteFilename)}`
			}
		]
	}
};
