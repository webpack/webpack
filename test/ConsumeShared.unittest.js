"use strict";

const { normalizeVersion } = require("../lib/sharing/utils");

describe("normalizeVersion", () => {
	const cases = [
		"git+ssh://git@github.com:npm/cli.git#v1.0.27",
		"git+ssh://git@github.com:npm/cli#semver:^5.0",
		"git://github.com/npm/cli.git#v1.0.27",
		"git+https://isaacs@github.com/npm/cli.git",
		"v1.2",
		"^1.2.0"
	];

	const results = [
		"v1.0.27",
		"^5.0",
		"v1.0.27",
		"git+https://isaacs@github.com/npm/cli.git",
		"v1.2",
		"^1.2.0"
	];

	it("should get right version for semver URL deps and normal deps", () => {
		for (let i = 0, len = cases.length; i < len; i++) {
			expect(normalizeVersion(cases[i])).toBe(results[i]);
		}
	});
});
