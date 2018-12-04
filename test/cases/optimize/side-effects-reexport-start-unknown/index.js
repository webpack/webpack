import * as m from "m";

it("should handle unknown exports fine", function() {
	var x = m;
	expect(x).toEqual(nsObj({ foo: "foo" }));
});
