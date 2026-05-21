"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: ["./a.js", "./b.js", "./c.js", "./index.js"],
	output: {
		library: {
			type: "global"
		}
	}
};
