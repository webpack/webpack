it("should resolve [uniqueName] and [uniquename] in the filename template", () => {
	expect(
		__STATS__.assets.some((asset) => asset.name === "my-app-my-app-main.js")
	).toBe(true);
});
