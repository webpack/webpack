it("should resolve aliased loader module with query", function() {
	var foo = require('./a');

	expect(foo).toBe("someMessage");
});

it("should favor explicit loader query over aliased query (options in rule)", function() {
	var foo = require('./b');

	expect(foo).toBe("someOtherMessage");
});

it("should favor explicit loader query over aliased query (inline query in rule)", function() {
	var foo = require('./b2');

	expect(foo).toBe("someOtherMessage");
});

it("should favor explicit loader query over aliased query (inline query in rule.use)", function() {
	var foo = require('./b3');

	expect(foo).toBe("someOtherMessage");
});
