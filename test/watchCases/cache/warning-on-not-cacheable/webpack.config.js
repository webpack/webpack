module.exports = {
	plugins: [
		function() {
			this.plugin("this-compilation", c => {
				c.notCacheable = "for testing";
			});
		}
	]
};
