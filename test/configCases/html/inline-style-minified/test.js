const fs = require("fs");
const path = require("path");

for (const name of ["page", "srcdoc", "page-in-process", "srcdoc-in-process"]) {
	it(`should write the inlined stylesheet into minified ${name}.html`, () => {
		const html = fs
			.readFileSync(path.resolve(__dirname, `${name}.html`))
			.toString("utf-8");
		expect(html).toMatch(/<style>[^<]*--spacing:\s*1em/);
		expect(html).not.toContain("__WEBPACK_HTML_INLINE__");
	});
}
