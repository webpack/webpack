import defaultValue, { value, value2, value3, value4 } from "./module";

it("should be possible to redefine Object in a module", function() {
	expect(value).toEqual(123);
	expect(value2).toEqual(123);
	expect(value3).toEqual(123);
	expect(value4).toEqual(123);
	expect(defaultValue).toEqual(123);
});
