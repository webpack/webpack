import defer * as ns from "./dep.js";
import defer * as reserved from "./reserved-names.js";
import * as reservedEager from "./reserved-names.js";
import { reexported } from "./barrel.js";

// Opaque keys: webpack resolves a literal member access statically, so it
// never reaches the namespace object.
const opaque = (name) => name;
const absent = opaque("notAnExport");
const esModule = opaque("__esModule");

it("gives a deferred namespace the spec's exotic shape", () => {
	expect(Reflect.isExtensible(ns)).toBe(false);
	expect(Reflect.ownKeys(ns)).toEqual(["alpha", "beta", Symbol.toStringTag]);
	expect(Object.getOwnPropertyDescriptor(ns, "alpha")).toEqual({
		value: 1,
		writable: true,
		enumerable: true,
		configurable: false
	});
});

it("reports only the module's exports", () => {
	expect(esModule in ns).toBe(false);
	expect(ns[esModule]).toBe(undefined);
	expect(Object.getOwnPropertyDescriptor(ns, esModule)).toBe(undefined);
	expect(absent in ns).toBe(false);
	expect(ns[absent]).toBe(undefined);
	expect(Object.getOwnPropertyDescriptor(ns, absent)).toBe(undefined);
});

it("keeps one shape when the same module is also re-exported", () => {
	expect(reexported).toBe(ns);
	expect(Reflect.isExtensible(reexported)).toBe(false);
	expect({ ...reexported }).toEqual({ alpha: 1, beta: 2 });
});

it("keeps a real `__esModule` export and never exposes `then`", () => {
	expect(Reflect.ownKeys(reserved)).toEqual([
		"__esModule",
		"real",
		Symbol.toStringTag
	]);
	// webpack's own interop flag shadows the export's value, on an eager
	// namespace too, so the two must at least agree.
	expect(reserved[esModule]).toBe(reservedEager[esModule]);
	expect(Object.getOwnPropertyDescriptor(reserved, esModule)).toEqual({
		value: reservedEager[esModule],
		writable: true,
		enumerable: true,
		configurable: false
	});
	expect(reserved[opaque("real")]).toBe(1);
	expect(opaque("then") in reserved).toBe(false);
	expect(reserved[opaque("then")]).toBe(undefined);
});
