it("should use default trusted types policy name", function() {
	// emulate trusted types in a window object
	const noop = (i) => i
	const rules = {
		createURL: noop,
		createScriptURL: noop,
	}
	window.TrustedTypes = {
		createPolicy: () => rules
	}
	const createPolicySpy = jest.spyOn(window.TrustedTypes, 'createPolicy')

	const promise = import("./empty?b" /* webpackChunkName: "default-policy-name" */);
	__non_webpack_require__("./default-policy-name.web.js");
	expect(createPolicySpy).toHaveBeenCalledWith('webpack', expect.anything())

	return promise;
});
