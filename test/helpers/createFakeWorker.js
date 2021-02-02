const path = require("path");

module.exports = ({ outputDirectory }) =>
	class Worker {
		constructor(url, options) {
			expect(url).toBeInstanceOf(URL);
			expect(url.origin).toBe("https://test.cases");
			expect(url.pathname.startsWith("/path/")).toBe(true);
			const file = url.pathname.slice(6);
			const workerBootstrap = `
const { parentPort } = require("worker_threads");
const { URL } = require("url");
const path = require("path");
const fs = require("fs");
global.self = global;
self.URL = URL;
const urlToPath = url => {
	if(url.startsWith("https://test.cases/path/")) url = url.slice(24);
	return path.resolve(${JSON.stringify(outputDirectory)}, \`./\${url}\`);
};
self.importScripts = url => {
	require(urlToPath(url));
};
self.fetch = async url => {
	try {
		const buffer = await new Promise((resolve, reject) =>
			fs.readFile(urlToPath(url), (err, b) =>
				err ? reject(err) : resolve(b)
			)
		);
		return {
			status: 200,
			ok: true,
			json: async () => JSON.parse(buffer.toString("utf-8"))
		};
	} catch(err) {
		if(err.code === "ENOENT") {
			return {
				status: 404,
				ok: false
			};
		}
		throw err;
	}
};
parentPort.on("message", data => {
	if(self.onmessage) self.onmessage({
		data
	});
});
self.postMessage = data => {
	parentPort.postMessage(data);
};
require(${JSON.stringify(path.resolve(outputDirectory, file))});
`;
			// eslint-disable-next-line node/no-unsupported-features/node-builtins
			this.worker = new (require("worker_threads").Worker)(workerBootstrap, {
				eval: true
			});
		}

		set onmessage(value) {
			this.worker.on("message", data => {
				value({
					data
				});
			});
		}

		postMessage(data) {
			this.worker.postMessage(data);
		}

		terminate() {
			return this.worker.terminate();
		}
	};
