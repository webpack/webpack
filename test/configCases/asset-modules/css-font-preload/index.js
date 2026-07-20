"use strict";

import "./style.css";

const findLink = (predicate) =>
	document.head._children.find(
		(el) => el._type === "link" && predicate(el)
	);

it("should auto-preload the primary @font-face src with as=font + type", () => {
	const woff2 = findLink((l) => l.href.endsWith("/font.woff2"));
	expect(woff2).toBeDefined();
	expect(woff2.rel).toBe("preload");
	expect(woff2.as).toBe("font");
	expect(woff2.type).toBe("font/woff2");
});

it("should preload only the first src url per @font-face, not every format", () => {
	// The `woff` fallback is emitted as an asset but must NOT get a preload link.
	const woff = findLink((l) => l.href.endsWith("/font.woff"));
	expect(woff).toBeUndefined();
});

it("should not preload non-@font-face url() assets", () => {
	// `fontPreload` must only touch fonts — a background image gets no link.
	const bg = findLink((l) => l.href.endsWith("/bg.png"));
	expect(bg).toBeUndefined();
});

it("should let a magic comment override the seeded `as`", () => {
	// `webpackAs: "fetch"` wins over the heuristic's `as="font"`; preload stays.
	const other = findLink((l) => l.href.endsWith("/other.woff2"));
	expect(other).toBeDefined();
	expect(other.rel).toBe("preload");
	expect(other.as).toBe("fetch");
});
