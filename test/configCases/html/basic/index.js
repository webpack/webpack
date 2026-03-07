const fs = require("fs");
const path = require("path");


it("should have emitted the CSS file", () => {
	const cssAsset = __STATS__.assets.find(a => a.name === "bundle0.css");
	expect(cssAsset).toBeDefined();
});

it("should have correct content in HTML", () => {
	const htmlContent = fs.readFileSync(path.join(__dirname, "bundle0.html"), "utf8");
	expect(htmlContent).toContain('<link rel="stylesheet" href="bundle0.css">');
	expect(htmlContent).toContain('<script src="bundle0.js"></script>');
});
