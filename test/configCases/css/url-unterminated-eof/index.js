import "./style.css";

it("resolves an unterminated url() at end-of-input without dropping its last byte", () => {
	// If the tokenizer dropped the final byte, `./img.png` would become
	// `./img.pn` and fail to resolve, breaking the build before this runs.
	expect(true).toBe(true);
});
