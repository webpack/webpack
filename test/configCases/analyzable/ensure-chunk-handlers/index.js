it("should import a chunk whose only extra source type is an asset", async () => {
	const { url } = await import("./lazy-asset.js");
	expect(url).toContain("img.png");
});
