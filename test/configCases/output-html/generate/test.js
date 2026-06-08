const fs = require("fs");
const path = require("path");

it("injects CSS link in head and JS defer script in body with publicPath prefix", () => {
	const html = fs.readFileSync(path.resolve(__dirname, "app.html"), "utf-8");
	expect(html).toContain("<title>app</title>");
	expect(html).toMatch(/<link rel="stylesheet" href="\/assets\/[^"]+\.css">/);
	expect(html).toContain('<script defer src="/assets/app.js"></script>');
	expect(html.indexOf("<link")).toBeLessThan(html.indexOf("</head>"));
	expect(html.indexOf("<script")).toBeGreaterThan(html.indexOf("</head>"));
});

it("generates a separate HTML file per entrypoint", () => {
	const lib = fs.readFileSync(path.resolve(__dirname, "lib.html"), "utf-8");
	expect(lib).toContain("<title>lib</title>");
	expect(lib).toContain('<script defer src="/assets/lib.js"></script>');
	expect(lib).not.toMatch(/<link/);
});
