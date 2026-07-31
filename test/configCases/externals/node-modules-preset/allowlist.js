"use strict";

const regexPkg = require("allow-regex");
const stringPkg = require("allow-string");
const fnPkg = require("allow-fn");
const externalized = require("fake-dep");

it("keeps allowlisted packages bundled (RegExp, string, function)", () => {
	// bundled copies run their real code and report "package"
	expect(regexPkg.where).toBe("package");
	expect(stringPkg.where).toBe("package");
	expect(fnPkg.where).toBe("package");
});

it("still externalizes packages not in the allowlist", () => {
	// stubbed at runtime by test.config.js
	expect(externalized.where).toBe("runtime");
});
