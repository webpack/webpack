/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

module.exports = class EventSource {
	/**
	 * @param {string} url url
	 */
	constructor(url) {
		/** @type {import("http").IncomingMessage | undefined} */
		this.response = undefined;
		/** @type {undefined | ((err: Error | { message: Error }) => void)} */
		this.onerror = undefined;
		const request = (
			url.startsWith("https:") ? require("https") : require("http")
		).request(
			url,
			{
				agent: false,
				rejectUnauthorized: false,
				headers: { accept: "text/event-stream" }
			},
			(res) => {
				this.response = res;
				res.on("error", (err) => {
					if (this.onerror) this.onerror(err);
				});
			}
		);
		request.on("error", (err) => {
			if (this.onerror) this.onerror({ message: err });
		});
		request.end();
	}

	close() {
		if (this.response) this.response.destroy();
	}

	// eslint-disable-next-line accessor-pairs
	set onopen(/** @type {unknown} */ value) {
		throw new Error("not implemented");
	}

	// eslint-disable-next-line accessor-pairs
	set onmessage(/** @type {unknown} */ value) {
		throw new Error("not implemented");
	}
};
