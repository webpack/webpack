import * as m2 from './module2';

const { expectSourceToContain } = require("../../../helpers/expectSource");

// It's important to preserve the same accessor syntax (quotes vs. dot notatation) after the actual export variable.
// Else, minifiers such as Closure Compiler will not be able to minify correctly in ADVANCED mode.

it("should use/preserve accessor form for import object and namespaces", function() {
	var fs = require("fs");
	var source = fs.readFileSync(__filename, "utf-8").toString();

	// Reference the import to generate uses in the source.

	const f = false;
	if (f) {
		const a = m2["m1"]["obj1"]["flip"].flap;
		const b = m2["m1"]["obj1"].zip["zap"];
		const c = m2["m1"]["obj1"]["ding"].dong();
		const d = m2["m1"]["obj1"].sing["song"]();
	}

	/************ DO NOT MATCH BELOW THIS LINE ************/

	// Imported objects and import namespaces should use dot notation.  Any references to the properties of exports
	// should be preserved as either quotes or dot notation, depending on the original source.

	expectSourceToContain(source, 'const a = _module2__WEBPACK_IMPORTED_MODULE_0__.m1.obj1["flip"].flap;');
	expectSourceToContain(source, 'const b = _module2__WEBPACK_IMPORTED_MODULE_0__.m1.obj1.zip["zap"];');

	expectSourceToContain(source, 'const c = _module2__WEBPACK_IMPORTED_MODULE_0__.m1.obj1["ding"].dong();');
	expectSourceToContain(source, 'const d = _module2__WEBPACK_IMPORTED_MODULE_0__.m1.obj1.sing["song"]();');
});
