import "./page.html";

const findLink = (predicate) =>
	document.head._children.find(
		(el) => el._type === "link" && predicate(el)
	);

it("should apply output.resourceHints rules to HTML <img src> asset deps", () => {
	// The HTML module references `./image.png` via `<img src>`. The
	// matching `resourceHints` rule should inject a `<link rel="prefetch">`
	// with the configured fetchPriority.
	const link = findLink((l) => l.href.endsWith("/image.png"));
	expect(link).toBeDefined();
	expect(link.rel).toBe("prefetch");
	expect(link.as).toBe("image");
	expect(link.getAttribute("fetchpriority")).toBe("low");
});

it("should let an `<!-- webpackPreload: true -->` comment before a tag override the rule default", () => {
	// `logo.png` matches the PNG rule (prefetch), but the HTML comment
	// right before the `<img>` lifts it to preload.
	const link = findLink((l) => l.href.endsWith("/logo.png"));
	expect(link).toBeDefined();
	expect(link.rel).toBe("preload");
});
