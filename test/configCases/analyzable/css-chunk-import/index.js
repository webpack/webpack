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

	expect(bundle).toContain(`${"chunkImports"} = {`);
	expect(bundle).toContain('import("./lazy_js.mjs")');
});

it("should carry the handler map without the runtime chunk loader", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "main.mjs"),
		"utf8"
	);
	const require_ = "__webpack_require__";

	// `.f.css` needs the map to attach to, and `.e` dispatches every handler on it.
	expect(bundle).toContain(`${require_}.f = {}`);
	expect(bundle).toContain(`${require_}.f.css =`);
	expect(bundle).toContain(`${require_}.f.j =`);
	// The js handler imports a name from the loader's map, so no chunk id is ever
	// turned into a filename and that table is not emitted.
	expect(bundle).not.toContain(`${require_}.u =`);
});
