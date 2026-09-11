import * as ns from "./m.js";
import { required } from "./inner.js";

it("should hand out a spec namespace object to an import", () => {
	expect(Object.getPrototypeOf(ns)).toBe(null);
	expect(Object.getOwnPropertyNames(ns)).toEqual(["a", "b", "default"]);
	expect(ns[Symbol.toStringTag]).toBe("Module");
	expect(Object.isExtensible(ns)).toBe(false);
	expect(ns.a).toBe(1);
	expect(ns.default).toBe(3);
});

it("should hand a require() the exports object, not the namespace", () => {
	// `require` is not an import, so it keeps webpack's interop contract:
	// `__esModule` has to stay readable for a default-interop helper.
	const value = required();

	expect(value).not.toBe(ns);
	expect(value.__esModule).toBe(true);
	expect(Object.getPrototypeOf(value)).toBe(Object.prototype);
	expect(value.default).toBe(3);
});
