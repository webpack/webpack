require("./tick");

it("should preserve the order of entries without a request property", () => {
	expect(require("./state")).toEqual(
		WATCH_STEP === "0" ? ["a", "b"] : ["b", "a"]
	);
});
