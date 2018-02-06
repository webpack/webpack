class CSSGenerator {
	generate(module) {
		return module.originalSource();
	}
}

module.exports = CSSGenerator;
