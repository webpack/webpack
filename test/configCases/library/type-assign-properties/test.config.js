module.exports = {
	afterExecute() {
		delete global.MyLibraryProperties;
	}
};
