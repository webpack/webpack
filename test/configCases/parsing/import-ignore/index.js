const fs = require("fs");
const path = require("path");
const should = require("should");

it("should be able to ignore import()", () => {
	const source = fs.readFileSync(path.join(__dirname, "bundle1.js"), "utf-8");
	should(source).containEql(`import(/* webpackIgnore: true */ "./other2.js")`);
	should(source).not.containEql(`import(/* webpackIgnore: false */ "./other3.js")`);
});
