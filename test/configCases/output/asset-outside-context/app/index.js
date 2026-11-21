import "../asset-outside-context-shared/far.png";
import "./near.png";

const fs = require("fs");
const path = require("path");

it("should write the assets outside of output.path, where their options lead", () => {
	expect(
		fs.existsSync(
			path.join(__dirname, "../asset-outside-context-shared/far.png")
		)
	).toBe(true);
	expect(
		fs.existsSync(
			path.join(__dirname, "../asset-outside-context-generated/near.png")
		)
	).toBe(true);
});
