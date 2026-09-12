import * as spec from "./spec.js";
import * as plain from "./plain.js";
import { getSpecNamespace } from "./other-importer.js";

it("should apply to the imported module, not the importer", () => {
	expect(Object.getPrototypeOf(spec)).toBe(null);
	// index.js itself has no option set, yet plain.js is untouched
	expect(Object.getPrototypeOf(plain)).toBe(Object.prototype);
	expect(Object.getOwnPropertyNames(plain)).toContain("__esModule");
});

it("should hand every importer the same namespace object", () => {
	expect(getSpecNamespace()).toBe(spec);
});
