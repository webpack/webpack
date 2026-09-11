import * as ns from "./m.js";
import { touch } from "./inner.js";

it("should hand out a spec namespace object through a lazy accessor", () => {
	expect(touch()).toBe("object");
	expect(Object.getPrototypeOf(ns)).toBe(null);
	expect(Object.getOwnPropertyNames(ns)).toEqual(["a", "b", "default"]);
	expect(ns[Symbol.toStringTag]).toBe("Module");
	expect(Object.isExtensible(ns)).toBe(false);
	expect(ns.a).toBe(1);
	expect(ns.default).toBe(3);
});

it("should keep one namespace object across references", () => {
	// a second reference renders its own accessor call
	const again = ns;
	expect(again).toBe(ns);
});
