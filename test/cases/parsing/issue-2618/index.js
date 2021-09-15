import defaultValue, { value, value2, value3, value4 } from "./module";

it("should be possible to redefine Object in a module", function() {
	expect(value).toBe(123);
	expect(value2).toBe(123);
	expect(value3).toBe(123);
	expect(value4).toBe(123);
	expect(defaultValue).toBe(123);
});
