"use strict";

const dep = require("fake-dep");
const local = require("./local");
const aliased = require("aliased-pkg");

it("externalizes packages resolving into node_modules", () => {
	// stubbed at runtime by test.config.js; a bundled copy would report "package"
	expect(dep.where).toBe("runtime");
});

it("bundles relative requests", () => {
	expect(local.where).toBe("local");
});

it("bundles bare requests resolving outside node_modules", () => {
	// aliased to a local file; externalizing it would break its runtime load
	expect(aliased.where).toBe("alias");
});
