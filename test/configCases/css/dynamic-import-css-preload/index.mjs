__webpack_public_path__ = "https://example.com/public/path/";

it("should preload a nested dynamic-import chunk's CSS as style, not its JS", () => {
	// Loading `route` ensures it, which fires the CSS-only preload for its own
	// dynamic-import child `sub` (whose chunk carries CSS).
	const promise = import(/* webpackChunkName: "route" */ "./route.mjs");

	const links = document.head._children.filter((el) => el._type === "link");
	const preload = links.find(
		(l) => l.rel === "preload" && String(l.href).includes("sub")
	);
	expect(preload).toBeDefined();
	expect(preload.as).toBe("style");
	expect(String(preload.href)).toContain("sub");
	expect(String(preload.href)).toContain(".css");

	// The sub chunk's JavaScript is NOT preloaded (CSS-only).
	const jsPreload = links.find(
		(l) =>
			l.rel === "preload" &&
			l.as === "script" &&
			String(l.href).includes("sub")
	);
	expect(jsPreload).toBeUndefined();

	return promise;
});
