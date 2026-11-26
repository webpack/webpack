"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	entry: ["./a.js", "./b.js", "./c.js"],
	optimization: {
		avoidEntryIife: true
	}
};
