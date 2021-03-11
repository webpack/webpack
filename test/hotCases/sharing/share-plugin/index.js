it("should accept a shared dependency", done => {
	expect.assertions(1);

	const onApply = error => {
		expect(error).toBeFalsy();
		done();
	};

	require("./module");
	module.hot.accept("./module");

	NEXT(require("../../update")(onApply, true, () => onApply()));
});
