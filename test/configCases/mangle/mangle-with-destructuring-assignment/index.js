import * as module from "./module";
import { obj3, obj3CanMangle, obj4, obj4CanMangle } from "./reexport?side-effects" // enable side effects to ensure reexport is not skipped

it("should not mangle export when destructuring module", () => {
	const { obj: { a, b }, objCanMangle } = module
	expect(a).toBe("a");
	expect(b).toBe("b");
	expect(objCanMangle).toBe(false)
});

it("should mangle export when destructuring module's property", () => {
	const { a, b } = module.obj2
	const { obj2CanMangle } = module
	expect(a).toBe("a");
	expect(b).toBe("b");
	expect(obj2CanMangle).toBe(true)
});

it("should mangle export when using module dot property", () => {
	expect(module.aaa).toBe("aaa");
	expect(module.aaaCanMangle).toBe(true)
});

it("should not mangle export when destructuring module's property is a module", () => {
	const { aaa, bbb } = obj3;
	expect(aaa).toBe("a");
	expect(bbb).toBe("b");
	expect(obj3CanMangle).toBe(false)
});

it("should not mangle export when destructuring module's nested property is a module", () => {
	const { nested: { obj5, obj5CanMangle } } = obj4;
	expect(obj5.aaa).toBe("a");
	expect(obj5.bbb).toBe("b");
	expect(obj4CanMangle).toBe(true);
	expect(obj5CanMangle).toBe(false)
});
