import { history, add } from "./chat-module";

onconnect = function (e) {
	for (const port of e.ports) {
		port.onmessage = event => {
			const msg = event.data;
			switch (msg.type) {
				case "message":
					add(msg.content, msg.from);
				// fallthrough
				case "history":
					port.postMessage({
						type: "history",
						history
					});
					break;
			}
		};
	}
};
