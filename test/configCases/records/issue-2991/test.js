try {
	require("pkgs/somepackage/foo");
} catch(e){}

it("should write relative paths to records", function() {
	var fs = require("fs");
	var path = require("path");
	var content = fs.readFileSync(path.join(__dirname, "records.json"), "utf-8");
	content.should.eql(`{
  "modules": {
    "byIdentifier": {
      "test.js": 0,
      "ignored  pkgs/somepackage/foo": 1,
      "external \\"fs\\"": 2,
      "external \\"path\\"": 3
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
    "byBlocks": {},
    "usedIds": {
      "0": 0
    }
  }
}`);
});
