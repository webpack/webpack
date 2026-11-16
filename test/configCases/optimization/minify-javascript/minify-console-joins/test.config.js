"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const code = fs.readFileSync(
			path.join(options.output.path, "bundle0.js"),
			"utf8"
		);
		expect(code).not.toContain("dropped");
		expect(code).not.toContain("optional");
		expect(code).toContain("expect(`<Grid size={3} />\\nBelow 4.\\n\\nEnd.`)");
		expect(code).toContain("expect(`a<!`+`-- 1`)");
		expect(code).not.toContain("a< /script>");
		expect(code).not.toContain("a<! --");
	}
};
