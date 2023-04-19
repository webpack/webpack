it("can continue on policy creation failure", function () {
	// emulate trusted types in a window object
	window.trustedTypes = {
		createPolicy: () => {
			throw new Error("Rejecting createPolicy call");
		}
	};

	const createPolicySpy = jest.spyOn(window.trustedTypes, "createPolicy");
	const consoleWarn = jest.spyOn(console, "warn").mockImplementation(() => {});

	const promise = import(
		"./empty?b" /* webpackChunkName: "continue-on-policy-creation-failure" */
	);
	var script = document.head._children.pop();
	expect(script.src).toBe(
		"https://test.cases/path/continue-on-policy-creation-failure.web.js"
	);
	__non_webpack_require__("./continue-on-policy-creation-failure.web.js");

	expect(createPolicySpy).toHaveBeenCalledWith(
		"CustomPolicyName",
		expect.objectContaining({
			createScriptURL: expect.anything()
		})
	);
	expect(createPolicySpy).toThrow();
	expect(consoleWarn).toHaveBeenCalledWith(
		`Could not create trusted-types policy "CustomPolicyName"`
	);

	createPolicySpy.mockReset();
	consoleWarn.mockReset();

	return promise;
});
