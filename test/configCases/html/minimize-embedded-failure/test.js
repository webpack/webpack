const fs = require("fs");
const path = require("path");

const read = (file) =>
	fs.readFileSync(path.resolve(__dirname, file), "utf-8");

for (const suffix of ["-caller", "-builtin"]) {
	it(`should leave what the CSS minifier failed on in page${suffix}.html as written`, () => {
		const html = read(`page${suffix}.html`);
		expect(html).toContain("<title>Embedded sources a minifier fails on</title>");
		expect(html).toContain("<style>.kept { color : red }</style>");
		expect(html).toContain('style="color : blue"');
	});
}

it("should leave what the CSS minifier failed on in an SVG asset as written", () => {
	expect(read("image-builtin.svg")).toContain(
		"<style>.svg { fill : red }</style>"
	);
});
