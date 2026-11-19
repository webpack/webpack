"use strict";

const MinimizerPlugin = require("minimizer-webpack-plugin");

/** @type {(name: string, options: import("../../../../").Configuration) => import("../../../../").Configuration} */
const config = (name, options) => ({
	mode: "production",
	// Chrome 50 still needs `-webkit-user-select`, so the stylesheet shows the
	// target reached the CSS minifier an SVG's `<style>` is handed to.
	target: "browserslist:chrome 50",
	output: {
		pathinfo: false,
		filename: `${name}.js`,
		assetModuleFilename: `${name}[ext]`
	},
	module: {
		rules: [
			{
				test: /attribute-dependency\.svg$/,
				type: "asset/resource",
				generator: { filename: "attribute-dependency.svg" }
			},
			{
				test: /animated\.svg$/,
				type: "asset/resource",
				generator: { filename: "animated.svg" }
			}
		]
	},
	...options,
	optimization: { minimize: true, minimizer: ["..."], ...options.optimization }
});

module.exports = [
	// futureDefaults turns the XML minimizer on.
	config("future", { experiments: { futureDefaults: true } }),
	// `false` turns it back off.
	config("disabled", {
		experiments: { futureDefaults: true },
		optimization: { minimizeOptions: { xml: false } }
	}),
	// Without futureDefaults an object turns it on.
	config("object", { optimization: { minimizeOptions: { xml: {} } } }),
	// And absent, it stays off.
	config("absent", {}),
	// Every type turned off: no minimizer is applied at all.
	config("none", {
		experiments: { futureDefaults: true },
		optimization: {
			minimizeOptions: {
				javascript: false,
				css: false,
				html: false,
				json: false,
				xml: false
			}
		}
	}),
	// A minimizer of the user's own matching every type keeps them all.
	config("claimed", {
		experiments: { futureDefaults: true },
		optimization: {
			minimize: true,
			minimizer: [
				new MinimizerPlugin({
					test: /\.(?:css|html|json|svg)$/,
					parallel: false,
					minify: () => ({ code: "<svg/>" })
				}),
				"..."
			]
		}
	}),
	config("sorted", {
		optimization: { minimizeOptions: { xml: { sortAttributes: true } } }
	}),
	config("cleaned", {
		entry: "./editor.js",
		optimization: {
			minimizeOptions: {
				xml: {
					removeMetadata: true,
					removeEditorData: true,
					sortAttributes: true
				}
			}
		}
	}),
	...[false, true].map((collapseWhitespace) =>
		config(collapseWhitespace ? "whitespace" : "attributes", {
			entry: "./editor.js",
			optimization: {
				minimizeOptions: {
					xml: {
						collapseWhitespace,
						removeMetadata: true,
						removeEditorData: true,
						removeEmptyAttributes: true,
						removeUnusedNamespaces: true,
						sortAttributes: true
					}
				}
			}
		})
	),
	config("numbers", {
		entry: "./numbers.js",
		optimization: {
			minimizeOptions: {
				xml: {
					shortenNumbers: true,
					sortAttributes: true,
					collapseWhitespace: true
				}
			}
		}
	}),
	...[
		// Each spelling switch on its own, the other two off.
		{
			name: "colors",
			xml: { shortenNumbers: false, shortenPathData: false }
		},
		{ name: "paths", xml: { shortenNumbers: false, shortenColors: false } },
		{
			name: "containers",
			xml: { removeEmptyElements: true, collapseWhitespace: true }
		},
		{
			name: "compact",
			xml: {
				shortenColors: true,
				shortenNumbers: true,
				shortenPathData: true,
				removeEmptyElements: true,
				collapseWhitespace: true,
				removeEmptyAttributes: true,
				removeUnusedNamespaces: true,
				sortAttributes: true
			}
		}
	].map(({ name, xml }) =>
		config(name, {
			entry: "./compact.js",
			optimization: { minimizeOptions: { xml } }
		})
	),
	config("symbols", {
		entry: "./symbols.js",
		optimization: {
			minimizeOptions: {
				xml: { sortSymbols: true, convertShapes: true, sortAttributes: true }
			}
		}
	}),
	config("constraints", {
		entry: "./constraints.js",
		optimization: {
			minimizeOptions: {
				xml: {
					shortenColors: true,
					shortenNumbers: true,
					shortenPathData: true,
					removeMetadata: true,
					removeEditorData: true,
					sortSymbols: true,
					convertShapes: true,
					removeEmptyElements: true
				}
			}
		}
	}),
	config("optional", {
		entry: "./optional.js",
		optimization: {
			minimizeOptions: {
				xml: {
					removeScripts: true,
					removeTitles: true,
					removeDescriptions: true,
					removeRasterImages: true,
					removeXlink: true,
					removeDimensions: true,
					removeDoctype: true,
					cleanupIds: true,
					removeHiddenElements: true,
					removeUnusedNamespaces: true,
					collapseWhitespace: true
				}
			}
		}
	}),
	// `false` drops the legal notice "some" keeps, and "all" keeps every comment.
	...[
		{ name: "uncommented", comments: false },
		{ name: "commented", comments: "all" }
	].map(({ name, comments }) =>
		config(name, {
			entry: "./comments.js",
			optimization: { minimizeOptions: { xml: { comments } } }
		})
	),
	// Recomposed within the precision, a matrix becomes a rotation about a point.
	config("transforms", {
		entry: "./transforms.js",
		optimization: {
			minimizeOptions: {
				xml: { shortenNumbers: true, convertTransforms: true }
			}
		}
	}),
	// A path wholly outside the root `viewBox` goes.
	config("offcanvas", {
		entry: "./offcanvas.js",
		optimization: { minimizeOptions: { xml: { removeOffCanvasPaths: true } } }
	}),
	// Paths whose bounds do not overlap merge into one.
	config("disjoint", {
		entry: "./disjoint.js",
		optimization: { minimizeOptions: { xml: { mergeDisjointPaths: true } } }
	}),
	// A path's transform goes into its points, its stroke widened to match.
	config("applied", {
		entry: "./applied.js",
		optimization: {
			minimizeOptions: {
				xml: {
					shortenNumbers: true,
					shortenPathData: true,
					applyTransforms: true
				}
			}
		}
	}),
	// A curve that keeps to one circle becomes an arc of it.
	config("arcs", {
		entry: "./arcs.js",
		optimization: {
			minimizeOptions: {
				xml: {
					shortenNumbers: true,
					shortenPathData: true,
					convertCurvesToArcs: true
				}
			}
		}
	}),
	// An element no SVG specification defines goes with its content.
	config("unknown", {
		entry: "./unknown.js",
		optimization: { minimizeOptions: { xml: { removeUnknownElements: true } } }
	}),
	// Scripts and event handlers reach the JavaScript minifier, styles the CSS one.
	config("scripts", {
		entry: "./scripts.js",
		optimization: { minimizeOptions: { xml: { collapseWhitespace: true } } }
	}),
	// What svgo's lossier switches do, each opted into.
	config("lossy", {
		entry: "./lossy.js",
		optimization: {
			minimizeOptions: {
				xml: {
					shortenNumbers: true,
					shortenPathData: true,
					convertTransforms: true,
					anglePrecision: 1,
					convertCurvesToArcs: "loose",
					inlineStyles: true,
					inlineStylePseudoClasses: [":hover"],
					removeUnknownAttributes: true,
					removeDeprecatedAttributes: true,
					collapseAttributeWhitespace: true
				}
			}
		}
	}),
	config("structure", {
		entry: "./structure.js",
		optimization: {
			minimizeOptions: {
				xml: {
					cleanupStructure: true,
					reusePaths: true,
					mergePaths: true,
					sortDefinitions: true,
					convertShapes: true,
					shortenPathData: true,
					shortenNumbers: true,
					shortenColors: true
				}
			}
		}
	})
];
