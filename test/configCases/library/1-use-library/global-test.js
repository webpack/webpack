var data = require("library");

it("should be able get items from library (" + NAME + ")", function() {
	data.should.have.property("default").be.eql("default-value");
	data.should.have.property("a").be.eql("a");
	data.should.have.property("b").be.eql("b");
});
