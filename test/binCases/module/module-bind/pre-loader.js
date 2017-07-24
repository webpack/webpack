module.exports = function(source) {
	console.log('pre-loaded ' + source.replace('\n', ''))
	return source;
};
