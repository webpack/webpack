import * as ns from "./a";
import * as reexported from "./reexport";
import * as star from "./star";
import * as value from "./value";

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

it("should define an export named __proto__ as an own property", () => {
	for (const object of [ns, reexported, star]) {
		expect(hasOwn(object, "__proto__")).toBe(true);
		expect(object.__proto__()).toBe(42);
	}
	expect(Object.keys(ns).sort()).toEqual(["__proto__", "other"]);
	expect(hasOwn(value, "__proto__")).toBe(true);
	expect(value.__proto__).toEqual({ flag: true });
	expect(Object.getPrototypeOf(value)).not.toBe(value.__proto__);
});

it("should define an export named __proto__ on a dynamically imported namespace", () =>
	Promise.all([import("./a"), import("./star"), import("./value")]).then(
		([a, starNs, valueNs]) => {
			expect(hasOwn(a, "__proto__")).toBe(true);
			expect(a.__proto__()).toBe(42);
			expect(hasOwn(starNs, "__proto__")).toBe(true);
			expect(valueNs.__proto__).toEqual({ flag: true });
		}
	));
