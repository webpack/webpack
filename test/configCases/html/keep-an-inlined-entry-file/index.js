it("should keep the file of an entry a page inlines", () => {
	// Built here: the page inlines this text, and spelling the name would keep the file.
	const name = ["main", "js"].join(".");
	expect(__STATS__.assets.map((asset) => asset.name)).toContain(name);
});
