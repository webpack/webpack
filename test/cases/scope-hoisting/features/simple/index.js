import value, { named } from "./module";

it("simple: should have the correct values", function() {
	expect(value).toBe("default");
	expect(named).toBe("named");
});
