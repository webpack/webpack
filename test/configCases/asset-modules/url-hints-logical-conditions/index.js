"use strict";

const a = new URL("./a.png", import.meta.url);
const b = new URL("./b.png", import.meta.url);
const font = new URL("./font.woff2", import.meta.url);

const findLink = (name) =>
	document.head._children.find(
		(el) => el._type === "link" && el.href.endsWith(`/${name}`)
	);

it("should match urlHints rules written as logical conditions", () => {
	expect(a.href).toContain("a.png");
	expect(b.href).toContain("b.png");
	expect(font.href).toContain("font.woff2");
	expect(findLink("a.png").rel).toBe("preload");
	expect(findLink("b.png").rel).toBe("prefetch");
	expect(findLink("font.woff2").rel).toBe("prefetch");
});
