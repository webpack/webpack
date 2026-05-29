// Loaded by the HTML entry via `<script src="./app.js">`. It imports an HTML
// module as a string: an HTML module imported from JavaScript exports its
// (URL-rewritten) HTML and, because it isn't an entry, is NOT emitted as a
// standalone `.html` file.
import fragment from "./fragment.html";

const container = document.createElement("div");
container.innerHTML = fragment;
document.body.appendChild(container);
