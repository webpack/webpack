"use strict";

let warnings = [];
let oldWarn;

beforeEach(done => {
	oldWarn = console.warn;
	console.warn = m => warnings.push(m);
	done();
});

afterEach(done => {
	expectWarning();
	console.warn = oldWarn;
	done();
});

const expectWarning = regexp => {
	if (!regexp) {
		expect(warnings).toEqual([]);
	} else {
		expect(warnings).toEqual(
			expect.objectContaining({
				0: expect.stringMatching(regexp),
				length: 1
			})
		);
	}
	warnings.length = 0;
};

it("should allow to handle remote loading error with import()", async () => {
	await expect(import("./loading-error")).rejects.toEqual(
		expect.objectContaining({
			code: "ENOENT"
		})
	);
});

it("should allow to handle remote loading error with require", async () => {
	const { error } = await import("./loading-error-cjs");
	expect(error).toEqual(
		expect.objectContaining({
			code: "ENOENT"
		})
	);
});

it("should allow to handle remote loading error with top-level-await import()", async () => {
	const { error } = await import("./loading-error-tl-await");
	expect(error).toEqual(
		expect.objectContaining({
			code: "ENOENT"
		})
	);
});

it("should allow to handle invalid remote module error with import()", async () => {
	await expect(import("./invalid-module")).rejects.toEqual(
		expect.objectContaining({
			message:
				'Module "./invalid" does not exist in container.\nwhile loading "./invalid" from webpack/container/reference/remote'
		})
	);
	// at this point sharing initialization runs and triggers a warning that 'invalid' remote can't be loaded
	expectWarning(/ENOENT/);
});

it("should allow to handle invalid remote module error with require", async () => {
	const { error } = await import("./invalid-module-cjs");
	expect(error).toEqual(
		expect.objectContaining({
			message:
				'Module "./invalid" does not exist in container.\nwhile loading "./invalid" from webpack/container/reference/remote'
		})
	);
});

it("should allow to handle invalid remote module error with top-level-await import()", async () => {
	const { error } = await import("./invalid-module-tl-await");
	expect(error).toEqual(
		expect.objectContaining({
			message:
				'Module "./invalid" does not exist in container.\nwhile loading "./invalid" from webpack/container/reference/remote'
		})
	);
});

it("should allow to handle remote module evaluation error with import()", async () => {
	await expect(import("./evaluation-error")).rejects.toEqual(
		expect.objectContaining({
			message: "evaluation error"
		})
	);
});

it("should allow to handle remote module evaluation error with require", async () => {
	const { error } = await import("./evaluation-error-cjs");
	expect(error).toEqual(
		expect.objectContaining({
			message: "evaluation error"
		})
	);
});

it("should allow to handle remote module evaluation error with top-level-await import()", async () => {
	const { error } = await import("./evaluation-error-tl-await");
	expect(error).toEqual(
		expect.objectContaining({
			message: "evaluation error"
		})
	);
});
