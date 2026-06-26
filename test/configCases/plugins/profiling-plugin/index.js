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

it("should produce a trace Chrome DevTools can load (#17234)", () => {
	var fs = require("fs");
	var path = require("path");

	var source = JSON.parse(
		fs.readFileSync(path.join(__dirname, "in/directory/events.json"), "utf-8")
	);

	// Replicates Chrome DevTools' trace bootstrap: it iterates the
	// TracingStartedInBrowser frames and picks the parent-less one as the main
	// frame. A missing `frames` array made this throw "not iterable".
	var event = source.find((e) => e.name === "TracingStartedInBrowser");
	expect(event).toBeDefined();

	var mainFrame;
	expect(() => {
		for (var frame of event.args.data.frames) {
			if (!frame.parent) mainFrame = frame;
		}
	}).not.toThrow();
	expect(mainFrame).toBeDefined();
	expect(typeof mainFrame.frame).toBe("string");
});
