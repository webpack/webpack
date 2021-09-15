import { test } from "./file";

it("should hide import by local var", function() {
	var test = "ok";
	expect(test).toBe("ok");
});

it("should hide import by object pattern", function() {
	var { test } = { test: "ok" };
	expect(test).toBe("ok");
});

it("should hide import by array pattern", function() {
	var [test] = ["ok"];
	expect(test).toBe("ok");
});

it("should hide import by array pattern (nested)", function() {
	var [[test]] = [["ok"]];
	expect(test).toBe("ok");
});

it("should hide import by pattern in function", function() {
	(function({test}) {
		expect(test).toBe("ok");
	}({ test: "ok" }));
});

it("should allow import in default (incorrect)", function() {
	var { other = test, test } = { test: "ok" };
	expect(test).toBe("ok");
	expect((typeof other)).toBe("undefined");
});

it("should allow import in default", function() {
	var { other = test } = { test: "ok" };
	expect(other).toBe("test");
});
