it("should load imports when a dependency changes its async state", async () => {
	const { default: value } = await import("./parent");
	expect(value).toBe(44);
});

it("should load synchronous imports without waiting", () => {
	if (WATCH_STEP !== "1") {
		expect(require("./parent").default).toBe(44);
	}
});
