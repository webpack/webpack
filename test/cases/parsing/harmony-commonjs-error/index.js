it("should result in a warning when using module.exports in harmony module", function() {
	var x = require("./wrong-module");
	x.should.be.eql(1234);
});
