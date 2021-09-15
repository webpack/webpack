var value = require("./file");

it("should wait until promises returned by status handlers are fulfilled", (done) => {
	var handler = jest.fn(status => {
		var test = jest.fn(() => {
			expect(module.hot.status()).toBe(status == "dispose" ? "apply" : status);
		});

		var promise = Promise.resolve().then(test);
		promise.test = test;

		return promise;
	});
	module.hot.addStatusHandler(handler);
	module.hot.accept("./file", () => {
		value = require("./file");
	});
	NEXT(require("../../update")(done, undefined, () => {
		expect(handler.mock.calls).toStrictEqual([['check'], ['prepare'], ['dispose'], ['apply'], ['idle']]);
		for (let result of handler.mock.results)
			expect(result.value.test).toHaveBeenCalledTimes(1);

		expect(module.hot.status()).toBe("idle");

		done();
  }));
});
