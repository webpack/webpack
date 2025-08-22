"use strict";

const fs = require("fs");

require("./test1");

it("should remove sourceMap comment", () => {
	expect(
		fs.readFileSync(__filename).toString("utf-8")
	).not.toMatch(/\/\/\s*@\s*sourceMappingURL/);
});
