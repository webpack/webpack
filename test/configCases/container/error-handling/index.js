"use strict";

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
				'Module "invalid" does not exist in container.\nwhile loading "invalid" from webpack/container/reference/remote'
		})
	);
});

it("should allow to handle invalid remote module error with require", async () => {
	const { error } = await import("./invalid-module-cjs");
	expect(error).toEqual(
		expect.objectContaining({
			message:
				'Module "invalid" does not exist in container.\nwhile loading "invalid" from webpack/container/reference/remote'
		})
	);
});

it("should allow to handle invalid remote module error with top-level-await import()", async () => {
	const { error } = await import("./invalid-module-tl-await");
	expect(error).toEqual(
		expect.objectContaining({
			message:
				'Module "invalid" does not exist in container.\nwhile loading "invalid" from webpack/container/reference/remote'
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
