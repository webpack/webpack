import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { simpleGit } from "simple-git";
import pkgJson from "../package.json" with { type: "json" };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootPath = path.join(__dirname, "..");
const git = simpleGit(rootPath);

const VALID_BUMPS = new Set(["major", "minor", "patch"]);
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const ENTRY_RE = /^"([^"]+)"\s*:\s*([a-zA-Z]+)\s*$/;

const toLines = (output) =>
	output
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);

const isChangeset = (filePath) => {
	const normalized = filePath.replace(/\\/g, "/");
	return (
		normalized.startsWith(".changeset/") &&
		normalized.endsWith(".md") &&
		normalized !== ".changeset/README.md"
	);
};

const gitDiff = async (more = []) => {
	const args = [
		"diff",
		"--name-only",
		// cspell:ignore ACMR
		"--diff-filter=ACMR",
		...more,
		"--",
		".changeset/*.md"
	].filter(Boolean);

	return toLines(await git.raw(args));
};

const getChangedFiles = async () => {
	const files = new Set();
	const baseRef = process.env.GITHUB_BASE_REF;

	// GitHub Actions base diff
	if (baseRef) {
		for (const file of await gitDiff([`origin/${baseRef}...HEAD`])) {
			if (isChangeset(file)) files.add(file);
		}
	}
	// Local working tree changes
	else {
		const _files = [
			// Unstaged changes
			...(await gitDiff()),
			// Staged but uncommitted changes
			...(await gitDiff(["--cached"])),
			// Untracked files
			...(await git.status()).not_added
		];
		for (const file of _files) {
			if (isChangeset(file)) files.add(file);
		}
	}
	return files;
};

const validate = async (filePath) => {
	const absoluteFilePath = path.join(rootPath, filePath);
	const content = await fs.readFile(absoluteFilePath, "utf8");
	const frontmatterMatch = content.match(FRONTMATTER_RE);
	const errors = [];

	if (!frontmatterMatch) {
		errors.push("missing YAML frontmatter block");
		return errors;
	}

	const entries = frontmatterMatch[1]
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);

	if (entries.length === 0) {
		errors.push("frontmatter does not contain package bump entries");
		return errors;
	}

	for (const entry of entries) {
		const match = entry.match(ENTRY_RE);
		if (!match) {
			errors.push(`invalid frontmatter entry: ${entry}`);
			continue;
		}

		const [, pkgName, bumpType] = match;
		if (pkgName !== pkgJson.name) {
			errors.push(
				`invalid package name "${pkgName}", expected "${pkgJson.name}"`
			);
		}

		if (!VALID_BUMPS.has(bumpType)) {
			errors.push(
				`invalid bump type "${bumpType}", expected one of: major, minor, patch`
			);
		}
	}

	return errors;
};

const main = async () => {
	const changedFiles = await getChangedFiles();

	if (changedFiles.length === 0) {
		console.log("No changed changeset files found.");
		return;
	}

	const failures = [];
	for (const filePath of changedFiles) {
		const errors = await validate(filePath);
		for (const error of errors) {
			failures.push(`${filePath}: ${error}`);
		}
	}

	if (failures.length > 0) {
		console.error("Changeset validation failed:");
		for (const failure of failures) {
			console.error(`- ${failure}`);
		}
		process.exitCode = 1;
	}
};

main();
