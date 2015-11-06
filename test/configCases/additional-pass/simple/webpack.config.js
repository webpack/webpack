var testPlugin = function() {
	var counter = 1;
	this.plugin("compilation", function(compilation) {
		var nr = counter++;
		compilation.plugin("need-additional-pass", function() {
			if(nr < 5)
				return true;
		});
	});
};

module.exports = {
	plugins: [
		testPlugin
	]
};
