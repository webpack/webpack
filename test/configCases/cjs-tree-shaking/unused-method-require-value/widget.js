module.exports = {
	used() {
		return 1;
	},
	returned() {
		return require("./value");
	},
	member() {
		return require("./value").length;
	},
	constructed() {
		return new require("./value");
	},
	statement() {
		require("./value");
	},
	get getter() {
		return require("./value");
	}
};
