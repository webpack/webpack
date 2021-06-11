var value = require("./file");

it("should wait until promises returned by status handlers are fulfilled", (done) => {
	var handler = jest.fn(status => {
		return Promise.resolve().then(() => {
			expect(status).toBe(module.hot.status());
		});
	});
	module.hot.addStatusHandler(handler);
	module.hot.accept("./file", () => {
		value = require("./file");
		done();
	});
	NEXT(require("../../update")(done, undefined, () => {
		expect(module.hot.status()).toBe("idle");
		
		expect(handler.mock.calls).toBe([['check'], ['prepare'], ['dispose'], ['apply'], ['idle']]);
		done();
}));
});

