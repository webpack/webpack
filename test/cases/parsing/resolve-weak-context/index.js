it("should be able to use require.resolveWeak with expression", function() {
	var expr = "file";
	var id = require.resolveWeak("./dir/" + expr);
	id.should.be.eql(require("./dir/file.js"));
});

