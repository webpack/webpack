import { test } from "./file";

it("issue-3273: should hide import by local var", function() {
	var test = "ok";
	expect(test).toBe("ok");
});

it("issue-3273: should hide import by object pattern", function() {
	var { test } = { test: "ok" };
	expect(test).toBe("ok");
});

it("issue-3273: should hide import by array pattern", function() {
	var [test] = ["ok"];
	expect(test).toBe("ok");
});

it("issue-3273: should hide import by array pattern (nested)", function() {
	var [[test]] = [["ok"]];
	expect(test).toBe("ok");
});

it("issue-3273: should hide import by pattern in function", function() {
	(function({test}) {
		expect(test).toBe("ok");
	}({ test: "ok" }));
});

it("issue-3273: should allow import in default (incorrect)", function() {
	var { other = test, test } = { test: "ok" };
	expect(test).toBe("ok");
	expect((typeof other)).toBe("undefined");
});

it("issue-3273: should allow import in default", function() {
	var { other = test } = { test: "ok" };
	expect(other).toBe("test");
});
