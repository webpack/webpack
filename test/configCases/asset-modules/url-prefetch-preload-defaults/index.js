"use strict";

const findLink = (predicate) =>
	document.head._children.find(
		(el) => el._type === "link" && predicate(el)
	);

it("should apply output.resourceHints.prefetch to all `new URL` without comments", () => {
	const url = new URL("./image.png", import.meta.url);
	expect(url.href).toMatch(/image\.png$/);

	const link = findLink((l) => l.href.endsWith("/image.png"));
	expect(link).toBeDefined();
	expect(link.rel).toBe("prefetch");
	expect(link.as).toBe("image");
	expect(link.getAttribute("fetchpriority")).toBe("low");
});

it("should let a magic-comment hint override the project default", () => {
	new URL(/* webpackPreload: true */ "./font.woff2", import.meta.url);

	const link = findLink((l) => l.href.endsWith("/font.woff2"));
	expect(link).toBeDefined();
	// `webpackPreload: true` wins over `output.resourceHints.prefetch: true`
	expect(link.rel).toBe("preload");
	expect(link.as).toBe("font");
});
