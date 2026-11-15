import fragment from "./fragment.html";
import page from "./page.html";
import prefix from "./prefix.html";

const fs = __non_webpack_require__("fs");

it("should keep marker text in html exported to js", () => {
	expect(fragment).toBe(
		'<p integrity="__WEBPACK_HTML_INTEGRITY__00__css__END__">__WEBPACK_HTML_INLINE__00__css__END__</p>\n'
	);
});

it("should keep text spelling only the marker prefix", () => {
	expect(prefix).toBe("<p>__WEBPACK_HTML_ prefix</p>\n");
});

it("should drop the inline marker of an extracted page exported to js", () => {
	expect(page).toContain("<script></script>");
	expect(page).not.toContain("__WEBPACK_HTML_");
});

it("should keep a module header comment naming a marker directory closed", () => {
	const bundle = fs.readFileSync(__filename, "utf-8");
	expect(bundle).toContain("*__WEBPACK_CSS_PUBLIC_PATH_AUTO__/auto.js ***!");
	expect(bundle).toContain(
		"*__WEBPACK_HTML_INLINE__00__css__END__/inline.js ***!"
	);
	expect(global.markerDirectories).toEqual(["auto", "inline"]);
});
