import value, { exception } from "./module";

it("should have a TDZ for exported const values", function() {
	(typeof exception).should.be.eql("object");
	exception.should.be.instanceof(Error);
	exception.message.should.be.eql("value is not defined");
	value.should.be.eql("value");
});
