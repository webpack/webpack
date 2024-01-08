it("should stop if policy fails to be created", function () {
	// emulate trusted types in a window object
	window.trustedTypes = {
		createPolicy: () => {
			throw new Error("Rejecting createPolicy call");
		}
	};

	const createPolicySpy = jest.spyOn(window.trustedTypes, "createPolicy");
	const consoleWarn = jest.spyOn(console, "warn").mockImplementation(() => {});

	let promise;
	try {
		promise = import(
			"./empty?test=stop-on-policy-creation-failure" /* webpackChunkName: "stop-on-policy-creation-failure" */
		);
	} catch (e) {
		expect(e.message).toBe("Rejecting createPolicy call");
	}

	// Unlike in the other test cases, we expect the failure above to prevent any scripts from being added to the document head
	expect(document.head._children.length).toBe(0);
	expect(createPolicySpy).toHaveBeenCalledWith(
		"webpack",
		expect.objectContaining({
			createScriptURL: expect.anything()
		})
	);

	// Unlike in the "continue-on-policy-creation-failure" case, we expect an outright thrown error,
	// rather than a console warning. The console should not have been called:
	expect(consoleWarn).toHaveBeenCalledTimes(0);

	createPolicySpy.mockReset();
	consoleWarn.mockReset();

	return promise;
});
