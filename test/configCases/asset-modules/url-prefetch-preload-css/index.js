"use strict";

import "./style.css";

const findLink = (predicate) =>
	document.head._children.find(
		(el) => el._type === "link" && predicate(el)
	);

it("should apply output.resourceHints rules to CSS url() asset deps", () => {
	// The CSS module has `url(./image.png)` and `url(./font.woff2)`.
	// Both should pick up project-wide defaults from the matching rules.
	const png = findLink((l) => l.href.endsWith("/image.png"));
	expect(png).toBeDefined();
	expect(png.rel).toBe("prefetch");
	expect(png.as).toBe("image");
	expect(png.getAttribute("fetchpriority")).toBe("low");

	const woff = findLink((l) => l.href.endsWith("/font.woff2"));
	expect(woff).toBeDefined();
	expect(woff.rel).toBe("preload");
	expect(woff.as).toBe("font");
	expect(woff.getAttribute("fetchpriority")).toBe("high");
});

it("should let `/* webpackPreload: true */` before `url(...)` override the rule default", () => {
	// `data.png` matches the PNG rule (prefetch), but the comment lifts it
	// to preload.
	const link = findLink((l) => l.href.endsWith("/data.png"));
	expect(link).toBeDefined();
	expect(link.rel).toBe("preload");
});

it("should honor webpackAs / webpackType on CSS url() magic comments", () => {
	// The comment forces `as="fetch"` (overriding the auto-detected `image`
	// for a `.png`) and sets `type="application/octet-stream"`.
	const link = findLink((l) => l.href.endsWith("/data.png"));
	expect(link).toBeDefined();
	expect(link.as).toBe("fetch");
	expect(link.type).toBe("application/octet-stream");
});
