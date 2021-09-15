it("should replace ! with %21 in the module id string of the context module", function () {
	const moduleId = require.context(
		"./folder",
		true,
		/^(?!file1\.js$).*$/i,
		"lazy"
	).id;
	if (typeof moduleId !== "number")
		expect(moduleId).toBe(
			"./context/issue-10969/folder lazy recursive ^(?%21file1\\.js$).*$/"
		);
});
