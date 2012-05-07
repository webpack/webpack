module.exports = function(options, templateOptions) {
	if(templateOptions.chunks) {
		return require("fs").readFileSync(require("path").join(__dirname, "browserAsync.js"));
	} else {
		return require("fs").readFileSync(require("path").join(__dirname, "browserSingle.js"));
	}
}