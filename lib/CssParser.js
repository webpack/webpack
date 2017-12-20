const Tapable = require("tapable").Tapable;
const { Parser } = require("postcss");

class CssParser extends Tapable {
	constructor(options) {
		super();
		this.hooks = {};
		this.options = options;
	}

	parse(source, state, callback) {
		// TODO parse Css AST, identify/extract dependencies
		// TODO determine sigil for lazy-loading? @import?
		// TODO

		const ast = Parser.parse(source);
		console.log(ast);
	}
}

module.exports = CssParser;
