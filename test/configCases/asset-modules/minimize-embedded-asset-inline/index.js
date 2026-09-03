import icon from "./icon.svg";
import sheet from "./sheet.css";

/**
 * @param {string} url a `data:` URL
 * @returns {string} its payload, decoded
 */
const payloadOf = (url) =>
	Buffer.from(url.slice(url.indexOf(",") + 1), "base64").toString("utf8");

it("should encode what came back, not what was written", () => {
	expect(payloadOf(icon)).toBe(
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"> <rect width="10" height="10" /> </svg>'
	);
	expect(payloadOf(sheet)).toBe(".a{color:red}");
});
