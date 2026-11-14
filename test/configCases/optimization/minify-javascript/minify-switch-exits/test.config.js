"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const code = fs.readFileSync(
			path.join(options.output.path, "bundle0.js"),
			"utf8"
		);
		expect(code).not.toContain("dead");
		expect(code).toContain(
			"case 1:log.push(`one`);break;default:log.push(`other`)"
		);
		expect(code).toContain("log.push(`tested`),log.push(`first`)");
		expect(code).toContain(
			"switch(log.push(`tested`)+5){case 1:case log.push(`second`):}"
		);
		expect(code).toContain("if(x===1)return x+1;return 0");
		expect(code).toContain(
			"if(x===1){let data=make(x);return data+data}return 0"
		);
		expect(code).toContain("for(;;){log.push(`once`);break}");
		expect(code).toContain(
			"if(x===1){let data=log.length;log.push(`block`,data)}return log.push(`after`),log"
		);
	}
};
