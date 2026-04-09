import load from "./loader";

it("should handle anonymous async arrow default export in ES5 env", async () => {
	// `export default async (v) => v * 2` — ArrowFunctionExpression (async),
	// matches isAnonymousDefault. Ensure the Reflect fix-up references the
	// real assignment target, not an undeclared `__WEBPACK_DEFAULT_EXPORT__`.
	const result = await load(21);
	expect(result).toBe(42);
});
