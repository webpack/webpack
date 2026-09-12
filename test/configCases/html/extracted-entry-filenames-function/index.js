import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));

it("should name a page's script and link entries after their urls", () => {
	expect(
		fs.readFileSync(path.resolve(here, "page.html"), "utf-8")
	).toMatchSnapshot();
});

it("should fall back to a plain [name] the url can fill", () => {
	// `.mjs` because `output.module` is on; `a.css` rather than the `[id].css`
	// the function left behind, which would name the synthetic id.
	const files = fs.readdirSync(here);
	expect(files).toContain("a.mjs");
	expect(files).toContain("a.css");
	expect(files).not.toContain("main.css");
});
