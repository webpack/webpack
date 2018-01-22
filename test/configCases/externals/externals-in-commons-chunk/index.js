it("should not move externals into the commons chunk", function() {
	require("should");
	var fs = require("fs");
	var source1 = fs.readFileSync(__dirname + "/main.js", "utf-8");
	var source2 = fs.readFileSync(__dirname + "/other.js", "utf-8");
	var source3 = fs.readFileSync(__dirname + "/common.js", "utf-8");
	source1.should.containEql("1+" + (1+1));
	source1.should.containEql("3+" + (2+2));
	source2.should.containEql("1+" + (1+1));
	source2.should.containEql("5+" + (3+3));
	source3.should.not.containEql("1+" + (1+1));
	source3.should.not.containEql("3+" + (2+2));
	source3.should.not.containEql("5+" + (3+3));

	require("external");
	require("external2");
	require("./module");
});
