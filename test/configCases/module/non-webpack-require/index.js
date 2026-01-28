import { createRequire as func_create_require, builtinModules as builtin } from "module";
import external from "external-module";
import externalOther from "external-other-module";
import baz from "./baz.js";

it("should work with __non_webpack_require__ and ES modules", function () {
	const foo = __non_webpack_require__("./mod.js");

	expect(foo).toBe("module text");
	expect(external).toBe("external module text");
	expect(externalOther).toBe("external module text");
	expect(baz).toBe("baz module text");
	expect(typeof func_create_require).toBe("function");
	expect(func_create_require(import.meta.url)("./mod.js")).toBe("module text");
	expect(typeof builtin).toBe("object")
});
