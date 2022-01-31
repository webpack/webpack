import id from "./id";
import mod from "./module";
import modType from "./typeof-module";

it("should support __webpack_module__.id", () => {
	expect(typeof id).toMatch(/^(string|number)$/);
	expect(id).not.toBe(__webpack_module__.id);
});

it("should support __webpack_module__", () => {
	expect(mod.exports).toBeTypeOf("object");
	expect(typeof mod.id).toMatch(/^(string|number)$/);
	expect(mod).not.toBe(__webpack_module__);
});

it("should support typeof __webpack_module__", () => {
	expect(modType).toBe("object");
});
