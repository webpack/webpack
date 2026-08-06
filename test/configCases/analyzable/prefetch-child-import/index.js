import fs from "fs";
import path from "path";

it("should still prefetch the grandchild through the analyzable import", async () => {
	const mid = await import("./mid");
	expect(mid.value).toBe("mid");

	// `.f.prefetch` runs after the chunk installs, so the `<link>` exists now.
	const link = document.head._children.find(
		(el) => el._type === "link" && el.rel === "prefetch"
	);

	expect(link).toBeDefined();
	expect(String(link.href)).toContain("grandchild_js");
	expect(await mid.load()).toBe("grandchild");
});

it("should emit the analyzable literal for a chunk with prefetch children", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "main.mjs"),
		"utf8"
	);

	expect(bundle).toContain(`${"__webpack_require__"}.ei("mid_js"`);
	expect(bundle).toContain('import("./mid_js.mjs")');
});
