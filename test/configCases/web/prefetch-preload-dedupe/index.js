// This config need to be set on initial evaluation to be effective
__webpack_public_path__ = "https://example.com/public/path/";

it("should skip webpackPrefetch when the chunk is already (pre)loaded via markup", async () => {
	// Simulate a preload hint already present in the document (e.g. from SSR/HTML).
	const preload = document.createElement("link");
	preload.rel = "preload";
	preload.as = "script";
	preload.href = "https://example.com/public/path/p.js";
	document.head.appendChild(preload);

	const promise = import(/* webpackChunkName: "a" */ "./a");

	// Drive the <script> load for chunk "a", which then prefetches "p" and "q".
	const script = document.head._children[document.head._children.length - 1];
	expect(script._type).toBe("script");
	__non_webpack_require__("./a.js");
	script.onload();
	await promise;

	const prefetched = document.head._children
		.filter(el => el._type === "link" && el.rel === "prefetch")
		.map(el => el.href);

	// "p" is already preloaded -> skipped; "q" has no prior hint -> prefetched.
	expect(prefetched).not.toContain("https://example.com/public/path/p.js");
	expect(prefetched).toContain("https://example.com/public/path/q.js");
});
