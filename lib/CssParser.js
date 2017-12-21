const { SyncBailHook, Tapable } = require("tapable");
const postcss = require("postcss");



class CssParser extends Tapable {
	constructor(options) {
		super();
		this.hooks = {
			cssProgram: new SyncBailHook(["ast"])
		};
		this.options = options;
	}

	parse(source, initialState, callback) {
		// TODO parse Css AST, identify/extract dependencies
		// TODO determine sigil for lazy-loading? @import?

		/**
		 * Grab AST
		 * Throw if doesn't exist
		 * Track oldScope and oldState 
		 *   (assign from this.scope/state)
		 * Stores comments (do we need this?)
		 *
		 * program.call(ast, comments)
		 * 		walkAST, trig events
		 *
		 */

		const ast = postcss.parse(source, {/*postcss plugin/options*/});
		if(this.hooks.cssProgram.call(ast) === undefined) {
			// what do I really do here? JS Parser prewalks
			// what do I really do here? walkStatements
		}

	}
}

module.exports = CssParser;
