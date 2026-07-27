import { foo as cjsexport_harmonyimport } from "./cjs-module";
import theDefault, { bar as harmonyexport_harmonyimport } from "./harmony-module";
const { harmonyexport_cjsimport } = require("./harmony-module").bar;
import { baz as harmonyexport_harmonyimport_2 } from "./harmony-module-2";

import * as mod3 from "./harmony-module-3";
export { mod3 };

const { expectSourceToContain, expectSourceToMatch } = require("../../../helpers/expectSource");

// It's important to use propertyName when generating object members to ensure that the exported property name
// uses the same accessor syntax (quotes vs. dot notation) as the imported property name on the other end
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
	// Array format: "a", 0, bar (value) or "a", () => bar (getter)
	expectSourceToMatch(source, `\\/\\* harmony export \\*\\/   "a", .*bar`);

	// Checking formation of imports. The require() edge makes ./harmony-module a
	// wrapped member, so both sides read the mangled export through `.a`. The
	// accessor call is parenthesized so `new`/call positions keep binding to the
	// export rather than to the wrapper accessor.
	expectSourceToContain(source, "(harmony_module_namespaceFn().a);");
	expectSourceToContain(source, "const { harmonyexport_cjsimport } = (harmony_module_namespaceFn().a);");

	// Checking concatenatedmodule.js formation of exports
	expectSourceToContain(source, "a: () => (/* reexport */ harmony_module_3_namespaceObject)");

	// Checking concatenatedmodule.js formation of namespace objects
	expectSourceToContain(source, "a: () => (apple)");
});
