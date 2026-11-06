const fs = require("fs");
const path = require("path");

it("should keep a converted module script decoded as UTF-8", () => {
	const page = fs.readFileSync(path.join(__dirname, "page.html"), "utf8");
	// A module script is decoded as UTF-8 whatever the encoding of the page,
	// and a classic one follows the page unless it names its own charset.
	expect(page).not.toMatch(/\btype="module"/);
	expect(page).toMatch(/<script charset="utf-8" src="a\.js"><\/script>/);
	expect(page).toMatch(/<script charset="UTF-8" src="b\.js"><\/script>/);
});

it("should add nothing on a page that declares UTF-8", () => {
	const page = fs.readFileSync(path.join(__dirname, "utf8-page.html"), "utf8");
	expect(page).not.toMatch(/\btype="module"/);
	expect(page).toMatch(/<script src="a\d*\.js"><\/script>/);
});
