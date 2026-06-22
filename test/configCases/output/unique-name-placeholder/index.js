it("should resolve [uniqueName] and [uniquename] in the filename template", () => {
	expect(
		__STATS__.assets.some((asset) => asset.name === "my-app-my-app-main.js")
	).toBe(true);
});

it("should resolve [uniquename] in the publicPath template", () => {
	expect(__webpack_public_path__).toBe("/my-app/");
});

it("should resolve [uniquename] in the assetModuleFilename template", () => {
	const url = require("./file.txt");
	expect(url).toBe("/my-app/my-app.txt");
	expect(__STATS__.assets.some((asset) => asset.name === "my-app.txt")).toBe(
		true
	);
});

it("should resolve [uniquename] in the chunkFilename template", (done) => {
	import(/* webpackChunkName: "async" */ "./chunk").then(({ default: value }) => {
		expect(value).toBe(42);
		expect(
			__STATS__.assets.some((asset) => asset.name === "my-app.async.chunk.js")
		).toBe(true);
		done();
	}, done);
});
