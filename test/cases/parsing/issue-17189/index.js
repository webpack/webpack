import module from "./module.js";

it("should parse sparse arrays", function() {
	var {
		a,
		...other1
	} = module;
	var {
		b,
		...other2
	} = module;

	expect(other1).toEqual({ b: 2, c: 3 });
	expect(other2).toEqual({ a: 1, c: 3 });
});
