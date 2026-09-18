import * as styles from "./styles.module.css";

/**
 * Builds an empty titled panel for one module type.
 * @param {string} heading panel title
 * @returns {HTMLElement} the panel, not yet attached
 */
export function panel(heading) {
	const element = document.createElement("section");

	element.className = styles.panel;

	const title = document.createElement("h3");

	title.className = styles.heading;
	title.innerText = heading;
	element.appendChild(title);

	return element;
}

/**
 * Appends a line of text to a panel.
 * @param {HTMLElement} element panel to append to
 * @param {string} text what to write
 * @returns {HTMLElement} the appended node
 */
export function line(element, text) {
	const node = document.createElement("div");

	node.innerText = text;
	element.appendChild(node);

	return node;
}
