// This config need to be set on initial evaluation to be effective
__webpack_public_path__ = "https://example.com/public/path/";

it("should skip webpackPrefetch for already-preloaded chunks (universal target)", async () => {
	const hasBrowser = typeof document !== "undefined";

	if (hasBrowser) {
		// Simulate a modulepreload hint already present in the document (e.g. from SSR).
		const preload = document.createElement("link");
		preload.rel = "modulepreload";
		preload.href = "https://example.com/public/path/p.mjs";
		document.head.appendChild(preload);
	}

	// Loading "a" prefetches "p" and "q" (a no-op on the Node side of the build).
	await import(/* webpackChunkName: "a" */ "./a.mjs");

	if (hasBrowser) {
		const prefetched = document.head._children
			.filter(el => el._type === "link" && el.rel === "prefetch")
			.map(el => el.href);

		// "p" is already modulepreloaded -> skipped; "q" has no prior hint -> prefetched.
		expect(prefetched).not.toContain("https://example.com/public/path/p.mjs");
		expect(prefetched).toContain("https://example.com/public/path/q.mjs");
	}
});
