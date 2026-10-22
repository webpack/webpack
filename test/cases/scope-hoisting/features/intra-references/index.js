import value from "./a";

it("intra-references: should have the correct values", function() {
	expect(value).toBe("ok");
});


// prevent scope hoisting of b
require("./b");
