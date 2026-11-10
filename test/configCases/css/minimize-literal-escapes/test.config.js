"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle() {
		return ["bundle0.js"];
	},
	afterExecute(options) {
		expect(
			fs.readFileSync(path.join(options.output.path, "bundle0.css"), "utf8")
		).toBe(
			// `@charset` opens the file, the license banner after everything else.
			'@charset "UTF-8";' +
				'.mdi-a:before{content:"\u{F01C9}"}' +
				'.emoji:after{content:"\u{1F600}!"}' +
				'.bmp:before{content:"\\e900"}' +
				// An identifier keeps its escape, terminator and all.
				".\\1F600 {color:red}" +
				"/*! For license information please see bundle0.css.LICENSE.txt */"
		);
	}
};
