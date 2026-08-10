"use strict";

import "./style.css";

const findLink = (predicate) =>
	document.head._children.find((el) => el._type === "link" && predicate(el));

it("should inject hints for CSS-only assets under an auto public path", () => {
	// No JS consumer, so the asset has no wrapper to read the url from and the
	// href is rebuilt from the runtime public path plus the emitted filename.
	const png = findLink((l) => l.href.endsWith("image.png"));
	expect(png).toBeDefined();
	expect(png.rel).toBe("prefetch");

	const woff = findLink((l) => l.href.endsWith("font.woff2"));
	expect(woff).toBeDefined();
	expect(woff.rel).toBe("preload");
	expect(woff.as).toBe("font");
});
