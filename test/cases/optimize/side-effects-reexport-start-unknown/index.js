import * as m from "m";

it("should handle unknown exports fine", function() {
	var x = m;
	x.should.be.eql({ foo: "foo" });
});
