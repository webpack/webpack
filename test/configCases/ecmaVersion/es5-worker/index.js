it("should reference a worker chunk from es5 output", function () {
	var url = new URL("./worker.js", import.meta.url);
	expect(String(url)).toMatch(/^https:\/\/test\.cases\/path\/.+\.js$/);
});

it("should reference an asset from es5 output", function () {
	var url = new URL("./asset.txt", import.meta.url);
	expect(String(url)).toMatch(/^https:\/\/test\.cases\/path\/.+\.txt$/);
});
