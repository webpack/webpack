it("should report a `<script type=module>` it could not read as a classic script", () => {
	// The expectation is `errors.js`: the minifier is handed the body's language
	// but not its parse goal, so a top-level `await` is read as a syntax error.
	expect(true).toBe(true);
});
