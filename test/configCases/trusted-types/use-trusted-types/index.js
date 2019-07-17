it("should load chunk when there are no trusted types", function() {
	const promise = import("./empty?a" /* webpackChunkName: "no-trusted-types" */);

	var script = document.head._children.pop();
	__non_webpack_require__("./no-trusted-types.web.js");
	expect(script.src).toBe("https://test.cases/path/no-trusted-types.web.js");

	return promise;
});

it("should load chunk using trusted types", function() {
	// emulate trusted types in a window object
	const noop = (i) => i
	const rules = {
		createURL: noop,
		createScriptURL: noop,
	}
	window.TrustedTypes = {
		createPolicy: () => rules
	}
	const createScriptURLSpy = jest.spyOn(rules, 'createScriptURL')
	const createPolicySpy = jest.spyOn(window.TrustedTypes, 'createPolicy')

	const promise = import("./empty?b" /* webpackChunkName: "trusted-types" */);
	var script = document.head._children.pop();
	__non_webpack_require__("./trusted-types.web.js");
	expect(script.src).toBe("https://test.cases/path/trusted-types.web.js");
	expect(createScriptURLSpy).toHaveBeenCalledWith('trusted-types.web.js');
	expect(createPolicySpy).toHaveBeenCalledWith('customPolicyName', expect.anything())

	return promise;
});
