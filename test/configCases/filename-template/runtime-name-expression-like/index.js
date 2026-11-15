it("should sanitize a [runtime] name shaped like a string concatenation", () => {
	const files = __STATS__.assets.map(asset => asset.name).sort();
	expect(files).toEqual(["main.js", "runtime-_rt_.js"]);
});
