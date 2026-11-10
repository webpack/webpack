import page from "./page.html";
import utf8Page from "./utf8-page.html";

it("should keep the next attribute apart when a quoted type=module with no space after it is dropped", () => {
	expect(page).not.toContain("type=");
	expect(page).not.toContain("<scriptsrc");
	expect(page).not.toContain('"src');
	expect(page).toMatch(/<script charset="utf-8" src="entry\.js"><\/script>/);
	expect(page).toMatch(
		/<script charset="utf-8" src="other\.js" data-x="MARK"><\/script>/
	);
});

it("should keep the next attribute apart on a page that declares UTF-8", () => {
	expect(utf8Page).not.toContain("type=");
	expect(utf8Page).toMatch(/<script src="entry\d*\.js"><\/script>/);
	expect(utf8Page).toMatch(/<script src="other\d*\.js" data-x="MARK"><\/script>/);
});
