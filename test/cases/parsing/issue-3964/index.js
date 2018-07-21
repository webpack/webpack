it("should be possible to export default an imported name", function() {
	var x = require("./module");
	x.should.be.eql({ default: 1234 });
});
