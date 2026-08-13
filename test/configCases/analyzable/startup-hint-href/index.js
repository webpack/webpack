const asset = new URL(/* webpackPreload: true */ "./a.txt", import.meta.url);
const worker = new URL(
	/* webpackPrefetch: true */ "./worker.js",
	import.meta.url
);

it("should resolve both hinted references", () => {
	expect(asset.href).toContain("a.txt");
	expect(worker.href).toContain("worker");
});
