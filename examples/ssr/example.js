import "./style.css";

// `page.js` is code-split; the SSR manifest maps it to the client assets
// (its JS chunk and CSS) to preload when it is rendered on the server.
import("./page.js").then(({ render }) => {
	document.body.innerHTML = render();
});
