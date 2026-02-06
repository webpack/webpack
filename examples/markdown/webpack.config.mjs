/** @typedef {import("webpack").LoaderContext<void>} LoaderContext */

import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

/** @type {import("webpack").Configuration} */
const config = {
	// mode: "development" || "production",
	module: {
		rules: [
			// To convert Markdown syntax to HTML
			{
				test: /\.(md|markdown|mdown|mkdn|mkd|mdwn|mkdown|ron)$/i,
				exclude: /(raw-to-string|raw-to-uint8-array)\.md/,
				loader: "html-loader",
				options: {
					preprocessor:
						/**
						 * @param {string} content content
						 * @param {LoaderContext} loaderContext loader context
						 * @returns {Promise<string>} result
						 */
						async (content, loaderContext) => {
							const file = await unified()
								.use(remarkParse)
								.use(remarkFrontmatter)
								.use(remarkGfm)
								.use(remarkRehype)
								.use(rehypeSanitize)
								.use(rehypeStringify)
								.process(content);

							return String(file);
						}
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
