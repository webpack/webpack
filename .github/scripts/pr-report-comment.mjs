import fs from "fs";
import path from "path";

// Every producer writes into this one comment; `find-comment` locates it by the marker.
const MARKER = "<!-- webpack-ci-report -->";
const HEADING = "### 🤖 webpack CI report";
// Sections render in this order, whichever workflow produces them first.
const SECTION_ORDER = ["package-preview", "types-coverage"];
const SECTION_SEPARATOR = "\n\n---\n\n";
// GitHub rejects comment bodies over 65536 characters; leave headroom because it
// counts differently than `String#length` for astral characters.
const MAX_BODY_LENGTH = 65000;
const TRUNCATION_NOTICE =
	"\n\n_Report truncated to fit GitHub's comment size limit._";

/**
 * @param {string} section section id
 * @returns {string} opening delimiter of the section
 */
function startDelimiter(section) {
	return `<!-- section:${section} -->`;
}

/**
 * @param {string} section section id
 * @returns {string} closing delimiter of the section
 */
function endDelimiter(section) {
	return `<!-- /section:${section} -->`;
}

/**
 * @param {string} body existing comment body
 * @returns {Map<string, string>} section id to its markdown
 */
function parseSections(body) {
	/** @type {Map<string, string>} */
	const sections = new Map();
	const regexp =
		/<!-- section:([\w-]+) -->\n([\s\S]*?)\n<!-- \/section:\1 -->/g;
	let match;

	while ((match = regexp.exec(body)) !== null) {
		sections.set(match[1], match[2]);
	}

	return sections;
}

/**
 * @param {Map<string, string>} sections section id to its markdown
 * @returns {string} full comment body
 */
function renderBody(sections) {
	const known = SECTION_ORDER.filter((section) => sections.has(section));
	const unknown = [...sections.keys()].filter(
		(section) => !SECTION_ORDER.includes(section)
	);
	const rendered = [...known, ...unknown]
		.map(
			(section) =>
				`${startDelimiter(section)}\n${sections.get(section)}\n${endDelimiter(section)}`
		)
		.join(SECTION_SEPARATOR);
	const body = `${MARKER}\n${HEADING}\n\n${rendered}`;

	return body.length > MAX_BODY_LENGTH
		? body.slice(0, MAX_BODY_LENGTH - TRUNCATION_NOTICE.length) +
				TRUNCATION_NOTICE
		: body;
}

const sectionsPath = process.env.SECTIONS_PATH;
const outputPath = process.env.OUTPUT_PATH;

// GitHub serves comment bodies with CRLF line endings, the delimiters use LF.
const existingBody = (process.env.EXISTING_BODY || "").replace(/\r\n/g, "\n");
// Sections without a downloaded artifact keep whatever the comment already shows.
const sections = parseSections(existingBody);
const collected = fs
	.readdirSync(sectionsPath)
	.filter((entry) => entry.endsWith(".md"));

for (const entry of collected) {
	const section = path.basename(entry, ".md");
	const sectionBody = fs
		.readFileSync(path.join(sectionsPath, entry), "utf8")
		.trim();

	if (sectionBody) {
		sections.set(section, sectionBody);
	} else {
		sections.delete(section);
	}
}

const body = renderBody(sections);

fs.writeFileSync(outputPath, body);
