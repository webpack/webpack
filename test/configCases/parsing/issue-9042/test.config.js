module.exports = {
	moduleScope: function(scope) {
		delete scope.__dirname;
	}
};
