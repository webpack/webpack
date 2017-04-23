it("should polyfill System", function() {
	if (typeof System === "object" && typeof System.register === "function") {
		require("fail");
	}
	expect((typeof System)).toEqual("object");
	expect((typeof System.register)).toEqual("undefined");
	expect((typeof System.get)).toEqual("undefined");
	expect((typeof System.set)).toEqual("undefined");
	expect((typeof System.anyNewItem)).toEqual("undefined");
	var x = System.anyNewItem;
	expect((typeof x)).toEqual("undefined");
})
