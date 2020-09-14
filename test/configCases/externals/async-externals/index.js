import value from "promise-external";
import value2 from "module-promise-external";
import value3 from "object-promise-external";
import request from "import-external";
import "./module.mjs";

it("should allow async externals", () => {
	expect(value).toBe(42);
	expect(value2).toBe(42);
	expect(value3).toEqual({ default: 42, named: true });
	expect(request).toBe("/hello/world.js");
});

it("should allow to catch errors of async externals", () => {
	return expect(() => import("failing-promise-external")).rejects.toEqual(
		expect.objectContaining({
			message: "external reject"
		})
	);
});

it("should allow dynamic import promise externals", () => {
	return import("promise-external").then(module => {
		expect(module).toMatchObject({ default: 42 });
	});
});

it("should allow dynamic import promise externals that are modules", () => {
	return import("module-promise-external").then(module => {
		expect(module).toMatchObject({ default: 42, named: true });
	});
});

it("should allow dynamic import promise externals that are objects", () => {
	return import("object-promise-external").then(module => {
		expect(module).toMatchObject({
			default: { default: 42, named: true },
			named: true
		});
	});
});
