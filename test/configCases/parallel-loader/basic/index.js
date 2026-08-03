it("should run a loader chain in a worker thread", () => {
	expect(require("./a")).toBe("a-parallel");
});

it("should answer resolve() from the main thread", () => {
	expect(require("./b")).toBe("resolved.js");
});
