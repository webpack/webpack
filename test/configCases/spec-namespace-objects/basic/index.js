import * as statik from "./m.js";

it("should hand out a spec namespace object for import * as ns", () => {
	expect(Object.getPrototypeOf(statik)).toBe(null);
	// sorted, and without webpack's own `__esModule` marker
	expect(Object.getOwnPropertyNames(statik)).toEqual(["a", "b", "default"]);
	expect(statik[Symbol.toStringTag]).toBe("Module");
	expect(Object.isExtensible(statik)).toBe(false);
	expect(Reflect.set(statik, "a", 9)).toBe(false);
	expect(Reflect.deleteProperty(statik, "a")).toBe(false);
	expect(Reflect.deleteProperty(statik, "notAnExport")).toBe(true);
	expect(Reflect.setPrototypeOf(statik, {})).toBe(false);
	expect(Reflect.setPrototypeOf(statik, null)).toBe(true);
	const descriptor = Object.getOwnPropertyDescriptor(statik, "a");
	expect(descriptor.writable).toBe(true);
	expect(descriptor.enumerable).toBe(true);
	expect(descriptor.configurable).toBe(false);
	expect(statik.a).toBe(1);
	// computed so it stays a namespace lookup rather than a static export ref
	const missing = "notAnExport";
	expect(statik[missing]).toBe(undefined);
	expect(missing in statik).toBe(false);
	expect("a" in statik).toBe(true);
});

it("should reuse one namespace object per module", () => import("./m.js").then((first) =>
	import("./m.js").then((second) => {
		expect(first).toBe(second);
		expect(Object.getPrototypeOf(first)).toBe(null);
		expect(Object.getOwnPropertyNames(first)).toEqual(["a", "b", "default"]);
	})
));
