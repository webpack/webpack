it("should emit valid code for dynamic require string with expr", function() {
	var test = require("./folder/file");
	expect(test("file")).toEqual({ a: false, b: false, c: true, d: true });
	expect(test("file.js")).toEqual({ a: false, b: false, c: false, d: true });
	expect(test("./file")).toEqual({ a: true, b: true, c: false, d: false });
	expect(test("./file.js")).toEqual({ a: false, b: false, c: false, d: false });
});
