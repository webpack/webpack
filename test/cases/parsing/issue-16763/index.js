import * as mod from "./class.js";

it('should correctly handle class methods and properties (include static)', () => {
	expect(mod.staticBlockValue).toBe("test");
	expect(mod.staticProperty).toBe("test");
	expect(mod.staticMethod).toBe("test");
	expect(mod.reexport).toBe(1);
	expect(mod.method.className).toBe("test");
	expect(mod.method.propertyValue).toBe("test");
	expect(mod.functionName).toBe("C");
});
