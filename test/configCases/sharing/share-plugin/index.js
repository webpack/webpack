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

it("should provide and consume a normal library async in a separate shareScope", async () => {
	expect(await import("lib3")).toEqual(
		expect.objectContaining({
			default: "lib3"
		})
	);
	expect(
		__webpack_share_scopes__.default && __webpack_share_scopes__.default.lib3
	).toBe(undefined);
	expect(typeof __webpack_share_scopes__.other.lib3).toBe("object");
});

it("should provide and consume a relative request async", async () => {
	expect(await import("./relative1")).toEqual(
		expect.objectContaining({
			default: "rel1"
		})
	);
});

it("should consume a remapped relative request async", async () => {
	if (Math.random() < 0) require("store");
	expect(await import("./relative2")).toEqual(
		expect.objectContaining({
			default: "store"
		})
	);
});
