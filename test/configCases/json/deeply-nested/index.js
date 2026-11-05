it("should report an error for too deeply nested JSON instead of crashing", () => {
	// Engines whose JSON.parse recurses (Node.js 10) overflow before the depth check.
	expect(() => require("./deep.json")).toThrow(
		/JSON nests deeper than 512 levels|Maximum call stack size exceeded/
	);
});

it("should reject JSON just past the depth limit", () => {
	expect(() => require("./over-limit.json")).toThrow(
		/JSON nests deeper than 512 levels/
	);
});
