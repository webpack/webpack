it("should process imports of star exports in the correct order", function() {
	var tracker = require("./tracker");
	tracker.list.length = 0;
	delete require.cache[require.resolve("./c")];
	var c = require("./c");
	expect(tracker.list).toEqual(["a", "b", "c"]);
	expect(c.ax).toEqual("ax");
	expect(c.bx).toEqual("ax");
	expect(c.cx).toEqual("ax");
});
