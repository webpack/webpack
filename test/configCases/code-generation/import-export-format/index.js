import { foo as cjsexport_harmonyimport } from "./cjs-module";
import theDefault, { bar as harmonyexport_harmonyimport } from "./harmony-module";
const { harmonyexport_cjsimport } = require("./harmony-module").bar;
import { baz as harmonyexport_harmonyimport_2 } from "./harmony-module-2";

import * as mod3 from "./harmony-module-3";
export { mod3 };

const { expectSourceToContain, expectSourceToMatch } = require("../../../helpers/expectSource");
const regexEscape = require("../../../helpers/regexEscape.js");

// It's important to use propertyName when generating object members to ensure that the exported property name
// uses the same accessor syntax (quotes vs. dot notatation) as the imported property name on the other end
// (which needs to use propertyAccess).  Else, minifiers such as Closure Compiler will not be able to minify correctly.
it("should use the same accessor syntax for import and export", function() {

	var fs = require("fs");
	var source = fs.readFileSync(__filename, "utf-8").toString();

	// Reference these imports to generate uses in the source.

	cjsexport_harmonyimport;
	harmonyexport_harmonyimport;
	harmonyexport_cjsimport;
	harmonyexport_harmonyimport_2;
	theDefault;

	/*********** DO NOT MATCH BELOW THIS LINE ***********/

	// Note that there are no quotes around the "a" and "b" properties in the following lines.

	// Checking harmonyexportinitfragment.js formation of standard export fragment
	expectSourceToContain(source, "/* harmony export */   a: () => (/* binding */ bar)");

	// Checking formation of imports
	expectSourceToContain(source, "harmony_module/* bar */.a;");
	expectSourceToMatch(source, `${regexEscape("const { harmonyexport_cjsimport } = (__webpack_require__(/*! ./harmony-module */ ")}\\d+${regexEscape(")/* .bar */ .a);")}`);

	// Checking concatenatedmodule.js formation of exports
	expectSourceToContain(source, "a: () => (/* reexport */ harmony_module_3_namespaceObject)");

	// Checking concatenatedmodule.js formation of namespace objects
	expectSourceToContain(source, "a: () => (apple)");
});
