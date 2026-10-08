import value from "./module";

it("issue-5481: should not cause name conflicts", function() {
	expect((typeof value)).toBe("undefined");
});
