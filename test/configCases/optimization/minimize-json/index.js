import url from "./data.json";
import notJsonUrl from "./not-json.json";

const fs = require("fs");
const path = require("path");

/**
 * @param {string} file emitted or source file
 * @returns {string} its content
 */
const read = (file) => fs.readFileSync(file, "utf8");

const sourceDirectory = path.resolve(
	__dirname,
	"../../../../configCases/optimization/minimize-json"
);

it("should minify an emitted JSON asset only when `minimizeOptions.json` is on", () => {
	const source = read(path.resolve(__dirname, url));
	if (EXPECTED === "minified") {
		expect(source).toMatchSnapshot();
	} else if (EXPECTED === "user") {
		expect(source).toBe(JSON.stringify(JSON.parse(source), null, 1));
	} else {
		expect(source).toBe(read(path.resolve(sourceDirectory, "data.json")));
	}
});

it("should leave a JSON asset that does not parse as written", () => {
	expect(read(path.resolve(__dirname, notJsonUrl))).toBe(
		read(path.resolve(sourceDirectory, "not-json.json"))
	);
});
