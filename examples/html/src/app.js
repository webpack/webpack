// HTML used via `import`: an HTML module imported from JavaScript exports its
// (URL-rewritten) HTML as a string. Because it isn't an entry, it is NOT
// emitted as a standalone `.html` file — it's just the string below.
import fragment from "./fragment.html";

const container = document.createElement("div");
container.innerHTML = fragment;
document.body.appendChild(container);
