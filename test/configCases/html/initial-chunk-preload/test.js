const fs = require("fs");
const path = require("path");

const readFile = (name) =>
	fs.readFileSync(path.resolve(__dirname, name), "utf-8");

const page = readFile("page.html");

it("should preload the entry's initial dependency chunks with <link rel=preload as=script>", () => {
	// The runtime chunk is an initial sibling — preloaded, with SRI + CORS.
	expect(page).toMatch(
		/<link rel="preload" as="script" href="runtime\.js" crossorigin="anonymous" integrity="sha[^"]+">/
	);
	// Classic output uses `preload`, never `modulepreload`.
	expect(page).not.toContain("modulepreload");
	// The entry chunk itself is not preloaded — it's already the <script src>.
	expect(page).not.toMatch(/<link rel="preload"[^>]*href="__html_/);
});

it("should place the preloads inside <head>, before the body scripts", () => {
	const headEnd = page.indexOf("</head>");
	expect(headEnd).toBeGreaterThan(-1);
	// exec()-in-a-loop rather than String.prototype.matchAll (needs Node 12+).
	const re = /<link rel="preload"[^>]*>/g;
	let m;
	while ((m = re.exec(page))) {
		expect(m.index).toBeLessThan(headEnd);
	}
	expect(page.indexOf("<script")).toBeGreaterThan(headEnd);
});

it("should NOT statically hint dynamic imports — those stay on the runtime", () => {
	// The `webpackPrefetch` dynamic import is not rendered as a static tag...
	expect(page).not.toMatch(/rel="prefetch"/);
	expect(page).not.toContain("lazy");
	// ...it is handled by webpack's on-demand prefetch runtime instead.
	expect(readFile("runtime.js")).toContain("prefetch");
});
