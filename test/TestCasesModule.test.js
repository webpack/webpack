"use strict";

const vm = require("vm");
const { describeCases, variants } = require("./templates/TestCases");

describe("TestCases", () => {
	if (!vm.SourceTextModule) {
		throw new Error(
			"Running this test requires '--experimental-vm-modules'.\nRun with 'node --experimental-vm-modules node_modules/jest-cli/bin/jest'."
		);
	}
	describeCases(variants.module);
});
