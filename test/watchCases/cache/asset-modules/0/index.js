it("should return a valid url when cached", () => {
	const url = new URL("file.txt", import.meta.url);
	expect(url.pathname).toMatch(/\.txt$/);
});

it("should return a valid url when modified", () => {
	const url = new URL("other.txt", import.meta.url);
	expect(url.pathname).toMatch(/\.txt$/);
});

it("should not emit undefined files", () => {
	expect(STATS_JSON.assets.map(a => a.name)).not.toContain(undefined);
	expect(STATS_JSON.assets.map(a => a.name)).not.toContain("undefined");
});
