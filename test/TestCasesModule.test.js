const { describeCases } = require("./TestCases.template");
const vm = require("vm");

describe("TestCases", () => {
	if (!vm.SourceTextModule) {
		it("module can't run without --experimental-vm-modules");
		return;
	}
	describeCases({
		name: "module",
		module: true
	});
});
