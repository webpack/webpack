import fs from "fs";
import path from "path";

it("should load the chunk's stylesheet through the analyzable import", async () => {
	const lazy = await import("./lazy");
	expect(lazy.value).toBe("lazy");

	// `.f.css` runs alongside the literal import, so the <link> is in place by now.
	const link = document.head._children.find(
		(el) => el._type === "link" && el.rel === "stylesheet"
	);

	expect(link).toBeDefined();
	expect(String(link.href)).toContain("lazy_js.css");
});

it("should emit the analyzable literal for a chunk carrying css", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "main.mjs"),
		"utf8"
	);

	expect(bundle).toContain(`${"__webpack_require__"}.ei("lazy_js"`);
	expect(bundle).toContain('import("./lazy_js.mjs")');
});
