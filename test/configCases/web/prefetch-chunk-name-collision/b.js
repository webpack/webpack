__webpack_public_path__ = "https://example.com/path/";

// The import below only needs to exist for the parser to associate this
// entry with the same named chunk group. Wrapping it in unreachable code
// prevents the JSONP runtime from arming a long chunkLoadTimeout.
if (Math.random() < -1) {
	import(/* webpackChunkName: "shared" */ "./shared");
}

it("entry b should not prefetch the shared chunk because webpackPrefetch is not set", () => {
	// Entry a (run before this) already added one prefetch link at startup.
	// Without the fix from issue #12393, entry b would also have added a
	// prefetch link because the named "shared" chunk group accumulated
	// prefetchOrder from entry a's block.
	const prefetchLinks = document.head._children.filter(
		(node) => node._type === "link" && node.rel === "prefetch"
	);
	expect(prefetchLinks).toHaveLength(1);
});
