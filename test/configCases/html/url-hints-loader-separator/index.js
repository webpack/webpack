import "./page.html";

it("should match a URL hint rule against the URL as written", () => {
	const link = document.head._children.find(
		(el) => el._type === "link" && el.href.endsWith("/a!b.png")
	);
	expect(link).toBeDefined();
	expect(link.rel).toBe("prefetch");
});
