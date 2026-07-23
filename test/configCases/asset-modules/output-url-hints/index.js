"use strict";

import "./style.css";

// JS `new URL(...)` — picks up the output-level rules too (woff2 preload).
const font = new URL("./font.woff2", import.meta.url);
// icon.png is overridden by the JS-scoped rule to preload (as=image).
const icon = new URL("./icon.png", import.meta.url);

const findLink = (predicate) =>
	document.head._children.find(
		(el) => el._type === "link" && predicate(el)
	);

it("should apply output.urlHints to JS new URL() references", () => {
	const woff = findLink((l) => l.href.endsWith("/font.woff2"));
	expect(woff).toBeDefined();
	expect(woff.rel).toBe("preload");
	expect(woff.as).toBe("font");
	expect(font.href).toContain("font.woff2");
});

it("should apply output.urlHints to CSS url() references", () => {
	const png = findLink((l) => l.href.endsWith("/image.png"));
	expect(png).toBeDefined();
	expect(png.rel).toBe("prefetch");
	expect(png.getAttribute("fetchpriority")).toBe("low");
});

it("should let parser.<type>.urlHints override the output-level rule", () => {
	// output-level says png → prefetch; the JS rule lifts icon.png → preload.
	const iconLink = findLink((l) => l.href.endsWith("/icon.png"));
	expect(iconLink).toBeDefined();
	expect(iconLink.rel).toBe("preload");
	expect(iconLink.as).toBe("image");
	expect(icon.href).toContain("icon.png");
});
