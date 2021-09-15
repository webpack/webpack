const { describeCases } = require("./TestCases.template");
const vm = require("vm");

describe("TestCases", () => {
	if (!vm.SourceTextModule) {
		throw new Error(
			"Running this test requires '--experimental-vm-modules'.\nRun with 'node --experimental-vm-modules node_modules/jest-cli/bin/jest'."
		);
	}
	describeCases({
		name: "module",
		target: "node14",
		module: true
	});
});
