it("should report an error for too deeply nested JSON instead of crashing", () => {
	expect(() => require("./deep.json")).toThrow(
		/JSON nests deeper than 512 levels/
	);
});
