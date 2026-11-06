"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const code = fs.readFileSync(
			path.join(options.output.path, "bundle0.js"),
			"utf8"
		);
		expect(code).toContain("expect([5,40,void 0,20])");
		expect(code).toContain('return[x+="foo",y="a",x,y]');
		expect(code).toContain("return new(yield make())");
		expect(code).toContain("expect(new(make())(1).v)");
		expect(code).toContain(
			'expect(function(){log.push("tail")}()).toBe(void 0)'
		);
	}
};
