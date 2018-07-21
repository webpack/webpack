import defaultValue, { value, value2, value3, value4 } from "./module";

it("should be possible to redefine Object in a module", function() {
	value.should.be.eql(123);
	value2.should.be.eql(123);
	value3.should.be.eql(123);
	value4.should.be.eql(123);
	defaultValue.should.be.eql(123);
});
