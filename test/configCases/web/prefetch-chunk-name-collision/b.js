__webpack_public_path__ = "https://example.com/path/";

it("entry b should not prefetch the shared chunk because webpackPrefetch is not set", () => {
	// Entry a (run before this) already added one prefetch link at startup.
	// Without the fix from issue #12393, entry b would also have added a
	// prefetch link because the named "shared" chunk group accumulated
	// prefetchOrder from entry a's block.
	const prefetchLinks = document.head._children.filter(
		(node) => node._type === "link" && node.rel === "prefetch"
	);
	expect(prefetchLinks).toHaveLength(1);
	import(/* webpackChunkName: "shared" */ "./shared");
});
