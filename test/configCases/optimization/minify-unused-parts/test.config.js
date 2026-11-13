"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const code = fs.readFileSync(
			path.join(options.output.path, "bundle0.js"),
			"utf8"
		);
		expect(code).toContain("var{x:left}={x:1,y:2},[,kept,last]=[3,4,5]");
		expect(code).toContain("var{a,b,...others}=o");
		expect(code).toContain("function(value){return note(value)}");
		expect(code).toContain("var shared=7;var fresh;return[shared,fresh]");
		expect(code).toContain("function unreadRest(first){return first}");
		expect(code).toContain("function(unused,used){return used}(0,");
		expect(code).toContain("function(){return 1}(note(`extra`))");
	}
};
