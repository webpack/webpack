// One ESM bundle for web and Node. The dev-server client is universal: it
// listens for the same update signal on either platform (browser dev-server,
// or a Node dev-server/middleware feeding the emitter), so no per-target client
// is needed.
import message from "./message";
import "webpack/hot/dev-server";

const render = () => {
	if (typeof document !== "undefined") {
		document.body.textContent = message;
	} else {
		console.log("message:", message);
	}
};

render();

if (import.meta.webpackHot) {
	import.meta.webpackHot.accept("./message", render);
}
