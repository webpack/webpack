import value, { named } from "./module";

it("should have the correct values", function() {
	value.should.be.eql("default");
	named.should.be.eql("named");
});
