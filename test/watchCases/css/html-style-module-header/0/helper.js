const fs = require("fs");
const path = require("path");

// The header `output.pathinfo` writes above a sheet, and the module it names.
const HEADER_REGEXP = /^\/\*!\*+!\*\\\n {2}!\*\*\* (.*) \*\*\*!\n {2}\\\*+\/\n/;

// The emitted page's one `<style>`, split into the header a build wrote and
// what it heads.
module.exports = (stats) => {
	const asset = stats.assets.find((a) => /\.html$/.test(a.name));
	const html = fs.readFileSync(path.join(__dirname, asset.name), "utf8");
	const body = /<style>([\s\S]*?)<\/style>/.exec(html)[1];
	const header = HEADER_REGEXP.exec(body);
	return {
		html,
		// Every header in the page, to count them.
		headers: html.match(/!\*\*\* css /g) || [],
		// The sheet the header says it was read as.
		names:
			header &&
			Buffer.from(/base64,([\w+/=]+)/.exec(header[1])[1], "base64").toString(
				"utf8"
			),
		// The body under the header, which is the sheet as the page holds it.
		heads: header && body.slice(header[0].length)
	};
};
