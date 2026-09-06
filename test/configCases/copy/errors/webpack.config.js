"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		copy: [
			{ from: "missing/**/*.txt" },
			{
				from: "files/a.txt",
				filename: "boom.txt",
				transform: () => {
					throw new Error("Transform failed");
				}
			},
			{ from: "files", filename: "collide.txt" }
		]
	}
};
