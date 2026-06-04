"use strict";

const findLink = (predicate) =>
	document.head._children.find(
		(el) => el._type === "link" && predicate(el)
	);

it("should inject a <link rel=prefetch> for new URL() with webpackPrefetch", () => {
	// The link is injected by the chunk's startup runtime — not by the
	// `new URL(...)` call site — so it must already exist before any
	// user code in this chunk runs. CSP nonce is picked up from
	// `document.currentScript.nonce` (the `<script>` tag that loaded
	// the bundle), since `__webpack_nonce__ = ...` inside the entry
	// module would run too late for these startup-fired links.
	const link = findLink((l) => l.href.endsWith("/image.png"));
	expect(link).toBeDefined();
	expect(link.rel).toBe("prefetch");
	expect(link.as).toBe("image");
	expect(link.getAttribute("nonce")).toBe("csp-nonce-from-script-tag");
	expect(link.crossOrigin).toBe("anonymous");

	const url = new URL(
		/* webpackPrefetch: true */
		"./image.png",
		import.meta.url
	);
	expect(url.href).toMatch(/image\.png$/);
});

it("should inject a <link rel=preload> with auto-detected as for fonts", () => {
	new URL(/* webpackPreload: true */ "./font.woff2", import.meta.url);

	const link = findLink((l) => l.href.endsWith("/font.woff2"));
	expect(link.rel).toBe("preload");
	expect(link.as).toBe("font");
});

it("should set fetchpriority when webpackFetchPriority is given", () => {
	new URL(
		/* webpackPreload: true */
		/* webpackFetchPriority: "high" */
		"./style.css",
		import.meta.url
	);

	const link = findLink((l) => l.href.endsWith("/style.css"));
	expect(link.rel).toBe("preload");
	expect(link.as).toBe("style");
	expect(link.getAttribute("fetchpriority")).toBe("high");
});

it("should let webpackAs / webpackType / webpackMedia override defaults", () => {
	new URL(
		/* webpackPreload: true */
		/* webpackAs: "video" */
		/* webpackType: "video/webm" */
		/* webpackMedia: "(max-width: 600px)" */
		"./clip.webm",
		import.meta.url
	);

	const link = findLink((l) => l.href.endsWith("/clip.webm"));
	expect(link.as).toBe("video");
	expect(link.type).toBe("video/webm");
	expect(link.media).toBe("(max-width: 600px)");
});

it("should apply attribute overrides to prefetch too, not only preload", () => {
	new URL(
		/* webpackPrefetch: true */
		/* webpackAs: "fetch" */
		"./data.png",
		import.meta.url
	);

	const link = findLink((l) => l.href.endsWith("/data.png"));
	expect(link.rel).toBe("prefetch");
	expect(link.as).toBe("fetch");
});

it("should prefer preload when both prefetch and preload are set", () => {
	new URL(
		/* webpackPrefetch: true */
		/* webpackPreload: true */
		"./both.png",
		import.meta.url
	);

	const link = findLink((l) => l.href.endsWith("/both.png"));
	expect(link.rel).toBe("preload");
});

it("should not inject a duplicate <link> when the same URL is created twice", () => {
	new URL(/* webpackPrefetch: true */ "./image.png", import.meta.url);
	new URL(/* webpackPrefetch: true */ "./image.png", import.meta.url);

	const matches = document.head._children.filter(
		(el) => el._type === "link" && el.href.endsWith("/image.png")
	);
	expect(matches).toHaveLength(1);
});
