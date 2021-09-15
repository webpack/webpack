it("should return different modules with different casing", function() {
	var a = require("./a");
	var A = require("./A");
	var b = require("./b/file.js");
	var B = require("./B/file.js");
	expect(a).not.toBe(A);
	expect(b).not.toBe(B);
});
