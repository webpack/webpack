const fs = require("fs");
const path = require("path");

it("module-import should correctly get fallback type", function() {
	const content = fs.readFileSync(path.resolve(__dirname, "a.js"), "utf-8");
	expect(content).toContain(`import { default as __WEBPACK_EXTERNAL_MODULE_external0_default__ } from "external0";`); // module
	expect(content).toContain(`const __WEBPACK_EXTERNAL_createRequire_require = __WEBPACK_EXTERNAL_createRequire(import.meta.url);`); // module
	expect(content).toContain(`import * as __WEBPACK_EXTERNAL_MODULE_external1__ from "external1"`); // module
	// the require() edge concatenates this external, so it is a hoisted binding
	// rather than its own module -- createRequire vs. `from "external2"` is what
	// pins the node-commonjs fallback
	expect(content).toContain(`__WEBPACK_EXTERNAL_createRequire_require("external2")`); // node-commonjs
	expect(content).not.toContain(`from "external2"`);
	expect(content).toContain(`import * as __WEBPACK_EXTERNAL_MODULE_external3__ from "external3"`); // module
	expect(content).toContain(`const external3_2 = Promise.resolve(/*! import() */).then`); // import
});
