"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle() {
		return ["bundle0.js"];
	},
	afterExecute(options) {
		const read = (name) =>
			fs.readFileSync(path.join(options.output.path, name), "utf8");
		expect(read("bundle0.css")).toBe(
			"/*! For license information please see bundle0.css.LICENSE.txt */\n" +
				".reset{margin:0}.button{color:red}.icon{color:blue}"
		);
		expect(read("bundle0.css.LICENSE.txt")).toBe(
			"/*!\n * Kit 1.0 - Button\n * Released under the MIT license\n */\n\n" +
				"/*!\n * Kit 1.0 - Reset\n * Released under the MIT license\n */\n\n" +
				"/** @license Apache-2.0 */\n"
		);
	}
};
