it("should result in a warning when using module.exports in harmony module", function() {
	var x = require("./module1");
	x.should.be.eql({default: 1234});
});
