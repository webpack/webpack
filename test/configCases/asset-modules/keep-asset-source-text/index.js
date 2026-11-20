import css from "./text.css";
import html from "./text.html";
import javascript from "./text.js";
import json from "./text.json";
import svg from "./icon.svg";
import note from "./note.txt";

// A text import is data the program reads, so a production build keeps it as
// the file holds it. SVG is the exception: it is markup to render, and an SVG
// minifier keeps the image the same.
it("should keep an `asset/source` module's text as written", () => {
	expect(html).toBe(
		'<div class="a">\n\t<!-- kept -->\n\t<img alt="{{name}}" src="/u/{{id}}">\n</div>\n'
	);
	expect(css).toBe('.a {\n\tbackground : url("{{url}}") ;\n}\n');
	expect(javascript).toBe(
		'function greet(name) {\n\tconst greeting = "hello";\n\n\treturn `${greeting}, ${name}`;\n}\n\ngreet("world");\n'
	);
	expect(json).toBe('{\n\t"a" :  1 ,\n\t"b" : [ 2 , 3 ]\n}\n');
	expect(note).toBe("   plain   text   names   no   language   \n");
});

it("should minify the SVG an `asset/source` module embeds", () => {
	expect(svg).toBe(
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"> <rect width="10" height="10" /> </svg>'
	);
});
