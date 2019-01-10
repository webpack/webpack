module.exports = function(config) {
	return !/^v(4|6)/.test(process.version);
};
