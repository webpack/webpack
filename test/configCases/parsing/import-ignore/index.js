const fs = require("fs");
const path = require("path");

it("should be able to ignore import()", () => {
	const source = fs.readFileSync(path.join(__dirname, "bundle1.js"), "utf-8");
	expect(source).toMatch(`import(/* webpackIgnore: true */ "./other2.js")`);
	expect(source).not.toMatch(`import(/* webpackIgnore: false */ "./other3.js")`);
});
