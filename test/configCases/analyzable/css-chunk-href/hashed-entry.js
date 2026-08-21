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

	// Whatever it baked has to be a file that was actually emitted, so a stand-in the
	// deferred pass never filled in cannot pass.
	const baked = bundle.match(/new URL\("\.\/([^"]+\.css)"/g) || [];

	expect(baked).toHaveLength(1);
	expect(emitted).toContain(baked[0].slice('new URL("./'.length, -1));
	expect(bundle).not.toContain(`${"__webpack_require__"}.k = `);
	expect(bundle).not.toContain(`${"__webpack_require__"}.p = `);
});
