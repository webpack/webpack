const fs = require("fs");
const path = require("path");

it("should be able to ignore require()", () => {
	const source = fs.readFileSync(path.join(__dirname, "bundle1.js"), "utf-8");
	expect(source).toMatch(`require(/* webpackIgnore: true */ "./other2.js")`);
	expect(source).not.toMatch(`require(/* webpackIgnore: false */ "./other3.js")`);
});
