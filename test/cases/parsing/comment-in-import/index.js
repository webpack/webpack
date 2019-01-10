it("should allow random comments in import()", () => {
	return Promise.all([
		import(/* hello world */ "./module"),
		import(/* }); */ "./module"),
		import(/* test */ "./module"),
		import(/* 1234 */ "./module")
	]);
});
