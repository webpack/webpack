module.exports = function(contents, options, callback) {
	callback(null, contents[0].split("").reverse().join(""));
}
