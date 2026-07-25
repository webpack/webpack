import { createRequire } from "module";

const require = createRequire(import.meta.url);

const findGraphRoots =
	/** @type {import("../../../../lib/util/findGraphRoots")} */
	(require("../../../../lib/util/findGraphRoots.js"));

/** @typedef {{ id: number, deps: GraphNode[] }} GraphNode */

/** @type {GraphNode[]} */
let nodes = [];
let sink = 0;

export default {
	name: "unit/util/findGraphRoots",
	setup() {
		// 5000-node graph with deterministic edges: forward jumps like a module
		// graph plus back-edges every 17th node so cycle handling is exercised.
		nodes = Array.from({ length: 5000 }, (_, id) => ({ id, deps: [] }));
		for (const node of nodes) {
			const { id } = node;
			node.deps.push(
				nodes[(id * 7 + 1) % nodes.length],
				nodes[(id * 13 + 3) % nodes.length]
			);
			if (id % 17 === 0 && id > 0) {
				node.deps.push(nodes[id - 1]);
			}
		}
	},
	teardown() {
		nodes = [];
		if (sink === -1) console.log(sink);
	},
	benches: [
		{
			name: "5000 nodes with cycles",
			fn() {
				let count = 0;
				for (const _root of findGraphRoots(nodes, (node) => node.deps)) {
					count++;
				}
				sink = count;
			}
		}
	]
};
