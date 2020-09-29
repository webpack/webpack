import value from "promise-external";
import value2 from "module-promise-external";
import value3 from "object-promise-external";
import request from "import-external";

it("should allow async externals (in strict esm)", () => {
	expect(value).toBe(42);
	expect(value2).toEqual({ __esModule: true, default: 42, named: true });
	expect(value3).toEqual({ default: 42, named: true });
	expect(request).toBe("/hello/world.js");
});

it("should allow to catch errors of async externals (in strict esm)", () => {
	return expect(() => import("failing-promise-external")).rejects.toEqual(
		expect.objectContaining({
			message: "external reject"
		})
	);
});

it("should allow dynamic import promise externals (in strict esm)", () => {
	return import("promise-external").then(module => {
		expect(module).toMatchObject({ default: 42 });
	});
});

it("should allow dynamic import promise externals that are modules (in strict esm)", () => {
	return import("module-promise-external").then(module => {
		expect(module).toMatchObject({
			default: { __esModule: true, default: 42, named: true }
		});
	});
});

it("should allow dynamic import promise externals that are objects (in strict esm)", () => {
	return import("object-promise-external").then(module => {
		expect(module).toMatchObject({
			default: { default: 42, named: true }
		});
	});
});
