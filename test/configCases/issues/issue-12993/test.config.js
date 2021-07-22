module.exports = {
	afterExecute() {
		delete global.lib;
	}
};
