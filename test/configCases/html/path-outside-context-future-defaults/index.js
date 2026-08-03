import fs from "fs";
import path from "path";
import page from "./page.html";

it("should contain [path] of a page outside of the context", () => {
	// the linked page lives above `context`, so its `[path]` starts with ".."
	expect(page).toContain('<a href="_/_pages/about.html">About</a>');
	expect(
		fs.existsSync(path.join(__STATS__.outputPath, "_/_pages/about.html"))
	).toBe(true);
});
