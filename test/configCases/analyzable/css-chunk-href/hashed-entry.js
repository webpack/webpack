import fs from "fs";
import path from "path";

it("should load the stylesheet its hashed name points at", async () => {
	await import("./lazy.css");

	// The neutral runtime guards the DOM, so the stylesheet only lands where there is one.
	if (typeof document !== "undefined") {
		expect(getComputedStyle(document.body).getPropertyValue("background")).toBe(
			" red"
		);
	}
});

it("should fill the reserved name in with the hash the file was emitted under", () => {
	const dir = __STATS__.children[__INDEX__].outputPath;
	const bundle = fs.readFileSync(path.join(dir, `${__NAME__}.mjs`), "utf8");
	const emitted = fs.readdirSync(dir).filter((n) => n.endsWith(".css"));

	// Every config shares this directory, so the name has to be this one's shape as
	// well as a file that exists — a stand-in never filled in is neither.
	const baked = bundle.match(/new URL\("\.\/([^"]+\.css)"/g) || [];

	expect(baked).toHaveLength(1);
	const name = baked[0].slice('new URL("./'.length, -1);

	expect(name).toMatch(/^hashed-lazy_css\.[\da-f]+\.css$/);
	expect(emitted).toContain(name);
	expect(bundle).not.toContain(`${"__webpack_require__"}.k = `);
	expect(bundle).not.toContain(`${"__webpack_require__"}.p = `);
});
