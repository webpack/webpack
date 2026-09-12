import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// The filename function puts this bundle in `assets/`, so the output root is
// its parent.
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

it("should name a page's script and link entries after their urls", () => {
	expect(
		fs.readFileSync(path.resolve(out, "page.html"), "utf-8")
	).toMatchSnapshot();
});

it("should keep the directory the filename function returned", () => {
	// The function ran for the extracted entries too, so only the stem it
	// built from the synthetic chunk name was replaced by the tag's url.
	expect(fs.readdirSync(path.resolve(out, "assets"))).toContain("a.mjs");
	expect(fs.readdirSync(path.resolve(out, "styles"))).toContain("a.css");
	expect(fs.readdirSync(out)).not.toContain("a.mjs");
});
