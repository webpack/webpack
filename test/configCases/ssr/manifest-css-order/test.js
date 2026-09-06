const fs = require("fs");
const path = require("path");

const manifest = JSON.parse(
	fs.readFileSync(path.resolve(__dirname, "ssr-manifest.json"), "utf-8")
);

it("lists a route's stylesheets in the order they cascade", () => {
	const files = manifest["./page.js"];

	expect(files).toBeDefined();

	const stylesheets = files.filter((file) => file.endsWith(".css"));

	// `page.js` imports zebra.css before the split chunk carrying alpha.css
	expect(stylesheets).toEqual(["page.css", "alpha.css"]);
});
