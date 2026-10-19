"use strict";

it("should preserve empty process variables without a file default", () => {
	expect(process.env.WEBPACK_DOTENV_EMPTY_PROCESS_ONLY).toBe("");
	expect(import.meta.env.WEBPACK_DOTENV_EMPTY_PROCESS_ONLY).toBe("");
	expect(
		Object.prototype.hasOwnProperty.call(
			import.meta.env,
			"WEBPACK_DOTENV_EMPTY_PROCESS_ONLY"
		)
	).toBe(true);
});

it("should let empty process variables override file values", () => {
	expect(process.env.WEBPACK_DOTENV_EMPTY_OVERRIDE).toBe("");
	expect(import.meta.env.WEBPACK_DOTENV_EMPTY_OVERRIDE).toBe("");
});

it("should preserve nonempty process variables", () => {
	expect(process.env.WEBPACK_DOTENV_NONEMPTY).toBe("from-process");
	expect(import.meta.env.WEBPACK_DOTENV_NONEMPTY).toBe("from-process");
});
