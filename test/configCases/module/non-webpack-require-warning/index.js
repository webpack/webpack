import foo from "./foo";

it("should generate createRequire in concatenated modules", function () {
	expect(foo).toBe(1);
});
