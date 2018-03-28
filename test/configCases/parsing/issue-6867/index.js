import test from './test';

it("should compile default export with function expressions", function() {
	return import(/* webpackChunkName: "test" */ "./test")
		.then(({ default: one }) => {
			one().should.be.eql(1)
		});
});
