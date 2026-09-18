// Every module type and ECMAScript form webpack supports, one panel each, so a
// change to HMR can be tried against all of them — see README.md.

import "./styles.css";
import data from "./data.json" with { type: "json" };
import defer * as deferred from "./deferred.js";
import source addSource from "./add.wat";
import inlineLogo from "./logo.svg?inline";
import logo from "./logo.svg";
import notes from "./notes.txt";
import { add } from "./add.wat";
import { hmrPanel } from "./hmrApi.js";
import { line, panel } from "./ui.js";

const sections = [hmrPanel];

/**
 * Builds a panel, remembers it for mounting, and hands it back.
 * @param {string} heading panel title
 * @returns {HTMLElement} the panel
 */
function section(heading) {
	const element = panel(heading);

	sections.push(element);

	return element;
}

// A module the entry accepts: its callback re-renders this panel in place.
const acceptedPanel = section("CommonJS, accepted by the entry");
const acceptedBody = document.createElement("div");

acceptedBody.innerHTML = require("./html.js");
acceptedPanel.appendChild(acceptedBody);

// element-dependency.js is accepted by nobody, so a change to it bubbles up
// and replaces element.js with it.
const bubblePanel = section("CommonJS, bubbles to its parent");
let element = require("./element.js");

bubblePanel.appendChild(element);

// JSON, imported with an import attribute.
const jsonPanel = section("JSON module, `with { type: \"json\" }`");
const jsonBody = line(jsonPanel, `${data.title}: ${data.note}`);

// asset/resource — emitted as a file, the import is its URL.
const assetPanel = section("Asset module, asset/resource");
const image = document.createElement("img");

image.src = logo;
image.alt = "logo";
assetPanel.appendChild(image);

// asset/inline — the same file, emitted as a data URI instead of a file.
const inlinePanel = section("Asset module, asset/inline");
const inlineImage = document.createElement("img");

inlineImage.src = inlineLogo;
inlineImage.alt = "inline logo";
inlinePanel.appendChild(inlineImage);
line(inlinePanel, `src starts with ${inlineLogo.slice(0, 24)}…`);

// asset/source — the file contents arrive as a string.
const sourcePanel = section("Asset module, asset/source");
const sourceBody = line(sourcePanel, notes);

// new URL(): a reference webpack rewrites to the emitted asset.
const urlPanel = section("new URL(specifier, import.meta.url)");
const urlBody = line(
	urlPanel,
	String(new URL("./logo.svg", import.meta.url))
);

// Async WebAssembly: the import is a promise webpack awaits for you.
const wasmPanel = section("WebAssembly, asyncWebAssembly");
const wasmBody = line(wasmPanel, `add(2, 3) = ${add(2, 3)}`);

// Source phase import: the module itself, uninstantiated.
const sourcePhasePanel = section("Source phase, `import source`");

line(sourcePhasePanel, `addSource is a ${addSource.constructor.name}`);

// `import defer`: deferred.js has not been evaluated yet.
const deferPanel = section("Deferred, `import defer`");
const deferBody = line(deferPanel, "not evaluated yet — click to touch it");
const deferButton = document.createElement("button");

deferButton.innerText = "Touch the namespace";
deferButton.onclick = () => {
	deferBody.innerText = `evaluated at ${deferred.evaluatedAt}`;
};
deferPanel.appendChild(deferButton);

// An async chunk, fetched on demand.
const lazyPanel = section("Async chunk, import()");
const lazyBody = line(lazyPanel, "loading…");

function renderLazy() {
	import("./lazy.js").then((module) => {
		lazyBody.innerText = module.default;
	});
}

renderLazy();

for (const element_ of sections) document.body.appendChild(element_);

if (module.hot) {
	module.hot.accept("./html.js", () => {
		acceptedBody.innerHTML = require("./html.js");
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
		urlBody.innerText = String(new URL("./logo.svg", import.meta.url));
	});

	module.hot.accept("./notes.txt", () => {
		sourceBody.innerText = notes;
	});

	module.hot.accept("./add.wat", () => {
		wasmBody.innerText = `add(2, 3) = ${add(2, 3)}`;
	});

	module.hot.accept("./lazy.js", renderLazy);
	module.hot.accept("./ui.js", () => window.location.reload());
}
