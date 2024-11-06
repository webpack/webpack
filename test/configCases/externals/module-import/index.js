const fs = require("fs");
const path = require("path");

it("module-import should correctly get fallback type", function() {
	const content = fs.readFileSync(path.resolve(__dirname, "a.js"), "utf-8");
	expect(content).toContain(`import * as __WEBPACK_EXTERNAL_MODULE_external0__ from "external0"`); // module
	expect(content).toContain(`import * as __WEBPACK_EXTERNAL_MODULE_external1__ from "external1"`); // module
	expect(content).toContain(`module.exports = __WEBPACK_EXTERNAL_createRequire(import.meta.url)("external2")`); // node-commonjs
	expect(content).toContain(`import * as __WEBPACK_EXTERNAL_MODULE_external3__ from "external3"`); // module
	expect(content).toContain(`const external3_2 = Promise.resolve(/*! import() */).then`); // import
});
