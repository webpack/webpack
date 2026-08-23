export var value = 42;

it("should wrap an es5 bundle in a library without leaving es5", function () {
	expect(value).toBe(42);
});
