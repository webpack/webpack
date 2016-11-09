module.exports = function(content) {
	var callback = this.async();
	callback(null, "module.exports=" + JSON.stringify(content+"loader"));
}
