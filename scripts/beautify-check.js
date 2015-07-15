var forEachBeautifiedFile = require("./forEachBeautifiedFile");
var diff = require("diff");

function normalizeNewLines(str) {
	return str.replace(/\r\n?/g, "\n");
}

var errors = 0;

forEachBeautifiedFile(function(item, callback) {
	var content = normalizeNewLines(item.content);
	var beautifiedContent = normalizeNewLines(item.beautifiedContent);
	if(content !== beautifiedContent) {
		console.log(diff.createPatch(item.file, content, beautifiedContent));
		console.log();
		errors++;
	}
	callback();
}, function(err) {
	if(err) throw err;
	if(errors) {
		console.log(errors + " Errors.");
		process.exit(1);
	} else {
		console.log("Fine.");
		process.exit(0);
	}
});
