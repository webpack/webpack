it("should polyfill System", function() {
	if (typeof System === "object" && typeof System.register === "function") {
		require("fail");
	}
	expect((typeof System)).toBe("object");
	expect((typeof System.register)).toBe("undefined");
	expect((typeof System.get)).toBe("undefined");
	expect((typeof System.set)).toBe("undefined");
	expect((typeof System.anyNewItem)).toBe("undefined");
	var x = System.anyNewItem;
	expect((typeof x)).toBe("undefined");
})
