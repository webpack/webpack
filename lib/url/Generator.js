class URLGenerator {
	generate(module) {
		return module.originalSource();
	}
}

module.exports = URLGenerator;
