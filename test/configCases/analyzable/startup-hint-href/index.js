const preloaded = new URL(/* webpackPreload: true */ "./a.txt", import.meta.url);
const prefetched = new URL(
	/* webpackPrefetch: true */ "./prefetched.js",
	import.meta.url
);

it("should resolve both hinted references", () => {
	expect(preloaded.href).toContain("a.txt");
	expect(prefetched.href).toContain("prefetched");
});
