/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// Compare webpack's own XML parser and printer (`parseHtml(…, { xml: true })`)
// against the ecosystem's, over real documents, in the three stages a tool can
// be asked for.
//
//   node tooling/compare-xml-tools.js
//
// `parse` builds the tree and stops; `beautify` and `minify` print it back out.
// Every table reports best-of-3 wall/cpu ms and the worker's own peak RSS.
//
// The two printing tables add what the output weighs, whether a strict XML
// parser still accepts it, and whether the tree it reads back to still says
// what the input's did.
//
// The run opens with the invariants webpack's own printer owes its output,
// which need no install; `--invariants` prints that section and stops.
//
// `FIXTURE=`, `TOOL=` and `STAGE=` narrow the run to rows whose name contains
// what they name, so one cell is re-measured without the whole matrix.
//
// Each cell runs in a fresh worker, so cost is attributable to that one tool.
// The packages compared against install into `node_modules/.cache/`.

const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const {
	builtinEmbeddedRenderer
} = require("../lib/html/builtinEmbeddedRenderer");
const { SourceProcessor } = require("../lib/html/syntax");
const {
	Field,
	NodeType,
	Part,
	_attributeList,
	decodeXmlAttribute,
	parseHtml,
	tokenizeXml
} = require("../lib/html/syntax-parser");
const {
	STAGES,
	TreeEvents,
	agreement,
	agreementInvariant,
	collectFiles,
	compress,
	cutsAt,
	filterFrom,
	findingGroups,
	formatCost,
	formatProfile,
	formatSecond,
	hasher,
	idempotence,
	installPackages,
	kb,
	loaderFor,
	log,
	measure,
	measureInWorker,
	missingReport,
	oneLine,
	pathSpanWalk,
	purityRelation,
	shrink,
	signed,
	sliceRelation,
	spans,
	sweepExitCode,
	sweepMode,
	wantedExpectations,
	wantedRespelling
} = require("./compare-tools-harness");

/** @typedef {import("../lib/html/syntax-parser").HtmlPath} HtmlPath */
/** @typedef {import("./compare-tools-harness").Report} Report */

const ROOT = path.resolve(__dirname, "..");
const CACHE_NAME = "xml-tool-comparison";
const CACHE = path.join(ROOT, "node_modules/.cache", CACHE_NAME);
const MODULES = path.join(CACHE, "node_modules");
const load = loaderFor(CACHE);

/**
 * Install the pinned comparison packages into the cache.
 * @returns {Promise<string>} the cache directory
 */
const setup = () => installPackages(CACHE_NAME);

/**
 * Import an ES-module-only package from the cache by the entry its own manifest
 * names: a bare specifier would resolve against this file, not the cache.
 * @param {string} name package name
 * @returns {Promise<EXPECTED_ANY>} its namespace
 */
const importPackage = (name) => {
	const manifest = load(`${name}/package.json`);
	const exported =
		manifest.exports === undefined || typeof manifest.exports === "string"
			? manifest.exports
			: manifest.exports["."].import || manifest.exports["."].default;
	const entry = exported || manifest.module || manifest.main || "index.js";
	return import(pathToFileURL(path.join(MODULES, name, entry)).href);
};

// Real shipped XML: icon sprites whole, and two of the most intricate
// hand-drawn flags a flag set carries, which is where authoring tools leave
// their namespaces, metadata and deep nesting.
/** @type {[string, string][]} */
const INSTALLED_DOCUMENTS = [
	["Bootstrap Icons sprite", "bootstrap-icons/bootstrap-icons.svg"],
	[
		"Font Awesome solid sprite",
		"@fortawesome/fontawesome-free/sprites/solid.svg"
	],
	["Feather sprite", "feather-icons/dist/feather-sprite.svg"],
	["Flag of Spain (flag-icons)", "flag-icons/flags/4x3/es.svg"],
	["Flag of Serbia (flag-icons)", "flag-icons/flags/4x3/rs.svg"]
];

// What a drawing tool exports: an XML declaration, a DOCTYPE whose internal
// subset declares the namespaces as entities, editor metadata in namespaces of
// its own, and a stylesheet in a CDATA section.
const EDITOR_SVG = `<?xml version="1.0" encoding="utf-8"?>
<!-- Generator: Adobe Illustrator 27.0.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" [
	<!ENTITY ns_svg "http://www.w3.org/2000/svg">
	<!ENTITY ns_xlink "http://www.w3.org/1999/xlink">
	<!ENTITY ns_extend "http://ns.adobe.com/Extensibility/1.0/">
	<!ENTITY ns_ai "http://ns.adobe.com/AdobeIllustrator/10.0/">
	<!ENTITY st0 "fill:#FFFFFF;stroke:#000000;stroke-miterlimit:10;">
]>
<svg version="1.1" id="Layer_1" xmlns="&ns_svg;" xmlns:xlink="&ns_xlink;" xmlns:i="&ns_ai;"
	 xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
	 xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
	 x="0px" y="0px" width="200px" height="120px" viewBox="0 0 200 120"
	 style="enable-background:new 0 0 200 120;" xml:space="preserve">
<style type="text/css">
<![CDATA[
	.st0{&st0;}
	.st1{font-family:'Helvetica'; font-size:12px;}
	text > tspan { fill: #333 }
]]>
</style>
<metadata>
	<sfw xmlns="&ns_extend;">
		<slices></slices>
		<sliceSourceBounds  height="120" width="200" y="0" x="0" bottomLeftOrigin="true"></sliceSourceBounds>
	</sfw>
</metadata>
<sodipodi:namedview id="base" pagecolor="#ffffff" inkscape:zoom="1.5" inkscape:cx="100" inkscape:cy="60"/>
<g i:extraneous="self">
	<rect x="10" y="10" class="st0" width="180" height="100"/>
	<path class="st0" d="M 20,20 L 180,20 L 180 , 100 Z" />
	<text transform="matrix(1 0 0 1 30 60)" class="st1">Fish &amp; Chips &lt;3 &#x2764;</text>
	<text x="30" y="80" xml:space="preserve">  two   spaces  </text>
	<use xlink:href="#shape" x="0" y="0"></use>
</g>
</svg>
`;

/**
 * An Atom feed, the XML most sites still publish: namespaced extensions, escaped
 * HTML in `content`, and a CDATA section carrying the same.
 * @param {number} entries how many entries it lists
 * @returns {string} the feed
 */
