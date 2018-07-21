module.exports = function(source) {
	console.log("post-loaded " + source.replace(/\r?\n/g, ""));
	return source;
};
