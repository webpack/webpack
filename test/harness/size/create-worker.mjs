import fs from "fs/promises";
import path from "path";

/**
 * @param {number} task task index
 * @returns {string} task module source
 */
function taskCode(task) {
	return `import { groupBy, meanBy, orderBy, sumBy } from "lodash-es";
import { differenceInDays, format, startOfWeek } from "date-fns";
import thresholds from "../thresholds.json";

const limit = thresholds[${task} % thresholds.length];

export default function task${task}(rows) {
	const recent = rows.filter(
		(row) => differenceInDays(new Date(row.at), new Date(rows[0].at)) < ${(task % 7) + 7}
	);
	const weeks = groupBy(recent, (row) =>
		format(startOfWeek(new Date(row.at)), "yyyy-MM-dd")
	);
	return orderBy(
		Object.entries(weeks).map(([week, group]) => ({
			week,
			total: sumBy(group, "amount"),
			average: meanBy(group, "amount"),
			flagged: group.filter((row) => row.amount > limit.amount).length
		})),
		["total"],
		["desc"]
	).slice(0, ${(task % 5) + 5});
}
`;
}

/**
 * Writes a data-processing web worker: a message loop that lazily loads one
 * of many task modules, each built on `lodash-es`, `date-fns` and shared JSON.
 * @param {string} folder output folder
 * @param {number} tasks count of lazy-loaded tasks
 * @returns {Promise<void>}
 */
async function createWorker(folder, tasks) {
	await fs.rm(folder, { recursive: true, force: true });
	await fs.mkdir(path.join(folder, "tasks"), { recursive: true });

	await fs.writeFile(
		path.join(folder, "thresholds.json"),
		JSON.stringify(
			Array.from({ length: 16 }, (_, id) => ({
				id,
				amount: (id * 53) % 100,
				label: `threshold-${id}`
			})),
			null,
			2
		)
	);

	const loaders = [];
	for (let task = 0; task < tasks; task++) {
		await fs.writeFile(
			path.join(folder, `tasks/task-${task}.js`),
			taskCode(task)
		);
		loaders.push(
			`\t${JSON.stringify(`task-${task}`)}: () => import(/* webpackChunkName: "task-${task}" */ "./tasks/task-${task}.js")`
		);
	}

	await fs.writeFile(
		path.join(folder, "worker.js"),
		`const tasks = {
${loaders.join(",\n")}
};

self.addEventListener("message", async (event) => {
	const { id, task, rows } = event.data;
	const load = tasks[task];
	if (!load) {
		self.postMessage({ id, error: \`Unknown task \${task}\` });
		return;
	}
	try {
		const { default: run } = await load();
		self.postMessage({ id, result: run(rows) });
	} catch (error) {
		self.postMessage({ id, error: String(error) });
	}
});
`
	);
}

export default createWorker;
