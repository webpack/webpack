const fs = require("fs");
const path = require("path");
import asset from "./asset.jpg";

it("should inject custom publicPathFunction into runtime", () => {
	var source = fs.readFileSync(
		path.join(__dirname, "main.js"),
		"utf-8"
	);
	expect(source).toMatch("/custom/");
	expect(source).toMatch("__webpack_require__.P = function(path, publicPath)");
});

it("should have __webpack_require__.P as a function", () => {
	expect(__webpack_require__.P).toBeTypeOf("function");
});

it("should use custom publicPathFunction for asset URL", () => {
	expect(asset).toBe("/custom/asset.jpg");
});
