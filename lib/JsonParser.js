/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ConstDependency = require("./dependencies/ConstDependency");

class JsonParser {
	constructor(options) {
		this.options = options;
	}

	parse(source, state) {
		const regExp = /\u2028|\u2029/g; // invalid in JavaScript but valid JSON
		let match = regExp.exec(source);
		while(match) {
			const escaped = match[0] === "\u2028" ? "\\u2028" : "\\u2029";
			const dep = new ConstDependency(escaped, [match.index, match.index]);
			state.module.addDependency(dep);
			match = regExp.exec(source);
		}
		return state;
	}
}

module.exports = JsonParser;
