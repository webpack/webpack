import { history, add } from "./chat-module";

onconnect = function (e) {
	for (const port of e.ports) {
		port.onmessage = event => {
			const msg = event.data;
			if (msg.type === "message") {
				add(msg.content, msg.from);
			}
			if (msg.type === "message" || msg.type === "history") {
				port.postMessage({
					type: "history",
					history
				});
			}
		};
	}
};
