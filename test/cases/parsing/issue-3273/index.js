import { test } from "./file";

it("should hide import by local var", function() {
	var test = "ok";
	test.should.be.eql("ok");
});

it("should hide import by object pattern", function() {
	var { test } = { test: "ok" };
	test.should.be.eql("ok");
});

it("should hide import by array pattern", function() {
	var [test] = ["ok"];
	test.should.be.eql("ok");
});

it("should hide import by array pattern (nested)", function() {
	var [[test]] = [["ok"]];
	test.should.be.eql("ok");
});

it("should hide import by pattern in function", function() {
	(function({test}) {
		test.should.be.eql("ok");
	}({ test: "ok" }));
});

it("should allow import in default", function() {
	var { other = test, test } = { test: "ok" };
	test.should.be.eql("ok");
	other.should.be.eql("test");
});
