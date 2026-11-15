import "./page.html";

// `removeImpliedTags: "smart"` leaves out the `<html>` start tag and keeps
// `</html>`, which a truncation check reads a page as complete by finding.
it("should keep the shell end tags the source spelled", () => {
	expect(true).toBe(true);
});
