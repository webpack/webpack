import "./page.html";
import "./kept-comment.html";
import "./head-content.html";

it("should drop the document shell tags the parser implies", () => {
	// The emitted files are the assertion — see the snapshot in test.config.js.
	expect(true).toBe(true);
});
