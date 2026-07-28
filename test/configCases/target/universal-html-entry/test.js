const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");

it("emits the html entry page for a universal target", () => {
	expect(html).toContain("<title>Universal</title>");
	const script = /<script type="module" src="([^"]+)"><\/script>/.exec(html);
	expect(script).not.toBe(null);
	expect(fs.existsSync(path.resolve(__dirname, script[1]))).toBe(true);
});

it("rewrites asset and webmanifest urls in a universal html page", () => {
	expect(html).toContain('<link rel="manifest" href="app.webmanifest">');
	expect(html).toContain('<img src="icon.png" alt="icon">');
	expect(fs.existsSync(path.resolve(__dirname, "icon.png"))).toBe(true);
});

it("bundles the webmanifest icons of a universal html page", () => {
	const manifest = JSON.parse(
		fs.readFileSync(path.resolve(__dirname, "app.webmanifest"), "utf-8")
	);
	expect(manifest.icons[0].src).toBe("icon.png");
});

it("extracts css of a universal html page into a stylesheet link", () => {
	const links = html.match(/<link rel="stylesheet" href="([^"]+)">/g);
	expect(links).not.toBe(null);
	for (const link of links) {
		const file = /href="([^"]+)"/.exec(link)[1];
		expect(fs.existsSync(path.resolve(__dirname, file))).toBe(true);
	}
	const css = links
		.map((link) =>
			fs.readFileSync(
				path.resolve(__dirname, /href="([^"]+)"/.exec(link)[1]),
				"utf-8"
			)
		)
		.join("");
	expect(css).toContain("color: red");
	expect(css).toContain("color: green");
});
