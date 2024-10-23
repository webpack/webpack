const fs = require("fs");
const path = require("path");

it("IIFE should present for multiple entires", () => {
	const source = fs.readFileSync(path.join(__dirname, "bundle0.mjs"), "utf-8");
	expect(source).toContain(`This entry needs to be wrapped in an IIFE because it needs to be isolated against other entry modules.`);
});
