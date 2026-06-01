"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: ["./a.js", "./b.js", "./index.js"],
	output: {
		libraryTarget: "global"
	}
};
