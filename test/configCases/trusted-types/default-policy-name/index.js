it("should use default trusted types policy name", function() {
	// emulate trusted types in a window object
	const noop = (i) => i
	const rules = {
		createScriptURL: noop,
	}
	window.trustedTypes = {
		createPolicy: () => rules
	}
	const createPolicySpy = jest.spyOn(window.trustedTypes, 'createPolicy')

	const promise = import("./empty?b" /* webpackChunkName: "default-policy-name" */);
	__non_webpack_require__("./default-policy-name.web.js");
	expect(createPolicySpy).toHaveBeenCalledWith('webpack', expect.anything())

	return promise;
});
