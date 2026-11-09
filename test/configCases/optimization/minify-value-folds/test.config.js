"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const code = fs.readFileSync(
			path.join(options.output.path, "bundle0.js"),
			"utf8"
		);
		expect(code).toContain("{(void 0).a}");
		expect(code).toContain("(void 0)()");
		expect(code).toContain('"false",throws(()=>new(!0))');
		expect(code).toContain(
			'if(u)log.push("or");if(u)log.push("and");if(u)log.push("nullish")'
		);
		expect(code).toContain("return[1/0,-1/0,{[1/0]:1}[Infinity],Infinity]");
		expect(code).toContain("return[1/0,-1/0,NaN,a/(1/0),2**2e3]");
		expect(code).toContain("expect([void 0,void 0]).toEqual");
		expect(code).toContain("expect([1,3,5])");
		expect(code).toContain("[f(),f(),(0,o.f)()]");
	}
};
