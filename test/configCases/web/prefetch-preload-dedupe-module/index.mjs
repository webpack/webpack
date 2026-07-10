// This config need to be set on initial evaluation to be effective
__webpack_public_path__ = "https://example.com/public/path/";

it("should skip webpackPrefetch for already-preloaded chunks (module output)", async () => {
	// Simulate a preload hint already present in the document (e.g. from SSR/HTML).
	const preload = document.createElement("link");
	preload.rel = "preload";
	preload.as = "script";
	preload.href = "https://example.com/public/path/p.mjs";
	document.head.appendChild(preload);

	// Loading "a" prefetches "p" and "q".
	await import(/* webpackChunkName: "a" */ "./a.mjs");

	const prefetched = document.head._children
		.filter(el => el._type === "link" && el.rel === "prefetch")
		.map(el => el.href);

	// "p" is already preloaded -> skipped; "q" has no prior hint -> prefetched.
	expect(prefetched).not.toContain("https://example.com/public/path/p.mjs");
	expect(prefetched).toContain("https://example.com/public/path/q.mjs");
});
