module.exports = function(source) {
	console.log('post-loaded ' + source.replace('\n', ''))
	return source;
};
