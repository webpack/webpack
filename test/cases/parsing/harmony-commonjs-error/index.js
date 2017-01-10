it("should result in a warning when using module.exports in harmony module", function() {
	var x = require("./wrong-module");
	x.should.be.eql(1234);
	var y = require("./correct-module");
	y.should.have.property("default").be.type("function");
});
