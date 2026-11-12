import page from "./page.html";

it("should keep a plain nomodule script as written", () => {
	expect(page).toMatch(/<script nomodule src="[^"]+\.js"><\/script>/);
	expect(page).toContain("<script nomodule>window.MARK_INLINE_PLAIN = 1;</script>");
});

it("should remove a nomodule script that uses module syntax", () => {
	expect(page).not.toContain("MARK_INLINE_MODULE");
	expect(page.match(/<script nomodule/g)).toHaveLength(2);
});
