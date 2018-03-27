/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Jarid Margolin @jaridmargolin
*/
"use strict";

module.exports = class WebpackError extends Error {
	inspect() {
		// @ts-ignore Property 'details' does not exist on type 'WebpackError'
		return this.stack + (this.details ? `\n${this.details}` : "");
	}
};
