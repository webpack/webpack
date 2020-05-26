it("should provide and consume a normal library async", async () => {
	expect(await import("lib1")).toEqual(
		expect.objectContaining({
			default: "lib1"
		})
	);
});

it("should provide and consume a renamed library sync", () => {
	expect(require("lib-two")).toEqual(
		expect.objectContaining({
			default: "lib2"
		})
	);
});

it("should provide and consume a relative request async", async () => {
	expect(await import("./relative1")).toEqual(
		expect.objectContaining({
			default: "rel1"
		})
	);
});

it("should consume a remapped relative request async", async () => {
	expect(await import("./relative2")).toEqual(
		expect.objectContaining({
			default: "store"
		})
	);
});
