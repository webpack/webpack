/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require("path");

function RequestShortener(directory) {
	var parentDirectory = path.dirname(directory);
	var buildins = path.join(__dirname, "..");
	var currentDirectoryRegExp = directory.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
	currentDirectoryRegExp = new RegExp("^" + currentDirectoryRegExp + "|(!)" + currentDirectoryRegExp, "g");
	var buildinsAsModule = currentDirectoryRegExp.test(buildins);
	var parentDirectoryRegExp = parentDirectory.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
	parentDirectoryRegExp = new RegExp("^" + parentDirectoryRegExp + "|(!)" + parentDirectoryRegExp, "g");
	var buildinsRegExp = buildins.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
	buildinsRegExp = new RegExp("^" + buildinsRegExp + "|(!)" + buildinsRegExp, "g");

	this.buildinsAsModule = buildinsAsModule;
	this.currentDirectoryRegExp = currentDirectoryRegExp;
	this.parentDirectoryRegExp = parentDirectoryRegExp;
	this.buildinsRegExp = buildinsRegExp;
	this.node_modulesRegExp = /\/node_modules\//g;
	this.index_jsRegExp = /\/index.js(!|\?|\(query\))/g;
}
module.exports = RequestShortener;

RequestShortener.prototype.shorten = function(request) {
	if(!request)
		return request;
	if(this.buildinsAsModule)
		request = request.replace(this.buildinsRegExp, "!(webpack)");
	request = request.replace(this.currentDirectoryRegExp, "!.");
	request = request.replace(this.parentDirectoryRegExp, "!..");
	if(!this.buildinsAsModule)
		request = request.replace(this.buildinsRegExp, "!(webpack)");
	request = request.replace(/\\/g, "/");
	request = request.replace(this.node_modulesRegExp, "/~/");
	request = request.replace(this.index_jsRegExp, "$1");
	return request.replace(/^!|!$/, "");
};
