/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

module.exports = class EventSource {
	constructor(url) {
		this.response = undefined;
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
		this.response.destroy();
	}

	// eslint-disable-next-line accessor-pairs
	set onopen(value) {
		throw new Error("not implemented");
	}

	// eslint-disable-next-line accessor-pairs
	set onmessage(value) {
		throw new Error("not implemented");
	}
};
