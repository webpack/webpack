it("should load chunk using trusted types with custom policy name", function () {
	// emulate trusted types in a window object
	const noop = i => i;
	const rules = {
		createScriptURL: noop
	};
	window.trustedTypes = {
		createPolicy: () => rules
	};
	const createScriptURLSpy = jest.spyOn(rules, "createScriptURL");
	const createPolicySpy = jest.spyOn(window.trustedTypes, "createPolicy");

	const promise = import("./empty?b" /* webpackChunkName: "trusted-types" */);
	var script = document.head._children.pop();
	__non_webpack_require__("./trusted-types.web.js");
	expect(script.src).toBe("https://test.cases/path/trusted-types.web.js");
	expect(createScriptURLSpy).toHaveBeenCalledWith(
		"https://test.cases/path/trusted-types.web.js"
	);
	expect(createPolicySpy).toHaveBeenCalledWith(
		"customPolicyName",
		expect.objectContaining({
			createScriptURL: expect.anything()
		})
	);

	return promise;
});
