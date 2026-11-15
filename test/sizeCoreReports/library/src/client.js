import { Emitter } from "./emitter.js";
import { parseDuration } from "./duration.js";

const sleep = (milliseconds) =>
	new Promise((resolve) => setTimeout(resolve, milliseconds));

export function createClient({ baseUrl = "", retries = 2, timeout = "10s" } = {}) {
	const events = new Emitter();
	const limit = parseDuration(timeout);

	async function request(method, path, body) {
		for (let attempt = 0; ; attempt++) {
			const controller = new AbortController();
			const timer = setTimeout(() => controller.abort(), limit);
			try {
				events.emit("request", { method, path, attempt });
				const response = await fetch(baseUrl + path, {
					method,
					headers: body ? { "content-type": "application/json" } : {},
					body: body ? JSON.stringify(body) : undefined,
					signal: controller.signal
				});
				if (!response.ok) throw new Error(`${method} ${path}: ${response.status}`);
				const result = await response.json();
				events.emit("response", { method, path, result });
				return result;
			} catch (error) {
				if (attempt >= retries) {
					events.emit("error", error);
					throw error;
				}
				await sleep(2 ** attempt * 100);
			} finally {
				clearTimeout(timer);
			}
		}
	}

	return {
		on: events.on.bind(events),
		get: (path) => request("GET", path),
		post: (path, body) => request("POST", path, body),
		delete: (path) => request("DELETE", path)
	};
}
