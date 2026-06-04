const fs = require("fs");
const path = require("path");

const page = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");

it("should emit `<link rel=\"prefetch\">` for the entry's initial dependency chunks", () => {
	// The runtime chunk is an initial sibling — prefetched, not modulepreloaded.
	expect(page).toMatch(/<link rel="prefetch" href="runtime\.mjs">/);
	// `chunks: "prefetch"` never emits modulepreload or preload.
	expect(page).not.toMatch(/<link rel="modulepreload"/);
	expect(page).not.toMatch(/<link rel="preload"/);
	// The entry chunk itself is not hinted — it's already the <script src>.
	expect(page).not.toMatch(/<link rel="prefetch" href="__html_/);
});
