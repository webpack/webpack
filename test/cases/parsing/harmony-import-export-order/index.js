it("should process imports of star exports in the correct order", function() {
	var tracker = require("./tracker");
	tracker.list.length = 0;
	delete require.cache[require.resolve("./c")];
	var c = require("./c");
	tracker.list.should.be.eql(["a", "b", "c"]);
	c.ax.should.be.eql("ax");
	c.bx.should.be.eql("ax");
	c.cx.should.be.eql("ax");
});
