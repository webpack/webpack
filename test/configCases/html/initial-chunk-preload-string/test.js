const fs = require("fs");
const path = require("path");

const page = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");

it('should treat resourceHints: "preload" as an alias of true', () => {
	// The runtime chunk is an initial sibling — preloaded as script.
	expect(page).toMatch(/<link rel="preload" as="script" href="runtime\.js">/);
	// Classic output uses `preload`, never `modulepreload`.
	expect(page).not.toContain("modulepreload");
	// The entry chunk itself is not preloaded — it's already the <script src>.
	expect(page).not.toMatch(/<link rel="preload"[^>]*href="__html_/);
});
