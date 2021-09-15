it("should process imports of star exports in the correct order", function() {
	var tracker = require("./tracker");
	tracker.list.length = 0;
	delete require.cache[require.resolve("./c")];
	var c = require("./c");
	expect(tracker.list).toEqual(["a", "b", "c"]);
	expect(c.ax).toBe("ax");
	expect(c.bx).toBe("ax");
	expect(c.cx).toBe("ax");
});
