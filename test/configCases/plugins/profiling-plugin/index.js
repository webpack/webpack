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

it("should emit a TracingStartedInBrowser event with iterable frames so Chrome can load the trace", () => {
	var fs = require("fs");
	var path = require("path");

	var source = JSON.parse(
		fs.readFileSync(path.join(__dirname, "in/directory/events.json"), "utf-8")
	);
	var event = source.find((e) => e.name === "TracingStartedInBrowser");
	expect(event).toBeDefined();
	expect(Array.isArray(event.args.data.frames)).toBe(true);
});
