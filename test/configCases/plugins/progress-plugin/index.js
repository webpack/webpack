it("should contain the custom progress messages", function() {
	var data = require(__dirname + "/data");
	data.should.containEql("optimizing");
	data.should.containEql("optimizing|CustomPlugin");
	data.should.containEql("optimizing|CustomPlugin|custom category|custom message");
});
