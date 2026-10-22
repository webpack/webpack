import "./style.css";

it("should move the stylesheet's legal comments into a license file", () => {
	// The emitted stylesheet and license file are read in test.config.js
	// (afterExecute); this keeps a runnable entry so the `.css` is produced.
	expect(true).toBe(true);
});
