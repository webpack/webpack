const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

for (const name of ["virtual", "mixed"]) {
	it(`should load ${name} shared chunks with valid integrity and no missing scripts`, () => {
		const html = fs.readFileSync(path.join(__dirname, `${name}.html`), "utf8");
		const tags = html.match(/<script\b[^>]*>/g) || [];
		expect(tags).toHaveLength(name === "virtual" ? 2 : 3);
		expect(tags[0]).toContain(`${name}-runtime.`);
		if (name === "virtual") {
			expect(html).not.toContain("virtual-shared.");
		} else {
			expect(tags[1]).toContain("mixed-shared.");
		}
		expect(html).not.toContain("__WEBPACK_HTML_INTEGRITY__");
		const context = vm.createContext({ self: {} });
		for (const tag of tags) {
			const filename = tag.match(/\bsrc="([^"]+)"/)[1];
			const source = fs.readFileSync(path.join(__dirname, filename));
			const integrity = tag.match(/\bintegrity="([^"]+)"/);
			expect(integrity).not.toBeNull();
			expect(integrity[1]).toBe(
				`sha384-${crypto.createHash("sha384").update(source).digest("base64")}`
			);
			vm.runInContext(source.toString("utf8"), context, { filename });
		}
		expect(context.self.sharedValues).toEqual(["first", "second", "vendor"]);
	});
}
