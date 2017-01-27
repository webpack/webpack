it("should contain hash as query parameter", function() {
	var fs = require("fs");
	var source = fs.readFileSync(__filename, "utf-8");
	var match = /sourceMappingURL\s*=\s*.*\?([A-Fa-f0-9]{32})/.exec(source);
	match.length.should.be.eql(2);
});
