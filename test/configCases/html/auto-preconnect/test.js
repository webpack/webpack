const fs = require("fs");
const path = require("path");

const page = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");
const head = page.slice(0, page.indexOf("</head>"));

it("should emit a preconnect link for the cross-origin publicPath origin", () => {
	expect(head).toContain(
		'<link rel="preconnect" href="https://cdn.example.com" crossorigin="anonymous">'
	);
	// Only the origin, not the full path.
	expect(head).not.toContain('href="https://cdn.example.com/assets/"');
});
