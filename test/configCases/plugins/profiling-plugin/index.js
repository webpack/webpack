import "./test.json";

it("should generate a events.json file", () => {
	var fs = require("fs");
	var path = require("path");

	expect(fs.existsSync(path.join(__dirname, "in/directory/events.json"))).toBe(
		true
	);
});

it("should have proper setup record inside of the json stream", () => {
	var fs = require("fs");
	var path = require("path");

	var source = JSON.parse(
		fs.readFileSync(path.join(__dirname, "in/directory/events.json"), "utf-8")
	);
	expect(source[0].id).toEqual(1);
});
