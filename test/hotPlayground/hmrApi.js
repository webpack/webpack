// The HMR API itself, rather than a module type: state that survives an update,
// the status machine, a manual check/apply, and invalidate.

import { line, panel } from "./ui.js";

const hot = module.hot;

// `module.hot.data` is whatever the previous version's dispose handler stored,
// and is undefined on the first evaluation.
const previous = hot && hot.data ? hot.data : {};
const generation = (previous.generation || 0) + 1;

export const hmrPanel = panel("HMR API");

line(hmrPanel, `generation ${generation} — survives updates via dispose/data`);

const statusLine = line(hmrPanel, `status: ${hot ? hot.status() : "no hmr"}`);

/** @type {((status: string) => void) | undefined} */
let updateStatus;

// index.js mounts the first panel; every version after this one has to put
// itself where its predecessor was, since nothing else will.
if (previous.panel && previous.panel.parentNode) {
	previous.panel.parentNode.replaceChild(hmrPanel, previous.panel);
}

/**
 * Adds a button to the panel.
 * @param {string} label button text
 * @param {() => void} onClick what it does
 * @returns {void}
 */
function button(label, onClick) {
	const element = document.createElement("button");

	element.innerText = label;
	element.onclick = onClick;
	hmrPanel.appendChild(element);
}

if (hot) {
	// Every status the update machine passes through, reported as it happens.
	// Held by name so the next version can take it off again — otherwise each
	// update leaves another handler pointing at a detached line.
	updateStatus = (status) => {
		statusLine.innerText = `status: ${status}`;
	};

	hot.addStatusHandler(updateStatus);

	// Ask the server for an update by hand — what the dev-server client does
	// for you, useful for watching apply() decide what to replace.
	button("check()", () => {
		hot
			.check(true)
			.then((updated) => {
				line(
					hmrPanel,
					updated && updated.length > 0
						? `replaced: ${updated.join(", ")}`
						: "nothing to update"
				);
			})
			.catch((error) => {
				line(hmrPanel, `check failed: ${error.message}`);
			});
	});

	// Give up this module's accept handler, so the next change to it bubbles
	// to its parents instead — here that means a full reload.
	button("invalidate()", () => {
		hot.invalidate();
	});

	// Hand the next version everything it needs to carry on.
	hot.dispose((data) => {
		hot.removeStatusHandler(updateStatus);
		data.generation = generation;
		data.panel = hmrPanel;
	});

	hot.accept();
}
