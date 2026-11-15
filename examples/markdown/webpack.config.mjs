import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

const markdownToHtml = unified()
	.use(remarkParse)
	.use(remarkFrontmatter)
	.use(remarkGfm)
	.use(remarkRehype)
	.use(rehypeSanitize)
	.use(rehypeStringify);

/** @type {import("webpack").Configuration} */
const config = {
	// mode: "development" || "production",
	module: {
		rules: [
			// To convert Markdown syntax to HTML: webpack's built-in HTML support
			// parses the converted markup, so images and other URLs it references
			// are bundled and rewritten — no `html-loader` needed
			{
				test: /\.(md|markdown|mdown|mkdn|mkd|mdwn|mkdown|ron)$/i,
				exclude: /(raw-to-string|raw-to-uint8-array)\.md/,
				type: "html",
				parser: {
					/**
					 * Runs before the HTML is parsed for dependencies
					 * @param {string} source the Markdown source
					 * @returns {string} the HTML it converts to
					 */
					template: (source) => String(markdownToHtml.processSync(source)),
					// The result is a fragment, not a full document
					as: "template"
				},
				generator: {
					// Export the HTML as a string instead of emitting a page
					extract: false
				}
			},
			// Import Markdown as a string
			{
				test: /raw-to-string\.md$/,
				type: "asset/source"
			}
		]
	}
};

export default config;
