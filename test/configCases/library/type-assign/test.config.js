module.exports = {
	afterExecute() {
		delete global.MyLibrary;
	}
};
