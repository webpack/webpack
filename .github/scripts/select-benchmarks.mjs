/* eslint-disable no-console */

import { execFileSync } from "child_process";
import fs from "fs";

const fullMatrix = {
	include: [
		{ dir: "unit", shard: "1/1" },
		{ dir: "e2e", shard: "1/3" },
		{ dir: "e2e", shard: "2/3" },
		{ dir: "e2e", shard: "3/3" }
	]
};

const benchmarkFiles = execFileSync(
	"git",
	["ls-files", "-z", "test/benchmark/unit", "test/benchmark/e2e"],
	{ encoding: "utf8" }
)
	.split("\0")
	.filter((file) => file.endsWith(".bench.mjs"))
	.sort();

const suiteByFile = new Map(
	benchmarkFiles.map((file) => {
		if (file.startsWith("test/benchmark/e2e/")) {
			return [file, file.split("/").slice(2, 4).join("/")];
		}
		return [
			file,
			file
				.slice("test/benchmark/".length, -".bench.mjs".length)
				.replaceAll("\\", "/")
		];
	})
);
const fileBySuite = new Map(
	[...suiteByFile].map(([file, suite]) => [suite, file])
);
const e2eFiles = benchmarkFiles.filter((file) =>
	file.startsWith("test/benchmark/e2e/")
);

const e2eRules = [
	["e2e/asset-modules", [/^lib\/asset\//, /^lib\/AssetModulesPlugin\.js$/]],
	[
		"e2e/code-splitting",
		[
			/^lib\/optimize\//,
			/^lib\/(?:Chunk|ChunkGraph|ChunkGroup|Entrypoint|buildChunkGraph)\.js$/
		]
	],
	["e2e/css-modules", [/^lib\/css\//]],
	[
		"e2e/filesystem-cache",
		[
			/^lib\/cache\//,
			/^lib\/serialization\//,
			/^lib\/(?:Cache|CacheFacade)\.js$/,
			/^lib\/util\/serialization\.js$/
		]
	],
	["e2e/json-modules", [/^lib\/json\//]],
	[
		"e2e/many-modules-interop-runtime",
		[
			/^lib\/runtime\//,
			/^lib\/dependencies\/(?:CommonJs|Harmony)/,
			/^lib\/(?:RuntimePlugin|RuntimeTemplate)\.js$/,
			/^lib\/javascript\/JavascriptModulesPlugin\.js$/
		]
	],
	[
		"e2e/rebuild",
		[
			/^hot\//,
			/^lib\/hmr\//,
			/^lib\/cache\//,
			/^lib\/(?:Compilation|Compiler|FileSystemInfo|NormalModule|Watching)\.js$/
		]
	],
	[
		"e2e/source-map",
		[
			/^lib\/(?:EvalSourceMapDevToolPlugin|SourceMapDevToolModuleOptionsPlugin|SourceMapDevToolPlugin)\.js$/,
			/^lib\/util\/extractSourceMap\.js$/
		]
	]
];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const fullSelection = () => ({
	run: true,
	filter: "",
	matrix: fullMatrix,
	suites: ["all"]
});

const skippedSelection = () => ({
	run: false,
	filter: "",
	matrix: fullMatrix,
	suites: []
});

const recommendedSelection = (changedFiles) => {
	if (
		changedFiles.some(
			(file) =>
				file === "package.json" ||
				file === "yarn.lock" ||
				file === ".github/workflows/benchmark-suite.yml" ||
				file === ".github/scripts/select-benchmarks.mjs" ||
				file.startsWith("test/benchmark/helpers/") ||
				file.startsWith("test/benchmark/lib/")
		)
	) {
		return fullSelection();
	}

	const suites = new Set();
	const addSuite = (suite) => {
		if (fileBySuite.has(suite)) suites.add(suite);
	};

	for (const file of changedFiles) {
		const benchmarkSuite = suiteByFile.get(file);
		if (benchmarkSuite) addSuite(benchmarkSuite);

		if (file.startsWith("lib/") && file.endsWith(".js")) {
			addSuite(`unit/${file.slice("lib/".length, -".js".length)}`);
		}

		if (/^(lib|schemas)\//.test(file)) {
			addSuite("e2e/many-modules-commonjs");
			addSuite("e2e/many-modules-esm");
		}

		if (file.startsWith("assembly/")) {
			addSuite("unit/util/createHash");
		}

		for (const [suite, patterns] of e2eRules) {
			if (patterns.some((pattern) => pattern.test(file))) addSuite(suite);
		}
	}

	if (suites.size === 0) return skippedSelection();

	const sortedSuites = [...suites].sort();
	const include = [];
	if (sortedSuites.some((suite) => suite.startsWith("unit/"))) {
		include.push({ dir: "unit", shard: "1/1" });
	}

	const e2eShards = new Set();
	for (const suite of sortedSuites) {
		if (!suite.startsWith("e2e/")) continue;
		const file = fileBySuite.get(suite);
		const index = file === undefined ? -1 : e2eFiles.indexOf(file);
		if (index >= 0) e2eShards.add((index % 3) + 1);
	}
	for (const shard of [...e2eShards].sort()) {
		include.push({ dir: "e2e", shard: `${shard}/3` });
	}

	return {
		run: true,
		filter: `^(?:${sortedSuites.map(escapeRegExp).join("|")})(?:/|$)`,
		matrix: { include },
		suites: sortedSuites
	};
};

const changedFilesBetween = (base, head) =>
	execFileSync("git", ["diff", "--name-only", "-z", `${base}...${head}`], {
		encoding: "utf8"
	})
		.split("\0")
		.filter(Boolean);

const selectionFromEvent = () => {
	const eventName = process.env.GITHUB_EVENT_NAME;
	if (eventName !== "pull_request") return fullSelection();

	const event = JSON.parse(
		fs.readFileSync(
			/** @type {string} */ (process.env.GITHUB_EVENT_PATH),
			"utf8"
		)
	);
	const action = event.action;
	const eventLabel = event.label && event.label.name;
	const runAllLabel = "Run All Benchmark";
	const runRecommendedLabel = "Run Recommended Benchmarks";
	if (
		action === "labeled" &&
		eventLabel !== runAllLabel &&
		eventLabel !== runRecommendedLabel
	) {
		return skippedSelection();
	}

	const labels = new Set(event.pull_request.labels.map((label) => label.name));
	if (labels.has(runAllLabel)) return fullSelection();
	if (!labels.has(runRecommendedLabel)) return skippedSelection();

	return recommendedSelection(
		changedFilesBetween(
			event.pull_request.base.sha,
			event.pull_request.head.sha
		)
	);
};

const args = process.argv.slice(2);
let selection;
if (args[0] === "--all") {
	selection = fullSelection();
} else if (args[0] === "--files") {
	selection = recommendedSelection(args.slice(1));
} else {
	selection = selectionFromEvent();
}

if (process.env.GITHUB_OUTPUT) {
	fs.appendFileSync(
		process.env.GITHUB_OUTPUT,
		`run=${selection.run}\nfilter=${selection.filter}\nmatrix=${JSON.stringify(
			selection.matrix
		)}\n`
	);
}
console.log(JSON.stringify(selection));
