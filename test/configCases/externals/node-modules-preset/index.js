"use strict";

const dep = require("fake-dep");
const local = require("./local");
const aliased = require("aliased-pkg");
const asset = require("asset-pkg/logo.svg");
const aliasedToPackage = require("alias-to-pkg");

it("externalizes packages resolving into node_modules", () => {
	// stubbed at runtime by test.config.js; a bundled copy would report "package"
	expect(dep.where).toBe("runtime");
});

it("bundles a package's non-JS asset instead of externalizing it", () => {
	// externalizing the .svg would make node require() a missing module at runtime
	expect(asset).toMatch(/\.svg$/);
});

it("bundles relative requests", () => {
	expect(local.where).toBe("local");
});

it("bundles a request aliased to another package", () => {
	// externalizing it would keep the original request and load the unaliased package
	expect(aliasedToPackage.where).toBe("real-pkg");
});

it("bundles bare requests resolving outside node_modules", () => {
	// aliased to a local file; externalizing it would break its runtime load
	expect(aliased.where).toBe("alias");
});
