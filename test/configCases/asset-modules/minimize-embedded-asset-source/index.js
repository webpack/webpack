import css from "./text.css";
import html from "./text.html";
import javascript from "./text.js";
import json from "./text.json";
import svg from "./icon.svg";
import note from "./note.txt";

it("should minify every language an `asset/source` module embeds in JS", () => {
	expect(css).toBe(".a{color:red}");
	expect(html).toContain("<div class=a>");
	expect(html).not.toContain("dropped");
	expect(javascript).toBe('function greet(e){return`hello, ${e}`}greet("world");');
	expect(json).toBe('{"a":1,"b":[2,3]}');
	expect(svg).toBe(
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"> <rect width="10" height="10" /> </svg>'
	);
});

it("should leave a file whose name names no language alone", () => {
	expect(note).toBe("   plain   text   names   no   language   \n");
});
