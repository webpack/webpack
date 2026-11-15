import fs from "fs";
import path from "path";
import page from "./page.html";

const PLACEHOLDER = ["__WEBPACK", "CSS_PUBLIC_PATH_AUTO__"].join("_");
const PRELOAD = /<link rel="preload" as="image" href="[a-f0-9]+\.png">/;

it("should resolve the public path of a preloaded image in a page exported to js", () => {
	expect(page).toMatch(/<img src="[a-f0-9]+\.png" alt="image">/);
	expect(page).toMatch(PRELOAD);
	expect(page).not.toContain(PLACEHOLDER);
});

it("should resolve the public path of a preloaded image in an emitted page", () => {
	const emitted = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");
	expect(emitted).toMatch(PRELOAD);
	expect(emitted).not.toContain(PLACEHOLDER);
});
