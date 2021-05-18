const stringifyRequest = require("loader-utils").stringifyRequest;

/** @type {import("../../../../").PitchLoaderDefinitionFunction} */
module.exports.pitch = function (remainingRequest) {
	return `
	import { getString as _getString, memory } from ${stringifyRequest(
		this,
		`${this.resourcePath}.wasm!=!wast-loader!${remainingRequest}`
	)};

	export function getString() {
		const strBuf = new Uint8Array(memory.buffer, _getString());
		const idx = strBuf.indexOf(0);
		const strBuf2 = strBuf.slice(0, idx);
		const str = Buffer.from(strBuf2).toString("utf-8");
		return str;
	};
	`;
};
