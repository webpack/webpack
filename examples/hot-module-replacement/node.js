// Node HMR: there is no EventSource, so a Node trigger drives the check.
// `webpack/hot/poll` re-checks on a timer; `webpack/hot/signal` waits for
// SIGUSR2. Run with `webpack --watch` and `node dist/node/main.js`.
import "webpack/hot/poll?1000";

const render = () => {
	console.log("message:", require("./message"));
};

render();

if (module.hot) {
	module.hot.accept("./message", render);
}
