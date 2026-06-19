// Browser HMR: webpack-dev-server pushes update signals over EventSource and
// the dev-server client runs the check. Start it with `webpack serve`.
import "webpack/hot/dev-server";

const render = () => {
	document.body.textContent = require("./message");
};

render();

if (module.hot) {
	module.hot.accept("./message", render);
}
