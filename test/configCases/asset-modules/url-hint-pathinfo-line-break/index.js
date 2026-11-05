import imageUrl from "./image.png?a\nb";

it("should add a prefetch link for a request with a line break", () => {
	const url = new URL(
		/* webpackPrefetch: true */
		"./image.png?a\nb",
		import.meta.url
	);
	expect(url.href).toMatch(/image\.png$/);
	expect(imageUrl).toMatch(/image\.png$/);
	const link = document.head._children.find(
		(el) => el._type === "link" && el.href.endsWith("/image.png")
	);
	expect(link).toBeDefined();
	expect(link.rel).toBe("prefetch");
});

it("should keep a line break in a request inside one comment line", () => {
	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const source = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.js"),
		"utf-8"
	);
	expect(source).toContain("/*! ./image.png?a\\nb */");
	expect(source).not.toContain("/*! ./image.png?a\n");
});
