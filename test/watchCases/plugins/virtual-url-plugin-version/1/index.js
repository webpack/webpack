import { routes } from "virtual:routes";
import { watchStep } from "virtual:watchStep";
import { constStep } from "virtual:constStep";

it("should have correct read from an external file", function() {
	expect(routes).toBe("v1");
});

it("should always rebuild when version set to true", function() {
	expect(watchStep).toBe(1);
});

it("should not rebuild when version not set", function() {
	expect(constStep).toBe(0);
});
