it("should resolve when import existed chunk (#8626)", function(done) {
	require.context("./dir-initial/");
	const fileName = "initialModule";
	import(`./dir-initial/${fileName}`).then(({default:m}) => {
		expect(m).toBe("initialModuleDefault");
		done();
	}).catch(done);
});
