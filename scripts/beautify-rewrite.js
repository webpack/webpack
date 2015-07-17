var forEachBeautifiedFile = require("./forEachBeautifiedFile");
var fs = require("fs");

function normalizeNewLines(str) {
	return str.replace(/\r\n?/g, "\n");
}

forEachBeautifiedFile(function(item, callback) {
	var content = normalizeNewLines(item.content);
	var beautifiedContent = normalizeNewLines(item.beautifiedContent);
	if(content !== beautifiedContent) {
		console.log("- " + item.file);
		fs.writeFile(item.path, beautifiedContent, "utf-8", callback);
	} else {
		callback();
	}
}, function(err) {
	if(err) throw err;
	console.log("Done.");
});
