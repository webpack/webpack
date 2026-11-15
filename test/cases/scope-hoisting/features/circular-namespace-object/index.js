import value from "./module";

it("circular-namespace-object: should have access to namespace object before evaluation", function() {
	expect(value).toBe("ok");
});
