import fs from "fs";
import path from "path";

it("should load a chunk a second entrypoint already has at startup", async () => {
	const shared = await import("./shared.js");
	expect(shared.load()).toBe("shared");
	const lazy = await import("./lazy.js");
	expect(lazy.default).toBe("lazy");
});

it("should keep the url fallback next to the names it can bake", () => {
	const source = fs.readFileSync(
		path.join(__STATS__.outputPath, "runtime.mjs"),
		"utf8"
	);

	// Built at runtime so the needles are not source string literals here.
	expect(source).toContain(`${"chunkImports"} = {`);
	expect(source).toContain(`${"__webpack_require__"}.u(chunkId)`);
});
