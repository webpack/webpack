import * as mod from "./class.js";

it('should correctly handle class methods and properties (include static)', () => {
	expect(mod.staticBlockValue).toBe("test");
	expect(mod.staticProperty).toBe("test");
	expect(mod.staticMethod).toBe("test");
	expect(mod.reexport).toBe(1);
	expect(mod.method.className).toBe("test");
	expect(mod.method.propertyValue).toBe("test");
	expect(typeof mod.functionName).toBe("string");
	expect(mod.publicMethod.B).toBe(1);
	expect(mod.publicMethod.propertyB).toBe(1);
	expect(mod.publicMethod.privatePropertyB).toBe(1);
	expect(mod.publicMethod.privateMethod.privateName).toBe("test");
	expect(mod.publicMethod.privateMethod.B).toBe(1);
	expect(mod.valueInStaticBlock).toBe(1);
	expect(mod.staticB).toBe(1);
	expect(mod.staticPrivateMethod.B).toBe(1);
	expect(mod.staticPrivateMethod.staticB).toBe(1);
	expect(mod.staticPrivateMethod.privateStaticB).toBe(1);
	expect(mod.staticThis.name).toBe("test");
});
