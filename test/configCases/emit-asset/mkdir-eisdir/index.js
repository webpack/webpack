"use strict";

const fs = require("fs");
const path = require("path");

it("should emit assets when mkdir reports EISDIR for existing dirs", () => {
	// reaching here means emit did not fail; the nested asset confirms both the
	// top-level and recursive mkdirp EISDIR branches were exercised (#10544)
	expect(
		fs.readFileSync(path.resolve(__dirname, "nested/deep/asset.txt"), "utf8")
	).toBe("emitted while mkdir reported EISDIR\n");
});
