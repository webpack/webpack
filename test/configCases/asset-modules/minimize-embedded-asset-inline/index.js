import sheet from "./sheet.css";
import data from "./data.json";
import icon from "./icon.svg";
import page from "./page.html";
import script from "./script.js";

/**
 * @param {string} url a `data:` URL
 * @returns {string} its payload, decoded
 */
const payloadOf = (url) =>
	Buffer.from(url.slice(url.indexOf(",") + 1), "base64").toString("utf8");

it("should encode what came back, not what was written", () => {
	// One asset per language a minimizer here claims, each inlined from the
	// minified text rather than from the source.
	expect(payloadOf(icon)).toBe(
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"> <rect width="10" height="10" /> </svg>'
	);
	expect(payloadOf(sheet)).toBe(".a{color:red}");
	// Whitespace between elements is meaningful here, so only the comment goes.
	expect(payloadOf(page)).toBe('<div class=a>\n\t\n\t<p>hi</p>\n</div>\n');
	expect(payloadOf(data)).toBe('{"a":1,"b":[1,2]}');
	expect(payloadOf(script)).toBe("var a=1;function f(){return a}");
});
