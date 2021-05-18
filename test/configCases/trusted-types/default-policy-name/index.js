it("should use default trusted types policy name", function () {
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

	const promise = import(
		"./empty?b" /* webpackChunkName: "default-policy-name" */
	);
	var script = document.head._children.pop();
	expect(script.src).toBe("https://test.cases/path/default-policy-name.web.js");
	__non_webpack_require__("./default-policy-name.web.js");
	expect(createScriptURLSpy).toHaveBeenCalledWith(
		"https://test.cases/path/default-policy-name.web.js"
	);
	expect(createPolicySpy).toHaveBeenCalledWith(
		"webpack",
		expect.objectContaining({
			createScriptURL: expect.anything()
		})
	);

	return promise;
});
