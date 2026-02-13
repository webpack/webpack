"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: ["./a.js", "./b.js", "./c.js"],
	output: {
		library: {
			name: "MyLib",
			type: "assign"
		}
	}
};
