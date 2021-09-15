import dataImport from "@scope/self/a.js";
import dataRequire from "./module1.js";
import importChainEndsWithRequire from "./module3.js";

it("should respect type of import", function() {
	expect(dataImport).toBe(1);
	expect(dataRequire).toBe(2);
	expect(importChainEndsWithRequire).toBe(2);
});
