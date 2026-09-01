import * as ns from "./m.js";

it("should keep the plain exports object when the option is off", () => {
	expect(Object.getPrototypeOf(ns)).toBe(Object.prototype);
	expect(Object.getOwnPropertyNames(ns)).toContain("__esModule");
	expect(ns.a).toBe(1);
});
