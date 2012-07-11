/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require("path");

module.exports = function(cwd) {
	var cwd = cwd;
	var cwdParent = path.dirname(cwd);
	var buildins = path.join(__dirname, "..");
	cwd = cwd.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
	cwd = new RegExp("^" + cwd + "|(!)" + cwd, "g");
	var buildinsAsModule = cwd.test(buildins);
	cwdParent = cwdParent.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
	cwdParent = new RegExp("^" + cwdParent + "|(!)" + cwdParent, "g");
	buildins = buildins.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
	buildins = new RegExp("^" + buildins + "|(!)" + buildins, "g");
	var node_modulesRegExpA = /\/node_modules\//g;
	var node_modulesRegExpB = /\\node_modules\\/g;
	var index_jsRegExp = /[\\\/]index.js!/g;
	function compressFilename(filename) {
		if(!filename)
			return filename;
		if(buildinsAsModule)
			filename = filename.replace(buildins, "!(webpack)");
		filename = filename.replace(cwd, "!.");
		if(!buildinsAsModule)
			filename = filename.replace(buildins, "!(webpack)");
		filename = filename.replace(node_modulesRegExpA, "/~/");
		filename = filename.replace(node_modulesRegExpB, "\\~\\");
		filename = filename.replace(index_jsRegExp, "!");
		return filename.replace(/^!|!$/, "");
	}
	return compressFilename;
}