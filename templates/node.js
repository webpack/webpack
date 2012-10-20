module.exports = function(options, templateOptions) {
	return require("fs").readFileSync(require("path").join(__dirname, "nodeTemplate.js"));
}
module.exports.chunk = function(chunk, options, templateOptions) {
	return [
		"/******/module.exports = ",
		""
	]
}