import value from "./a";

it("should have the correct values", function() {
	value.should.be.eql("ok");
});


// prevent scope hoisting of b
require("./b");
