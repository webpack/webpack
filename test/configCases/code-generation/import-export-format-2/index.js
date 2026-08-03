import { foo as cjsexport_harmonyimport } from "./cjs-module";
import theDefault, { bar as harmonyexport_harmonyimport } from "./harmony-module";
import theDefaultExpression from "./export-default-expression";
const { harmonyexport_cjsimport } = require("./harmony-module").bar;
const harmonyexport_cjsimportdefault = require("./export-default-expression").default;
import { baz as harmonyexport_harmonyimport_2 } from "./harmony-module-2";

import * as mod3 from "./harmony-module-3";
export { mod3 };
export { theDefaultExpression }

const { expectSourceToContain, expectSourceToMatch } = require("../../../helpers/expectSource");

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
	theDefaultExpression;
	harmonyexport_cjsimportdefault;

	/*********** DO NOT MATCH BELOW THIS LINE ***********/

	// Checking harmonyexportinitfragment.js formation of standard export fragment
	// Array format: "bar", 0, bar (value) or "bar", () => bar (getter)
	expectSourceToMatch(source, `\\/\\* harmony export \\*\\/   "bar", .*bar`);

	// Checking formation of imports. Both targets become wrapped members, read
	// through lazy accessors: `.bar` unquoted and `["default"]` quoted, as exported.
	// The accessor call is parenthesized so `new`/call positions keep binding to the
	// export rather than to the wrapper accessor.
	expectSourceToContain(source, "const { harmonyexport_cjsimport } = (harmony_module_namespaceFn().bar);");
	expectSourceToContain(source, "const harmonyexport_cjsimportdefault = (export_default_expression_namespaceFn()[\"default\"]);");

	// Checking concatenatedmodule.js formation of exports
	expectSourceToContain(source, "mod3: () => (/* reexport */ harmony_module_3_namespaceObject)");

	// Checking concatenatedmodule.js formation of namespace objects
	expectSourceToContain(source, "apple: () => (apple)");

	// Do not break default option
	expectSourceToContain(source, "[\"default\"] = (___CSS_LOADER_EXPORT___)");
});
