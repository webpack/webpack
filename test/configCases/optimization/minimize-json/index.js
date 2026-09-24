import url from "./data.json";

it("should minify an emitted JSON asset only when `minimizeOptions.json` is on", () => {
	const fs = require("fs");
	const path = require("path");

	const source = fs.readFileSync(path.resolve(__dirname, url), "utf8");
	const data = JSON.parse(source);
	if (EXPECTED === "minified") {
		expect(source).toBe(JSON.stringify(data));
	} else if (EXPECTED === "user") {
		expect(source).toBe(JSON.stringify(data, null, 1));
	} else {
		expect(source).toBe(
			fs.readFileSync(path.resolve(__dirname, "../../../../configCases/optimization/minimize-json/data.json"), "utf8")
		);
	}
});
