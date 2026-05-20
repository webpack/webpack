__webpack_public_path__ = "https://example.com/path/";

it("entry a should prefetch the shared chunk at startup", () => {
	const prefetchLinks = document.head._children.filter(
		(node) => node._type === "link" && node.rel === "prefetch"
	);
	expect(prefetchLinks).toHaveLength(1);
	expect(prefetchLinks[0].href).toBe("https://example.com/path/shared.js");
	// The import is what registered the prefetch directive at compile time.
	import(/* webpackChunkName: "shared", webpackPrefetch: true */ "./shared");
});
