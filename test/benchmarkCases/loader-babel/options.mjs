import fs from "fs/promises";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import memoryScaledCount from "../../harness/benchmark/scale.mjs";

// Small in simulation/walltime mode: every module pays a full babel parse,
// transform and print, so the count buys build time quickly.
const count = memoryScaledCount(30, 90);

/**
 * @param {number} i index
 * @returns {string} generated component source
 */
function generateComponent(i) {
	return `import h from "./h.js";

export const title${i} = "component-${i}";

export default function Component${i}({ items, title }) {
	const rows = items.map((item, index) => (
		<li className="row" data-index={index} key={item.id}>
			<span className="label">{item.label}</span>
			<em className="value">{item.value * ${i}}</em>
		</li>
	));

	return (
		<section className="component component-${i}">
			<h2 className="heading">{title || title${i}}</h2>
			<ul className="rows">{rows}</ul>
			{items.length > 0 ? <footer className="count">{items.length}</footer> : null}
		</section>
	);
}
`;
}

export async function setup() {
	const __dirname = dirname(fileURLToPath(import.meta.url));
	const generated = resolve(__dirname, "./generated");

	await fs.rm(generated, { recursive: true, force: true });
	await fs.mkdir(generated, { recursive: true });

	// The JSX factory, so the transformed output resolves without pulling a
	// runtime package into the measured graph.
	await fs.writeFile(
		resolve(generated, "h.js"),
		`export default function h(type, props, ...children) {
	return { type, props, children };
}
`
	);

	let code = "";

	for (let i = 0; i < count; i++) {
		await fs.writeFile(
			resolve(generated, `component-${i}.jsx`),
			generateComponent(i)
		);

		code += `import Component${i} from "./component-${i}.jsx";\nconsole.log(Component${i});\nexport { Component${i} };\n`;
	}

	await fs.writeFile(resolve(generated, "module.js"), code);
}
