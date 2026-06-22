const fs = require("fs");
const path = require("path");

it("emits the entry .html (extract default) but not the inline srcdoc module", () => {
	const files = fs.readdirSync(__dirname);
	const htmlFiles = files.filter((f) => f.endsWith(".html"));

	// The not-`"inline"` branch: the HTML entry is emitted as a standalone file.
	expect(htmlFiles).toContain("page.html");

	// The `"inline"` branch: the nested `<iframe srcdoc>` document must NOT emit
	// its own `.html`, so the entry page is the only HTML file.
	expect(htmlFiles).toEqual(["page.html"]);

	// The srcdoc asset is still rewritten in place inside the emitted page.
	const page = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");
	expect(page).toContain(
		'srcdoc="<img src=&quot;handled-image.png&quot;>"'
	);
	expect(page).not.toContain("./image.png");
});