const atomFeed = (entries) => {
	let out = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/feed.xsl"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/" xml:lang="en">
	<title type="text">webpack &amp; friends</title>
	<link href="https://webpack.js.org/feed.xml" rel="self" type="application/atom+xml"/>
	<updated>2026-09-24T00:00:00Z</updated>
	<id>tag:webpack.js.org,2026:feed</id>
`;
	for (let i = 0; i < entries; i++) {
		out += `	<entry>
		<title>Release 5.${i}.0 — "quoted" &amp; 'apostrophes'</title>
		<link rel="alternate" type="text/html" href="https://webpack.js.org/blog/5-${i}?utm=feed&amp;ref=atom"/>
		<id>tag:webpack.js.org,2026:5.${i}.0</id>
		<updated>2026-09-${String((i % 28) + 1).padStart(2, "0")}T12:00:00Z</updated>
		<author><name>Maintainer ${i % 7}</name></author>
		<category term="release" />
		<media:thumbnail url="https://webpack.js.org/thumb-${i}.png" width="120" height="80"/>
		<summary type="html">&lt;p&gt;Adds &lt;code&gt;experiments.${i}&lt;/code&gt; and fixes ${i} bugs.&lt;/p&gt;</summary>
		<content type="html"><![CDATA[<p>Read the <a href="/blog/5-${i}">full notes</a> — a < b && c > d.</p>]]></content>
	</entry>
`;
	}
	return `${out}</feed>
`;
};

// A build descriptor: deep nesting of short text elements, comments, and
// property placeholders, which is where whitespace between elements dominates.
const MAVEN_POM = `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <!-- coordinates -->
  <groupId>org.example</groupId>
  <artifactId>demo</artifactId>
  <version>1.0.0-SNAPSHOT</version>
  <properties>
    <java.version>21</java.version>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
  </properties>
  <dependencies>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter</artifactId>
      <version>\${junit.version}</version>
      <scope>test</scope>
    </dependency>
  </dependencies>
  <build>
    <plugins>
      <plugin>
        <artifactId>maven-compiler-plugin</artifactId>
        <configuration><release>\${java.version}</release><compilerArgs><arg>-Xlint:all</arg></compilerArgs></configuration>
      </plugin>
    </plugins>
  </build>
</project>
`;

// A translation file: inline markup placeholders inside text, where every space
// is content a translator wrote.
const XLIFF = `<?xml version="1.0" encoding="UTF-8"?>
<xliff version="2.0" xmlns="urn:oasis:names:tc:xliff:document:2.0" srcLang="en" trgLang="de">
  <file id="f1">
    <unit id="greeting">
      <segment>
        <source>Hello <pc id="1">world</pc>, you have <ph id="2" equiv="{count}"/> new messages &lt;3</source>
        <target>Hallo <pc id="1">Welt</pc>, du hast <ph id="2" equiv="{count}"/> neue Nachrichten &lt;3</target>
      </segment>
    </unit>
    <unit id="empty"><segment><source/><target></target></segment></unit>
  </file>
</xliff>
`;

/**
 * Every fixture the comparison measures.
 * @returns {Promise<[string, string][]>} `[label, xml]` for every fixture
 */
const fixtures = async () => {
	/** @type {[string, string][]} */
	const out = [];
	for (const [label, file] of INSTALLED_DOCUMENTS) {
		out.push([
			label,
			await fs.promises.readFile(path.join(MODULES, file), "utf8")
		]);
	}
	out.push(["Editor-exported SVG (DTD entities)", EDITOR_SVG]);
	out.push(["Atom feed (400 entries)", atomFeed(400)]);
	out.push(["Maven POM", MAVEN_POM]);
	out.push(["XLIFF translation", XLIFF]);
	return out;
};

/**
 * @param {string} xml a document
 * @param {"minify" | "beautify"} mode what to print
 * @returns {string} what webpack prints
 */
const printXml = (xml, mode) =>
	/** @type {{ code: string }} */ (
		new SourceProcessor().process(xml, { xml: true, mode })
	).code;

/** @typedef {Pick<import("../lib/html/syntax-printer").HtmlProcessOptions, "sortAttributes" | "renderEmbeddedSource">} XmlPrintOptions */

/** @typedef {import("../lib/html/builtinEmbeddedRenderer").BuiltinEmbeddedRendererOptions} CssOptions */

/** @type {CssOptions} */
const LEGACY_CSS_OPTIONS = {
	environment: { browsers: ["chrome 100", "firefox 100", "safari 15.4"] }
};

// The printer alone, the two the webpack rows run, where an SVG's `<style>` and
// `style=""` reach the CSS minifier as in a build, and a target it lowers for;
// each with the CSS options its renderer minifies with, which `meaning` reads.
/** @type {[string, XmlPrintOptions, CssOptions][]} */
const PRESETS = [
	["default", {}, {}],
	["embedded", { renderEmbeddedSource: builtinEmbeddedRenderer() }, {}],
	[
		"sorted",
		{ sortAttributes: true, renderEmbeddedSource: builtinEmbeddedRenderer() },
		{}
	],
	[
		"embedded+legacy",
		{ renderEmbeddedSource: builtinEmbeddedRenderer(LEGACY_CSS_OPTIONS) },
		LEGACY_CSS_OPTIONS
	]
];

/**
 * @param {XmlPrintOptions} options one preset's printer options
 * @returns {(xml: string) => string} the minifier those options name
 */
const printerFor = (options) => (xml) =>
	/** @type {{ code: string }} */ (
		new SourceProcessor().process(xml, {
			...options,
			xml: true,
			mode: "minify"
		})
	).code;

// Each entry builds its callable on demand, so the measuring worker loads only
// the one tool it measures — anything else would land in that tool's peak RSS.
/** @type {import("./compare-tools-harness").Tool[]} */
const TOOLS = [
	{
		name: "webpack",
		stage: "parse",
		create: () => (xml) => parseHtml(xml, 0, { xml: true })
	},
	{
		name: "sax (svgo's parser)",
		stage: "parse",
		create: () => {
			const sax = load("sax");
			return (xml) => {
				const parser = sax.parser(true, { xmlns: false, position: false });
				let count = 0;
				parser.onopentag = () => count++;
				parser.ontext = () => count++;
				parser.onerror = () => parser.resume();
				parser.write(xml).close();
				return count;
			};
		}
	},
	{
		name: "saxes",
		stage: "parse",
		create: () => {
			const { SaxesParser } = load("saxes");
			return (xml) => {
				const parser = new SaxesParser();
				let count = 0;
				parser.on("opentag", () => count++);
				parser.on("text", () => count++);
				parser.write(xml).close();
				return count;
			};
		}
	},
	{
		name: "@xmldom/xmldom",
		stage: "parse",
		create: () => {
			const { DOMParser } = load("@xmldom/xmldom");
			return (xml) => new DOMParser().parseFromString(xml, "text/xml");
		}
	},
	{
		name: "@rgrove/parse-xml",
		stage: "parse",
		create: () => {
			const loading = importPackage("@rgrove/parse-xml");
			return async (xml) => (await loading).parseXml(xml);
		}
	},
	{
		name: "fast-xml-parser",
		stage: "parse",
		create: () => {
			const { XMLParser } = load("fast-xml-parser");
			const parser = new XMLParser({
				ignoreAttributes: false,
				preserveOrder: true
			});
			return (xml) => parser.parse(xml);
		}
	},
	{
		name: "htmlparser2 (xmlMode)",
		stage: "parse",
		create: () => {
			const htmlparser2 = load("htmlparser2");
			return (xml) => htmlparser2.parseDocument(xml, { xmlMode: true });
		}
	},
	{
		name: "txml",
		stage: "parse",
		create: () => {
			const txml = load("txml");
			return (xml) => txml.parse(xml, { keepComments: true });
		}
	},
	{
		name: "webpack",
		stage: "beautify",
		create: () => (xml) => printXml(xml, "beautify")
	},
	{
		// A round trip that reformats nothing: the floor the others are read against.
		name: "@xmldom/xmldom (serialize)",
		stage: "beautify",
		create: () => {
			const { DOMParser, XMLSerializer } = load("@xmldom/xmldom");
			return (xml) =>
				new XMLSerializer().serializeToString(
					new DOMParser().parseFromString(xml, "text/xml")
				);
		}
	},
	{
		name: "xml-formatter",
		stage: "beautify",
		create: () => {
			const format = load("xml-formatter");
			return (xml) => format(xml, { collapseContent: true });
		}
	},
	{
		name: "prettier (@prettier/plugin-xml)",
		stage: "beautify",
		create: () => {
			const prettier = load("prettier");
			const plugin = importPackage("@prettier/plugin-xml");
			return async (xml) =>
				prettier.format(xml, {
					parser: "xml",
					plugins: [(await plugin).default]
				});
		}
	},
	{
		// With the renderer a build hands it, so an SVG's stylesheets are minified.
		name: "webpack",
		stage: "minify",
		create: () => {
			const renderEmbeddedSource = builtinEmbeddedRenderer();
			return (xml) =>
				/** @type {{ code: string }} */ (
					new SourceProcessor().process(xml, {
						xml: true,
						mode: "minify",
						renderEmbeddedSource
					})
				).code;
		}
	},
	{
		name: "webpack (sorted attributes)",
		stage: "minify",
		create: () => {
			const renderEmbeddedSource = builtinEmbeddedRenderer();
			return (xml) =>
				new SourceProcessor().process(xml, {
					xml: true,
					mode: "minify",
					sortAttributes: true,
					renderEmbeddedSource
				}).code;
		}
	},
	{
		// SVG's own optimizer: it rewrites path data and drops what it deems
		// editor noise, so it differs by design rather than by mistake.
		name: "svgo",
		stage: "minify",
		create: () => {
			const { optimize } = load("svgo");
			return (xml) => optimize(xml, { multipass: false }).data;
		}
	},
	{
		name: "svgo (multipass)",
		stage: "minify",
		create: () => {
			const { optimize } = load("svgo");
			return (xml) => optimize(xml, { multipass: true }).data;
		}
	},
	{
		name: "minify-xml",
		stage: "minify",
		create: () => {
			const loading = importPackage("minify-xml");
			return async (xml) => (await loading).minify(xml);
		}
	},
	{
		name: "xml-formatter (minify)",
		stage: "minify",
		create: () => {
			const format = load("xml-formatter");
			return (xml) => format.minify(xml, { collapseContent: true });
		}
	},
	{
		name: "htmlparser2 + dom-serializer (xmlMode)",
		stage: "minify",
		create: () => {
			const htmlparser2 = load("htmlparser2");
			const render = load("dom-serializer").default;
			return (xml) =>
				render(htmlparser2.parseDocument(xml, { xmlMode: true }), {
					xmlMode: true
				});
		}
	}
];

// A tool built for one vocabulary, whose output for any other document says
// nothing about how it reads XML: svgo drops what an SVG renderer ignores.
const SVG_ONLY = new Set(["svgo", "svgo (multipass)"]);

const STYLE_ELEMENT = /(?:^|:)style$/;

/**
 * A stylesheet as webpack's CSS minifier reads it, run to a fixed point, so a
 * tool that minified an SVG's `<style>` is not reported for changing its text.
 * @param {string} css a `<style>` body
 * @param {CssOptions=} options the CSS minifier's options, a target among them
 * @returns {string} its canonical form
 */
const canonicalCss = (css, options = {}) => {
	try {
		const { SourceProcessor: CssProcessor } = require("../lib/css/syntax");

		const processor = new CssProcessor();
		let out = css;
		for (let i = 0; i < 3; i++) {
			const next = processor.process(out, { ...options, mode: "minify" }).code;
			if (next === out) break;
			out = next;
		}
		return out;
	} catch (_err) {
		return css;
	}
};

/**
 * What a document says, read by a strict XML parser that shares nothing with
 * webpack's: every element and attribute, and the text with whitespace runs
 * collapsed — a minifier is allowed to reflow what sits between elements.
 * @param {EXPECTED_ANY} parseXml `@rgrove/parse-xml`'s `parseXml`
 * @param {string} xml a document
 * @returns {{ elements: Map<string, number>, attributes: Map<string, number>, text: string } | string} its fingerprint, or why the parser rejected it
 */
const fingerprint = (parseXml, xml) => {
	/** @type {EXPECTED_ANY} */
	let document;
	try {
		document = parseXml(xml, { ignoreUndefinedEntities: true });
	} catch (error) {
		return String(/** @type {Error} */ (error).message).split("\n", 1)[0];
	}
	/** @type {Map<string, number>} */
	const elements = new Map();
	/** @type {Map<string, number>} */
	const attributes = new Map();
	/** @type {string[]} */
	const text = [];
	/**
	 * @param {EXPECTED_ANY} node a parse-xml node
	 * @returns {void}
	 */
	const walk = (node) => {
		if (node.type === "text" || node.type === "cdata") {
			const value = (
				STYLE_ELEMENT.test(node.parent.name || "")
					? canonicalCss(node.text)
					: node.text
			)
				.replace(/\s+/g, " ")
				.trim();
			if (value !== "") text.push(value);
			return;
		}
		if (node.type === "element") {
			elements.set(node.name, (elements.get(node.name) || 0) + 1);
			for (const name of Object.keys(node.attributes)) {
				const key = `${node.name}[${name}]`;
				attributes.set(key, (attributes.get(key) || 0) + 1);
			}
		}
		for (const child of node.children || []) walk(child);
	};
	walk(document);
	return { elements, attributes, text: text.join(" ") };
};

/**
 * @param {Map<string, number>} before input counts
 * @param {Map<string, number>} after output counts
 * @returns {string[]} the entries the output has fewer of
 */
const missing = (before, after) => {
	const out = [];
	for (const [key, count] of before) {
		const left = after.get(key) || 0;
		if (left >= count) continue;
		out.push(`${key}${count - left > 1 ? ` ×${count - left}` : ""}`);
	}
	return out;
};

const wantedFixture = filterFrom("FIXTURE");
const wantedTool = filterFrom("TOOL");
const wantedStage = filterFrom("STAGE");
const wantedRelation = filterFrom("RELATION");
const wantedPreset = filterFrom("PRESET");

/**
 * Select tools for the document's root vocabulary, skipping SVG optimizers for other XML.
 * @param {string} stage comparison stage
 * @param {string} xml input document
 * @returns {import("./compare-tools-harness").Tool[]} the eligible tools
 */
const toolsFor = (stage, xml) => {
	/** @type {string | undefined} */
	let root;
	tokenizeXml(xml, 0, {
		openTag(input, _start, end, nameStart, nameEnd) {
			if (root === undefined) root = input.slice(nameStart, nameEnd);
			return end;
		}
	});
	return TOOLS.filter(
		(tool) =>
			tool.stage === stage &&
			wantedTool(tool.name) &&
			(!SVG_ONLY.has(tool.name) || root === "svg")
	);
};

// --- Invariants -------------------------------------------------------------

// `js` is where the test harness writes what a case built, and `external` holds
// the conformance suites, which `test/specCases/xmlconf.spectest.js` reads.
const SKIPPED_FIXTURE_DIRS = new Set(["js", "node_modules", "external"]);

/** @type {Record<number, string>} */
const NODE_TYPE_NAMES = {};
for (const [name, type] of Object.entries(NodeType)) {
	NODE_TYPE_NAMES[type] = name;
}

/**
 * @param {string} value decoded text
 * @returns {string} the text as the canonical form escapes it
 */
const escapeCanonical = (value) =>
	value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/\t/g, "&#9;")
		.replace(/\n/g, "&#10;")
		.replace(/\r/g, "&#13;");

/**
 * @param {HtmlPath} nodePath an element's path
 * @returns {[string, string][]} its normalized attribute names and values
 */
const decodedAttributes = (nodePath) => {
	/** @type {[string, string][]} */
	const attributes = [];
	for (let i = 0; i < nodePath.fieldCount(Field.attributes); i++) {
		const attribute = nodePath.field(i, Field.attributes);
		attributes.push([nodePath.name(attribute), nodePath.value(attribute)]);
	}
	return attributes;
};

/**
 * A `style=""` value as the CSS minifier reads it, run to a fixed point.
 * @param {string} value the declarations
 * @param {CssOptions} options the CSS minifier's options
 * @returns {string} their canonical form
 */
const canonicalDeclarations = (value, options) => {
	const css = canonicalCss(`a{${value}}`, options);
	return css.startsWith("a{") && css.endsWith("}") ? css.slice(2, -1) : css;
};

/**
 * What a document means, as webpack reads it: James Clark's canonical form,
 * attributes sorted and every value decoded, comments and the DTD left out.
 * A `<style>` body and a `style=""` are read in their canonical CSS form, so
 * the CSS minifier writing them is not the document saying something else.
 * @param {string} xml a document
 * @param {CssOptions=} cssOptions the options that CSS is minified with
 * @returns {string} its canonical form
 */
const canonical = (xml, cssOptions = {}) => {
	/** @type {string[]} */
	const out = [];
	/** @type {string[]} */
	const open = [];
	/** @type {Record<number, { enter: (nodePath: HtmlPath) => void, exit: (nodePath: HtmlPath) => void }>} */
	const visitors = {
		[NodeType.Element]: {
			enter: (nodePath) => {
				const attributes = decodedAttributes(nodePath).sort(([a], [b]) =>
					a < b ? -1 : a > b ? 1 : 0
				);
				out.push(
					`<${nodePath.name()}${attributes
						.map(
							([name, value]) =>
								` ${name}="${escapeCanonical(
									name === "style"
										? canonicalDeclarations(value, cssOptions)
										: value
								)}"`
						)
						.join("")}>`
				);
				open.push(nodePath.name());
			},
			exit: (nodePath) => {
				out.push(`</${nodePath.name()}>`);
				open.pop();
			}
		},
		[NodeType.Text]: {
			enter: (nodePath) => {
				const text = nodePath.value();
				out.push(
					escapeCanonical(
						STYLE_ELEMENT.test(open[open.length - 1] || "")
							? canonicalCss(text, cssOptions)
							: text
					)
				);
			},
			exit: () => {}
		},
		[NodeType.ProcessingInstruction]: {
			enter: (nodePath) => {
				out.push(`<?${nodePath.name()} ${nodePath.value()}?>`);
			},
			exit: () => {}
		}
	};
	new SourceProcessor().use(visitors).process(xml, { xml: true });
	return out.join("");
};

// --- Parser agreement -------------------------------------------------------

// `@rgrove/parse-xml` is strict and shares nothing with webpack's parser, so it
// is the reference the trees are held to. A parser reporting events rather than
// building a tree, or trimming and typing values, has a dialect of its own.
const REFERENCE_PARSER = "@rgrove/parse-xml";

/**
 * @param {string} name the element's name
 * @param {[string, string][]} attributes its attributes, in order
 * @returns {string} what its start tag says, as every reader writes it
 */
const startOf = (name, attributes) =>
	`<${name}${attributes
		.map(([key, value]) => ` ${key}=${JSON.stringify(value)}`)
		.join("")}>`;

/**
 * Character data, CDATA sections folded in. What sits outside the root element
 * is markup's whitespace, not character data (XML §2.1), so it is left out.
 * @param {TreeEvents} events the tree so far
 * @param {string} value the text
 */
const textOf = (events, value) => {
	if (events.depth > 0) events.text(value);
};

// An entity's declared value is read with its character references decoded;
// one still holding markup, or whitespace an attribute would normalize, is
// left undeclared, so a source using it stays one the reference rejects.
const ENTITY_DECLARATION =
	/<!ENTITY\s+([^\s%]\S*)\s+(?:"([^"]*)"|'([^']*)')\s*>/g;

/**
 * The general entities a doctype's internal subset declares, each name bound
 * to its replacement text by its first declaration (XML §4.2).
 * @param {string} subset the internal subset
 * @returns {Map<string, string>} each entity's replacement text, by name
 */
const declaredEntities = (subset) => {
	/** @type {Map<string, string>} */
	const declared = new Map();
	for (const match of subset
		.replace(/<!--[\s\S]*?-->/g, "")
		.matchAll(ENTITY_DECLARATION)) {
		const literal = match[2] === undefined ? match[3] : match[2];
		if (declared.has(match[1]) || literal.includes("%")) continue;
		const value = literal.replace(/&#(x[\da-fA-F]+|\d+);/g, (_, code) =>
			String.fromCodePoint(
				code[0] === "x" ? Number.parseInt(code.slice(1), 16) : Number(code)
			)
		);
		if (!/[&<\t\n\r]/.test(value)) declared.set(match[1], value);
	}
	return declared;
};

/**
 * `@rgrove/parse-xml`'s document. It reads no DTD, so where it rejects a source
 * the source is read again with what the internal subset declares.
 * @param {EXPECTED_ANY} parseXml its `parseXml`
 * @param {string} xml a document
 * @returns {EXPECTED_ANY} the document
 */
const parseXmlDocument = (parseXml, xml) => {
	try {
		return parseXml(xml, { preserveComments: true });
	} catch (error) {
		/** @type {EXPECTED_ANY} */
		let doctype;
		try {
			doctype = parseXml(xml, {
				preserveDocumentType: true,
				ignoreUndefinedEntities: true
			}).children.find(
				(/** @type {EXPECTED_ANY} */ node) => node.type === "doctype"
			);
		} catch (_error) {
			throw error;
		}
		if (doctype === undefined || !doctype.internalSubset) throw error;
		const declared = declaredEntities(doctype.internalSubset);
		return parseXml(xml, {
			preserveComments: true,
			resolveUndefinedEntity: (/** @type {string} */ reference) =>
				declared.get(reference.slice(1, -1))
		});
	}
};

/**
 * `@rgrove/parse-xml`'s tree, as the agreement column and relation read it.
 * @param {EXPECTED_ANY} parseXml its `parseXml`
 * @param {string} xml a document
 * @returns {TreeEvents} what it says
 */
const parseXmlEvents = (parseXml, xml) => {
	const events = new TreeEvents();
	/**
	 * @param {EXPECTED_ANY} node a parse-xml node
	 */
	const walk = (node) => {
		for (const child of node.children) {
			if (child.type === "element") {
				events.open(
					child.name,
					startOf(child.name, Object.entries(child.attributes))
				);
				walk(child);
				events.close(`</${child.name}>`);
			} else if (child.type === "text" || child.type === "cdata") {
				textOf(events, child.text);
			} else if (child.type === "comment") {
				events.leaf(`comment ${JSON.stringify(child.content)}`);
			} else if (child.type === "pi") {
				events.leaf(`<?${child.name} ${JSON.stringify(child.content)}?>`);
			}
		}
	};
	walk(parseXmlDocument(parseXml, xml));
	return events;
};

/**
 * @param {string} xml a document
 * @returns {Promise<TreeEvents>} what `@rgrove/parse-xml` reads it to
 */
const parseXmlTree = async (xml) =>
	parseXmlEvents((await importPackage(REFERENCE_PARSER)).parseXml, xml);

/**
 * webpack's tree, as the agreement column reads it.
 * @param {string} xml a document
 * @returns {TreeEvents} what it says
 */
const webpackTree = (xml) => {
	const events = new TreeEvents();
	/** @type {Record<number, { enter: (nodePath: HtmlPath) => void, exit: (nodePath: HtmlPath) => void }>} */
	const visitors = {
		[NodeType.Element]: {
			enter: (nodePath) => {
				events.open(
					nodePath.name(),
					startOf(nodePath.name(), decodedAttributes(nodePath))
				);
			},
			exit: (nodePath) => {
				events.close(`</${nodePath.name()}>`);
			}
		},
		[NodeType.Text]: {
			enter: (nodePath) => {
				textOf(events, nodePath.value());
			},
			exit: () => {}
		},
		[NodeType.Comment]: {
			enter: (nodePath) => {
				events.leaf(`comment ${JSON.stringify(nodePath.value())}`);
			},
			exit: () => {}
		},
		[NodeType.ProcessingInstruction]: {
			enter: (nodePath) => {
				// The XML declaration is not a processing instruction (§2.8).
				if (nodePath.name() === "xml") return;
				events.leaf(
					`<?${nodePath.name()} ${JSON.stringify(nodePath.value())}?>`
				);
			},
			exit: () => {}
		}
	};
	new SourceProcessor().use(visitors).process(xml, { xml: true });
	return events;
};

/**
 * `@xmldom/xmldom`'s DOM, as the agreement column reads it.
 * @param {string} xml a document
 * @returns {TreeEvents} what it says
 */
const xmldomTree = (xml) => {
	const { DOMParser } = load("@xmldom/xmldom");
	const events = new TreeEvents();
	/**
	 * @param {EXPECTED_ANY} node a DOM node
	 */
	const walk = (node) => {
		for (let child = node.firstChild; child; child = child.nextSibling) {
			if (child.nodeType === 1) {
				/** @type {[string, string][]} */
				const attributes = [];
				for (let i = 0; i < child.attributes.length; i++) {
					attributes.push([
						child.attributes[i].name,
						child.attributes[i].value
					]);
				}
				events.open(child.nodeName, startOf(child.nodeName, attributes));
				walk(child);
				events.close(`</${child.nodeName}>`);
			} else if (child.nodeType === 3 || child.nodeType === 4) {
				textOf(events, child.data);
			} else if (child.nodeType === 8) {
				events.leaf(`comment ${JSON.stringify(child.data)}`);
			} else if (child.nodeType === 7 && child.target !== "xml") {
				events.leaf(`<?${child.target} ${JSON.stringify(child.data)}?>`);
			}
		}
	};
	walk(new DOMParser().parseFromString(xml, "text/xml"));
	return events;
};

/**
 * htmlparser2's tree in `xmlMode`, as the agreement column reads it.
 * @param {string} xml a document
 * @returns {TreeEvents} what it says
 */
const htmlparser2Tree = (xml) => {
	const htmlparser2 = load("htmlparser2");
	const events = new TreeEvents();
	/**
	 * @param {EXPECTED_ANY} node an htmlparser2 node
	 */
	const walk = (node) => {
		for (const child of node.children) {
			if (child.attribs !== undefined) {
				events.open(
					child.name,
					startOf(child.name, Object.entries(child.attribs))
				);
				walk(child);
				events.close(`</${child.name}>`);
			} else if (child.type === "text") {
				textOf(events, child.data);
			} else if (child.type === "cdata") {
				for (const text of child.children) textOf(events, text.data);
			} else if (child.type === "comment") {
				events.leaf(`comment ${JSON.stringify(child.data)}`);
			} else if (child.type === "directive" && child.name !== "?xml") {
				// A directive is a doctype or a processing instruction, kept whole.
				const instruction = /^\?(\S+)\s*([\s\S]*?)\??$/.exec(child.data);
				if (instruction !== null) {
					events.leaf(
						`<?${instruction[1]} ${JSON.stringify(instruction[2])}?>`
					);
				}
			}
		}
	};
	walk(htmlparser2.parseDocument(xml, { xmlMode: true }));
	return events;
};

/** @type {Map<string, import("./compare-tools-harness").TreeReader>} */
const TREE_READERS = new Map(
	/** @type {[string, import("./compare-tools-harness").TreeReader][]} */ ([
		["webpack", webpackTree],
		["@xmldom/xmldom", xmldomTree],
		[REFERENCE_PARSER, parseXmlTree],
		["htmlparser2 (xmlMode)", htmlparser2Tree]
	])
);

/**
 * @typedef {object} Site
 * @property {number} valueStart where the attribute value begins
 * @property {number} valueEnd where it ends, before a closing delimiter
 * @property {number} quote its delimiter, `"` or `'`, as a code unit
 * @property {number} tagStart the enclosing tag's start
 * @property {number} tagEnd its end, past the `>`
 */

/**
 * Every quoted attribute value the source wrote, found with webpack's own XML
 * tokenizer so a respelling only ever touches what is really a value.
 * @param {string} xml a document
 * @returns {Site[]} each value, in source order
 */
const attributeSites = (xml) => {
	/** @type {Site[]} */
	const sites = [];
	/** @type {Site[]} */
	const pending = [];
	tokenizeXml(xml, 0, {
		attribute: (input, nameStart, nameEnd, valueStart, valueEnd, quoteType) => {
			if (valueStart === -1 || quoteType === 0) return nameEnd;
			pending.push({
				valueStart,
				valueEnd,
				quote: input.charCodeAt(valueStart - 1),
				tagStart: 0,
				tagEnd: 0
			});
			return valueEnd + 1;
		},
		openTag: (input, start, end) => {
			for (const site of pending) {
				site.tagStart = start;
				site.tagEnd = end;
				sites.push(site);
			}
			pending.length = 0;
			return end;
		}
	});
	return sites;
};

/**
 * @typedef {object} Respelling
 * @property {string} name how the relation is labelled
 * @property {(value: string, site: Site, raw: string) => string | null} write the value's new spelling with its delimiters, or null to leave it
 */

/**
 * @param {string} value decoded value
 * @param {string} quote the delimiter to write it between
 * @returns {string} the value written between that delimiter
 */
const quoted = (value, quote) =>
	`${quote}${value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(quote === '"' ? /"/g : /'/g, quote === '"' ? "&quot;" : "&apos;")
		.replace(/\t/g, "&#9;")
		.replace(/\n/g, "&#10;")
		.replace(/\r/g, "&#13;")}${quote}`;

// What a respelling may rewrite is what XML says means the same thing: a value's
// delimiter, and a character written as a reference to it.
/** @type {Respelling[]} */
const RESPELLINGS = [
	{
		name: "quote-single",
		write: (value, site) =>
			site.quote === 0x22 && !value.includes("'") ? quoted(value, "'") : null
	},
	{
		name: "quote-double",
		write: (value, site) =>
			site.quote === 0x27 && !value.includes('"') ? quoted(value, '"') : null
	},
	{
		name: "references",
		write: (value, site) => {
			if (value === "") return null;
			let out = "";
			for (const character of value) {
				out +=
					character === " "
						? " "
						: `&#x${/** @type {number} */ (character.codePointAt(0)).toString(16)};`;
			}
			const quote = site.quote === 0x27 ? "'" : '"';
			return `${quote}${out}${quote}`;
		}
	}
];

const DECLARED_REFERENCE = /&(?!#|amp;|lt;|gt;|quot;|apos;)/;

/**
 * Respell every site in a subset.
 * @param {string} xml a document
 * @param {Site[]} sites the values to respell
 * @param {Respelling} respelling how
 * @returns {string} the document with them respelled
 */
const respell = (xml, sites, respelling) => {
	let out = "";
	let last = 0;
	for (const site of sites) {
		const raw = xml.slice(site.valueStart, site.valueEnd);
		// A reference to what the DTD declares is shorter than any spelling of its
		// text, which the printer keeps; writing the text out is not lexical.
		if (DECLARED_REFERENCE.test(raw)) continue;
		const written = respelling.write(decodeXmlAttribute(raw), site, raw);
		if (written === null) continue;
		out += xml.slice(last, site.valueStart - 1) + written;
		last = site.valueEnd + 1;
	}
	return out + xml.slice(last);
};

/**
 * @typedef {{ kind: string, delta: number }} Finding
 */

/**
 * Whether respelling these sites moves what the document minifies to. A
 * respelling that moved the document itself says nothing about the printer.
 * @param {string} xml a document
 * @param {string} minified what it minifies to
 * @param {Site[]} sites the values to respell
 * @param {Respelling} respelling how
 * @returns {Finding | null} what moved
 */
const spellingFinding = (xml, minified, sites, respelling) => {
	const mutated = respell(xml, sites, respelling);
	if (mutated === xml || canonical(mutated) !== canonical(xml)) return null;
	const answer = printXml(mutated, "minify");
	if (answer === minified) return null;
	if (canonical(answer) !== canonical(minified)) {
		return { kind: "differs", delta: answer.length - minified.length };
	}
	// Saying the same thing in no more bytes is not a finding.
	if (answer.length <= minified.length) return null;
	return { kind: "bytes", delta: answer.length - minified.length };
};

/**
 * Every respelling this document's output depends on.
 * @param {string} xml the document
 * @param {string} minified what it minifies to
 * @returns {Report[]} what moved, and the smallest repro found for each
 */
const sweepRespellings = (xml, minified) => {
	/** @type {Report[]} */
	const reports = [];
	const sites = attributeSites(xml);
	for (const respelling of RESPELLINGS.filter((one) =>
		wantedRespelling(one.name)
	)) {
		/**
		 * @param {Site[]} subset the sites to respell
		 * @returns {Finding | null} what moved
		 */
		const holds = (subset) =>
			spellingFinding(xml, minified, subset, respelling);
		const found = holds(sites);
		if (found === null) continue;
		const carried = shrink(holds, sites, found.kind);
		const blamed = holds(carried) || found;
		const tag = xml.slice(carried[0].tagStart, carried[0].tagEnd);
		reports.push({
			relation: `respelling ${respelling.name}`,
			what: `${blamed.kind}, ${signed(blamed.delta)}`,
			repro: `    ${oneLine(tag, 80)}  ->  ${oneLine(
				respell(xml, carried, respelling).slice(
					carried[0].tagStart,
					carried[0].tagEnd + 40
				),
				80
			)}`
		});
	}
	return reports;
};

// Where a cut lands, by the construct it interrupts: each pattern ends where the
// document is cut, just inside what the end of the input then has to close.
/** @type {[string, RegExp][]} */
const XML_CUTS = [
	["in a start tag's name", /<[a-z_]/gi],
	["in an end tag's name", /<\/[a-z_]/gi],
	["in an attribute's name", /<[a-z_][^\s<>]*\s+[a-z_]/gi],
	["after an attribute's =", /<[a-z_][^\s<>]*\s+[\w:.-]+=/gi],
	["in a double-quoted value", /[=]"[^"]/g],
	["in a single-quoted value", /[=]'[^']/g],
	["before a tag's >", /<[a-z_][^<>]*(?=>)/gi],
	["between a tag's / and >", /<[a-z_][^<>]*\/(?=>)/gi],
	["in a comment", /<!--[\s\S]/g],
	["in a processing instruction", /<\?[\s\S]/g],
	["in a doctype", /<!DOCTYPE/g],
	["in an internal subset", /<!DOCTYPE[^>[]*\[[\s\S]/g],
	["in a reference", /&[a-z#_]/gi],
	["in a CDATA section", /<!\[CDATA\[[\s\S]/g],
	["in a <style> body", /<(?:[\w.-]+:)?style[^>]*>[^<]/gi],
	["in a style attribute", /style="[^"]/gi]
];

/**
 * The tag in the output a second pass first differs inside, minified on its
 * own: a repro only where minifying that tag alone moves it too.
 * @param {(xml: string) => string} minify the printer under test
 * @param {string} minified one pass's output
 * @param {number} at where the second pass first differs
 * @returns {{ source: string, again: string } | null} the repro, or null
 */
const idempotenceRepro = (minify, minified, at) => {
	let found = "";
	tokenizeXml(minified, 0, {
		openTag: (input, start, end) => {
			if (start <= at && at < end) found = input.slice(start, end);
			return end;
		}
	});
	if (found === "") return null;
	const again = minify(found);
	return again === found ? null : { source: found, again };
};

/**
 * The sub-ranges an element states: its opening tag, and the name and value of
 * every attribute written into it. One the DTD supplied was written nowhere.
 * @param {HtmlPath} nodePath the accessor
 * @returns {readonly [string, number, number][] | undefined} each `[name, start, end]`
 */
const xmlInnerRanges = (nodePath) => {
	if (nodePath.type() !== NodeType.Element) return undefined;
	const start = nodePath.start();
	/** @type {[string, number, number][]} */
	const inner = [["opening tag", start, nodePath.endOf(Part.startTag)]];
	for (const attribute of _attributeList(nodePath.node)) {
		if (attribute.nameStart === -1) continue;
		inner.push(["attribute name", attribute.nameStart, attribute.nameEnd]);
		inner.push(["attribute value", attribute.valueStart, attribute.valueEnd]);
	}
	return inner;
};

/**
 * Hold the parser's ranges to what they claim about the document: XML owes all
 * of it — nesting is the grammar, so a node sits inside its parent and after
 * its earlier siblings.
 * @param {string} xml a document
 * @returns {Report[]} what the ranges broke
 */
const xmlSpans = (xml) =>
	spans({
		length: xml.length,
		contains: true,
		siblings: true,
		walk: pathSpanWalk({
			length: xml.length,
			run: (enter, exit) => {
				/** @type {Record<number, { enter: typeof enter, exit: typeof exit }>} */
				const visitors = {};
				for (const type of Object.values(NodeType)) {
					visitors[type] = { enter, exit };
				}
				new SourceProcessor().use(visitors).process(xml, { xml: true });
			},
			start: (nodePath) => nodePath.start(),
			end: (nodePath) => nodePath.end(),
			name: (nodePath) => NODE_TYPE_NAMES[nodePath.type()],
			inner: xmlInnerRanges
		})
	});

/**
 * @typedef {{ what: string, start: number, end: number, size: number, inElement: boolean }} NodeRun
 */

// Reparsing every node costs a parse of its own, so a document would cost its
// size times its depth. Each one is capped at this many times its own bytes.
const SLICE_BUDGET_FACTOR = 4;

/**
 * Every node in one document, in post-order with the size of its subtree.
 * @param {string} xml a document
 * @returns {{ runs: NodeRun[], doctype: string }} each node, children before parents, and the DOCTYPE the document declared
 */
const xmlNodeRuns = (xml) => {
	/** @type {NodeRun[]} */
	const runs = [];
	const found = { doctype: "" };
	/** @type {{ held: number, element: boolean }[]} */
	const stack = [{ held: 0, element: false }];
	/** @type {Record<number, { enter: (nodePath: HtmlPath) => void, exit: (nodePath: HtmlPath) => void }>} */
	const visitors = {};
	for (const type of Object.values(NodeType)) {
		visitors[type] = {
			enter: (nodePath) => {
				stack.push({ held: 0, element: type === NodeType.Element });
			},
			exit: (nodePath) => {
				const frame = /** @type {{ held: number, element: boolean }} */ (
					stack.pop()
				);
				if (type === NodeType.Doctype) found.doctype = nodePath.source();
				const parent = stack[stack.length - 1];
				const size = frame.held + 1;
				parent.held += size;
				runs.push({
					what: `${NODE_TYPE_NAMES[type]}${
						type === NodeType.Element ? `:${nodePath.name()}` : ""
					}`,
					start: nodePath.start(),
					end: nodePath.end(),
					size,
					inElement: parent.element
				});
			}
		};
	}
	new SourceProcessor().use(visitors).process(xml, { xml: true });
	return { runs, doctype: found.doctype };
};

/**
 * What one node's subtree says: its shape and the offsets inside it, read
 * against the node's own start.
 * @param {readonly NodeRun[]} runs every node in post-order
 * @param {number} at which one to digest
 * @param {number} origin the offset to read ranges against
 * @returns {string} its digest
 */
const runDigest = (runs, at, origin) => {
	const node = runs[at];
	/** @type {string[]} */
	const out = [];
	for (let index = at - node.size + 1; index <= at; index++) {
		const one = runs[index];
		out.push(`${one.what}[${one.start - origin},${one.end - origin})`);
	}
	return out.join(" ");
};

// Where a slice is read back: inside an element, after the document's own
// DOCTYPE, so what its internal subset declares still resolves.
const SLICE_WRAPPER_OPEN = "<_>";
const SLICE_WRAPPER_CLOSE = "</_>";

/**
 * Hold each node's own source to the node it came from: the bytes between its
 * offsets, read back inside an element after the document's DOCTYPE, give that
 * node back. A node outside the root element has no context to be read in.
 * @param {string} xml a document
 * @returns {{ reports: Report[], read: number, skipped: number, capped: number, repeats: number }} what broke, how many answered, and what was left out
 */
const xmlSlices = (xml) => {
	const { runs, doctype } = xmlNodeRuns(xml);
	/** @type {import("./compare-tools-harness").SliceCandidate[]} */
	const candidates = [];
	let budget = xml.length * SLICE_BUDGET_FACTOR;
	let capped = 0;
	let repeats = 0;
	let skipped = 0;
	/** @type {Set<string>} */
	const seen = new Set();
	for (let at = 0; at < runs.length; at++) {
		const node = runs[at];
		if (!node.inElement || node.end <= node.start) {
			skipped++;
			continue;
		}
		const said = runDigest(runs, at, node.start);
		if (seen.has(said)) {
			repeats++;
			continue;
		}
		seen.add(said);
		const text = xml.slice(node.start, node.end);
		if (text.length > budget) {
			capped++;
			continue;
		}
		budget -= text.length;
		candidates.push({
			what: node.what,
			said,
			reparse: () => {
				const prefix = `${doctype}${SLICE_WRAPPER_OPEN}`;
				const again = xmlNodeRuns(
					`${prefix}${text}${SLICE_WRAPPER_CLOSE}`
				).runs;
				const want = again.findIndex(
					(one) =>
						one.what === node.what &&
						one.start === prefix.length &&
						one.end === prefix.length + text.length
				);
				return want === -1 ? null : runDigest(again, want, prefix.length);
			}
		});
	}
	const answered = sliceRelation(candidates);
	return { ...answered, skipped: answered.skipped + skipped, capped, repeats };
};

/**
 * What one parse of a document amounts to: every node's type and range, every
 * name and value it derived, and the bytes the printer makes of it.
 * @param {string} xml a document
 * @returns {string} the digest
 */
const xmlPurityDigest = (xml) => {
	const digest = hasher();
	/** @type {Record<number, { enter: () => void, exit: (nodePath: HtmlPath) => void }>} */
	const visitors = {};
	/**
	 * @param {HtmlPath} nodePath the node leaving the walk
	 * @returns {void}
	 */
	const read = (nodePath) => {
		const type = nodePath.type();
		digest.update(
			`${NODE_TYPE_NAMES[type]}[${nodePath.start()},${nodePath.end()})`
		);
		if (type === NodeType.Element) {
			digest.update(`|<${nodePath.name()}>`);
			for (const [name, value] of decodedAttributes(nodePath)) {
				digest.update(`|${name}=${value}`);
			}
		} else if (type !== NodeType.Document) {
			digest.update(`|${nodePath.value()}`);
		}
		digest.update("\n");
	};
	for (const type of Object.values(NodeType)) {
		visitors[type] = { enter: () => {}, exit: read };
	}
	try {
		new SourceProcessor().use(visitors).process(xml, { xml: true });
		digest.update(printXml(xml, "minify"));
	} catch (error) {
		return `refused: ${/** @type {Error} */ (error).message}`;
	}
	return digest.hex();
};

// What the last sweep did not find, read by the report and by the gate.
/** @type {string[]} */
let _missingFixtures = [];

/**
 * The documents the invariants are swept over: the repo's own `.svg` and `.xml`
 * fixtures, the ones this script builds, and whatever the comparison installed.
 * @returns {{ corpus: [string, string][], missing: string[] }} `[label, xml]` for every document, and the installed ones not found
 */
const invariantFixtures = () => {
	/** @type {[string, string][]} */
	const out = [];
	for (const extension of [".svg", ".xml"]) {
		for (const file of collectFiles(
			path.join(ROOT, "test"),
			extension,
			SKIPPED_FIXTURE_DIRS
		)) {
			out.push([
				path.relative(ROOT, file).replace(/\\/g, "/"),
				fs.readFileSync(file, "utf8")
			]);
		}
	}
	out.push(["Editor-exported SVG (DTD entities)", EDITOR_SVG]);
	out.push(["Atom feed", atomFeed(8)]);
	out.push(["Maven POM", MAVEN_POM]);
	out.push(["XLIFF translation", XLIFF]);
	/** @type {string[]} */
	const missingFiles = [];
	for (const [label, file] of INSTALLED_DOCUMENTS) {
		const full = path.join(MODULES, file);
		if (fs.existsSync(full)) out.push([label, fs.readFileSync(full, "utf8")]);
		else missingFiles.push(label);
	}
	return { corpus: out, missing: missingFiles };
};

/**
 * What the sweep reports that the printer owes nothing for, each with the
 * reason. None today: an entry is added with its reason or not at all.
 * @type {readonly import("./compare-tools-harness").Expected[]}
 */
const EXPECTED = [];

/**
 * Sweep mode: hold the parser and printer to their own invariants and report
 * what they break. Nothing is installed; `agreement` reads against the
 * reference where the corpus brought it.
 * @param {(text: string) => void} write receives the report
 * @param {EXPECTED_ANY=} parseXml the reference's `parseXml`, when installed
 * @returns {number} how many distinct findings it named
 */
const invariants = (write, parseXml) => {
	const built = invariantFixtures();
	_missingFixtures = built.missing.filter((label) => wantedFixture(label));
	const corpus = built.corpus.filter(([label]) => wantedFixture(label));
	const presets = PRESETS.filter(([name]) => wantedPreset(name));
	const referenceHeld = agreementInvariant({
		wanted: wantedRelation("agreement"),
		referenceName: REFERENCE_PARSER,
		reference: () => {
			if (parseXml === undefined) throw new Error("not installed");
			return (xml) => parseXmlEvents(parseXml, xml);
		},
		tree: webpackTree,
		corpus,
		expected: EXPECTED,
		missing: _missingFixtures
	});
	// Filtered like the corpus is: an expectation for a relation, fixture or
	// preset this run was never going to reach matched nothing because nothing
	// asked it to, which is not the divergence having gone away.
	const groups = findingGroups(
		wantedExpectations(
			referenceHeld.expected,
			corpus.map(([label]) => label),
			presets.map(([name]) => name)
		)
	);
	referenceHeld.hold(groups);
	if (wantedRelation("spans")) {
		log(`reading ranges over ${corpus.length} documents …`);
		for (const [label, xml] of corpus) {
			for (const report of xmlSpans(xml)) groups.add(report, "parse", label);
		}
	}
	if (wantedRelation("slices")) {
		let read = 0;
		let skipped = 0;
		let capped = 0;
		let repeats = 0;
		for (const [label, xml] of corpus) {
			const answered = xmlSlices(xml);
			read += answered.read;
			skipped += answered.skipped;
			capped += answered.capped;
			repeats += answered.repeats;
			for (const report of answered.reports) groups.add(report, "parse", label);
		}
		log(
			`reparsed ${read} shapes in their own context (${skipped} out of context, ${repeats} repeats, ${capped} past the budget) …`
		);
	}
	if (wantedRelation("purity")) {
		const { reports, read } = purityRelation(
			corpus.map(([label, xml]) => ({
				what: label,
				digest: () => xmlPurityDigest(xml)
			}))
		);
		for (const report of reports) {
			groups.add(report, "parse", report.repro.trim());
		}
		log(`read ${read} documents twice over …`);
	}
	log(`sweeping ${corpus.length} documents under ${presets.length} presets …`);
	for (const [label, xml] of corpus) {
		for (const [preset, options, cssOptions] of presets) {
			const minify = printerFor(options);
			const { printed, reports } = wantedRelation("idempotence")
				? idempotence({
						minify,
						source: xml,
						says: (text) => canonical(text, cssOptions),
						repro: (minified, at) => idempotenceRepro(minify, minified, at)
					})
				: { printed: minify(xml), reports: [] };
			for (const report of reports) groups.add(report, preset, label);
			if (printed === null) continue;
			// What minifying keeps is what the document says, which a reader other
			// than the printer's own has to agree with.
			if (
				wantedRelation("meaning") &&
				canonical(printed, cssOptions) !== canonical(xml, cssOptions)
			) {
				groups.add(
					{
						relation: "meaning",
						what: "the minified document says something else",
						repro: `    ${oneLine(xml, 80)}`
					},
					preset,
					label
				);
			}
			// Under the first preset only, as the other comparisons ask it: whether
			// a spelling decides the output is the same question under every set.
			if (preset !== presets[0][0]) continue;
			for (const report of sweepRespellings(xml, printed)) {
				groups.add(report, preset, label);
			}
		}
	}
	if (wantedRelation("idempotence")) {
		let cut = 0;
		for (const [label, xml] of corpus) {
			for (const [where, source] of cutsAt(xml, XML_CUTS)) {
				cut++;
				for (const [preset, options, cssOptions] of presets) {
					const minify = printerFor(options);
					const { reports } = idempotence({
						minify,
						source,
						says: (text) => canonical(text, cssOptions),
						repro: (minified, at) => idempotenceRepro(minify, minified, at)
					});
					for (const report of reports) {
						groups.add(report, preset, `${label}, cut ${where}`);
					}
				}
			}
		}
		log(`… and ${cut} of them cut short inside a construct …`);
	}
	return groups.write(write);
};

/**
 * The sweep as a section of the comparison's own report.
 * @returns {Promise<number>} how many distinct findings it named
 */
const reportInvariants = async () => {
	process.stdout.write(
		"\ninvariants — what the parser and printer owe their own output\n"
	);
	/** @type {EXPECTED_ANY} */
	let parseXml;
	try {
		({ parseXml } = await importPackage(REFERENCE_PARSER));
	} catch (_error) {
		// Not installed yet: the sweep names it among what it did not find.
	}
	const found = invariants((text) => process.stdout.write(text), parseXml);
	process.stdout.write(missingReport(_missingFixtures));
	process.stdout.write(`\n${found} finding${found === 1 ? "" : "s"}\n`);
	return found;
};

const main = async () => {
	// Before the install: the relations are webpack's own, so they answer in
	// seconds whether or not there is anything to compare against yet.
	await reportInvariants();
	await setup();
	const { parseXml } = await importPackage("@rgrove/parse-xml");
	for (const [label, xml] of (await fixtures()).filter(([name]) =>
		wantedFixture(name)
	)) {
		const before = fingerprint(parseXml, xml);
		const agrees = agreement(REFERENCE_PARSER, TREE_READERS, xml);
		const input = await compress(Buffer.from(xml));
		process.stdout.write(
			`\n${label} — ${kb(input.raw)} (${kb(input.gzip)} gzip, ${kb(
				input.brotli
			)} brotli, ${kb(input.zstd)} zstd)${
				typeof before === "string"
					? `, not well-formed: ${before}`
					: `, ${[...before.elements.values()].reduce((a, b) => a + b, 0)} elements`
			}\n`
		);
		for (const stage of STAGES.filter(wantedStage)) {
			const tools = toolsFor(stage, xml);
			if (tools.length === 0) continue;
			process.stdout.write(
				stage === "parse"
					? `  ${"parse".padEnd(40)}${"ms".padStart(8)}${"cpu".padStart(
							7
						)}${"peak".padStart(9)}   agrees with ${REFERENCE_PARSER}\n`
					: `  ${stage.padEnd(40)}${"out".padStart(10)}${"gzip".padStart(
							9
						)}${"saved".padStart(8)}${"brotli".padStart(9)}${"zstd".padStart(
							9
						)}${"ms".padStart(7)}${"cpu".padStart(6)}${"peak".padStart(
							8
						)}${"2nd".padStart(7)}   differs\n`
			);
			for (const tool of tools) {
				const result = await measureInWorker(__filename, stage, tool.name, xml);
				if ("error" in result) {
					// A tool rejecting the document outright is a comparison result too.
					process.stdout.write(
						`  ${tool.name.padEnd(40)} rejects it: ${result.error}\n`
					);
					continue;
				}
				const cost = formatCost(result, tool.external);
				if (stage === "parse") {
					process.stdout.write(
						`  ${
							tool.name.padEnd(40) +
							cost.wall.padStart(8) +
							cost.cpu.padStart(7) +
							cost.peak.padStart(9)
						}   ${await agrees(tool.name)}\n`
					);
					process.stdout.write(formatProfile(result));
					continue;
				}
				const code = /** @type {string} */ (result.code);
				const after = fingerprint(parseXml, code);
				/** @type {string[]} */
				const notes = [];
				if (typeof after === "string") {
					if (typeof before !== "string") {
						notes.push(`not well-formed: ${after}`);
					}
				} else if (typeof before !== "string") {
					notes.push(
						...missing(before.elements, after.elements).map(
							(entry) => `<${entry}`
						),
						...missing(before.attributes, after.attributes)
					);
					if (before.text !== after.text) notes.push("text");
				}
				const out = await compress(Buffer.from(code));
				process.stdout.write(
					`  ${
						tool.name.padEnd(40) +
						kb(out.raw).padStart(10) +
						kb(out.gzip).padStart(9) +
						`${(100 - (out.gzip / input.gzip) * 100).toFixed(1)}%`.padStart(8) +
						kb(out.brotli).padStart(9) +
						kb(out.zstd).padStart(9) +
						cost.wall.padStart(7) +
						cost.cpu.padStart(6) +
						cost.peak.padStart(8) +
						formatSecond(result.second).padStart(7)
					}   ${notes.length === 0 ? "-" : notes.slice(0, 4).join(", ")}\n`
				);
				process.stdout.write(formatProfile(result));
			}
		}
	}
};

/**
 * `--invariants`: the relations alone, which need no install.
 * @returns {Promise<void>} resolves once the exit code is set
 */
const reportInvariantsOnly = async () => {
	process.exitCode = sweepExitCode(
		await reportInvariants(),
		_missingFixtures,
		process.argv
	);
};

// A lookup rather than a chain of ternaries: each entry point is bound where
// it is named, so reading the dispatch is reading the whole table. `--setup`
// installs the fixtures and stops, without paying for the comparison.
const RUNNERS = new Map(
	/** @type {[string, () => Promise<unknown>][]} */ ([
		["--measure", measure.bind(null, TOOLS)],
		["--setup", setup],
		["--invariants", reportInvariantsOnly]
	])
);

/**
 * Runs the entry point the mode names, defaulting to the whole comparison.
 * @param {string=} mode which entry point to run
 * @returns {Promise<unknown>} what that entry point resolves to
 */
const runMode = (mode = "") => (RUNNERS.get(mode) || main)();

// Only as the entry point, so a test can read the corpus below without running
// the comparison.
const started =
	require.main === module
		? runMode(sweepMode(process.argv))
		: Promise.resolve();

started.catch((error) => {
	log(String(error && error.stack ? error.stack : error));
	process.exitCode = 1;
});

module.exports = {
	ATOM_FEED: atomFeed(8),
	CACHE,
	EDITOR_SVG,
	INSTALLED_DOCUMENTS,
	MAVEN_POM,
	PRESETS,
	TREE_READERS,
	XLIFF,
	XML_CUTS,
	canonical,
	printerFor,
	runMode,
	toolsFor
};
