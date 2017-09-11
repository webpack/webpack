module.exports = function(source) {
	console.log("pre-loaded " + source.replace(/\r?\n/g, ""));
	return source;
};
