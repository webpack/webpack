try {
	require("pkgs/somepackage/foo");
} catch(e){}

it("should write relative paths to records", function() {
	var fs = require("fs");
	var path = require("path");
	var content = fs.readFileSync(path.join(__dirname, "records.json"), "utf-8");
	expect(content).toEqual(`{
  "modules": {
    "byIdentifier": {
      "external \\"path\\"": 0,
      "external \\"fs\\"": 1,
      "ignored  pkgs/somepackage/foo": 2,
      "test.js": 3
    },
    "usedIds": {
      "0": 0,
      "1": 1,
      "2": 2,
      "3": 3
    }
  },
  "chunks": {
    "byName": {
      "main": 0
    },
    "bySource": {},
    "usedIds": [
      0
    ]
  }
}`);
});
