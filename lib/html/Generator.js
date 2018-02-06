class HTMLGenerator {
	generate(module) {
		return module.originalSource();
	}
}

module.exports = HTMLGenerator;
