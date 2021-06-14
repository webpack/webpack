import c from "../data/c.json" assert { type: "json" };

it("should be possible to import json data with import assertion", function() {
	expect(c[2]).toBe(3);
});
