import fs from "fs/promises";
import path from "path";

/**
 * @param {string} file file path
 * @param {string} content file content
 * @returns {Promise<void>}
 */
async function write(file, content) {
	await fs.mkdir(path.dirname(file), { recursive: true });
	await fs.writeFile(file, content);
}

/**
 * @param {number} feature feature index
 * @param {number} component component index
 * @returns {string} component module source
 */
function componentCode(feature, component) {
	const name = `Feature${feature}Component${component}`;

	return `import { createElement, useMemo, useState } from "react";
import { debounce, groupBy, sortBy } from "lodash-es";
import { addDays, format } from "date-fns";
import { Button, Card, formatCurrency, useToggle } from "@/shared";
import * as styles from "../styles.module.css";
import rows from "../data.json";
import icon from "../icon.svg";

const columns = ["id", "label", "amount", "createdAt"];

export function ${name}({ title = "${name}", onSelect }) {
	const [query, setQuery] = useState("");
	const [expanded, toggle] = useToggle(false);
	const visible = useMemo(() => {
		const filtered = rows.filter(({ label }) => label.includes(query));
		return groupBy(sortBy(filtered, ["amount"]), (row) => row.amount > 50);
	}, [query]);
	const onInput = debounce((event) => setQuery(event.target.value), 100);

	return createElement(
		Card,
		{ className: styles.card, title },
		createElement("img", { src: icon, alt: "" }),
		createElement("input", { className: styles.input, onInput }),
		createElement(Button, { onClick: toggle }, expanded ? "Less" : "More"),
		expanded &&
			Object.entries(visible).map(([key, group]) =>
				createElement(
					"ul",
					{ key, className: styles.list },
					group.map((row) =>
						createElement(
							"li",
							{ key: row.id, onClick: () => onSelect && onSelect(row) },
							columns.map((column) => String(row[column])).join(" | "),
							" ",
							formatCurrency(row.amount),
							" ",
							format(addDays(new Date(0), row.id), "yyyy-MM-dd")
						)
					)
				)
			)
	);
}

export default ${name};
`;
}

/**
 * @param {number} feature feature index
 * @returns {string} CSS module source
 */
function stylesCode(feature) {
	return `.card {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
	gap: 1rem;
	padding: ${feature % 4}rem;
	border: 1px solid var(--border, #ddd);
}

.card:hover {
	box-shadow: 0 2px 8px rgb(0 0 0 / 15%);
}

.input {
	composes: card;
	width: 100%;
}

.list > li:nth-child(odd) {
	background: color-mix(in srgb, currentColor 5%, transparent);
}

@media (max-width: 600px) {
	.card {
		grid-template-columns: 1fr;
	}
}
`;
}

/**
 * @param {number} feature feature index
 * @returns {string} JSON source
 */
function dataCode(feature) {
	return JSON.stringify(
		Array.from({ length: 20 }, (_, id) => ({
			id,
			label: `feature-${feature}-row-${id}`,
			amount: (id * 37 + feature * 11) % 100,
			createdAt: 1700000000000 + id * 86400000
		})),
		null,
		2
	);
}

/**
 * Writes a small single-page app: lazy routes, feature folders, barrel files,
 * an `@` alias, CSS modules, JSON and SVG assets and real npm packages.
 * @param {string} folder output folder
 * @param {number} features count of lazy-loaded feature routes
 * @param {number} components count of components in each feature
 * @returns {Promise<void>}
 */
async function createApp(folder, features, components) {
	await fs.rm(folder, { recursive: true, force: true });

	const utils = ["format", "toggle", "request", "storage", "validate"];

	for (const util of utils) {
		await write(
			path.join(folder, `shared/utils/${util}.js`),
			`export const ${util}Version = ${JSON.stringify(util)};

export function ${util}(value, options = {}) {
	const { strict = false, fallback = null } = options;
	if (value == null) return fallback;
	return strict ? JSON.parse(JSON.stringify(value)) : value;
}
`
		);
	}

	await write(
		path.join(folder, "shared/utils/currency.js"),
		`export const formatCurrency = (value, currency = "USD") =>
	new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
`
	);
	await write(
		path.join(folder, "shared/components/Button.js"),
		`import { createElement } from "react";

export const Button = ({ children, ...props }) =>
	createElement("button", { type: "button", ...props }, children);
`
	);
	await write(
		path.join(folder, "shared/components/Card.js"),
		`import { createElement } from "react";

export const Card = ({ title, children, ...props }) =>
	createElement("section", props, createElement("h2", null, title), children);
`
	);
	await write(
		path.join(folder, "shared/index.js"),
		`${utils.map((util) => `export * from "./utils/${util}.js";`).join("\n")}
export * from "./utils/currency.js";
export { useToggle } from "./utils/toggle-hook.js";
export * from "./components/Button.js";
export * from "./components/Card.js";
`
	);
	await write(
		path.join(folder, "shared/utils/toggle-hook.js"),
		`import { useCallback, useState } from "react";

export function useToggle(initial) {
	const [value, setValue] = useState(initial);
	return [value, useCallback(() => setValue((current) => !current), [])];
}
`
	);

	const routes = [];

	for (let feature = 0; feature < features; feature++) {
		const dir = path.join(folder, `features/feature-${feature}`);
		const names = [];

		await write(path.join(dir, "styles.module.css"), stylesCode(feature));
		await write(path.join(dir, "data.json"), dataCode(feature));
		await write(
			path.join(dir, "icon.svg"),
			`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="${(feature % 10) + 1}"/></svg>\n`
		);

		for (let component = 0; component < components; component++) {
			names.push(`Feature${feature}Component${component}`);
			await write(
				path.join(dir, `components/Component${component}.js`),
				componentCode(feature, component)
			);
		}

		await write(
			path.join(dir, "index.js"),
			`import { createElement } from "react";
${names.map((name, i) => `import ${name} from "./components/Component${i}.js";`).join("\n")}

export default function Feature${feature}() {
	return createElement(
		"main",
		null,
		${names.map((name) => `createElement(${name}, { key: ${JSON.stringify(name)} })`).join(",\n\t\t")}
	);
}
`
		);
		routes.push(
			`\t${JSON.stringify(`/feature-${feature}`)}: () => import(/* webpackChunkName: "feature-${feature}" */ "./features/feature-${feature}/index.js")`
		);
	}

	await write(
		path.join(folder, "index.js"),
		`import { createElement, lazy, Suspense } from "react";
import { Card } from "@/shared";

const routes = {
${routes.join(",\n")}
};

const App = ({ path }) =>
	createElement(
		Suspense,
		{ fallback: createElement(Card, { title: "Loading" }) },
		createElement(lazy(routes[path] || routes["/feature-0"]))
	);

export default createElement(App, { path: window.location.pathname });
`
	);
}

export default createApp;
