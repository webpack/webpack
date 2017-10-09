module.exports = function(config) {
	return !/^v4/.test(process.version);
};
