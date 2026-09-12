import * as self1 from "./index.js";
import * as self2 from "./index.js";
import { testNs } from "./other.js";

export var a = 1;

// Mirrors test262 language/module-code/instn-star-equality.js, which asks for
// a single namespace per module however the importer reached it.
it("should hand out one namespace object for a self-import", () => {
	expect(self1).toBe(self2);
	expect(Object.getPrototypeOf(self1)).toBe(null);
});

it("should hand out one namespace object for a re-exported namespace", () => {
	// a plain exports object carries `Symbol.toStringTag` too, so the null
	// prototype is what tells the two apart
	expect(Object.getPrototypeOf(testNs)).toBe(null);
	expect(testNs).toBe(self1);
});
