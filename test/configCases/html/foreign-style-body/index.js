import page from "./page.html";

it("should read a foreign style body as character data", () => {
	expect(page).toMatchSnapshot();

	// An HTML-namespace `<style>` body is raw text, so `&amp;` is the five
	// characters the author wrote and the declaration keeps them.
	expect(page).toContain('.htmlns::after{content:"&amp;"}');

	// `<svg><style>` holds character data, so `&#x2e;` names the `.` that
	// starts the selector. Kept as its source the rule reads `&#x2e;foreign`,
	// which selects nothing.
	expect(page).toContain(".foreign");
	expect(page).not.toContain("&#x2e;foreign");

	// Character data is decoded on the way in, so it has to be escaped on the
	// way out — otherwise re-reading the document turns `&amp;` into `&`, and
	// one more round trip would take `&amp;lt;` to `<`.
	expect(page).toContain('.esc::after{content:"&amp;"}');
});
