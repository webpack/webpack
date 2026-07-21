__webpack_public_path__ = "https://example.com/public/path/";

it("should keep dynamicImportCssPreload CSS-only despite a JS webpackPreload", () => {
	// A webpackPreload import registers the JS preload handler (`.j`).
	import(/* webpackChunkName: "jsp", webpackPreload: true */ "./jspreload.mjs");

	// Loading `route` ensures it → fires the CSS-only preload for its child `sub`.
	const promise = import(/* webpackChunkName: "route" */ "./route.mjs");

	const links = document.head._children.filter((el) => el._type === "link");
	const subPreloads = links.filter(
		(l) => l.rel === "preload" && String(l.href).includes("sub")
	);
	// sub's CSS is preloaded as style...
	const css = subPreloads.find((l) => l.as === "style");
	expect(css).toBeDefined();
	expect(String(css.href)).toContain(".css");
	// ...and sub's JS is NOT preloaded (the bug would preload it via .j).
	const js = subPreloads.find((l) => l.as === "script" || l.as === undefined);
	expect(js).toBeUndefined();

	return promise;
});
