import dummy from "dummy_module";

it("should load", () => {
	expect(dummy()).toBe("this is just a dummy function");
	return import("./inner-dir/b").then(importedModule => {
		expect(importedModule.dummy()).toBe("this is just a dummy function");
	});
});
