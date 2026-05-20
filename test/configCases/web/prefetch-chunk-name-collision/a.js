__webpack_public_path__ = "https://example.com/path/";

// The import below only needs to exist for the parser to register the
// prefetch directive. Wrapping it in unreachable code prevents the
// JSONP runtime from arming a long chunkLoadTimeout in the test harness.
if (Math.random() < -1) {
	import(/* webpackChunkName: "shared", webpackPrefetch: true */ "./shared");
}

it("entry a should prefetch the shared chunk at startup", () => {
	const prefetchLinks = document.head._children.filter(
		(node) => node._type === "link" && node.rel === "prefetch"
	);
	expect(prefetchLinks).toHaveLength(1);
	expect(prefetchLinks[0].href).toBe("https://example.com/path/shared.js");
});
