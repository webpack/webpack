module.exports = {
	moduleScope: function(scope) {
		delete scope.__dirname;
		delete scope.__filename;
	}
};
