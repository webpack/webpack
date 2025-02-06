const path = require("path");

module.exports = ({ outputDirectory }) =>
	class Worker {
		constructor(resource, options = {}) {
			const isFileURL = /^file:/i.test(resource);
			const isBlobURL = /^blob:/i.test(resource);

			if (!isFileURL && !isBlobURL) {
				expect(resource.origin).toBe("https://test.cases");
				expect(resource.pathname.startsWith("/path/")).toBe(true);
			}

			this.url = resource;
			const file = isFileURL
				? resource
				: path.resolve(
						outputDirectory,
						isBlobURL
							? options.originalURL.pathname.slice(6)
							: resource.pathname.slice(6)
					);

			const workerBootstrap = `
const { parentPort } = require("worker_threads");
const { URL, fileURLToPath } = require("url");
const path = require("path");
const fs = require("fs");
global.self = global;
self.URL = URL;
self.location = new URL(${JSON.stringify(
				isBlobURL
					? resource.toString().replace("nodedata:", "https://test.cases/path/")
					: resource.toString()
			)});
const urlToPath = url => {
  if (/^file:/i.test(url)) return fileURLToPath(url);
	if (url.startsWith("https://test.cases/path/")) url = url.slice(24);
	return path.resolve(${JSON.stringify(outputDirectory)}, \`./\${url}\`);
};
self.importScripts = url => {
	${
		options.type === "module"
			? 'throw new Error("importScripts is not supported in module workers")'
			: "require(urlToPath(url))"
	};
};
self.fetch = async url => {
	try {
		const buffer = await new Promise((resolve, reject) =>
			fs.readFile(urlToPath(url), (err, b) =>
				err ? reject(err) : resolve(b)
			)
		);
		return {
		  headers: { get(name) { } },
			status: 200,
			ok: true,
			arrayBuffer() { return buffer; },
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

self.postMessage = data => {
	parentPort.postMessage(data);
};
if (${options.type === "module"}) {
	import(${JSON.stringify(file)}).then(() => {
		parentPort.on("message", data => {
			if(self.onmessage) self.onmessage({
				data
			});
		});
	});
} else {
	parentPort.on("message", data => {
		if(self.onmessage) self.onmessage({
			data
		});
	});
	require(${JSON.stringify(file)});
}
`;
			this.worker = new (require("worker_threads").Worker)(workerBootstrap, {
				eval: true
			});

			this._onmessage = undefined;
		}

		set onmessage(value) {
			if (this._onmessage) this.worker.off("message", this._onmessage);
			this.worker.on(
				"message",
				(this._onmessage = data => {
					value({
						data
					});
				})
			);
		}

		postMessage(data) {
			this.worker.postMessage(data);
		}

		terminate() {
			return this.worker.terminate();
		}
	};
