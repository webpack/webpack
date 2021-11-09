it("should not move externals into the commons chunk", function() {
	const fs = require("fs");
	const path = require("path");
	const source1 = fs.readFileSync(path.join(__output_dirname__, "main.js"), "utf-8");
	const source2 = fs.readFileSync(path.join(__output_dirname__, "other.js"), "utf-8");
	const source3 = fs.readFileSync(path.join(__output_dirname__, "common.js"), "utf-8");
	expect(source1).toMatch("1+" + (1+1));
	expect(source1).toMatch("3+" + (2+2));
	expect(source2).toMatch("1+" + (1+1));
	expect(source2).toMatch("5+" + (3+3));
	expect(source3).not.toMatch("1+" + (1+1));
	expect(source3).not.toMatch("3+" + (2+2));
	expect(source3).not.toMatch("5+" + (3+3));

	require("external");
	require("external2");
	require("./module");
});
