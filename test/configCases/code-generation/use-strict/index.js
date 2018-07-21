"use strict";
it("should include only one use strict per module", function() {
	require("./harmony-with-strict");
	require("./harmony-without-strict");
	require("./harmony-with-strict2");

	var fs = require("fs");
	var source = fs.readFileSync(__filename, "utf-8");

	var regExp = /\"use strict\";?\s*(.*)/g
	var match = regExp.exec(source);
	var matches = [];
	while(match) {
		matches.push(match[1]);
		match = regExp.exec(source);
	}

	matches.should.be.eql([
		"it(\"should include only one use strict per module\", function() {",
		"Object.defineProperty(__webpack_exports__, \"__esModule\", { value: true });",
		"Object.defineProperty(__webpack_exports__, \"__esModule\", { value: true });",
		"Object.defineProperty(__webpack_exports__, \"__esModule\", { value: true });",
		"Object.defineProperty(__webpack_exports__, \"__esModule\", { value: true });",
		"/* unused harmony default export */ var _unused_webpack_default_export = (\"a\");",
	]);
});
