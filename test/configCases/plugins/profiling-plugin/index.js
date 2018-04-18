import "./test.json";

it("should generate a events.json file", (done) => {
    var fs = require("fs"),
        path = require("path"),
		os = require("os");

	// HACK: we need this timeout on the CI only,
	// because the filesystem is less responsive
	setTimeout(() => {
		expect(fs.existsSync(path.join(__dirname, "events.json"))).toBe(true);
		done();
	}, 500)
});

it("should have proper setup record inside of the json stream", (done) => {
    var fs = require("fs"),
        path = require("path"),
        os = require("os");

	// HACK: we need this timeout on the CI only,
	// because the filesystem is less responsive
	setTimeout(() => {
		// convert json stream to valid
		var source = JSON.parse(fs.readFileSync(path.join(__dirname, "events.json"), "utf-8").toString() + "{}]");
		expect(source[0].id).toEqual(1);
	}, 500)
});
