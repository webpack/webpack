const path = require('path');
const { RawSource } = require('webpack-sources');

class URLParser {
	constructor (options = {}) {
		this.options = options
	}

	parse(source, state) {
		const { module } = state;

		if (typeof source === 'string') {
			source = Buffer.from(source);
		}

		const file = path.relative(module.context, module.request);

		source = new RawSource(source);

		state.module._source = new RawSource(
			`export default '${module.rawRequest}'`;
		);

		state.module.buildInfo.assets = {
			[file]: source
		};

		return state;
	}
}

module.exports = URLParser;
