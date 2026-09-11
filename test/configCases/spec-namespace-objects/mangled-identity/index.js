import * as ns from "./m.js";
import { getNamespace } from "./second.js";

it("should hand both importers one namespace even when exports are mangled", () => {
	expect(getNamespace()).toBe(ns);
	expect(Object.getOwnPropertyNames(ns)).toEqual(["alsoUsed", "used"]);
	expect(ns.used).toBe(1);
	expect(ns.alsoUsed).toBe(2);
});
