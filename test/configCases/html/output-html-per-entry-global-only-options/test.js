const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.resolve(__dirname, "a.html"), "utf-8");

it("entry-level csp is not applied", () => {
	expect(html).not.toContain("Content-Security-Policy");
});

it("entry-level integrity is not applied", () => {
	expect(html).not.toContain("integrity=");
});

it("entry-level inline is not applied", () => {
	expect(html).toMatch(
		/<script[^>]* src="__html_[a-f0-9]+_0\.js"><\/script>/
	);
});

