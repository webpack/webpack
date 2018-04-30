import d from "library";
var data = require("library");

it("should get default export from library (" + NAME + ")", function() {
	data.should.be.eql("default-value");
	d.should.be.eql("default-value");
});
