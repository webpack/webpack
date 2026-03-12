import { history, add } from "./chat-module";

onconnect = function (e) {
	for (const port of e.ports) {
		port.onmessage = event => {
			const msg = event.data;
				// When a new chat message arrives, store it in history
			if (msg.type === "message") {
				add(msg.content, msg.from);
			}

			/**
			 * For both "message" and "history" requests,
			 * return the current chat history to the client.
			 */
			if (msg.type === "message" || msg.type === "history") {
				port.postMessage({
					type: "history",
					history
				});
			}
		};
	}
};
