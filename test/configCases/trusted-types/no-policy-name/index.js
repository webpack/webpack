it("should skip trusted types logic when policy name is empty", function () {
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
		"./empty?b" /* webpackChunkName: "no-trusted-types-policy-name" */
	);
	var script = document.head._children.pop();
	__non_webpack_require__("./no-trusted-types-policy-name.web.js");
	expect(script.src).toBe(
		"https://test.cases/path/no-trusted-types-policy-name.web.js"
	);
	expect(createScriptURLSpy).not.toHaveBeenCalled();
	expect(createPolicySpy).not.toHaveBeenCalled();

	return promise;
});
