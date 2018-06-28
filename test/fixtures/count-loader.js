let counter = 0;

module.exports = function() {
	return `module.exports = ${counter++};`;
};
