const chunk = (name) => __STATS__.chunks.find((c) => c.names.includes(name));
const assetNames = () => __STATS__.assets.map((a) => a.name);

it("should drop a deleted asset from chunk.files and chunk.auxiliaryFiles", () => {
	expect(assetNames()).not.toContain("gone.txt");
	expect(assetNames()).not.toContain("gone-aux.txt");
	expect(chunk("main").files).not.toContain("gone.txt");
	expect(chunk("main").auxiliaryFiles).not.toContain("gone-aux.txt");
});

it("should carry a rename into chunk.files and chunk.auxiliaryFiles", () => {
	expect(chunk("main").files).toContain("to.txt");
	expect(chunk("main").files).not.toContain("from.txt");
	expect(chunk("main").auxiliaryFiles).toContain("to-aux.txt");
	expect(chunk("main").auxiliaryFiles).not.toContain("from-aux.txt");
	expect(chunk("other").files).not.toContain("to.txt");
});

it("should track assets attached after the index was built", () => {
	expect(assetNames()).not.toContain("late.txt");
	expect(chunk("main").files).not.toContain("late.txt");
	expect(chunk("main").files).toContain("late-to.txt");
});

it("should clean every chunk of an asset shared via a re-emit", () => {
	expect(assetNames()).not.toContain("shared.txt");
	expect(chunk("main").files).not.toContain("shared.txt");
	expect(chunk("other").files).not.toContain("shared.txt");
});

it("should not re-add a renamed asset to a chunk that dropped it", () => {
	expect(assetNames()).toContain("stale-renamed.txt");
	expect(chunk("main").files).not.toContain("stale.txt");
	expect(chunk("main").files).not.toContain("stale-renamed.txt");
});

it("should scan the chunks for an asset the index does not know", () => {
	expect(assetNames()).not.toContain("scan-delete.txt");
	expect(chunk("main").files).not.toContain("scan-delete.txt");
	expect(chunk("other").files).not.toContain("scan-rename.txt");
	expect(chunk("other").files).toContain("scanned.txt");
});
