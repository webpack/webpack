import * as module from "./module";

it("should not mangle export when destructuring module", () => {
	const { obj: { a, b }, objCanMangle } = module
	expect(a).toBe("a");
	expect(b).toBe("b");
	expect(objCanMangle).toBe(false)
});

it("should mangle export when destructuring module's porperty", () => {
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
