const fs = require("fs");
const path = require("path");

const page = require("./page.html");

const read = (name) => fs.readFileSync(path.resolve(__dirname, name), "utf-8");

it("should run beforeEmit taps as a waterfall (later taps see earlier output)", () => {
	const html = read("page.html");
	// tap 1 injected the CSP meta...
	expect(html).toContain('http-equiv="Content-Security-Policy"');
	// ...and tap 2 observed it, proving the waterfall + the outputName context.
	expect(html).toContain("<!-- csp:true name:page.html -->");
});

it("should not affect the module's JS export (hook runs on the emitted asset)", () => {
	expect(page).not.toContain("Content-Security-Policy");
	expect(page).not.toContain("csp:");
});

it("should call afterEmit with each finalized page's output name", () => {
	expect(read("pages.txt")).toBe("page.html");
});
