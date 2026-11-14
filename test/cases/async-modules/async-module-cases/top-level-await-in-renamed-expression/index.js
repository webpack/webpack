it("top-level-await-in-renamed-expression: should detect top-level await in the unused branch of a renamed declarator", () =>
	import("./declarator.js").then(({ value }) => {
		expect(value).toBe(true);
	}));

it("top-level-await-in-renamed-expression: should detect top-level await in the unused branch of a renamed assignment", () =>
	import("./assignment.js").then(({ value }) => {
		expect(value).toBe(true);
	}));

it("top-level-await-in-renamed-expression: should detect top-level await in the unused branch of a renamed IIFE argument", () =>
	import("./iife.js").then(({ value }) => {
		expect(value).toBe(true);
	}));
