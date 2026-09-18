// A playground for watching HMR happen in a browser. Each module below is a
// different type, so editing one shows how that type updates — see README.md.

import "./styles.css";
import * as styles from "./styles.module.css";
import data from "./data.json";
import logo from "./logo.svg";

function panel(heading) {
	const element = document.createElement("section");

	element.className = styles.panel;

	const title = document.createElement("h3");

	title.className = styles.heading;
	title.innerText = heading;
	element.appendChild(title);

	return element;
}

// A module the entry accepts: the callback re-renders it in place.
const htmlPanel = panel("Accepted by the entry");
const htmlBody = document.createElement("div");

htmlBody.innerHTML = require("./html.js");
htmlPanel.appendChild(htmlBody);

// A module that bubbles: element-dependency.js is accepted by nobody, so a
// change to it replaces element.js too.
const bubblePanel = panel("Bubbles to its parent");
let element = require("./element.js");

bubblePanel.appendChild(element);

// A JSON module.
const jsonPanel = panel("JSON module");
const jsonBody = document.createElement("pre");

jsonBody.innerText = `${data.title}: ${data.note}`;
jsonPanel.appendChild(jsonBody);

// An asset module: the URL changes when the file does.
const assetPanel = panel("Asset module");
const image = document.createElement("img");

image.src = logo;
image.alt = "logo";
assetPanel.appendChild(image);

// An async chunk, fetched on demand.
const lazyPanel = panel("Async chunk");
const lazyBody = document.createElement("div");

lazyPanel.appendChild(lazyBody);

function renderLazy() {
	import("./lazy.js").then((module) => {
		lazyBody.innerText = module.default;
	});
}

renderLazy();

for (const section of [
	htmlPanel,
	bubblePanel,
	jsonPanel,
	assetPanel,
	lazyPanel
]) {
	document.body.appendChild(section);
}

if (module.hot) {
	module.hot.accept("./html.js", () => {
		htmlBody.innerHTML = require("./html.js");
	});

	module.hot.accept("./element.js", () => {
		const replacement = require("./element.js");

		bubblePanel.replaceChild(replacement, element);
		element = replacement;
	});

	module.hot.accept("./data.json", () => {
		jsonBody.innerText = `${data.title}: ${data.note}`;
	});

	module.hot.accept("./logo.svg", () => {
		image.src = logo;
	});

	module.hot.accept("./lazy.js", renderLazy);
}
