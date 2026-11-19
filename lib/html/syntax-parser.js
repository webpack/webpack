/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Raj Aryan (based on SWC parser by Alexander Akait)
*/

"use strict";

const {
	CSS_TYPE,
	HTML_TYPE,
	JAVASCRIPT_TYPE
} = require("../module/ModuleSourceTypeConstants");

const LocConverter = require("../util/LocConverter");
const SourceProcessor = require("../util/SourceProcessor");
const {
	EMBEDDED_STYLESHEET,
	buildDataURI,
	readEmbeddedDataURI
} = require("../util/dataURL");
const {
	haltVisitors,
	haltVisitorsAgain,
	resumeVisitors
} = require("../util/haltVisitors");

const {
	ACKNOWLEDGED_NON_VOID,
	ADDRESS_DIV_P,
	APPLET_MARQUEE_OBJECT,
	BLOCK_END,
	BLOCK_LEVEL_ELEMENTS,
	BLOCK_START,
	BODY_HTML_BR,
	BODY_START_KEPT_BEFORE,
	BOOLEAN_ATTRIBUTES,
	CAPTION_IGNORED_ENDS,
	CAPTION_TABLE_STARTS,
	CELL_IGNORED_ENDS,
	CLEAR_TABLE,
	CLEAR_TABLE_BODY,
	CLEAR_TABLE_ROW,
	COMMA_LIST_ATTRIBUTES,
	DOM_TOKEN_LIST_ATTRIBUTES,
	EMPTY_ELEMENT_DROPPED,
	EMPTY_METADATA_ELEMENTS,
	EMPTY_REMOVABLE_ATTRIBUTES,
	END_TAG_OPTIONAL_AT_BODY_END,
	ENUMERATED_ATTRIBUTE_NAMES,
	ENUMERATED_KEYWORDS,
	EVENT_HANDLER_ATTRIBUTES,
	FONT_BREAKOUT_ATTRS,
	FOREIGN_ATTR_NS,
	FOREIGN_BREAKOUT,
	FORMATTING,
	FOSTER_KEPT,
	HEADING,
	HEAD_BODY_HTML_BR,
	HEAD_ELEMENTS,
	HEAD_VOID_ELEMENTS,
	HTML_SCOPE,
	IGNORED_BODY_TABLE_STARTS,
	IMPLIED,
	IMPLIED_THOROUGH,
	INTEGER_ATTRIBUTES,
	INVALID_VALUE_DEFAULT_DIFFERS,
	IN_HEAD_NOSCRIPT_PASSTHROUGH,
	IN_TABLE_IGNORED_ENDS,
	JAVASCRIPT_SCRIPT_TYPES,
	LEADING_NEWLINE_ELEMENTS,
	LITERAL_TEXT_PARENTS,
	MATHML_SPECIAL,
	MATHML_TEXT_INTEGRATION,
	NOFRAMES_STYLE_NOSCRIPT,
	NO_DECODE_TEXT,
	NO_END_TAG,
	OPTIONAL_END_TAG_AT_END,
	OPTIONAL_END_TAG_FOLLOWERS,
	OPTIONAL_END_TAG_UNLESS_TRAILING_NODE,
	PARAM_SOURCE_TRACK,
	P_ENDS_ON_PARENT_END_TAG,
	QUIRKY_EXACT,
	QUIRKY_PREFIXES,
	RAW_TEXT_ELEMENTS,
	REDUNDANT_DEFAULT_ATTRIBUTES,
	REDUNDANT_TYPE_ATTRIBUTES,
	RESERVED_ELEMENT_NAMES,
	REWRITABLE_ATTRIBUTES,
	ROW_IGNORED_ENDS,
	ROW_TRIGGER_STARTS,
	SCOPE_ENDED_BY,
	SHADOW_HOSTS,
	SHELL_ELEMENTS,
	SIGNED_INTEGER_ATTRIBUTES,
	SPECIAL,
	SRCSET_ATTRIBUTES,
	STYLE_SCRIPT_TEMPLATE,
	SVG_ASPECT_RATIO_ELEMENTS,
	SVG_ATTRIBUTES,
	SVG_ATTR_ADJUST,
	SVG_COLOR_ATTRIBUTES,
	SVG_DEFINITION_ELEMENTS,
	SVG_EDITOR_NAMESPACES,
	SVG_ELEMENTS,
	SVG_EMPTY_CONTAINERS,
	SVG_EMPTY_DRAWING_CONTAINERS,
	SVG_GEOMETRY_ELEMENTS,
	SVG_GROUP_ATTRIBUTE_TARGETS,
	SVG_GROUP_INERT_ATTRIBUTES,
	SVG_HIDDEN_ELEMENT_TARGETS,
	SVG_INHERITED_CLEANUP_ATTRIBUTES,
	SVG_INHERITED_INITIAL_VALUES,
	SVG_LENGTH_UNITS,
	SVG_LOCAL_DEFAULTS,
	SVG_NUMERIC_ATTRIBUTES,
	SVG_PATH_ARGUMENTS,
	SVG_PRESENTATION_NUMERIC_ATTRIBUTES,
	SVG_SHAPE_ZERO_ATTRIBUTES,
	SVG_SPECIAL,
	SVG_STRUCTURAL_PRESENTATION_VALUES,
	SVG_TAG_ADJUST,
	SVG_TRANSFORM_ARGUMENTS,
	SVG_TRANSFORM_FOLD_TARGETS,
	SVG_UNUSED_DEFINITION_CONTENT,
	SVG_WHITESPACE_CONTAINERS,
	TABLE_CONTEXT,
	TABLE_SCOPE_STOP,
	TBODY_GROUP,
	TBODY_IGNORED_ENDS,
	TBODY_TRIGGER_STARTS,
	TD_TH,
	TD_TH_TR,
	TEMPLATE_START_TAG_MODES: TEMPLATE_START_TAG_MODE_NAMES,
	TOKEN_LIST_ATTRIBUTES,
	TRANSPARENT_IMPLIED_ELEMENTS,
	URL_ATTRIBUTES,
	VOID,
	VOID_FORMATTING,
	XML_ID_LIST_ATTRIBUTES
} = require("./data");
/** @typedef {import("./syntax-printer").CompiledVisitorMap} CompiledVisitorMap */
/** @typedef {import("../util/SourceProcessor").VisitorFn<HtmlPath>} VisitorFn */
/** @typedef {import("./syntax-printer").HtmlTransformOptions} HtmlTransformOptions */
/** @typedef {import("./syntax-printer").HtmlProcessOptions} HtmlProcessOptions */
/** @typedef {import("./syntax-printer").PrintContext} PrintContext */

const { deferredWrite, declineDeferredWrites } = SourceProcessor;

/** @import { OutputHtmlOptions } from "../../declarations/WebpackOptions" */

/**
 * Renders one nested body this document embeds - an inline `<style>`, every
 * `style=""` (handed over as a whole stylesheet), a `<script>` holding JSON or
 * JavaScript, every event handler attribute (`as` says it is a function body
 * rather than a script), an `<svg>` subtree (`as: "foreign-element"`), and the
 * document an `<iframe srcdoc>` holds. Returning the input unchanged declines
 * it. Synchronous: it is called from inside the print walk, so a caller with an
 * async minifier collects the bodies in a walk-only pass first and looks the
 * results up here.
 *
 * What comes back is spliced in as-is, so an `<svg>` renderer must return
 * markup - everything else is literal text. A `<style>` / `<script>` body may
 * therefore carry its own `sourceMappingURL`, which is the only way a map
 * reaches inline content; nothing else here can hold one.
 * @typedef {(source: string, info: { type: string, hostType: string, as?: string }) => string | undefined} EmbeddedSourceRenderer
 */

/**
 * One embedded source recorded for a caller that can only answer
 * asynchronously, and the text to print once it has.
 * @typedef {import("../util/dataURL").DeferredEmbeddedSource} DeferredEmbeddedSource
 */

// A `style=""` holds a block's contents, not a stylesheet. It is still CSS, so
// it is offered as CSS - with `as` saying which production it is, the same
// vocabulary `module.parser.css.as` uses.
const BLOCK_CONTENTS = "block-contents";
// An `onclick=""` is that shape one language over: JavaScript, but a function
// body - the production the `return` cancelling an event is written in.
const EVENT_HANDLER = "event-handler";
// An `<svg>` subtree is SVG, but an element of the HTML document holding it
// rather than a standalone `.svg`, which may be read without a namespace.
const FOREIGN_ELEMENT = "foreign-element";

// cspell:ignore apos notpre noncharacter noncharacters DFFF FFFE CCLS ALNUM

// #region html entities
// Auto-generated by `tooling/generate-html-data.js` from
// `tooling/html-entities.json` - run `yarn fix:special` to refresh.

// WHATWG named character references, keyed without the leading `&`: the keys
// that do not end in `;` are the legacy names matching unterminated.

// Null-prototype, so `&toString;` cannot reach an inherited `Object.prototype`
// key and read back as a matched reference.

// prettier-ignore
// cspell:disable-next-line
const HTML_ENTITIES = /** @type {Readonly<Record<string, string>>} */ (Object.freeze(Object.assign(Object.create(null), {"AElig":"Æ","AElig;":"Æ","AMP":"&","AMP;":"&","Aacute":"Á","Aacute;":"Á","Abreve;":"\u0102","Acirc":"Â","Acirc;":"Â","Acy;":"\u0410","Afr;":"\uD835\uDD04","Agrave":"À","Agrave;":"À","Alpha;":"\u0391","Amacr;":"\u0100","And;":"\u2A53","Aogon;":"\u0104","Aopf;":"\uD835\uDD38","ApplyFunction;":"\u2061","Aring":"Å","Aring;":"Å","Ascr;":"\uD835\uDC9C","Assign;":"\u2254","Atilde":"Ã","Atilde;":"Ã","Auml":"Ä","Auml;":"Ä","Backslash;":"\u2216","Barv;":"\u2AE7","Barwed;":"\u2306","Bcy;":"\u0411","Because;":"\u2235","Bernoullis;":"\u212C","Beta;":"\u0392","Bfr;":"\uD835\uDD05","Bopf;":"\uD835\uDD39","Breve;":"\u02D8","Bscr;":"\u212C","Bumpeq;":"\u224E","CHcy;":"\u0427","COPY":"©","COPY;":"©","Cacute;":"\u0106","Cap;":"\u22D2","CapitalDifferentialD;":"\u2145","Cayleys;":"\u212D","Ccaron;":"\u010C","Ccedil":"Ç","Ccedil;":"Ç","Ccirc;":"\u0108","Cconint;":"\u2230","Cdot;":"\u010A","Cedilla;":"¸","CenterDot;":"·","Cfr;":"\u212D","Chi;":"\u03A7","CircleDot;":"\u2299","CircleMinus;":"\u2296","CirclePlus;":"\u2295","CircleTimes;":"\u2297","ClockwiseContourIntegral;":"\u2232","CloseCurlyDoubleQuote;":"\u201D","CloseCurlyQuote;":"\u2019","Colon;":"\u2237","Colone;":"\u2A74","Congruent;":"\u2261","Conint;":"\u222F","ContourIntegral;":"\u222E","Copf;":"\u2102","Coproduct;":"\u2210","CounterClockwiseContourIntegral;":"\u2233","Cross;":"\u2A2F","Cscr;":"\uD835\uDC9E","Cup;":"\u22D3","CupCap;":"\u224D","DD;":"\u2145","DDotrahd;":"\u2911","DJcy;":"\u0402","DScy;":"\u0405","DZcy;":"\u040F","Dagger;":"\u2021","Darr;":"\u21A1","Dashv;":"\u2AE4","Dcaron;":"\u010E","Dcy;":"\u0414","Del;":"\u2207","Delta;":"\u0394","Dfr;":"\uD835\uDD07","DiacriticalAcute;":"´","DiacriticalDot;":"\u02D9","DiacriticalDoubleAcute;":"\u02DD","DiacriticalGrave;":"`","DiacriticalTilde;":"\u02DC","Diamond;":"\u22C4","DifferentialD;":"\u2146","Dopf;":"\uD835\uDD3B","Dot;":"¨","DotDot;":"\u20DC","DotEqual;":"\u2250","DoubleContourIntegral;":"\u222F","DoubleDot;":"¨","DoubleDownArrow;":"\u21D3","DoubleLeftArrow;":"\u21D0","DoubleLeftRightArrow;":"\u21D4","DoubleLeftTee;":"\u2AE4","DoubleLongLeftArrow;":"\u27F8","DoubleLongLeftRightArrow;":"\u27FA","DoubleLongRightArrow;":"\u27F9","DoubleRightArrow;":"\u21D2","DoubleRightTee;":"\u22A8","DoubleUpArrow;":"\u21D1","DoubleUpDownArrow;":"\u21D5","DoubleVerticalBar;":"\u2225","DownArrow;":"\u2193","DownArrowBar;":"\u2913","DownArrowUpArrow;":"\u21F5","DownBreve;":"\u0311","DownLeftRightVector;":"\u2950","DownLeftTeeVector;":"\u295E","DownLeftVector;":"\u21BD","DownLeftVectorBar;":"\u2956","DownRightTeeVector;":"\u295F","DownRightVector;":"\u21C1","DownRightVectorBar;":"\u2957","DownTee;":"\u22A4","DownTeeArrow;":"\u21A7","Downarrow;":"\u21D3","Dscr;":"\uD835\uDC9F","Dstrok;":"\u0110","ENG;":"\u014A","ETH":"Ð","ETH;":"Ð","Eacute":"É","Eacute;":"É","Ecaron;":"\u011A","Ecirc":"Ê","Ecirc;":"Ê","Ecy;":"\u042D","Edot;":"\u0116","Efr;":"\uD835\uDD08","Egrave":"È","Egrave;":"È","Element;":"\u2208","Emacr;":"\u0112","EmptySmallSquare;":"\u25FB","EmptyVerySmallSquare;":"\u25AB","Eogon;":"\u0118","Eopf;":"\uD835\uDD3C","Epsilon;":"\u0395","Equal;":"\u2A75","EqualTilde;":"\u2242","Equilibrium;":"\u21CC","Escr;":"\u2130","Esim;":"\u2A73","Eta;":"\u0397","Euml":"Ë","Euml;":"Ë","Exists;":"\u2203","ExponentialE;":"\u2147","Fcy;":"\u0424","Ffr;":"\uD835\uDD09","FilledSmallSquare;":"\u25FC","FilledVerySmallSquare;":"\u25AA","Fopf;":"\uD835\uDD3D","ForAll;":"\u2200","Fouriertrf;":"\u2131","Fscr;":"\u2131","GJcy;":"\u0403","GT":">","GT;":">","Gamma;":"\u0393","Gammad;":"\u03DC","Gbreve;":"\u011E","Gcedil;":"\u0122","Gcirc;":"\u011C","Gcy;":"\u0413","Gdot;":"\u0120","Gfr;":"\uD835\uDD0A","Gg;":"\u22D9","Gopf;":"\uD835\uDD3E","GreaterEqual;":"\u2265","GreaterEqualLess;":"\u22DB","GreaterFullEqual;":"\u2267","GreaterGreater;":"\u2AA2","GreaterLess;":"\u2277","GreaterSlantEqual;":"\u2A7E","GreaterTilde;":"\u2273","Gscr;":"\uD835\uDCA2","Gt;":"\u226B","HARDcy;":"\u042A","Hacek;":"\u02C7","Hat;":"^","Hcirc;":"\u0124","Hfr;":"\u210C","HilbertSpace;":"\u210B","Hopf;":"\u210D","HorizontalLine;":"\u2500","Hscr;":"\u210B","Hstrok;":"\u0126","HumpDownHump;":"\u224E","HumpEqual;":"\u224F","IEcy;":"\u0415","IJlig;":"\u0132","IOcy;":"\u0401","Iacute":"Í","Iacute;":"Í","Icirc":"Î","Icirc;":"Î","Icy;":"\u0418","Idot;":"\u0130","Ifr;":"\u2111","Igrave":"Ì","Igrave;":"Ì","Im;":"\u2111","Imacr;":"\u012A","ImaginaryI;":"\u2148","Implies;":"\u21D2","Int;":"\u222C","Integral;":"\u222B","Intersection;":"\u22C2","InvisibleComma;":"\u2063","InvisibleTimes;":"\u2062","Iogon;":"\u012E","Iopf;":"\uD835\uDD40","Iota;":"\u0399","Iscr;":"\u2110","Itilde;":"\u0128","Iukcy;":"\u0406","Iuml":"Ï","Iuml;":"Ï","Jcirc;":"\u0134","Jcy;":"\u0419","Jfr;":"\uD835\uDD0D","Jopf;":"\uD835\uDD41","Jscr;":"\uD835\uDCA5","Jsercy;":"\u0408","Jukcy;":"\u0404","KHcy;":"\u0425","KJcy;":"\u040C","Kappa;":"\u039A","Kcedil;":"\u0136","Kcy;":"\u041A","Kfr;":"\uD835\uDD0E","Kopf;":"\uD835\uDD42","Kscr;":"\uD835\uDCA6","LJcy;":"\u0409","LT":"<","LT;":"<","Lacute;":"\u0139","Lambda;":"\u039B","Lang;":"\u27EA","Laplacetrf;":"\u2112","Larr;":"\u219E","Lcaron;":"\u013D","Lcedil;":"\u013B","Lcy;":"\u041B","LeftAngleBracket;":"\u27E8","LeftArrow;":"\u2190","LeftArrowBar;":"\u21E4","LeftArrowRightArrow;":"\u21C6","LeftCeiling;":"\u2308","LeftDoubleBracket;":"\u27E6","LeftDownTeeVector;":"\u2961","LeftDownVector;":"\u21C3","LeftDownVectorBar;":"\u2959","LeftFloor;":"\u230A","LeftRightArrow;":"\u2194","LeftRightVector;":"\u294E","LeftTee;":"\u22A3","LeftTeeArrow;":"\u21A4","LeftTeeVector;":"\u295A","LeftTriangle;":"\u22B2","LeftTriangleBar;":"\u29CF","LeftTriangleEqual;":"\u22B4","LeftUpDownVector;":"\u2951","LeftUpTeeVector;":"\u2960","LeftUpVector;":"\u21BF","LeftUpVectorBar;":"\u2958","LeftVector;":"\u21BC","LeftVectorBar;":"\u2952","Leftarrow;":"\u21D0","Leftrightarrow;":"\u21D4","LessEqualGreater;":"\u22DA","LessFullEqual;":"\u2266","LessGreater;":"\u2276","LessLess;":"\u2AA1","LessSlantEqual;":"\u2A7D","LessTilde;":"\u2272","Lfr;":"\uD835\uDD0F","Ll;":"\u22D8","Lleftarrow;":"\u21DA","Lmidot;":"\u013F","LongLeftArrow;":"\u27F5","LongLeftRightArrow;":"\u27F7","LongRightArrow;":"\u27F6","Longleftarrow;":"\u27F8","Longleftrightarrow;":"\u27FA","Longrightarrow;":"\u27F9","Lopf;":"\uD835\uDD43","LowerLeftArrow;":"\u2199","LowerRightArrow;":"\u2198","Lscr;":"\u2112","Lsh;":"\u21B0","Lstrok;":"\u0141","Lt;":"\u226A","Map;":"\u2905","Mcy;":"\u041C","MediumSpace;":"\u205F","Mellintrf;":"\u2133","Mfr;":"\uD835\uDD10","MinusPlus;":"\u2213","Mopf;":"\uD835\uDD44","Mscr;":"\u2133","Mu;":"\u039C","NJcy;":"\u040A","Nacute;":"\u0143","Ncaron;":"\u0147","Ncedil;":"\u0145","Ncy;":"\u041D","NegativeMediumSpace;":"\u200B","NegativeThickSpace;":"\u200B","NegativeThinSpace;":"\u200B","NegativeVeryThinSpace;":"\u200B","NestedGreaterGreater;":"\u226B","NestedLessLess;":"\u226A","NewLine;":"\n","Nfr;":"\uD835\uDD11","NoBreak;":"\u2060","NonBreakingSpace;":" ","Nopf;":"\u2115","Not;":"\u2AEC","NotCongruent;":"\u2262","NotCupCap;":"\u226D","NotDoubleVerticalBar;":"\u2226","NotElement;":"\u2209","NotEqual;":"\u2260","NotEqualTilde;":"\u2242\u0338","NotExists;":"\u2204","NotGreater;":"\u226F","NotGreaterEqual;":"\u2271","NotGreaterFullEqual;":"\u2267\u0338","NotGreaterGreater;":"\u226B\u0338","NotGreaterLess;":"\u2279","NotGreaterSlantEqual;":"\u2A7E\u0338","NotGreaterTilde;":"\u2275","NotHumpDownHump;":"\u224E\u0338","NotHumpEqual;":"\u224F\u0338","NotLeftTriangle;":"\u22EA","NotLeftTriangleBar;":"\u29CF\u0338","NotLeftTriangleEqual;":"\u22EC","NotLess;":"\u226E","NotLessEqual;":"\u2270","NotLessGreater;":"\u2278","NotLessLess;":"\u226A\u0338","NotLessSlantEqual;":"\u2A7D\u0338","NotLessTilde;":"\u2274","NotNestedGreaterGreater;":"\u2AA2\u0338","NotNestedLessLess;":"\u2AA1\u0338","NotPrecedes;":"\u2280","NotPrecedesEqual;":"\u2AAF\u0338","NotPrecedesSlantEqual;":"\u22E0","NotReverseElement;":"\u220C","NotRightTriangle;":"\u22EB","NotRightTriangleBar;":"\u29D0\u0338","NotRightTriangleEqual;":"\u22ED","NotSquareSubset;":"\u228F\u0338","NotSquareSubsetEqual;":"\u22E2","NotSquareSuperset;":"\u2290\u0338","NotSquareSupersetEqual;":"\u22E3","NotSubset;":"\u2282\u20D2","NotSubsetEqual;":"\u2288","NotSucceeds;":"\u2281","NotSucceedsEqual;":"\u2AB0\u0338","NotSucceedsSlantEqual;":"\u22E1","NotSucceedsTilde;":"\u227F\u0338","NotSuperset;":"\u2283\u20D2","NotSupersetEqual;":"\u2289","NotTilde;":"\u2241","NotTildeEqual;":"\u2244","NotTildeFullEqual;":"\u2247","NotTildeTilde;":"\u2249","NotVerticalBar;":"\u2224","Nscr;":"\uD835\uDCA9","Ntilde":"Ñ","Ntilde;":"Ñ","Nu;":"\u039D","OElig;":"\u0152","Oacute":"Ó","Oacute;":"Ó","Ocirc":"Ô","Ocirc;":"Ô","Ocy;":"\u041E","Odblac;":"\u0150","Ofr;":"\uD835\uDD12","Ograve":"Ò","Ograve;":"Ò","Omacr;":"\u014C","Omega;":"\u03A9","Omicron;":"\u039F","Oopf;":"\uD835\uDD46","OpenCurlyDoubleQuote;":"\u201C","OpenCurlyQuote;":"\u2018","Or;":"\u2A54","Oscr;":"\uD835\uDCAA","Oslash":"Ø","Oslash;":"Ø","Otilde":"Õ","Otilde;":"Õ","Otimes;":"\u2A37","Ouml":"Ö","Ouml;":"Ö","OverBar;":"\u203E","OverBrace;":"\u23DE","OverBracket;":"\u23B4","OverParenthesis;":"\u23DC","PartialD;":"\u2202","Pcy;":"\u041F","Pfr;":"\uD835\uDD13","Phi;":"\u03A6","Pi;":"\u03A0","PlusMinus;":"±","Poincareplane;":"\u210C","Popf;":"\u2119","Pr;":"\u2ABB","Precedes;":"\u227A","PrecedesEqual;":"\u2AAF","PrecedesSlantEqual;":"\u227C","PrecedesTilde;":"\u227E","Prime;":"\u2033","Product;":"\u220F","Proportion;":"\u2237","Proportional;":"\u221D","Pscr;":"\uD835\uDCAB","Psi;":"\u03A8","QUOT":"\"","QUOT;":"\"","Qfr;":"\uD835\uDD14","Qopf;":"\u211A","Qscr;":"\uD835\uDCAC","RBarr;":"\u2910","REG":"®","REG;":"®","Racute;":"\u0154","Rang;":"\u27EB","Rarr;":"\u21A0","Rarrtl;":"\u2916","Rcaron;":"\u0158","Rcedil;":"\u0156","Rcy;":"\u0420","Re;":"\u211C","ReverseElement;":"\u220B","ReverseEquilibrium;":"\u21CB","ReverseUpEquilibrium;":"\u296F","Rfr;":"\u211C","Rho;":"\u03A1","RightAngleBracket;":"\u27E9","RightArrow;":"\u2192","RightArrowBar;":"\u21E5","RightArrowLeftArrow;":"\u21C4","RightCeiling;":"\u2309","RightDoubleBracket;":"\u27E7","RightDownTeeVector;":"\u295D","RightDownVector;":"\u21C2","RightDownVectorBar;":"\u2955","RightFloor;":"\u230B","RightTee;":"\u22A2","RightTeeArrow;":"\u21A6","RightTeeVector;":"\u295B","RightTriangle;":"\u22B3","RightTriangleBar;":"\u29D0","RightTriangleEqual;":"\u22B5","RightUpDownVector;":"\u294F","RightUpTeeVector;":"\u295C","RightUpVector;":"\u21BE","RightUpVectorBar;":"\u2954","RightVector;":"\u21C0","RightVectorBar;":"\u2953","Rightarrow;":"\u21D2","Ropf;":"\u211D","RoundImplies;":"\u2970","Rrightarrow;":"\u21DB","Rscr;":"\u211B","Rsh;":"\u21B1","RuleDelayed;":"\u29F4","SHCHcy;":"\u0429","SHcy;":"\u0428","SOFTcy;":"\u042C","Sacute;":"\u015A","Sc;":"\u2ABC","Scaron;":"\u0160","Scedil;":"\u015E","Scirc;":"\u015C","Scy;":"\u0421","Sfr;":"\uD835\uDD16","ShortDownArrow;":"\u2193","ShortLeftArrow;":"\u2190","ShortRightArrow;":"\u2192","ShortUpArrow;":"\u2191","Sigma;":"\u03A3","SmallCircle;":"\u2218","Sopf;":"\uD835\uDD4A","Sqrt;":"\u221A","Square;":"\u25A1","SquareIntersection;":"\u2293","SquareSubset;":"\u228F","SquareSubsetEqual;":"\u2291","SquareSuperset;":"\u2290","SquareSupersetEqual;":"\u2292","SquareUnion;":"\u2294","Sscr;":"\uD835\uDCAE","Star;":"\u22C6","Sub;":"\u22D0","Subset;":"\u22D0","SubsetEqual;":"\u2286","Succeeds;":"\u227B","SucceedsEqual;":"\u2AB0","SucceedsSlantEqual;":"\u227D","SucceedsTilde;":"\u227F","SuchThat;":"\u220B","Sum;":"\u2211","Sup;":"\u22D1","Superset;":"\u2283","SupersetEqual;":"\u2287","Supset;":"\u22D1","THORN":"Þ","THORN;":"Þ","TRADE;":"\u2122","TSHcy;":"\u040B","TScy;":"\u0426","Tab;":"\t","Tau;":"\u03A4","Tcaron;":"\u0164","Tcedil;":"\u0162","Tcy;":"\u0422","Tfr;":"\uD835\uDD17","Therefore;":"\u2234","Theta;":"\u0398","ThickSpace;":"\u205F\u200A","ThinSpace;":"\u2009","Tilde;":"\u223C","TildeEqual;":"\u2243","TildeFullEqual;":"\u2245","TildeTilde;":"\u2248","Topf;":"\uD835\uDD4B","TripleDot;":"\u20DB","Tscr;":"\uD835\uDCAF","Tstrok;":"\u0166","Uacute":"Ú","Uacute;":"Ú","Uarr;":"\u219F","Uarrocir;":"\u2949","Ubrcy;":"\u040E","Ubreve;":"\u016C","Ucirc":"Û","Ucirc;":"Û","Ucy;":"\u0423","Udblac;":"\u0170","Ufr;":"\uD835\uDD18","Ugrave":"Ù","Ugrave;":"Ù","Umacr;":"\u016A","UnderBar;":"_","UnderBrace;":"\u23DF","UnderBracket;":"\u23B5","UnderParenthesis;":"\u23DD","Union;":"\u22C3","UnionPlus;":"\u228E","Uogon;":"\u0172","Uopf;":"\uD835\uDD4C","UpArrow;":"\u2191","UpArrowBar;":"\u2912","UpArrowDownArrow;":"\u21C5","UpDownArrow;":"\u2195","UpEquilibrium;":"\u296E","UpTee;":"\u22A5","UpTeeArrow;":"\u21A5","Uparrow;":"\u21D1","Updownarrow;":"\u21D5","UpperLeftArrow;":"\u2196","UpperRightArrow;":"\u2197","Upsi;":"\u03D2","Upsilon;":"\u03A5","Uring;":"\u016E","Uscr;":"\uD835\uDCB0","Utilde;":"\u0168","Uuml":"Ü","Uuml;":"Ü","VDash;":"\u22AB","Vbar;":"\u2AEB","Vcy;":"\u0412","Vdash;":"\u22A9","Vdashl;":"\u2AE6","Vee;":"\u22C1","Verbar;":"\u2016","Vert;":"\u2016","VerticalBar;":"\u2223","VerticalLine;":"|","VerticalSeparator;":"\u2758","VerticalTilde;":"\u2240","VeryThinSpace;":"\u200A","Vfr;":"\uD835\uDD19","Vopf;":"\uD835\uDD4D","Vscr;":"\uD835\uDCB1","Vvdash;":"\u22AA","Wcirc;":"\u0174","Wedge;":"\u22C0","Wfr;":"\uD835\uDD1A","Wopf;":"\uD835\uDD4E","Wscr;":"\uD835\uDCB2","Xfr;":"\uD835\uDD1B","Xi;":"\u039E","Xopf;":"\uD835\uDD4F","Xscr;":"\uD835\uDCB3","YAcy;":"\u042F","YIcy;":"\u0407","YUcy;":"\u042E","Yacute":"Ý","Yacute;":"Ý","Ycirc;":"\u0176","Ycy;":"\u042B","Yfr;":"\uD835\uDD1C","Yopf;":"\uD835\uDD50","Yscr;":"\uD835\uDCB4","Yuml;":"\u0178","ZHcy;":"\u0416","Zacute;":"\u0179","Zcaron;":"\u017D","Zcy;":"\u0417","Zdot;":"\u017B","ZeroWidthSpace;":"\u200B","Zeta;":"\u0396","Zfr;":"\u2128","Zopf;":"\u2124","Zscr;":"\uD835\uDCB5","aacute":"á","aacute;":"á","abreve;":"\u0103","ac;":"\u223E","acE;":"\u223E\u0333","acd;":"\u223F","acirc":"â","acirc;":"â","acute":"´","acute;":"´","acy;":"\u0430","aelig":"æ","aelig;":"æ","af;":"\u2061","afr;":"\uD835\uDD1E","agrave":"à","agrave;":"à","alefsym;":"\u2135","aleph;":"\u2135","alpha;":"\u03B1","amacr;":"\u0101","amalg;":"\u2A3F","amp":"&","amp;":"&","and;":"\u2227","andand;":"\u2A55","andd;":"\u2A5C","andslope;":"\u2A58","andv;":"\u2A5A","ang;":"\u2220","ange;":"\u29A4","angle;":"\u2220","angmsd;":"\u2221","angmsdaa;":"\u29A8","angmsdab;":"\u29A9","angmsdac;":"\u29AA","angmsdad;":"\u29AB","angmsdae;":"\u29AC","angmsdaf;":"\u29AD","angmsdag;":"\u29AE","angmsdah;":"\u29AF","angrt;":"\u221F","angrtvb;":"\u22BE","angrtvbd;":"\u299D","angsph;":"\u2222","angst;":"Å","angzarr;":"\u237C","aogon;":"\u0105","aopf;":"\uD835\uDD52","ap;":"\u2248","apE;":"\u2A70","apacir;":"\u2A6F","ape;":"\u224A","apid;":"\u224B","apos;":"'","approx;":"\u2248","approxeq;":"\u224A","aring":"å","aring;":"å","ascr;":"\uD835\uDCB6","ast;":"*","asymp;":"\u2248","asympeq;":"\u224D","atilde":"ã","atilde;":"ã","auml":"ä","auml;":"ä","awconint;":"\u2233","awint;":"\u2A11","bNot;":"\u2AED","backcong;":"\u224C","backepsilon;":"\u03F6","backprime;":"\u2035","backsim;":"\u223D","backsimeq;":"\u22CD","barvee;":"\u22BD","barwed;":"\u2305","barwedge;":"\u2305","bbrk;":"\u23B5","bbrktbrk;":"\u23B6","bcong;":"\u224C","bcy;":"\u0431","bdquo;":"\u201E","becaus;":"\u2235","because;":"\u2235","bemptyv;":"\u29B0","bepsi;":"\u03F6","bernou;":"\u212C","beta;":"\u03B2","beth;":"\u2136","between;":"\u226C","bfr;":"\uD835\uDD1F","bigcap;":"\u22C2","bigcirc;":"\u25EF","bigcup;":"\u22C3","bigodot;":"\u2A00","bigoplus;":"\u2A01","bigotimes;":"\u2A02","bigsqcup;":"\u2A06","bigstar;":"\u2605","bigtriangledown;":"\u25BD","bigtriangleup;":"\u25B3","biguplus;":"\u2A04","bigvee;":"\u22C1","bigwedge;":"\u22C0","bkarow;":"\u290D","blacklozenge;":"\u29EB","blacksquare;":"\u25AA","blacktriangle;":"\u25B4","blacktriangledown;":"\u25BE","blacktriangleleft;":"\u25C2","blacktriangleright;":"\u25B8","blank;":"\u2423","blk12;":"\u2592","blk14;":"\u2591","blk34;":"\u2593","block;":"\u2588","bne;":"=\u20E5","bnequiv;":"\u2261\u20E5","bnot;":"\u2310","bopf;":"\uD835\uDD53","bot;":"\u22A5","bottom;":"\u22A5","bowtie;":"\u22C8","boxDL;":"\u2557","boxDR;":"\u2554","boxDl;":"\u2556","boxDr;":"\u2553","boxH;":"\u2550","boxHD;":"\u2566","boxHU;":"\u2569","boxHd;":"\u2564","boxHu;":"\u2567","boxUL;":"\u255D","boxUR;":"\u255A","boxUl;":"\u255C","boxUr;":"\u2559","boxV;":"\u2551","boxVH;":"\u256C","boxVL;":"\u2563","boxVR;":"\u2560","boxVh;":"\u256B","boxVl;":"\u2562","boxVr;":"\u255F","boxbox;":"\u29C9","boxdL;":"\u2555","boxdR;":"\u2552","boxdl;":"\u2510","boxdr;":"\u250C","boxh;":"\u2500","boxhD;":"\u2565","boxhU;":"\u2568","boxhd;":"\u252C","boxhu;":"\u2534","boxminus;":"\u229F","boxplus;":"\u229E","boxtimes;":"\u22A0","boxuL;":"\u255B","boxuR;":"\u2558","boxul;":"\u2518","boxur;":"\u2514","boxv;":"\u2502","boxvH;":"\u256A","boxvL;":"\u2561","boxvR;":"\u255E","boxvh;":"\u253C","boxvl;":"\u2524","boxvr;":"\u251C","bprime;":"\u2035","breve;":"\u02D8","brvbar":"¦","brvbar;":"¦","bscr;":"\uD835\uDCB7","bsemi;":"\u204F","bsim;":"\u223D","bsime;":"\u22CD","bsol;":"\\","bsolb;":"\u29C5","bsolhsub;":"\u27C8","bull;":"\u2022","bullet;":"\u2022","bump;":"\u224E","bumpE;":"\u2AAE","bumpe;":"\u224F","bumpeq;":"\u224F","cacute;":"\u0107","cap;":"\u2229","capand;":"\u2A44","capbrcup;":"\u2A49","capcap;":"\u2A4B","capcup;":"\u2A47","capdot;":"\u2A40","caps;":"\u2229\uFE00","caret;":"\u2041","caron;":"\u02C7","ccaps;":"\u2A4D","ccaron;":"\u010D","ccedil":"ç","ccedil;":"ç","ccirc;":"\u0109","ccups;":"\u2A4C","ccupssm;":"\u2A50","cdot;":"\u010B","cedil":"¸","cedil;":"¸","cemptyv;":"\u29B2","cent":"¢","cent;":"¢","centerdot;":"·","cfr;":"\uD835\uDD20","chcy;":"\u0447","check;":"\u2713","checkmark;":"\u2713","chi;":"\u03C7","cir;":"\u25CB","cirE;":"\u29C3","circ;":"\u02C6","circeq;":"\u2257","circlearrowleft;":"\u21BA","circlearrowright;":"\u21BB","circledR;":"®","circledS;":"\u24C8","circledast;":"\u229B","circledcirc;":"\u229A","circleddash;":"\u229D","cire;":"\u2257","cirfnint;":"\u2A10","cirmid;":"\u2AEF","cirscir;":"\u29C2","clubs;":"\u2663","clubsuit;":"\u2663","colon;":":","colone;":"\u2254","coloneq;":"\u2254","comma;":",","commat;":"@","comp;":"\u2201","compfn;":"\u2218","complement;":"\u2201","complexes;":"\u2102","cong;":"\u2245","congdot;":"\u2A6D","conint;":"\u222E","copf;":"\uD835\uDD54","coprod;":"\u2210","copy":"©","copy;":"©","copysr;":"\u2117","crarr;":"\u21B5","cross;":"\u2717","cscr;":"\uD835\uDCB8","csub;":"\u2ACF","csube;":"\u2AD1","csup;":"\u2AD0","csupe;":"\u2AD2","ctdot;":"\u22EF","cudarrl;":"\u2938","cudarrr;":"\u2935","cuepr;":"\u22DE","cuesc;":"\u22DF","cularr;":"\u21B6","cularrp;":"\u293D","cup;":"\u222A","cupbrcap;":"\u2A48","cupcap;":"\u2A46","cupcup;":"\u2A4A","cupdot;":"\u228D","cupor;":"\u2A45","cups;":"\u222A\uFE00","curarr;":"\u21B7","curarrm;":"\u293C","curlyeqprec;":"\u22DE","curlyeqsucc;":"\u22DF","curlyvee;":"\u22CE","curlywedge;":"\u22CF","curren":"¤","curren;":"¤","curvearrowleft;":"\u21B6","curvearrowright;":"\u21B7","cuvee;":"\u22CE","cuwed;":"\u22CF","cwconint;":"\u2232","cwint;":"\u2231","cylcty;":"\u232D","dArr;":"\u21D3","dHar;":"\u2965","dagger;":"\u2020","daleth;":"\u2138","darr;":"\u2193","dash;":"\u2010","dashv;":"\u22A3","dbkarow;":"\u290F","dblac;":"\u02DD","dcaron;":"\u010F","dcy;":"\u0434","dd;":"\u2146","ddagger;":"\u2021","ddarr;":"\u21CA","ddotseq;":"\u2A77","deg":"°","deg;":"°","delta;":"\u03B4","demptyv;":"\u29B1","dfisht;":"\u297F","dfr;":"\uD835\uDD21","dharl;":"\u21C3","dharr;":"\u21C2","diam;":"\u22C4","diamond;":"\u22C4","diamondsuit;":"\u2666","diams;":"\u2666","die;":"¨","digamma;":"\u03DD","disin;":"\u22F2","div;":"÷","divide":"÷","divide;":"÷","divideontimes;":"\u22C7","divonx;":"\u22C7","djcy;":"\u0452","dlcorn;":"\u231E","dlcrop;":"\u230D","dollar;":"$","dopf;":"\uD835\uDD55","dot;":"\u02D9","doteq;":"\u2250","doteqdot;":"\u2251","dotminus;":"\u2238","dotplus;":"\u2214","dotsquare;":"\u22A1","doublebarwedge;":"\u2306","downarrow;":"\u2193","downdownarrows;":"\u21CA","downharpoonleft;":"\u21C3","downharpoonright;":"\u21C2","drbkarow;":"\u2910","drcorn;":"\u231F","drcrop;":"\u230C","dscr;":"\uD835\uDCB9","dscy;":"\u0455","dsol;":"\u29F6","dstrok;":"\u0111","dtdot;":"\u22F1","dtri;":"\u25BF","dtrif;":"\u25BE","duarr;":"\u21F5","duhar;":"\u296F","dwangle;":"\u29A6","dzcy;":"\u045F","dzigrarr;":"\u27FF","eDDot;":"\u2A77","eDot;":"\u2251","eacute":"é","eacute;":"é","easter;":"\u2A6E","ecaron;":"\u011B","ecir;":"\u2256","ecirc":"ê","ecirc;":"ê","ecolon;":"\u2255","ecy;":"\u044D","edot;":"\u0117","ee;":"\u2147","efDot;":"\u2252","efr;":"\uD835\uDD22","eg;":"\u2A9A","egrave":"è","egrave;":"è","egs;":"\u2A96","egsdot;":"\u2A98","el;":"\u2A99","elinters;":"\u23E7","ell;":"\u2113","els;":"\u2A95","elsdot;":"\u2A97","emacr;":"\u0113","empty;":"\u2205","emptyset;":"\u2205","emptyv;":"\u2205","emsp13;":"\u2004","emsp14;":"\u2005","emsp;":"\u2003","eng;":"\u014B","ensp;":"\u2002","eogon;":"\u0119","eopf;":"\uD835\uDD56","epar;":"\u22D5","eparsl;":"\u29E3","eplus;":"\u2A71","epsi;":"\u03B5","epsilon;":"\u03B5","epsiv;":"\u03F5","eqcirc;":"\u2256","eqcolon;":"\u2255","eqsim;":"\u2242","eqslantgtr;":"\u2A96","eqslantless;":"\u2A95","equals;":"=","equest;":"\u225F","equiv;":"\u2261","equivDD;":"\u2A78","eqvparsl;":"\u29E5","erDot;":"\u2253","erarr;":"\u2971","escr;":"\u212F","esdot;":"\u2250","esim;":"\u2242","eta;":"\u03B7","eth":"ð","eth;":"ð","euml":"ë","euml;":"ë","euro;":"\u20AC","excl;":"!","exist;":"\u2203","expectation;":"\u2130","exponentiale;":"\u2147","fallingdotseq;":"\u2252","fcy;":"\u0444","female;":"\u2640","ffilig;":"\uFB03","fflig;":"\uFB00","ffllig;":"\uFB04","ffr;":"\uD835\uDD23","filig;":"\uFB01","fjlig;":"fj","flat;":"\u266D","fllig;":"\uFB02","fltns;":"\u25B1","fnof;":"\u0192","fopf;":"\uD835\uDD57","forall;":"\u2200","fork;":"\u22D4","forkv;":"\u2AD9","fpartint;":"\u2A0D","frac12":"½","frac12;":"½","frac13;":"\u2153","frac14":"¼","frac14;":"¼","frac15;":"\u2155","frac16;":"\u2159","frac18;":"\u215B","frac23;":"\u2154","frac25;":"\u2156","frac34":"¾","frac34;":"¾","frac35;":"\u2157","frac38;":"\u215C","frac45;":"\u2158","frac56;":"\u215A","frac58;":"\u215D","frac78;":"\u215E","frasl;":"\u2044","frown;":"\u2322","fscr;":"\uD835\uDCBB","gE;":"\u2267","gEl;":"\u2A8C","gacute;":"\u01F5","gamma;":"\u03B3","gammad;":"\u03DD","gap;":"\u2A86","gbreve;":"\u011F","gcirc;":"\u011D","gcy;":"\u0433","gdot;":"\u0121","ge;":"\u2265","gel;":"\u22DB","geq;":"\u2265","geqq;":"\u2267","geqslant;":"\u2A7E","ges;":"\u2A7E","gescc;":"\u2AA9","gesdot;":"\u2A80","gesdoto;":"\u2A82","gesdotol;":"\u2A84","gesl;":"\u22DB\uFE00","gesles;":"\u2A94","gfr;":"\uD835\uDD24","gg;":"\u226B","ggg;":"\u22D9","gimel;":"\u2137","gjcy;":"\u0453","gl;":"\u2277","glE;":"\u2A92","gla;":"\u2AA5","glj;":"\u2AA4","gnE;":"\u2269","gnap;":"\u2A8A","gnapprox;":"\u2A8A","gne;":"\u2A88","gneq;":"\u2A88","gneqq;":"\u2269","gnsim;":"\u22E7","gopf;":"\uD835\uDD58","grave;":"`","gscr;":"\u210A","gsim;":"\u2273","gsime;":"\u2A8E","gsiml;":"\u2A90","gt":">","gt;":">","gtcc;":"\u2AA7","gtcir;":"\u2A7A","gtdot;":"\u22D7","gtlPar;":"\u2995","gtquest;":"\u2A7C","gtrapprox;":"\u2A86","gtrarr;":"\u2978","gtrdot;":"\u22D7","gtreqless;":"\u22DB","gtreqqless;":"\u2A8C","gtrless;":"\u2277","gtrsim;":"\u2273","gvertneqq;":"\u2269\uFE00","gvnE;":"\u2269\uFE00","hArr;":"\u21D4","hairsp;":"\u200A","half;":"½","hamilt;":"\u210B","hardcy;":"\u044A","harr;":"\u2194","harrcir;":"\u2948","harrw;":"\u21AD","hbar;":"\u210F","hcirc;":"\u0125","hearts;":"\u2665","heartsuit;":"\u2665","hellip;":"\u2026","hercon;":"\u22B9","hfr;":"\uD835\uDD25","hksearow;":"\u2925","hkswarow;":"\u2926","hoarr;":"\u21FF","homtht;":"\u223B","hookleftarrow;":"\u21A9","hookrightarrow;":"\u21AA","hopf;":"\uD835\uDD59","horbar;":"\u2015","hscr;":"\uD835\uDCBD","hslash;":"\u210F","hstrok;":"\u0127","hybull;":"\u2043","hyphen;":"\u2010","iacute":"í","iacute;":"í","ic;":"\u2063","icirc":"î","icirc;":"î","icy;":"\u0438","iecy;":"\u0435","iexcl":"¡","iexcl;":"¡","iff;":"\u21D4","ifr;":"\uD835\uDD26","igrave":"ì","igrave;":"ì","ii;":"\u2148","iiiint;":"\u2A0C","iiint;":"\u222D","iinfin;":"\u29DC","iiota;":"\u2129","ijlig;":"\u0133","imacr;":"\u012B","image;":"\u2111","imagline;":"\u2110","imagpart;":"\u2111","imath;":"\u0131","imof;":"\u22B7","imped;":"\u01B5","in;":"\u2208","incare;":"\u2105","infin;":"\u221E","infintie;":"\u29DD","inodot;":"\u0131","int;":"\u222B","intcal;":"\u22BA","integers;":"\u2124","intercal;":"\u22BA","intlarhk;":"\u2A17","intprod;":"\u2A3C","iocy;":"\u0451","iogon;":"\u012F","iopf;":"\uD835\uDD5A","iota;":"\u03B9","iprod;":"\u2A3C","iquest":"¿","iquest;":"¿","iscr;":"\uD835\uDCBE","isin;":"\u2208","isinE;":"\u22F9","isindot;":"\u22F5","isins;":"\u22F4","isinsv;":"\u22F3","isinv;":"\u2208","it;":"\u2062","itilde;":"\u0129","iukcy;":"\u0456","iuml":"ï","iuml;":"ï","jcirc;":"\u0135","jcy;":"\u0439","jfr;":"\uD835\uDD27","jmath;":"\u0237","jopf;":"\uD835\uDD5B","jscr;":"\uD835\uDCBF","jsercy;":"\u0458","jukcy;":"\u0454","kappa;":"\u03BA","kappav;":"\u03F0","kcedil;":"\u0137","kcy;":"\u043A","kfr;":"\uD835\uDD28","kgreen;":"\u0138","khcy;":"\u0445","kjcy;":"\u045C","kopf;":"\uD835\uDD5C","kscr;":"\uD835\uDCC0","lAarr;":"\u21DA","lArr;":"\u21D0","lAtail;":"\u291B","lBarr;":"\u290E","lE;":"\u2266","lEg;":"\u2A8B","lHar;":"\u2962","lacute;":"\u013A","laemptyv;":"\u29B4","lagran;":"\u2112","lambda;":"\u03BB","lang;":"\u27E8","langd;":"\u2991","langle;":"\u27E8","lap;":"\u2A85","laquo":"«","laquo;":"«","larr;":"\u2190","larrb;":"\u21E4","larrbfs;":"\u291F","larrfs;":"\u291D","larrhk;":"\u21A9","larrlp;":"\u21AB","larrpl;":"\u2939","larrsim;":"\u2973","larrtl;":"\u21A2","lat;":"\u2AAB","latail;":"\u2919","late;":"\u2AAD","lates;":"\u2AAD\uFE00","lbarr;":"\u290C","lbbrk;":"\u2772","lbrace;":"{","lbrack;":"[","lbrke;":"\u298B","lbrksld;":"\u298F","lbrkslu;":"\u298D","lcaron;":"\u013E","lcedil;":"\u013C","lceil;":"\u2308","lcub;":"{","lcy;":"\u043B","ldca;":"\u2936","ldquo;":"\u201C","ldquor;":"\u201E","ldrdhar;":"\u2967","ldrushar;":"\u294B","ldsh;":"\u21B2","le;":"\u2264","leftarrow;":"\u2190","leftarrowtail;":"\u21A2","leftharpoondown;":"\u21BD","leftharpoonup;":"\u21BC","leftleftarrows;":"\u21C7","leftrightarrow;":"\u2194","leftrightarrows;":"\u21C6","leftrightharpoons;":"\u21CB","leftrightsquigarrow;":"\u21AD","leftthreetimes;":"\u22CB","leg;":"\u22DA","leq;":"\u2264","leqq;":"\u2266","leqslant;":"\u2A7D","les;":"\u2A7D","lescc;":"\u2AA8","lesdot;":"\u2A7F","lesdoto;":"\u2A81","lesdotor;":"\u2A83","lesg;":"\u22DA\uFE00","lesges;":"\u2A93","lessapprox;":"\u2A85","lessdot;":"\u22D6","lesseqgtr;":"\u22DA","lesseqqgtr;":"\u2A8B","lessgtr;":"\u2276","lesssim;":"\u2272","lfisht;":"\u297C","lfloor;":"\u230A","lfr;":"\uD835\uDD29","lg;":"\u2276","lgE;":"\u2A91","lhard;":"\u21BD","lharu;":"\u21BC","lharul;":"\u296A","lhblk;":"\u2584","ljcy;":"\u0459","ll;":"\u226A","llarr;":"\u21C7","llcorner;":"\u231E","llhard;":"\u296B","lltri;":"\u25FA","lmidot;":"\u0140","lmoust;":"\u23B0","lmoustache;":"\u23B0","lnE;":"\u2268","lnap;":"\u2A89","lnapprox;":"\u2A89","lne;":"\u2A87","lneq;":"\u2A87","lneqq;":"\u2268","lnsim;":"\u22E6","loang;":"\u27EC","loarr;":"\u21FD","lobrk;":"\u27E6","longleftarrow;":"\u27F5","longleftrightarrow;":"\u27F7","longmapsto;":"\u27FC","longrightarrow;":"\u27F6","looparrowleft;":"\u21AB","looparrowright;":"\u21AC","lopar;":"\u2985","lopf;":"\uD835\uDD5D","loplus;":"\u2A2D","lotimes;":"\u2A34","lowast;":"\u2217","lowbar;":"_","loz;":"\u25CA","lozenge;":"\u25CA","lozf;":"\u29EB","lpar;":"(","lparlt;":"\u2993","lrarr;":"\u21C6","lrcorner;":"\u231F","lrhar;":"\u21CB","lrhard;":"\u296D","lrm;":"\u200E","lrtri;":"\u22BF","lsaquo;":"\u2039","lscr;":"\uD835\uDCC1","lsh;":"\u21B0","lsim;":"\u2272","lsime;":"\u2A8D","lsimg;":"\u2A8F","lsqb;":"[","lsquo;":"\u2018","lsquor;":"\u201A","lstrok;":"\u0142","lt":"<","lt;":"<","ltcc;":"\u2AA6","ltcir;":"\u2A79","ltdot;":"\u22D6","lthree;":"\u22CB","ltimes;":"\u22C9","ltlarr;":"\u2976","ltquest;":"\u2A7B","ltrPar;":"\u2996","ltri;":"\u25C3","ltrie;":"\u22B4","ltrif;":"\u25C2","lurdshar;":"\u294A","luruhar;":"\u2966","lvertneqq;":"\u2268\uFE00","lvnE;":"\u2268\uFE00","mDDot;":"\u223A","macr":"¯","macr;":"¯","male;":"\u2642","malt;":"\u2720","maltese;":"\u2720","map;":"\u21A6","mapsto;":"\u21A6","mapstodown;":"\u21A7","mapstoleft;":"\u21A4","mapstoup;":"\u21A5","marker;":"\u25AE","mcomma;":"\u2A29","mcy;":"\u043C","mdash;":"\u2014","measuredangle;":"\u2221","mfr;":"\uD835\uDD2A","mho;":"\u2127","micro":"µ","micro;":"µ","mid;":"\u2223","midast;":"*","midcir;":"\u2AF0","middot":"·","middot;":"·","minus;":"\u2212","minusb;":"\u229F","minusd;":"\u2238","minusdu;":"\u2A2A","mlcp;":"\u2ADB","mldr;":"\u2026","mnplus;":"\u2213","models;":"\u22A7","mopf;":"\uD835\uDD5E","mp;":"\u2213","mscr;":"\uD835\uDCC2","mstpos;":"\u223E","mu;":"\u03BC","multimap;":"\u22B8","mumap;":"\u22B8","nGg;":"\u22D9\u0338","nGt;":"\u226B\u20D2","nGtv;":"\u226B\u0338","nLeftarrow;":"\u21CD","nLeftrightarrow;":"\u21CE","nLl;":"\u22D8\u0338","nLt;":"\u226A\u20D2","nLtv;":"\u226A\u0338","nRightarrow;":"\u21CF","nVDash;":"\u22AF","nVdash;":"\u22AE","nabla;":"\u2207","nacute;":"\u0144","nang;":"\u2220\u20D2","nap;":"\u2249","napE;":"\u2A70\u0338","napid;":"\u224B\u0338","napos;":"\u0149","napprox;":"\u2249","natur;":"\u266E","natural;":"\u266E","naturals;":"\u2115","nbsp":" ","nbsp;":" ","nbump;":"\u224E\u0338","nbumpe;":"\u224F\u0338","ncap;":"\u2A43","ncaron;":"\u0148","ncedil;":"\u0146","ncong;":"\u2247","ncongdot;":"\u2A6D\u0338","ncup;":"\u2A42","ncy;":"\u043D","ndash;":"\u2013","ne;":"\u2260","neArr;":"\u21D7","nearhk;":"\u2924","nearr;":"\u2197","nearrow;":"\u2197","nedot;":"\u2250\u0338","nequiv;":"\u2262","nesear;":"\u2928","nesim;":"\u2242\u0338","nexist;":"\u2204","nexists;":"\u2204","nfr;":"\uD835\uDD2B","ngE;":"\u2267\u0338","nge;":"\u2271","ngeq;":"\u2271","ngeqq;":"\u2267\u0338","ngeqslant;":"\u2A7E\u0338","nges;":"\u2A7E\u0338","ngsim;":"\u2275","ngt;":"\u226F","ngtr;":"\u226F","nhArr;":"\u21CE","nharr;":"\u21AE","nhpar;":"\u2AF2","ni;":"\u220B","nis;":"\u22FC","nisd;":"\u22FA","niv;":"\u220B","njcy;":"\u045A","nlArr;":"\u21CD","nlE;":"\u2266\u0338","nlarr;":"\u219A","nldr;":"\u2025","nle;":"\u2270","nleftarrow;":"\u219A","nleftrightarrow;":"\u21AE","nleq;":"\u2270","nleqq;":"\u2266\u0338","nleqslant;":"\u2A7D\u0338","nles;":"\u2A7D\u0338","nless;":"\u226E","nlsim;":"\u2274","nlt;":"\u226E","nltri;":"\u22EA","nltrie;":"\u22EC","nmid;":"\u2224","nopf;":"\uD835\uDD5F","not":"¬","not;":"¬","notin;":"\u2209","notinE;":"\u22F9\u0338","notindot;":"\u22F5\u0338","notinva;":"\u2209","notinvb;":"\u22F7","notinvc;":"\u22F6","notni;":"\u220C","notniva;":"\u220C","notnivb;":"\u22FE","notnivc;":"\u22FD","npar;":"\u2226","nparallel;":"\u2226","nparsl;":"\u2AFD\u20E5","npart;":"\u2202\u0338","npolint;":"\u2A14","npr;":"\u2280","nprcue;":"\u22E0","npre;":"\u2AAF\u0338","nprec;":"\u2280","npreceq;":"\u2AAF\u0338","nrArr;":"\u21CF","nrarr;":"\u219B","nrarrc;":"\u2933\u0338","nrarrw;":"\u219D\u0338","nrightarrow;":"\u219B","nrtri;":"\u22EB","nrtrie;":"\u22ED","nsc;":"\u2281","nsccue;":"\u22E1","nsce;":"\u2AB0\u0338","nscr;":"\uD835\uDCC3","nshortmid;":"\u2224","nshortparallel;":"\u2226","nsim;":"\u2241","nsime;":"\u2244","nsimeq;":"\u2244","nsmid;":"\u2224","nspar;":"\u2226","nsqsube;":"\u22E2","nsqsupe;":"\u22E3","nsub;":"\u2284","nsubE;":"\u2AC5\u0338","nsube;":"\u2288","nsubset;":"\u2282\u20D2","nsubseteq;":"\u2288","nsubseteqq;":"\u2AC5\u0338","nsucc;":"\u2281","nsucceq;":"\u2AB0\u0338","nsup;":"\u2285","nsupE;":"\u2AC6\u0338","nsupe;":"\u2289","nsupset;":"\u2283\u20D2","nsupseteq;":"\u2289","nsupseteqq;":"\u2AC6\u0338","ntgl;":"\u2279","ntilde":"ñ","ntilde;":"ñ","ntlg;":"\u2278","ntriangleleft;":"\u22EA","ntrianglelefteq;":"\u22EC","ntriangleright;":"\u22EB","ntrianglerighteq;":"\u22ED","nu;":"\u03BD","num;":"#","numero;":"\u2116","numsp;":"\u2007","nvDash;":"\u22AD","nvHarr;":"\u2904","nvap;":"\u224D\u20D2","nvdash;":"\u22AC","nvge;":"\u2265\u20D2","nvgt;":">\u20D2","nvinfin;":"\u29DE","nvlArr;":"\u2902","nvle;":"\u2264\u20D2","nvlt;":"<\u20D2","nvltrie;":"\u22B4\u20D2","nvrArr;":"\u2903","nvrtrie;":"\u22B5\u20D2","nvsim;":"\u223C\u20D2","nwArr;":"\u21D6","nwarhk;":"\u2923","nwarr;":"\u2196","nwarrow;":"\u2196","nwnear;":"\u2927","oS;":"\u24C8","oacute":"ó","oacute;":"ó","oast;":"\u229B","ocir;":"\u229A","ocirc":"ô","ocirc;":"ô","ocy;":"\u043E","odash;":"\u229D","odblac;":"\u0151","odiv;":"\u2A38","odot;":"\u2299","odsold;":"\u29BC","oelig;":"\u0153","ofcir;":"\u29BF","ofr;":"\uD835\uDD2C","ogon;":"\u02DB","ograve":"ò","ograve;":"ò","ogt;":"\u29C1","ohbar;":"\u29B5","ohm;":"\u03A9","oint;":"\u222E","olarr;":"\u21BA","olcir;":"\u29BE","olcross;":"\u29BB","oline;":"\u203E","olt;":"\u29C0","omacr;":"\u014D","omega;":"\u03C9","omicron;":"\u03BF","omid;":"\u29B6","ominus;":"\u2296","oopf;":"\uD835\uDD60","opar;":"\u29B7","operp;":"\u29B9","oplus;":"\u2295","or;":"\u2228","orarr;":"\u21BB","ord;":"\u2A5D","order;":"\u2134","orderof;":"\u2134","ordf":"ª","ordf;":"ª","ordm":"º","ordm;":"º","origof;":"\u22B6","oror;":"\u2A56","orslope;":"\u2A57","orv;":"\u2A5B","oscr;":"\u2134","oslash":"ø","oslash;":"ø","osol;":"\u2298","otilde":"õ","otilde;":"õ","otimes;":"\u2297","otimesas;":"\u2A36","ouml":"ö","ouml;":"ö","ovbar;":"\u233D","par;":"\u2225","para":"¶","para;":"¶","parallel;":"\u2225","parsim;":"\u2AF3","parsl;":"\u2AFD","part;":"\u2202","pcy;":"\u043F","percnt;":"%","period;":".","permil;":"\u2030","perp;":"\u22A5","pertenk;":"\u2031","pfr;":"\uD835\uDD2D","phi;":"\u03C6","phiv;":"\u03D5","phmmat;":"\u2133","phone;":"\u260E","pi;":"\u03C0","pitchfork;":"\u22D4","piv;":"\u03D6","planck;":"\u210F","planckh;":"\u210E","plankv;":"\u210F","plus;":"+","plusacir;":"\u2A23","plusb;":"\u229E","pluscir;":"\u2A22","plusdo;":"\u2214","plusdu;":"\u2A25","pluse;":"\u2A72","plusmn":"±","plusmn;":"±","plussim;":"\u2A26","plustwo;":"\u2A27","pm;":"±","pointint;":"\u2A15","popf;":"\uD835\uDD61","pound":"£","pound;":"£","pr;":"\u227A","prE;":"\u2AB3","prap;":"\u2AB7","prcue;":"\u227C","pre;":"\u2AAF","prec;":"\u227A","precapprox;":"\u2AB7","preccurlyeq;":"\u227C","preceq;":"\u2AAF","precnapprox;":"\u2AB9","precneqq;":"\u2AB5","precnsim;":"\u22E8","precsim;":"\u227E","prime;":"\u2032","primes;":"\u2119","prnE;":"\u2AB5","prnap;":"\u2AB9","prnsim;":"\u22E8","prod;":"\u220F","profalar;":"\u232E","profline;":"\u2312","profsurf;":"\u2313","prop;":"\u221D","propto;":"\u221D","prsim;":"\u227E","prurel;":"\u22B0","pscr;":"\uD835\uDCC5","psi;":"\u03C8","puncsp;":"\u2008","qfr;":"\uD835\uDD2E","qint;":"\u2A0C","qopf;":"\uD835\uDD62","qprime;":"\u2057","qscr;":"\uD835\uDCC6","quaternions;":"\u210D","quatint;":"\u2A16","quest;":"?","questeq;":"\u225F","quot":"\"","quot;":"\"","rAarr;":"\u21DB","rArr;":"\u21D2","rAtail;":"\u291C","rBarr;":"\u290F","rHar;":"\u2964","race;":"\u223D\u0331","racute;":"\u0155","radic;":"\u221A","raemptyv;":"\u29B3","rang;":"\u27E9","rangd;":"\u2992","range;":"\u29A5","rangle;":"\u27E9","raquo":"»","raquo;":"»","rarr;":"\u2192","rarrap;":"\u2975","rarrb;":"\u21E5","rarrbfs;":"\u2920","rarrc;":"\u2933","rarrfs;":"\u291E","rarrhk;":"\u21AA","rarrlp;":"\u21AC","rarrpl;":"\u2945","rarrsim;":"\u2974","rarrtl;":"\u21A3","rarrw;":"\u219D","ratail;":"\u291A","ratio;":"\u2236","rationals;":"\u211A","rbarr;":"\u290D","rbbrk;":"\u2773","rbrace;":"}","rbrack;":"]","rbrke;":"\u298C","rbrksld;":"\u298E","rbrkslu;":"\u2990","rcaron;":"\u0159","rcedil;":"\u0157","rceil;":"\u2309","rcub;":"}","rcy;":"\u0440","rdca;":"\u2937","rdldhar;":"\u2969","rdquo;":"\u201D","rdquor;":"\u201D","rdsh;":"\u21B3","real;":"\u211C","realine;":"\u211B","realpart;":"\u211C","reals;":"\u211D","rect;":"\u25AD","reg":"®","reg;":"®","rfisht;":"\u297D","rfloor;":"\u230B","rfr;":"\uD835\uDD2F","rhard;":"\u21C1","rharu;":"\u21C0","rharul;":"\u296C","rho;":"\u03C1","rhov;":"\u03F1","rightarrow;":"\u2192","rightarrowtail;":"\u21A3","rightharpoondown;":"\u21C1","rightharpoonup;":"\u21C0","rightleftarrows;":"\u21C4","rightleftharpoons;":"\u21CC","rightrightarrows;":"\u21C9","rightsquigarrow;":"\u219D","rightthreetimes;":"\u22CC","ring;":"\u02DA","risingdotseq;":"\u2253","rlarr;":"\u21C4","rlhar;":"\u21CC","rlm;":"\u200F","rmoust;":"\u23B1","rmoustache;":"\u23B1","rnmid;":"\u2AEE","roang;":"\u27ED","roarr;":"\u21FE","robrk;":"\u27E7","ropar;":"\u2986","ropf;":"\uD835\uDD63","roplus;":"\u2A2E","rotimes;":"\u2A35","rpar;":")","rpargt;":"\u2994","rppolint;":"\u2A12","rrarr;":"\u21C9","rsaquo;":"\u203A","rscr;":"\uD835\uDCC7","rsh;":"\u21B1","rsqb;":"]","rsquo;":"\u2019","rsquor;":"\u2019","rthree;":"\u22CC","rtimes;":"\u22CA","rtri;":"\u25B9","rtrie;":"\u22B5","rtrif;":"\u25B8","rtriltri;":"\u29CE","ruluhar;":"\u2968","rx;":"\u211E","sacute;":"\u015B","sbquo;":"\u201A","sc;":"\u227B","scE;":"\u2AB4","scap;":"\u2AB8","scaron;":"\u0161","sccue;":"\u227D","sce;":"\u2AB0","scedil;":"\u015F","scirc;":"\u015D","scnE;":"\u2AB6","scnap;":"\u2ABA","scnsim;":"\u22E9","scpolint;":"\u2A13","scsim;":"\u227F","scy;":"\u0441","sdot;":"\u22C5","sdotb;":"\u22A1","sdote;":"\u2A66","seArr;":"\u21D8","searhk;":"\u2925","searr;":"\u2198","searrow;":"\u2198","sect":"§","sect;":"§","semi;":";","seswar;":"\u2929","setminus;":"\u2216","setmn;":"\u2216","sext;":"\u2736","sfr;":"\uD835\uDD30","sfrown;":"\u2322","sharp;":"\u266F","shchcy;":"\u0449","shcy;":"\u0448","shortmid;":"\u2223","shortparallel;":"\u2225","shy":"­","shy;":"­","sigma;":"\u03C3","sigmaf;":"\u03C2","sigmav;":"\u03C2","sim;":"\u223C","simdot;":"\u2A6A","sime;":"\u2243","simeq;":"\u2243","simg;":"\u2A9E","simgE;":"\u2AA0","siml;":"\u2A9D","simlE;":"\u2A9F","simne;":"\u2246","simplus;":"\u2A24","simrarr;":"\u2972","slarr;":"\u2190","smallsetminus;":"\u2216","smashp;":"\u2A33","smeparsl;":"\u29E4","smid;":"\u2223","smile;":"\u2323","smt;":"\u2AAA","smte;":"\u2AAC","smtes;":"\u2AAC\uFE00","softcy;":"\u044C","sol;":"/","solb;":"\u29C4","solbar;":"\u233F","sopf;":"\uD835\uDD64","spades;":"\u2660","spadesuit;":"\u2660","spar;":"\u2225","sqcap;":"\u2293","sqcaps;":"\u2293\uFE00","sqcup;":"\u2294","sqcups;":"\u2294\uFE00","sqsub;":"\u228F","sqsube;":"\u2291","sqsubset;":"\u228F","sqsubseteq;":"\u2291","sqsup;":"\u2290","sqsupe;":"\u2292","sqsupset;":"\u2290","sqsupseteq;":"\u2292","squ;":"\u25A1","square;":"\u25A1","squarf;":"\u25AA","squf;":"\u25AA","srarr;":"\u2192","sscr;":"\uD835\uDCC8","ssetmn;":"\u2216","ssmile;":"\u2323","sstarf;":"\u22C6","star;":"\u2606","starf;":"\u2605","straightepsilon;":"\u03F5","straightphi;":"\u03D5","strns;":"¯","sub;":"\u2282","subE;":"\u2AC5","subdot;":"\u2ABD","sube;":"\u2286","subedot;":"\u2AC3","submult;":"\u2AC1","subnE;":"\u2ACB","subne;":"\u228A","subplus;":"\u2ABF","subrarr;":"\u2979","subset;":"\u2282","subseteq;":"\u2286","subseteqq;":"\u2AC5","subsetneq;":"\u228A","subsetneqq;":"\u2ACB","subsim;":"\u2AC7","subsub;":"\u2AD5","subsup;":"\u2AD3","succ;":"\u227B","succapprox;":"\u2AB8","succcurlyeq;":"\u227D","succeq;":"\u2AB0","succnapprox;":"\u2ABA","succneqq;":"\u2AB6","succnsim;":"\u22E9","succsim;":"\u227F","sum;":"\u2211","sung;":"\u266A","sup1":"¹","sup1;":"¹","sup2":"²","sup2;":"²","sup3":"³","sup3;":"³","sup;":"\u2283","supE;":"\u2AC6","supdot;":"\u2ABE","supdsub;":"\u2AD8","supe;":"\u2287","supedot;":"\u2AC4","suphsol;":"\u27C9","suphsub;":"\u2AD7","suplarr;":"\u297B","supmult;":"\u2AC2","supnE;":"\u2ACC","supne;":"\u228B","supplus;":"\u2AC0","supset;":"\u2283","supseteq;":"\u2287","supseteqq;":"\u2AC6","supsetneq;":"\u228B","supsetneqq;":"\u2ACC","supsim;":"\u2AC8","supsub;":"\u2AD4","supsup;":"\u2AD6","swArr;":"\u21D9","swarhk;":"\u2926","swarr;":"\u2199","swarrow;":"\u2199","swnwar;":"\u292A","szlig":"ß","szlig;":"ß","target;":"\u2316","tau;":"\u03C4","tbrk;":"\u23B4","tcaron;":"\u0165","tcedil;":"\u0163","tcy;":"\u0442","tdot;":"\u20DB","telrec;":"\u2315","tfr;":"\uD835\uDD31","there4;":"\u2234","therefore;":"\u2234","theta;":"\u03B8","thetasym;":"\u03D1","thetav;":"\u03D1","thickapprox;":"\u2248","thicksim;":"\u223C","thinsp;":"\u2009","thkap;":"\u2248","thksim;":"\u223C","thorn":"þ","thorn;":"þ","tilde;":"\u02DC","times":"×","times;":"×","timesb;":"\u22A0","timesbar;":"\u2A31","timesd;":"\u2A30","tint;":"\u222D","toea;":"\u2928","top;":"\u22A4","topbot;":"\u2336","topcir;":"\u2AF1","topf;":"\uD835\uDD65","topfork;":"\u2ADA","tosa;":"\u2929","tprime;":"\u2034","trade;":"\u2122","triangle;":"\u25B5","triangledown;":"\u25BF","triangleleft;":"\u25C3","trianglelefteq;":"\u22B4","triangleq;":"\u225C","triangleright;":"\u25B9","trianglerighteq;":"\u22B5","tridot;":"\u25EC","trie;":"\u225C","triminus;":"\u2A3A","triplus;":"\u2A39","trisb;":"\u29CD","tritime;":"\u2A3B","trpezium;":"\u23E2","tscr;":"\uD835\uDCC9","tscy;":"\u0446","tshcy;":"\u045B","tstrok;":"\u0167","twixt;":"\u226C","twoheadleftarrow;":"\u219E","twoheadrightarrow;":"\u21A0","uArr;":"\u21D1","uHar;":"\u2963","uacute":"ú","uacute;":"ú","uarr;":"\u2191","ubrcy;":"\u045E","ubreve;":"\u016D","ucirc":"û","ucirc;":"û","ucy;":"\u0443","udarr;":"\u21C5","udblac;":"\u0171","udhar;":"\u296E","ufisht;":"\u297E","ufr;":"\uD835\uDD32","ugrave":"ù","ugrave;":"ù","uharl;":"\u21BF","uharr;":"\u21BE","uhblk;":"\u2580","ulcorn;":"\u231C","ulcorner;":"\u231C","ulcrop;":"\u230F","ultri;":"\u25F8","umacr;":"\u016B","uml":"¨","uml;":"¨","uogon;":"\u0173","uopf;":"\uD835\uDD66","uparrow;":"\u2191","updownarrow;":"\u2195","upharpoonleft;":"\u21BF","upharpoonright;":"\u21BE","uplus;":"\u228E","upsi;":"\u03C5","upsih;":"\u03D2","upsilon;":"\u03C5","upuparrows;":"\u21C8","urcorn;":"\u231D","urcorner;":"\u231D","urcrop;":"\u230E","uring;":"\u016F","urtri;":"\u25F9","uscr;":"\uD835\uDCCA","utdot;":"\u22F0","utilde;":"\u0169","utri;":"\u25B5","utrif;":"\u25B4","uuarr;":"\u21C8","uuml":"ü","uuml;":"ü","uwangle;":"\u29A7","vArr;":"\u21D5","vBar;":"\u2AE8","vBarv;":"\u2AE9","vDash;":"\u22A8","vangrt;":"\u299C","varepsilon;":"\u03F5","varkappa;":"\u03F0","varnothing;":"\u2205","varphi;":"\u03D5","varpi;":"\u03D6","varpropto;":"\u221D","varr;":"\u2195","varrho;":"\u03F1","varsigma;":"\u03C2","varsubsetneq;":"\u228A\uFE00","varsubsetneqq;":"\u2ACB\uFE00","varsupsetneq;":"\u228B\uFE00","varsupsetneqq;":"\u2ACC\uFE00","vartheta;":"\u03D1","vartriangleleft;":"\u22B2","vartriangleright;":"\u22B3","vcy;":"\u0432","vdash;":"\u22A2","vee;":"\u2228","veebar;":"\u22BB","veeeq;":"\u225A","vellip;":"\u22EE","verbar;":"|","vert;":"|","vfr;":"\uD835\uDD33","vltri;":"\u22B2","vnsub;":"\u2282\u20D2","vnsup;":"\u2283\u20D2","vopf;":"\uD835\uDD67","vprop;":"\u221D","vrtri;":"\u22B3","vscr;":"\uD835\uDCCB","vsubnE;":"\u2ACB\uFE00","vsubne;":"\u228A\uFE00","vsupnE;":"\u2ACC\uFE00","vsupne;":"\u228B\uFE00","vzigzag;":"\u299A","wcirc;":"\u0175","wedbar;":"\u2A5F","wedge;":"\u2227","wedgeq;":"\u2259","weierp;":"\u2118","wfr;":"\uD835\uDD34","wopf;":"\uD835\uDD68","wp;":"\u2118","wr;":"\u2240","wreath;":"\u2240","wscr;":"\uD835\uDCCC","xcap;":"\u22C2","xcirc;":"\u25EF","xcup;":"\u22C3","xdtri;":"\u25BD","xfr;":"\uD835\uDD35","xhArr;":"\u27FA","xharr;":"\u27F7","xi;":"\u03BE","xlArr;":"\u27F8","xlarr;":"\u27F5","xmap;":"\u27FC","xnis;":"\u22FB","xodot;":"\u2A00","xopf;":"\uD835\uDD69","xoplus;":"\u2A01","xotime;":"\u2A02","xrArr;":"\u27F9","xrarr;":"\u27F6","xscr;":"\uD835\uDCCD","xsqcup;":"\u2A06","xuplus;":"\u2A04","xutri;":"\u25B3","xvee;":"\u22C1","xwedge;":"\u22C0","yacute":"ý","yacute;":"ý","yacy;":"\u044F","ycirc;":"\u0177","ycy;":"\u044B","yen":"¥","yen;":"¥","yfr;":"\uD835\uDD36","yicy;":"\u0457","yopf;":"\uD835\uDD6A","yscr;":"\uD835\uDCCE","yucy;":"\u044E","yuml":"ÿ","yuml;":"ÿ","zacute;":"\u017A","zcaron;":"\u017E","zcy;":"\u0437","zdot;":"\u017C","zeetrf;":"\u2128","zeta;":"\u03B6","zfr;":"\uD835\uDD37","zhcy;":"\u0436","zigrarr;":"\u21DD","zopf;":"\uD835\uDD6B","zscr;":"\uD835\uDCCF","zwj;":"\u200D","zwnj;":"\u200C"})));
// #endregion

const STATE_DATA = 0;
const STATE_TAG_OPEN = 1;
const STATE_END_TAG_OPEN = 2;
const STATE_TAG_NAME = 3;
const STATE_BEFORE_ATTRIBUTE_NAME = 4;
const STATE_ATTRIBUTE_NAME = 5;
const STATE_AFTER_ATTRIBUTE_NAME = 6;
const STATE_BEFORE_ATTRIBUTE_VALUE = 7;
const STATE_ATTRIBUTE_VALUE_DOUBLE_QUOTED = 8;
const STATE_ATTRIBUTE_VALUE_SINGLE_QUOTED = 9;
const STATE_ATTRIBUTE_VALUE_UNQUOTED = 10;
const STATE_AFTER_ATTRIBUTE_VALUE_QUOTED = 11;
const STATE_SELF_CLOSING_START_TAG = 12;

const STATE_MARKUP_DECLARATION_OPEN = 13;
const STATE_COMMENT_START = 14;
const STATE_COMMENT_START_DASH = 15;
const STATE_COMMENT = 16;
const STATE_COMMENT_END_DASH = 17;
const STATE_COMMENT_END = 18;
const STATE_COMMENT_END_BANG = 19;
const STATE_BOGUS_COMMENT = 20;

const STATE_COMMENT_LESS_THAN_SIGN = 21;
const STATE_COMMENT_LESS_THAN_SIGN_BANG = 22;
const STATE_COMMENT_LESS_THAN_SIGN_BANG_DASH = 23;
const STATE_COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH = 24;

const STATE_DOCTYPE = 25;
const STATE_BEFORE_DOCTYPE_NAME = 26;
const STATE_DOCTYPE_NAME = 27;
const STATE_AFTER_DOCTYPE_NAME = 28;
const STATE_AFTER_DOCTYPE_PUBLIC_KEYWORD = 29;
const STATE_BEFORE_DOCTYPE_PUBLIC_IDENTIFIER = 30;
const STATE_DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED = 31;
const STATE_DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED = 32;
const STATE_AFTER_DOCTYPE_PUBLIC_IDENTIFIER = 33;
const STATE_BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS = 34;
const STATE_AFTER_DOCTYPE_SYSTEM_KEYWORD = 35;
const STATE_BEFORE_DOCTYPE_SYSTEM_IDENTIFIER = 36;
const STATE_DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED = 37;
const STATE_DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED = 38;
const STATE_AFTER_DOCTYPE_SYSTEM_IDENTIFIER = 39;
const STATE_BOGUS_DOCTYPE = 40;

const STATE_CDATA_SECTION = 41;
const STATE_CDATA_SECTION_BRACKET = 42;
const STATE_CDATA_SECTION_END = 43;

const STATE_RCDATA = 44;
const STATE_RCDATA_LESS_THAN_SIGN = 45;
const STATE_RCDATA_END_TAG_OPEN = 46;
const STATE_RCDATA_END_TAG_NAME = 47;

const STATE_RAWTEXT = 48;
const STATE_RAWTEXT_LESS_THAN_SIGN = 49;
const STATE_RAWTEXT_END_TAG_OPEN = 50;
const STATE_RAWTEXT_END_TAG_NAME = 51;

const STATE_SCRIPT_DATA = 52;
const STATE_SCRIPT_DATA_LESS_THAN_SIGN = 53;
const STATE_SCRIPT_DATA_END_TAG_OPEN = 54;
const STATE_SCRIPT_DATA_END_TAG_NAME = 55;
const STATE_SCRIPT_DATA_ESCAPE_START = 56;
const STATE_SCRIPT_DATA_ESCAPE_START_DASH = 57;
const STATE_SCRIPT_DATA_ESCAPED = 58;
const STATE_SCRIPT_DATA_ESCAPED_DASH = 59;
const STATE_SCRIPT_DATA_ESCAPED_DASH_DASH = 60;
const STATE_SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN = 61;
const STATE_SCRIPT_DATA_ESCAPED_END_TAG_OPEN = 62;
const STATE_SCRIPT_DATA_ESCAPED_END_TAG_NAME = 63;
const STATE_SCRIPT_DATA_DOUBLE_ESCAPE_START = 64;
const STATE_SCRIPT_DATA_DOUBLE_ESCAPED = 65;
const STATE_SCRIPT_DATA_DOUBLE_ESCAPED_DASH = 66;
const STATE_SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH = 67;
const STATE_SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN = 68;
const STATE_SCRIPT_DATA_DOUBLE_ESCAPE_END = 69;

const STATE_PLAINTEXT = 70;

// https://html.spec.whatwg.org/multipage/parsing.html#character-reference-state
const STATE_CHARACTER_REFERENCE = 71;
// https://html.spec.whatwg.org/multipage/parsing.html#named-character-reference-state
const STATE_NAMED_CHARACTER_REFERENCE = 72;
// https://html.spec.whatwg.org/multipage/parsing.html#ambiguous-ampersand-state
const STATE_AMBIGUOUS_AMPERSAND = 73;
// https://html.spec.whatwg.org/multipage/parsing.html#numeric-character-reference-state
const STATE_NUMERIC_CHARACTER_REFERENCE = 74;
// https://html.spec.whatwg.org/multipage/parsing.html#hexadecimal-character-reference-start-state
const STATE_HEXADECIMAL_CHARACTER_REFERENCE_START = 75;
// https://html.spec.whatwg.org/multipage/parsing.html#decimal-character-reference-start-state
const STATE_DECIMAL_CHARACTER_REFERENCE_START = 76;
// https://html.spec.whatwg.org/multipage/parsing.html#hexadecimal-character-reference-state
const STATE_HEXADECIMAL_CHARACTER_REFERENCE = 77;
// https://html.spec.whatwg.org/multipage/parsing.html#decimal-character-reference-state
const STATE_DECIMAL_CHARACTER_REFERENCE = 78;
// https://html.spec.whatwg.org/multipage/parsing.html#numeric-character-reference-end-state
const STATE_NUMERIC_CHARACTER_REFERENCE_END = 79;

const CC_TAB = 0x09;
const CC_LF = 0x0a;
const CC_FF = 0x0c;
const CC_CR = 0x0d;
const CC_SPACE = 0x20;
const CC_NULL = 0x00;
const CC_EXCLAMATION_MARK = 0x21;
const CC_QUOTATION_MARK = 0x22;
const CC_NUMBER_SIGN = 0x23;
const CC_AMPERSAND = 0x26;
const CC_APOSTROPHE = 0x27;
const CC_LEFT_PARENTHESIS = 0x28;
const CC_RIGHT_PARENTHESIS = 0x29;
const CC_ASTERISK = 0x2a;
const CC_HYPHEN_MINUS = 0x2d;
const CC_SOLIDUS = 0x2f;
const CC_SEMICOLON = 0x3b;
const CC_LESS_THAN = 0x3c;
const CC_EQUALS = 0x3d;
const CC_GREATER_THAN = 0x3e;
const CC_QUESTION_MARK = 0x3f;
const CC_COMMERCIAL_AT = 0x40;
const CC_LEFT_SQUARE_BRACKET = 0x5b;
const CC_REVERSE_SOLIDUS = 0x5c;
const CC_RIGHT_SQUARE_BRACKET = 0x5d;
const CC_LOW_LINE = 0x5f;
const CC_GRAVE_ACCENT = 0x60;
const CC_LEFT_CURLY_BRACKET = 0x7b;
const CC_RIGHT_CURLY_BRACKET = 0x7d;
const CC_NO_BREAK_SPACE = 0xa0;

const QUOTE_DOUBLE = 1;
const QUOTE_SINGLE = 2;
const QUOTE_NONE = 0;

/**
 * How an attribute value is quoted in the source (HTML §13.2.5.36-38).
 * @type {{ None: 0, Double: 1, Single: 2 }}
 */
const Quote = {
	None: QUOTE_NONE,
	Double: QUOTE_DOUBLE,
	Single: QUOTE_SINGLE
};

// The longest WHATWG named entity is 32 chars with its `;`, 31 without. Capping
// the tokenizer's reference run and the decoder's longest-prefix backtrack there
// keeps `&` followed by thousands of alphanumerics linear-time.
const MAX_ENTITY_NAME_LEN = 32;

// ASCII character-class bit flags in one table: a load and a mask in place of
// the comparison chain these per-code-point predicates would otherwise run. No
// code point >= 0x80 is in any class, so callers short-circuit on `cc < 0x80`.
const CCLS_SPACE = 1;
const CCLS_DIGIT = 2;
const CCLS_UPPER = 4;
const CCLS_LOWER = 8;
const CCLS_HEX = 16;
// Terminator sets of the tag-name, attribute-name and unquoted-value states'
// fast-forward scans, mirroring those states' arcs; one mask test replaces
// their compare chains.
const CCLS_TAG_NAME_TERM = 32;
const CCLS_ATTR_NAME_TERM = 64;
const CCLS_UNQUOTED_VALUE_TERM = 256;
const CCLS_ALPHA = CCLS_UPPER | CCLS_LOWER;
const CCLS_ALNUM = CCLS_ALPHA | CCLS_DIGIT;
const CHAR_CLASS = new Uint16Array(128);
for (let i = 0; i < 128; i++) {
	let f = 0;
	if (
		i === CC_TAB ||
		i === CC_LF ||
		i === CC_FF ||
		i === CC_CR ||
		i === CC_SPACE
	) {
		f |= CCLS_SPACE;
	}
	if (i >= 0x30 && i <= 0x39) f |= CCLS_DIGIT | CCLS_HEX;
	if (i >= 0x41 && i <= 0x5a) f |= CCLS_UPPER;
	if (i >= 0x61 && i <= 0x7a) f |= CCLS_LOWER;
	if ((i >= 0x41 && i <= 0x46) || (i >= 0x61 && i <= 0x66)) f |= CCLS_HEX;
	if (
		(f & CCLS_SPACE) !== 0 ||
		i === CC_SOLIDUS ||
		i === CC_GREATER_THAN ||
		i === CC_NULL
	) {
		f |= CCLS_TAG_NAME_TERM | CCLS_ATTR_NAME_TERM;
	}
	if (
		i === CC_EQUALS ||
		i === CC_QUOTATION_MARK ||
		i === CC_APOSTROPHE ||
		i === CC_LESS_THAN
	) {
		f |= CCLS_ATTR_NAME_TERM;
	}
	if (
		(f & CCLS_SPACE) !== 0 ||
		i === CC_AMPERSAND ||
		i === CC_GREATER_THAN ||
		i === CC_NULL ||
		i === CC_QUOTATION_MARK ||
		i === CC_APOSTROPHE ||
		i === CC_LESS_THAN ||
		i === CC_EQUALS ||
		i === CC_GRAVE_ACCENT
	) {
		f |= CCLS_UNQUOTED_VALUE_TERM;
	}
	CHAR_CLASS[i] = f;
}

/**
 * @param {number} cc character code
 * @returns {boolean} is ascii alpha
 */
const isAsciiAlpha = (cc) => cc < 0x80 && (CHAR_CLASS[cc] & CCLS_ALPHA) !== 0;

/**
 * @param {number} cc character code
 * @returns {boolean} is ascii alphanumeric
 */
const isAsciiAlphanumeric = (cc) =>
	cc < 0x80 && (CHAR_CLASS[cc] & CCLS_ALNUM) !== 0;

/**
 * @param {number} cc character code
 * @returns {boolean} is ascii digit
 */
const isAsciiDigit = (cc) => cc < 0x80 && (CHAR_CLASS[cc] & CCLS_DIGIT) !== 0;

/**
 * @param {number} cc character code
 * @returns {boolean} is ascii hex digit
 */
const isAsciiHexDigit = (cc) => cc < 0x80 && (CHAR_CLASS[cc] & CCLS_HEX) !== 0;

/**
 * @param {number} cc character code
 * @returns {boolean} is ascii upper alpha
 */
const isAsciiUpperAlpha = (cc) =>
	cc < 0x80 && (CHAR_CLASS[cc] & CCLS_UPPER) !== 0;

/**
 * @param {number} cc character code
 * @returns {boolean} is ascii lower alpha
 */
const isAsciiLowerAlpha = (cc) =>
	cc < 0x80 && (CHAR_CLASS[cc] & CCLS_LOWER) !== 0;

/**
 * Tokenizer whitespace. U+000D CARRIAGE RETURN is included because the spec's
 * input-stream preprocessing converts CR (and CRLF) to LF before tokenizing;
 * this scanner keeps the original offsets, so it treats a raw CR as whitespace
 * to match the post-preprocessing behaviour.
 * @param {number} cc character code
 * @returns {boolean} is space
 */
const isAsciiWhitespace = (cc) =>
	cc < 0x80 && (CHAR_CLASS[cc] & CCLS_SPACE) !== 0;

/**
 * @param {number} code numeric character reference code point
 * @returns {boolean} is a Unicode noncharacter
 */
const isNoncharacter = (code) =>
	(code >= 0xfdd0 && code <= 0xfdef) || (code & 0xfffe) === 0xfffe;

/**
 * @param {number} code numeric character reference code point
 * @returns {boolean} is a C0/C1 control that is not ASCII whitespace
 */
const isControlReference = (code) =>
	code === 0x0d ||
	((code <= 0x1f || (code >= 0x7f && code <= 0x9f)) &&
		code !== CC_TAB &&
		code !== CC_LF &&
		code !== CC_FF &&
		code !== CC_SPACE);

/**
 * Severity of a tokenizer-detected parse error. `"warning"` is recoverable
 * (the tokenizer continued and the emitted token is still well-formed, e.g.
 * missing-attribute-value); `"error"` means the emitted token's offset
 * range is incomplete or does not match what the spec would produce, e.g.
 * eof-in-tag.
 *
 * Token offsets are JS string indices (UTF-16 code-unit offsets into
 * `input`), not byte offsets - relevant for inputs containing non-BMP
 * code points where one code point spans two indices.
 * @typedef {"warning" | "error"} ParseErrorSeverity
 */

/**
 * @typedef {object} HtmlTokenCallbacks
 * @property {(input: string, start: number, end: number, nameStart: number, nameEnd: number, selfClosing: boolean) => number=} openTag
 * @property {(input: string, start: number, end: number, nameStart: number, nameEnd: number) => number=} closeTag
 * @property {(input: string, start: number, end: number) => number=} text
 * @property {(input: string, nameStart: number, nameEnd: number, valueStart: number, valueEnd: number, quoteType: number) => number=} attribute
 * @property {(input: string, start: number, end: number, dataStart: number, dataEnd: number) => number=} comment
 * @property {(input: string, start: number, end: number, nameStart: number, nameEnd: number, publicStart: number, publicEnd: number, systemStart: number, systemEnd: number, forceQuirks: boolean, subsetStart?: number, subsetEnd?: number) => number=} doctype `subsetStart` / `subsetEnd` delimit an XML internal subset (`tokenizeXml` only; -1 when absent)
 * @property {(input: string, code: string, start: number, end: number, severity: ParseErrorSeverity) => void=} parseError
 * @property {(() => boolean)=} isForeign returns true when the adjusted current node is in a foreign (SVG/MathML) namespace, which is where a `<![CDATA[` opens a CDATA section
 * @property {((name: string) => boolean)=} vetoesContentMode returns true when the tree builder will not run the algorithm that switches the tokenizer for this start tag, so it stays in the data state
 * @property {string=} fragmentContext context element tag name for fragment parsing; seeds the initial content mode
 * @property {boolean=} scripting read a `noscript` as raw text, as a document with scripting on does
 */

/**
 * @param {string} name tag name (lowercase)
 * @param {boolean=} scripting whether `noscript` holds raw text, as it does with scripting on
 * @returns {number} content mode state for this tag, or STATE_DATA
 */
const getContentModeForTag = (name, scripting) => {
	switch (name) {
		case "textarea":
		case "title":
			return STATE_RCDATA;
		case "style":
		case "xmp":
		case "iframe":
		case "noembed":
		case "noframes":
			return STATE_RAWTEXT;
		case "script":
			return STATE_SCRIPT_DATA;
		case "plaintext":
			return STATE_PLAINTEXT;
		case "noscript":
			return scripting === true ? STATE_RAWTEXT : STATE_DATA;
		default:
			return STATE_DATA;
	}
};

const ASCII_UPPER_REGEXP = /[A-Z]/;

/**
 * Case-insensitive comparison of `input[start..end)` to a lowercase ASCII
 * literal, without allocating the slice.
 * @param {string} input input
 * @param {number} start range start
 * @param {number} end range end
 * @param {string} lit lowercase ASCII literal
 * @returns {boolean} true if the range equals `lit` ignoring ASCII case
 */
const rangeAsciiCaseInsensitiveMatch = (input, start, end, lit) => {
	if (end - start !== lit.length) return false;
	// Exact case first, two builtin calls where the fold makes two a character:
	// the fold matches it only when `lit` holds no upper case, as `foreignObject`
	// (an adjusted foreign name) does.
	if (input.startsWith(lit, start)) return !ASCII_UPPER_REGEXP.test(lit);
	for (let i = 0; i < lit.length; i++) {
		let c = input.charCodeAt(start + i);
		if (c >= 0x41 && c <= 0x5a) c += 0x20;
		if (c !== lit.charCodeAt(i)) return false;
	}
	return true;
};

/**
 * Content mode for the just-opened tag whose name spans `input[start..end)`,
 * matched on the raw range so ordinary tags need neither a slice nor a
 * `toLowerCase`. Mirrors `getContentModeForTag`.
 * @param {string} input input
 * @param {number} start tag-name start
 * @param {number} end tag-name end
 * @param {boolean} scripting whether `noscript` holds raw text, as it does with scripting on
 * @returns {number} content mode state, or STATE_DATA
 */
const getContentModeForRange = (input, start, end, scripting) => {
	switch (end - start) {
		case 3:
			if (rangeAsciiCaseInsensitiveMatch(input, start, end, "xmp")) {
				return STATE_RAWTEXT;
			}
			return STATE_DATA;
		case 5:
			if (rangeAsciiCaseInsensitiveMatch(input, start, end, "title")) {
				return STATE_RCDATA;
			}
			if (rangeAsciiCaseInsensitiveMatch(input, start, end, "style")) {
				return STATE_RAWTEXT;
			}
			return STATE_DATA;
		case 6:
			if (rangeAsciiCaseInsensitiveMatch(input, start, end, "script")) {
				return STATE_SCRIPT_DATA;
			}
			if (rangeAsciiCaseInsensitiveMatch(input, start, end, "iframe")) {
				return STATE_RAWTEXT;
			}
			return STATE_DATA;
		case 7:
			if (rangeAsciiCaseInsensitiveMatch(input, start, end, "noembed")) {
				return STATE_RAWTEXT;
			}
			return STATE_DATA;
		case 8:
			if (rangeAsciiCaseInsensitiveMatch(input, start, end, "textarea")) {
				return STATE_RCDATA;
			}
			if (rangeAsciiCaseInsensitiveMatch(input, start, end, "noframes")) {
				return STATE_RAWTEXT;
			}
			if (
				scripting &&
				rangeAsciiCaseInsensitiveMatch(input, start, end, "noscript")
			) {
				return STATE_RAWTEXT;
			}
			return STATE_DATA;
		case 9:
			if (rangeAsciiCaseInsensitiveMatch(input, start, end, "plaintext")) {
				return STATE_PLAINTEXT;
			}
			return STATE_DATA;
		default:
			return STATE_DATA;
	}
};

/**
 * @param {string} input input string
 * @param {number} pos current position
 * @param {HtmlTokenCallbacks} callbacks callbacks
 * @returns {number} final position
 */
const tokenize = (input, pos = 0, callbacks = {}) => {
	const len = input.length;
	// The closures below read these copies, never `input` and `len`: a variable
	// a closure captures is kept in a context, from which the scan loop would
	// load it, and check its type, again at every read.
	const source = input;
	const sourceLength = len;
	const scripting = callbacks.scripting === true;
	let state = STATE_DATA;
	let returnState = STATE_DATA;

	let textStart = pos;
	let tagStart = pos;
	let tagNameStart = -1;
	let tagNameEnd = -1;
	let attributeNameStart = -1;
	let attributeNameEnd = -1;
	let attributeValueStart = -1;
	let attrQuoteType = QUOTE_NONE;
	let commentStart = pos;
	// Data range of the comment being scanned, tracked rather than re-derived by
	// trimming delimiters: the comment states append characters that were never
	// consumed, such as the `--` an inner `-->` turns into.
	let commentDataStart = pos;
	let commentDataEnd = pos;
	// Sub-ranges of the DOCTYPE token being scanned (-1 = the spec's
	// "missing" value, which a consumer must tell apart from an empty one).
	let doctypeNameStart = -1;
	let doctypeNameEnd = -1;
	let doctypePublicStart = -1;
	let doctypePublicEnd = -1;
	let doctypeSystemStart = -1;
	let doctypeSystemEnd = -1;
	let doctypeForceQuirks = false;
	let lastOpenTagName = "";
	// Tag-name offsets of the last open tag; the lowercased `lastOpenTagName` is
	// derived from these lazily (only for special-content tags).
	let lastOpenTagStart = -1;
	let lastOpenTagEnd = -1;
	// How much of `"script"` the ASCII-alpha run after `<` / `</` has matched,
	// for SCRIPT_DATA_DOUBLE_ESCAPE_{START,END}: 0..6 chars, or 7 for no longer
	// matching. A counter rather than a buffer, which a long run would grow.
	let scriptMatch = 0;
	let namedEntityConsumed = 0;
	// Where this input last spelled a `name;` the entity table holds, in a slot
	// keyed on its first character and length; 0 is an empty slot, as a name
	// follows its `&`. Offsets rather than strings, so it holds no source.
	/** @type {Int32Array | undefined} */
	let matchedEntities;
	// Offset of the opening `&` and the running numeric value (clamped past the
	// Unicode range so it can't overflow); used for numeric-reference errors.
	let charRefStart = -1;
	let charRefCode = 0;
	// Tracks whether the current tag has parsed any attributes - used to
	// fire the `end-tag-with-attributes` parse error when an end tag emits.
	let tagHasAttributes = false;
	// Whether the last `<?` stays a processing instruction until EOF would cut it.
	let processingInstructionTargetValid = false;
	// Memoized next `<` / `&` / NUL for the text-run fast-forwards, where native
	// `indexOf` beats a per-char loop. `pos` only moves forward, so each memo is
	// refreshed at most once per occurrence; `len` means no further one.
	let nextLt = -1;
	let nextAmp = -1;
	let nextNul = -1;
	let nextHyphen = -1;
	let nextGt = -1;
	let nextBracket = -1;
	// Same memo scheme for the closing quote of quoted attribute values (long
	// values: data: URIs, srcset, inline style). Memoized so a value with many
	// `&` references doesn't re-run the quote scan per reference.
	let nextDQuote = -1;
	let nextSQuote = -1;

	/**
	 * Reports a tokenizer parse error to the consumer. The offset range and
	 * severity follow the WHATWG spec naming. Severity is `"error"` for
	 * cases where the emitted token is incomplete (EOF inside a tag or
	 * comment); everything else is a `"warning"`. Offsets are JS string
	 * indices (UTF-16 code-unit offsets into `input`).
	 * @param {string} code WHATWG parse-error code (kebab-case)
	 * @param {number} start string offset where the error starts
	 * @param {number} end string offset where the error ends
	 * @param {ParseErrorSeverity} severity error severity
	 */
	const reportError = (code, start, end, severity) => {
		if (callbacks.parseError !== undefined) {
			callbacks.parseError(source, code, start, end, severity);
		}
	};

	/**
	 * Emits the WHATWG numeric-character-reference validation parse error for
	 * the accumulated `charRefCode`, if any. Used both inline (when the
	 * reference is terminated by a real next character) and at EOF (when the
	 * reference runs to the end of input). The scanner only flags the error -
	 * the spec's U+FFFD / Windows-1252 substitution is done by `decodeEntities`.
	 * @param {number} endPos offset just past the reference
	 */
	const validateNumericReference = (endPos) => {
		if (charRefCode === 0) {
			reportError("null-character-reference", charRefStart, endPos, "warning");
		} else if (charRefCode > 0x10ffff) {
			reportError(
				"character-reference-outside-unicode-range",
				charRefStart,
				endPos,
				"warning"
			);
		} else if (charRefCode >= 0xd800 && charRefCode <= 0xdfff) {
			reportError(
				"surrogate-character-reference",
				charRefStart,
				endPos,
				"warning"
			);
		} else if (isNoncharacter(charRefCode)) {
			reportError(
				"noncharacter-character-reference",
				charRefStart,
				endPos,
				"warning"
			);
		} else if (isControlReference(charRefCode)) {
			reportError(
				"control-character-reference",
				charRefStart,
				endPos,
				"warning"
			);
		}
	};

	/**
	 * Raises the parse errors of the processing instruction open and target
	 * states for a `<?`, whose token spans what a bogus comment's does: up to the
	 * first `>`. An EOF one is left to the end of input, so errors stay in order.
	 * @param {number} targetStart offset past the `?`
	 * @returns {boolean} true when the target is one a processing instruction keeps
	 */
	const scanProcessingInstructionTarget = (targetStart) => {
		if (targetStart >= sourceLength) return true;
		let c = source.charCodeAt(targetStart);
		if (!isAsciiAlpha(c) && c !== CC_LOW_LINE) {
			reportError(
				"invalid-first-character-of-processing-instruction-target",
				targetStart,
				targetStart + 1,
				"warning"
			);
			return false;
		}
		for (let i = targetStart + 1; i < sourceLength; i++) {
			c = source.charCodeAt(i);
			if (
				isAsciiWhitespace(c) ||
				c === CC_QUESTION_MARK ||
				c === CC_GREATER_THAN
			) {
				if (
					!rangeAsciiCaseInsensitiveMatch(source, targetStart, i, "xml") &&
					!rangeAsciiCaseInsensitiveMatch(
						source,
						targetStart,
						i,
						"xml-stylesheet"
					)
				) {
					return true;
				}
				reportError(
					"disallowed-processing-instruction-target",
					targetStart,
					i,
					"warning"
				);
				return false;
			}
			if (
				!isAsciiAlphanumeric(c) &&
				c !== CC_HYPHEN_MINUS &&
				c !== CC_LOW_LINE
			) {
				reportError(
					"invalid-processing-instruction-target",
					i,
					i + 1,
					"warning"
				);
				return false;
			}
		}
		return true;
	};

	// Content mode for the tag just opened, named at `lastOpenTagStart..End`. In
	// foreign content `isForeign` vetoes the RAWTEXT/RCDATA/script switch, so an
	// SVG `<title>` is markup; `lastOpenTagName` is materialized only there.
	const contentModeAfterOpenTag = () => {
		// `xmp` is the shortest name that switches the content mode.
		if (lastOpenTagEnd - lastOpenTagStart < 3) return STATE_DATA;
		const m = getContentModeForRange(
			source,
			lastOpenTagStart,
			lastOpenTagEnd,
			scripting
		);
		// Ordinary tags stay in the data state whatever the tree builder did, so
		// they pay for neither the name nor the callback.
		if (m === STATE_DATA) return STATE_DATA;
		lastOpenTagName = source
			.slice(lastOpenTagStart, lastOpenTagEnd)
			.toLowerCase();
		if (
			callbacks.vetoesContentMode !== undefined &&
			callbacks.vetoesContentMode(lastOpenTagName)
		) {
			return STATE_DATA;
		}
		return m;
	};

	// HTML fragment parsing: seed the tokenizer with the context element's
	// content mode (e.g. a `textarea`/`style`/`script` context starts in
	// RCDATA/RAWTEXT/script-data rather than data state).
	if (callbacks.fragmentContext !== undefined) {
		lastOpenTagName = callbacks.fragmentContext;
		state =
			callbacks.vetoesContentMode !== undefined &&
			callbacks.vetoesContentMode(lastOpenTagName)
				? STATE_DATA
				: getContentModeForTag(lastOpenTagName, scripting);
	}

	/**
	 * @param {number} endPos end position
	 */
	const flushText = (endPos) => {
		if (textStart < endPos) {
			if (callbacks.text !== undefined) {
				callbacks.text(source, textStart, endPos);
			}
			// Advancing `textStart` makes a second `flushText` over the same span a
			// no-op instead of a duplicate emit. `emitOpenTag` / `emitCloseTag`
			// overwrite it with their own `nextPos`, so their start is unaffected.
			textStart = endPos;
		}
	};

	/**
	 * @param {number} endPos end position
	 * @returns {number} next position
	 */
	const emitAttribute = (endPos) => {
		// The default `nextPos` advances past the closing quote, if any, so the
		// machine continues without an `attribute` callback. A callback's return
		// value overrides it, and owes the same advance from its `quoteType`.
		let nextPos = attrQuoteType === QUOTE_NONE ? endPos : endPos + 1;
		if (callbacks.attribute !== undefined && attributeNameStart !== -1) {
			nextPos = callbacks.attribute(
				source,
				attributeNameStart,
				attributeNameEnd,
				attributeValueStart,
				attributeValueStart === -1 ? -1 : endPos,
				attrQuoteType
			);
		}
		if (attributeNameStart !== -1) tagHasAttributes = true;
		attributeNameStart = -1;
		attributeValueStart = -1;
		attrQuoteType = QUOTE_NONE;
		return nextPos;
	};

	/**
	 * @param {number} endPos end position
	 * @param {boolean} selfClosing is self closing
	 * @returns {number} next position
	 */
	const emitOpenTag = (endPos, selfClosing) => {
		let nextPos = endPos;
		if (callbacks.openTag !== undefined) {
			nextPos = callbacks.openTag(
				source,
				tagStart,
				endPos,
				tagNameStart,
				tagNameEnd,
				selfClosing
			);
		}
		// Record offsets only; `contentModeAfterOpenTag` lowercases lazily. A
		// trailing `/` is no exception: no element that switches the content mode
		// is void, so the tree builder ignores the flag on one in HTML content.
		lastOpenTagStart = tagNameStart;
		lastOpenTagEnd = tagNameEnd;
		tagHasAttributes = false;
		textStart = nextPos;
		return nextPos;
	};

	/**
	 * @param {number} endPos end position
	 * @returns {number} next position
	 */
	const emitCloseTag = (endPos) => {
		// Per WHATWG: an end tag emitted with attributes is a parse error.
		if (tagHasAttributes) {
			reportError("end-tag-with-attributes", tagStart, endPos, "warning");
		}
		let nextPos = endPos;
		if (callbacks.closeTag !== undefined) {
			nextPos = callbacks.closeTag(
				source,
				tagStart,
				endPos,
				tagNameStart,
				tagNameEnd
			);
		}
		tagHasAttributes = false;
		textStart = nextPos;
		return nextPos;
	};

	// The switch below labels each case with its STATE_* number written out: V8
	// builds a jump table only over literal labels, and compares one named
	// constant after another otherwise. `| 0` lets it skip the table's guards.
	while (pos < len) {
		let cc = input.charCodeAt(pos);

		// Every WHATWG tokenizer state is handled. Omitted: the parse errors
		// needing state an offset scanner lacks (duplicate-attribute,
		// `*-in-input-stream`) and reference substitution.
		switch (state | 0) {
			// https://html.spec.whatwg.org/multipage/parsing.html#data-state
			case 0: // STATE_DATA
				// Consume the next input character:
				// U+003C LESS-THAN SIGN (<)
				// Set the return state to the data state. Switch to the tag open state.
				if (cc === CC_LESS_THAN) {
					tagStart = pos;
					state = STATE_TAG_OPEN;
					pos++;
				} else if (cc === CC_AMPERSAND) {
					// U+0026 AMPERSAND (&)
					// Set the return state to the data state. Switch to the
					// character reference state.
					returnState = STATE_DATA;
					state = STATE_CHARACTER_REFERENCE;
					pos++;
					break;
				} else if (cc === CC_NULL) {
					// U+0000 NULL: unexpected-null-character (the data state
					// emits the NULL as-is; the scanner only flags the error).
					reportError("unexpected-null-character", pos, pos + 1, "warning");
					pos++;
					break;
				} else {
					// Fast-forward over ordinary text without re-entering the switch.
					// Only the data state's "anything else" arc is batched: the stops
					// are exactly the code points with arcs of their own.
					pos++;
					if (nextLt < pos) {
						nextLt = input.indexOf("<", pos);
						if (nextLt === -1) nextLt = len;
					}
					if (nextAmp < pos) {
						nextAmp = input.indexOf("&", pos);
						if (nextAmp === -1) nextAmp = len;
					}
					if (nextNul < pos) {
						nextNul = input.indexOf("\0", pos);
						if (nextNul === -1) nextNul = len;
					}
					pos = Math.min(nextLt, nextAmp, nextNul);
					// Fused: the memo invariant guarantees `input[nextLt] === "<"`, so
					// take this state's `<` arc without another dispatch.
					if (pos !== nextLt || pos >= len) break;
					tagStart = pos;
					state = STATE_TAG_OPEN;
					pos++;
				}
				// Fused: the tag open state, next in this switch, reads the character
				// after the `<` without another dispatch.
				if (pos >= len) break;
				cc = input.charCodeAt(pos);

			// https://html.spec.whatwg.org/multipage/parsing.html#tag-open-state
			// falls through
			case 1: // STATE_TAG_OPEN
				// Consume the next input character:
				// U+002F SOLIDUS (/)
				// Switch to the end tag open state.
				if (cc === CC_SOLIDUS) {
					state = STATE_END_TAG_OPEN;
					pos++;
					// Fused: when the next char is alpha, take the end-tag-open state's
					// alpha arc (and its tag-name run scan) without another dispatch.
					let c2 = pos < len ? input.charCodeAt(pos) : 0;
					if (c2 < 0x80 && (CHAR_CLASS[c2] & CCLS_ALPHA) !== 0) {
						flushText(tagStart);
						tagNameStart = pos;
						state = STATE_TAG_NAME;
						pos++;
						while (pos < len) {
							c2 = input.charCodeAt(pos);
							if (c2 < 0x80 && (CHAR_CLASS[c2] & CCLS_TAG_NAME_TERM) !== 0) {
								break;
							}
							pos++;
						}
						// Fused: a `>` ending the name is the tag-name state's `>` arc.
						if (pos < len && c2 === CC_GREATER_THAN) {
							tagNameEnd = pos;
							state = STATE_DATA;
							pos = emitCloseTag(pos + 1);
						}
					}
				} else if (cc === CC_EXCLAMATION_MARK) {
					// U+0021 EXCLAMATION MARK (!)
					// Switch to the markup declaration open state.
					flushText(tagStart);
					commentStart = tagStart;
					state = STATE_MARKUP_DECLARATION_OPEN;
					pos++;
				} else if (cc < 0x80 && (CHAR_CLASS[cc] & CCLS_ALPHA) !== 0) {
					// ASCII alpha
					// Create a new start tag token, set its tag name to the empty string.
					// Reconsume in the tag name state.
					flushText(tagStart);
					tagNameStart = pos;
					state = STATE_TAG_NAME;
					// Fused reconsume: the first char is alpha, so the tag-name state
					// always lands in its run scan - run it here without a dispatch.
					pos++;
					let c2 = 0;
					while (pos < len) {
						c2 = input.charCodeAt(pos);
						if (c2 < 0x80 && (CHAR_CLASS[c2] & CCLS_TAG_NAME_TERM) !== 0) {
							break;
						}
						pos++;
					}
					// Fused: a `>` or whitespace ending the name is the tag-name state's
					// arc for it.
					if (pos < len && c2 === CC_GREATER_THAN) {
						tagNameEnd = pos;
						const nextPos = emitOpenTag(pos + 1, false);
						state = nextPos > pos + 1 ? STATE_DATA : contentModeAfterOpenTag();
						pos = nextPos;
					} else if (pos < len && (CHAR_CLASS[c2] & CCLS_SPACE) !== 0) {
						tagNameEnd = pos;
						state = STATE_BEFORE_ATTRIBUTE_NAME;
						pos++;
					}
				} else if (cc === CC_QUESTION_MARK) {
					// `?`: the processing instruction states. The `<?...>` is reported as
					// the bogus comment it spans, and the tree tells the two apart.
					processingInstructionTargetValid = scanProcessingInstructionTarget(
						pos + 1
					);
					flushText(tagStart);
					commentStart = tagStart;
					commentDataStart = pos;
					commentDataEnd = pos;
					state = STATE_BOGUS_COMMENT;
					// Reconsume - let the bogus-comment state consume the `?`
					// itself, matching the spec.
				} else {
					// Anything else
					// This is an invalid-first-character-of-tag-name parse error. Emit a U+003C
					// LESS-THAN SIGN character token. Reconsume in the data state.
					reportError(
						"invalid-first-character-of-tag-name",
						pos,
						pos + 1,
						"warning"
					);
					state = STATE_DATA;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#end-tag-open-state
			case 2: // STATE_END_TAG_OPEN
				// The spec's ASCII-alpha arc is taken inline by the `<` `/` arc above,
				// the only way into this state, so `cc` is never ASCII alpha here.
				if (cc === CC_GREATER_THAN) {
					// `>`: missing-end-tag-name parse error, switch to data. Emitting no
					// token drops `</>` rather than keeping it in the text run, where
					// re-escaping the text node would resurface it as visible text.
					reportError("missing-end-tag-name", pos, pos + 1, "warning");
					flushText(tagStart);
					state = STATE_DATA;
					pos++;
					textStart = pos;
				} else {
					// Anything else: invalid-first-character-of-tag-name parse error. Create a
					// comment token with empty data, reconsume in bogus comment.
					reportError(
						"invalid-first-character-of-tag-name",
						pos,
						pos + 1,
						"warning"
					);
					flushText(tagStart);
					commentStart = tagStart;
					commentDataStart = pos;
					commentDataEnd = pos;
					state = STATE_BOGUS_COMMENT;
					// Reconsume - let bogus-comment consume this char itself.
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#tag-name-state
			case 3: // STATE_TAG_NAME
				// Whitespace (tab, LF, FF, space)
				// Switch to the before attribute name state.
				if (isAsciiWhitespace(cc)) {
					tagNameEnd = pos;
					state = STATE_BEFORE_ATTRIBUTE_NAME;
					pos++;
				} else if (cc === CC_SOLIDUS) {
					// U+002F SOLIDUS (/)
					// Switch to the self-closing start tag state.
					tagNameEnd = pos;
					state = STATE_SELF_CLOSING_START_TAG;
					pos++;
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// Switch to the data state. Emit the current tag token.
					tagNameEnd = pos;
					if (input.charCodeAt(tagStart + 1) === CC_SOLIDUS) {
						state = STATE_DATA;
						pos = emitCloseTag(pos + 1);
					} else {
						const nextPos = emitOpenTag(pos + 1, false);
						state = nextPos > pos + 1 ? STATE_DATA : contentModeAfterOpenTag();
						pos = nextPos;
					}
				} else {
					// U+0000 NULL: unexpected-null-character (append U+FFFD). The
					// tag-name run scans stop only on whitespace, `/`, `>` and NUL, so
					// NUL is the one code point left here.
					reportError("unexpected-null-character", pos, pos + 1, "warning");
					// Fast-forward over the ordinary run of the tag name.
					pos++;
					while (pos < len) {
						const c2 = input.charCodeAt(pos);
						if (c2 < 0x80 && (CHAR_CLASS[c2] & CCLS_TAG_NAME_TERM) !== 0) {
							break;
						}
						pos++;
					}
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#before-attribute-name-state
			case 4: // STATE_BEFORE_ATTRIBUTE_NAME
				// Whitespace (tab, LF, FF, space)
				// Ignore the character.
				// Reconsume so space is handled in BEFORE_ATTRIBUTE_NAME
				if (isAsciiWhitespace(cc)) {
					pos++;
				} else if (cc === CC_SOLIDUS || cc === CC_GREATER_THAN) {
					// `/` / `>` / EOF: reconsume in after attribute name.
					state = STATE_AFTER_ATTRIBUTE_NAME;
					// Reconsume
				} else if (cc === CC_EQUALS) {
					// U+003D EQUALS SIGN (=)
					// This is an unexpected-equals-sign-before-attribute-name parse
					// error. Start a new attribute. Switch to the attribute name state.
					reportError(
						"unexpected-equals-sign-before-attribute-name",
						pos,
						pos + 1,
						"warning"
					);
					attributeNameStart = pos;
					state = STATE_ATTRIBUTE_NAME;
					pos++;
				} else {
					// Anything else
					// Start a new attribute in the current tag token. Set that attribute name
					// and value to the empty string. Reconsume in the attribute name state.
					attributeNameStart = pos;
					state = STATE_ATTRIBUTE_NAME;
					// Fused reconsume: `cc` can't be a terminator here (space / `/` /
					// `>` / `=` took earlier arcs), so run the attribute-name state's
					// else arc - its first-char errors and run scan - without a dispatch.
					if (cc === CC_NULL) {
						reportError("unexpected-null-character", pos, pos + 1, "warning");
					} else if (
						cc === CC_QUOTATION_MARK ||
						cc === CC_APOSTROPHE ||
						cc === CC_LESS_THAN
					) {
						reportError(
							"unexpected-character-in-attribute-name",
							pos,
							pos + 1,
							"warning"
						);
					}
					pos++;
					while (pos < len) {
						const c2 = input.charCodeAt(pos);
						if (c2 < 0x80 && (CHAR_CLASS[c2] & CCLS_ATTR_NAME_TERM) !== 0) {
							break;
						}
						pos++;
					}
					// Fused: a `=` ending the name is the attribute-name state's `=` arc.
					if (pos < len && input.charCodeAt(pos) === CC_EQUALS) {
						attributeNameEnd = pos;
						state = STATE_BEFORE_ATTRIBUTE_VALUE;
						pos++;
					}
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#attribute-name-state
			case 5: // STATE_ATTRIBUTE_NAME
				// Whitespace (tab, LF, FF, space) / `/` / `>` / EOF: reconsume in after
				// attribute name.
				if (
					isAsciiWhitespace(cc) ||
					cc === CC_SOLIDUS ||
					cc === CC_GREATER_THAN
				) {
					attributeNameEnd = pos;
					state = STATE_AFTER_ATTRIBUTE_NAME;
					// Reconsume
				} else if (cc === CC_EQUALS) {
					attributeNameEnd = pos;
					state = STATE_BEFORE_ATTRIBUTE_VALUE;
					pos++;
				} else {
					// NULL -> unexpected-null-character; `"` `'` `<` -> unexpected-character-in-attribute-name.
					if (cc === CC_NULL) {
						reportError("unexpected-null-character", pos, pos + 1, "warning");
					} else if (
						cc === CC_QUOTATION_MARK ||
						cc === CC_APOSTROPHE ||
						cc === CC_LESS_THAN
					) {
						reportError(
							"unexpected-character-in-attribute-name",
							pos,
							pos + 1,
							"warning"
						);
					}
					// Fast-forward over the attribute name, stopping on a terminator
					// (space, `/`, `>`, `=`) or on a char needing a per-occurrence parse
					// error (NUL, `"`, `'`, `<`), which the outer switch re-handles.
					pos++;
					while (pos < len) {
						const c2 = input.charCodeAt(pos);
						if (c2 < 0x80 && (CHAR_CLASS[c2] & CCLS_ATTR_NAME_TERM) !== 0) {
							break;
						}
						pos++;
					}
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#after-attribute-name-state
			case 6: // STATE_AFTER_ATTRIBUTE_NAME
				// Whitespace (tab, LF, FF, space)
				// Ignore the character.
				if (isAsciiWhitespace(cc)) {
					pos++;
				} else if (cc === CC_SOLIDUS) {
					// U+002F SOLIDUS (/)
					// Switch to the self-closing start tag state.
					emitAttribute(pos);
					state = STATE_SELF_CLOSING_START_TAG;
					pos++;
				} else if (cc === CC_EQUALS) {
					// U+003D EQUALS SIGN (=)
					// Switch to the before attribute value state.
					state = STATE_BEFORE_ATTRIBUTE_VALUE;
					pos++;
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// Switch to the data state. Emit the current tag token.
					emitAttribute(pos);
					if (input.charCodeAt(tagStart + 1) === CC_SOLIDUS) {
						state = STATE_DATA;
						pos = emitCloseTag(pos + 1);
					} else {
						const nextPos = emitOpenTag(pos + 1, false);
						state = nextPos > pos + 1 ? STATE_DATA : contentModeAfterOpenTag();
						pos = nextPos;
					}
				} else {
					// Anything else
					// Start a new attribute in the current tag token.
					emitAttribute(pos);
					attributeNameStart = pos;
					state = STATE_ATTRIBUTE_NAME;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#before-attribute-value-state
			case 7: // STATE_BEFORE_ATTRIBUTE_VALUE
				// Whitespace (tab, LF, FF, space)
				// Ignore the character.
				if (isAsciiWhitespace(cc)) {
					pos++;
				} else if (cc === CC_QUOTATION_MARK) {
					// U+0022 QUOTATION MARK (")
					// Switch to the attribute value (double-quoted) state.
					attributeValueStart = pos + 1;
					attrQuoteType = QUOTE_DOUBLE;
					state = STATE_ATTRIBUTE_VALUE_DOUBLE_QUOTED;
					pos++;
					// Fused: run that state's memoized value scan now; a leading `"` /
					// `&` / NUL keeps the min at `pos` for the next dispatch. The quote
					// memo always lies behind a new value, so it is scanned afresh.
					nextDQuote = input.indexOf('"', pos);
					if (nextDQuote === -1) nextDQuote = len;
					if (nextAmp < pos) {
						nextAmp = input.indexOf("&", pos);
						if (nextAmp === -1) nextAmp = len;
					}
					if (nextNul < pos) {
						nextNul = input.indexOf("\0", pos);
						if (nextNul === -1) nextNul = len;
					}
					pos = Math.min(nextDQuote, nextAmp, nextNul);
					// Fused: a closing quote ending the scan is that state's quote arc.
					if (pos === nextDQuote && pos < len) {
						pos = emitAttribute(pos);
						state = STATE_AFTER_ATTRIBUTE_VALUE_QUOTED;
						// Fused: whitespace next is the after-value state's whitespace arc.
						if (pos < len && isAsciiWhitespace(input.charCodeAt(pos))) {
							state = STATE_BEFORE_ATTRIBUTE_NAME;
							pos++;
						}
					}
				} else if (cc === CC_APOSTROPHE) {
					// U+0027 APOSTROPHE (')
					// Switch to the attribute value (single-quoted) state.
					attributeValueStart = pos + 1;
					attrQuoteType = QUOTE_SINGLE;
					state = STATE_ATTRIBUTE_VALUE_SINGLE_QUOTED;
					pos++;
					// Fused: run that state's memoized value scan now; a leading `'` /
					// `&` / NUL keeps the min at `pos` for the next dispatch. The quote
					// memo always lies behind a new value, so it is scanned afresh.
					nextSQuote = input.indexOf("'", pos);
					if (nextSQuote === -1) nextSQuote = len;
					if (nextAmp < pos) {
						nextAmp = input.indexOf("&", pos);
						if (nextAmp === -1) nextAmp = len;
					}
					if (nextNul < pos) {
						nextNul = input.indexOf("\0", pos);
						if (nextNul === -1) nextNul = len;
					}
					pos = Math.min(nextSQuote, nextAmp, nextNul);
					// Fused: a closing quote ending the scan is that state's quote arc.
					if (pos === nextSQuote && pos < len) {
						pos = emitAttribute(pos);
						state = STATE_AFTER_ATTRIBUTE_VALUE_QUOTED;
						// Fused: whitespace next is the after-value state's whitespace arc.
						if (pos < len && isAsciiWhitespace(input.charCodeAt(pos))) {
							state = STATE_BEFORE_ATTRIBUTE_NAME;
							pos++;
						}
					}
				} else if (cc === CC_GREATER_THAN) {
					// `>`: missing-attribute-value parse error, switch to data and emit
					// the tag token. The attribute's empty value range points at the `>`,
					// so the open tag's own range still includes it.
					reportError("missing-attribute-value", pos, pos + 1, "warning");
					attributeValueStart = pos;
					attrQuoteType = QUOTE_NONE;
					pos = emitAttribute(pos);
					if (input.charCodeAt(tagStart + 1) === CC_SOLIDUS) {
						state = STATE_DATA;
						pos = emitCloseTag(pos + 1);
					} else {
						const nextPos = emitOpenTag(pos + 1, false);
						state = nextPos > pos + 1 ? STATE_DATA : contentModeAfterOpenTag();
						pos = nextPos;
					}
				} else {
					// Anything else
					// Reconsume in the attribute value (unquoted) state.
					attributeValueStart = pos;
					attrQuoteType = QUOTE_NONE;
					state = STATE_ATTRIBUTE_VALUE_UNQUOTED;
					// Fused reconsume: run that state's ordinary-run scan from this
					// char; one with an arc or an error of its own stops it at once.
					while (pos < len) {
						const c2 = input.charCodeAt(pos);
						if (
							c2 < 0x80 &&
							(CHAR_CLASS[c2] & CCLS_UNQUOTED_VALUE_TERM) !== 0
						) {
							break;
						}
						pos++;
					}
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#attribute-value-(double-quoted)-state
			case 8: // STATE_ATTRIBUTE_VALUE_DOUBLE_QUOTED
				// Consume the next input character:
				// U+0022 QUOTATION MARK (")
				// Switch to the after attribute value (quoted) state.
				if (cc === CC_QUOTATION_MARK) {
					pos = emitAttribute(pos);
					state = STATE_AFTER_ATTRIBUTE_VALUE_QUOTED;
				} else if (cc === CC_AMPERSAND) {
					// U+0026 AMPERSAND (&)
					// Set the return state to the attribute value (double-quoted)
					// state. Switch to the character reference state.
					returnState = STATE_ATTRIBUTE_VALUE_DOUBLE_QUOTED;
					state = STATE_CHARACTER_REFERENCE;
					pos++;
				} else if (cc === CC_NULL) {
					// U+0000 NULL: unexpected-null-character (append U+FFFD).
					reportError("unexpected-null-character", pos, pos + 1, "warning");
					pos++;
				} else {
					// Fast-forward over the ordinary run of the quoted value. The quote
					// memo, set when the value opened, is its closing quote or EOF.
					pos++;
					if (nextAmp < pos) {
						nextAmp = input.indexOf("&", pos);
						if (nextAmp === -1) nextAmp = len;
					}
					if (nextNul < pos) {
						nextNul = input.indexOf("\0", pos);
						if (nextNul === -1) nextNul = len;
					}
					pos = Math.min(nextDQuote, nextAmp, nextNul);
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#attribute-value-(single-quoted)-state
			case 9: // STATE_ATTRIBUTE_VALUE_SINGLE_QUOTED
				// Consume the next input character:
				// U+0027 APOSTROPHE (')
				// Switch to the after attribute value (quoted) state.
				if (cc === CC_APOSTROPHE) {
					pos = emitAttribute(pos);
					state = STATE_AFTER_ATTRIBUTE_VALUE_QUOTED;
				} else if (cc === CC_AMPERSAND) {
					// U+0026 AMPERSAND (&)
					// Set the return state to the attribute value (single-quoted)
					// state. Switch to the character reference state.
					returnState = STATE_ATTRIBUTE_VALUE_SINGLE_QUOTED;
					state = STATE_CHARACTER_REFERENCE;
					pos++;
				} else if (cc === CC_NULL) {
					// U+0000 NULL: unexpected-null-character (append U+FFFD).
					reportError("unexpected-null-character", pos, pos + 1, "warning");
					pos++;
				} else {
					// Fast-forward over the ordinary run of the quoted value. The quote
					// memo, set when the value opened, is its closing quote or EOF.
					pos++;
					if (nextAmp < pos) {
						nextAmp = input.indexOf("&", pos);
						if (nextAmp === -1) nextAmp = len;
					}
					if (nextNul < pos) {
						nextNul = input.indexOf("\0", pos);
						if (nextNul === -1) nextNul = len;
					}
					pos = Math.min(nextSQuote, nextAmp, nextNul);
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#attribute-value-(unquoted)-state
			case 10: // STATE_ATTRIBUTE_VALUE_UNQUOTED
				if (isAsciiWhitespace(cc)) {
					pos = emitAttribute(pos);
					state = STATE_BEFORE_ATTRIBUTE_NAME;
					// Reconsume so space is handled in BEFORE_ATTRIBUTE_NAME
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// This is a missing-attribute-value parse error. Switch to the data state.
					// Emit the current tag token.
					pos = emitAttribute(pos);
					if (input.charCodeAt(tagStart + 1) === CC_SOLIDUS) {
						state = STATE_DATA;
						pos = emitCloseTag(pos + 1);
					} else {
						const nextPos = emitOpenTag(pos + 1, false);
						state = nextPos > pos + 1 ? STATE_DATA : contentModeAfterOpenTag();
						pos = nextPos;
					}
				} else if (cc === CC_AMPERSAND) {
					// U+0026 AMPERSAND (&)
					// Set the return state to the attribute value (unquoted)
					// state. Switch to the character reference state.
					returnState = STATE_ATTRIBUTE_VALUE_UNQUOTED;
					state = STATE_CHARACTER_REFERENCE;
					pos++;
				} else {
					// NULL -> unexpected-null-character; `"` `'` `<` `=` `` ` `` -> unexpected-character-in-unquoted-attribute-value.
					if (cc === CC_NULL) {
						reportError("unexpected-null-character", pos, pos + 1, "warning");
					} else if (
						cc === CC_QUOTATION_MARK ||
						cc === CC_APOSTROPHE ||
						cc === CC_LESS_THAN ||
						cc === CC_EQUALS ||
						cc === CC_GRAVE_ACCENT
					) {
						reportError(
							"unexpected-character-in-unquoted-attribute-value",
							pos,
							pos + 1,
							"warning"
						);
					}
					// Fast-forward over the ordinary run of the unquoted value, stopping
					// on whitespace, `>`, `&` or a char needing a parse error of its own.
					pos++;
					while (pos < len) {
						const c2 = input.charCodeAt(pos);
						if (
							c2 < 0x80 &&
							(CHAR_CLASS[c2] & CCLS_UNQUOTED_VALUE_TERM) !== 0
						) {
							break;
						}
						pos++;
					}
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#after-attribute-value-(quoted)-state
			case 11: // STATE_AFTER_ATTRIBUTE_VALUE_QUOTED
				// Whitespace (tab, LF, FF, space)
				// Switch to the before attribute name state.
				if (isAsciiWhitespace(cc)) {
					state = STATE_BEFORE_ATTRIBUTE_NAME;
					pos++;
				} else if (cc === CC_SOLIDUS) {
					// U+002F SOLIDUS (/)
					// Switch to the self-closing start tag state.
					state = STATE_SELF_CLOSING_START_TAG;
					pos++;
				} else if (cc === CC_GREATER_THAN) {
					if (input.charCodeAt(tagStart + 1) === CC_SOLIDUS) {
						state = STATE_DATA;
						pos = emitCloseTag(pos + 1);
					} else {
						const nextPos = emitOpenTag(pos + 1, false);
						state = nextPos > pos + 1 ? STATE_DATA : contentModeAfterOpenTag();
						pos = nextPos;
					}
				} else {
					// Anything else
					// This is a missing-whitespace-between-attributes parse error. Reconsume in
					// the before attribute name state.
					reportError(
						"missing-whitespace-between-attributes",
						pos,
						pos + 1,
						"warning"
					);
					state = STATE_BEFORE_ATTRIBUTE_NAME;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#self-closing-start-tag-state
			case 12: // STATE_SELF_CLOSING_START_TAG
				// `>`: Set the self-closing flag of the tag token, switch to data. Emit the
				// tag token.
				if (cc === CC_GREATER_THAN) {
					if (input.charCodeAt(tagStart + 1) === CC_SOLIDUS) {
						// An end tag emitted with the self-closing flag set is an
						// end-tag-with-trailing-solidus parse error.
						reportError(
							"end-tag-with-trailing-solidus",
							tagStart,
							pos + 1,
							"warning"
						);
						state = STATE_DATA;
						pos = emitCloseTag(pos + 1);
					} else {
						const nextPos = emitOpenTag(pos + 1, true);
						state = nextPos > pos + 1 ? STATE_DATA : contentModeAfterOpenTag();
						pos = nextPos;
					}
				} else {
					// Anything else
					// This is an unexpected-solidus-in-tag parse error. Reconsume in the before
					// attribute name state.
					reportError("unexpected-solidus-in-tag", pos, pos + 1, "warning");
					state = STATE_BEFORE_ATTRIBUTE_NAME;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#markup-declaration-open-state
			case 13: // STATE_MARKUP_DECLARATION_OPEN
				// `--`: Consume those two characters, create a comment token with empty
				// data, and switch to the comment start state.
				if (
					cc === CC_HYPHEN_MINUS &&
					input.charCodeAt(pos + 1) === CC_HYPHEN_MINUS
				) {
					pos += 2;
					commentStart = tagStart;
					commentDataStart = pos;
					commentDataEnd = pos;
					state = STATE_COMMENT_START;
				} else if (
					// ASCII case-insensitive match for the word "DOCTYPE"
					// Consume those characters and switch to the DOCTYPE state.
					(cc === 0x44 || cc === 0x64) /* D or d */ &&
					(input.charCodeAt(pos + 1) | 0x20) === 0x6f /* o */ &&
					(input.charCodeAt(pos + 2) | 0x20) === 0x63 /* c */ &&
					(input.charCodeAt(pos + 3) | 0x20) === 0x74 /* t */ &&
					(input.charCodeAt(pos + 4) | 0x20) === 0x79 /* y */ &&
					(input.charCodeAt(pos + 5) | 0x20) === 0x70 /* p */ &&
					(input.charCodeAt(pos + 6) | 0x20) === 0x65 /* e */
				) {
					pos += 7;
					commentStart = tagStart;
					doctypeNameStart = -1;
					doctypeNameEnd = -1;
					doctypePublicStart = -1;
					doctypePublicEnd = -1;
					doctypeSystemStart = -1;
					doctypeSystemEnd = -1;
					doctypeForceQuirks = false;
					state = STATE_DOCTYPE;
				} else if (
					// `[CDATA[`: consume it and switch to CDATA section, but only with an
					// adjusted current node outside the HTML namespace. Elsewhere it is a
					// bogus comment whose data starts with the `[CDATA[`.
					cc === CC_LEFT_SQUARE_BRACKET &&
					input.charCodeAt(pos + 1) === 0x43 /* C */ &&
					input.charCodeAt(pos + 2) === 0x44 /* D */ &&
					input.charCodeAt(pos + 3) === 0x41 /* A */ &&
					input.charCodeAt(pos + 4) === 0x54 /* T */ &&
					input.charCodeAt(pos + 5) === 0x41 /* A */ &&
					input.charCodeAt(pos + 6) === CC_LEFT_SQUARE_BRACKET
				) {
					commentStart = tagStart;
					if (callbacks.isForeign !== undefined && callbacks.isForeign()) {
						pos += 7;
						state = STATE_CDATA_SECTION;
					} else {
						reportError("cdata-in-html-content", tagStart, pos + 7, "warning");
						state = STATE_BOGUS_COMMENT;
					}
					commentDataStart = pos;
					commentDataEnd = pos;
				} else {
					// Anything else: incorrectly-opened-comment parse error. Create a comment
					// token with empty data, switch to bogus comment (don't consume anything
					// in the current state).
					reportError("incorrectly-opened-comment", tagStart, pos, "warning");
					commentStart = tagStart;
					commentDataStart = pos;
					commentDataEnd = pos;
					state = STATE_BOGUS_COMMENT;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#comment-start-state
			case 14: // STATE_COMMENT_START
				// Consume the next input character:
				// U+002D HYPHEN-MINUS (-)
				// Switch to the comment start dash state.
				if (cc === CC_HYPHEN_MINUS) {
					state = STATE_COMMENT_START_DASH;
					pos++;
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// This is an abrupt-closing-of-empty-comment parse error. Switch to the
					// data state. Emit the current comment token.
					reportError(
						"abrupt-closing-of-empty-comment",
						pos,
						pos + 1,
						"warning"
					);
					let nextPos = pos + 1;
					if (callbacks.comment !== undefined) {
						nextPos = callbacks.comment(
							input,
							commentStart,
							pos + 1,
							commentDataStart,
							commentDataEnd
						);
					}
					state = STATE_DATA;
					textStart = nextPos;
					pos = nextPos;
				} else {
					// Anything else
					// Reconsume in the comment state.
					state = STATE_COMMENT;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#comment-start-dash-state
			case 15: // STATE_COMMENT_START_DASH
				// Consume the next input character:
				// U+002D HYPHEN-MINUS (-)
				// Switch to the comment end state.
				if (cc === CC_HYPHEN_MINUS) {
					state = STATE_COMMENT_END;
					pos++;
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// This is an abrupt-closing-of-empty-comment parse error. Switch to the
					// data state. Emit the current comment token.
					reportError(
						"abrupt-closing-of-empty-comment",
						pos,
						pos + 1,
						"warning"
					);
					let nextPos = pos + 1;
					if (callbacks.comment !== undefined) {
						nextPos = callbacks.comment(
							input,
							commentStart,
							pos + 1,
							commentDataStart,
							commentDataEnd
						);
					}
					state = STATE_DATA;
					textStart = nextPos;
					pos = nextPos;
				} else {
					// Anything else
					// Append a U+002D HYPHEN-MINUS character (-) to the comment token's data.
					// Reconsume in the comment state.
					commentDataEnd = pos;
					state = STATE_COMMENT;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#comment-state
			case 16: // STATE_COMMENT
				// Consume the next input character:
				// U+003C LESS-THAN SIGN (<)
				// Append a U+003C LESS-THAN SIGN character to the comment token's data. Switch to the comment less-than sign state.
				if (cc === CC_LESS_THAN) {
					state = STATE_COMMENT_LESS_THAN_SIGN;
					pos++;
					commentDataEnd = pos;
				} else if (cc === CC_HYPHEN_MINUS) {
					// Consume the next input character:
					// U+002D HYPHEN-MINUS (-)
					// Switch to the comment end dash state.
					state = STATE_COMMENT_END_DASH;
					pos++;
				} else {
					// U+0000 NULL: unexpected-null-character (append U+FFFD).
					if (cc === CC_NULL) {
						reportError("unexpected-null-character", pos, pos + 1, "warning");
					}
					// Fast-forward over ordinary comment text (same memoized
					// `indexOf` scheme as the data state); stop on `<` / `-` / NUL.
					pos++;
					if (nextLt < pos) {
						nextLt = input.indexOf("<", pos);
						if (nextLt === -1) nextLt = len;
					}
					if (nextHyphen < pos) {
						nextHyphen = input.indexOf("-", pos);
						if (nextHyphen === -1) nextHyphen = len;
					}
					if (nextNul < pos) {
						nextNul = input.indexOf("\0", pos);
						if (nextNul === -1) nextNul = len;
					}
					pos = Math.min(nextLt, nextHyphen, nextNul);
					commentDataEnd = pos;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#comment-end-dash-state
			case 17: // STATE_COMMENT_END_DASH
				// Consume the next input character:
				// U+002D HYPHEN-MINUS (-)
				// Switch to the comment end state.
				if (cc === CC_HYPHEN_MINUS) {
					state = STATE_COMMENT_END;
					pos++;
				} else {
					// Anything else: append a `-` to the comment data and reconsume in
					// comment, where NUL and `<` are handled.
					commentDataEnd = pos;
					state = STATE_COMMENT;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#comment-end-state
			case 18: // STATE_COMMENT_END
				// Consume the next input character:
				// U+003E GREATER-THAN SIGN (>)
				// Switch to the data state. Emit the current comment token.
				if (cc === CC_GREATER_THAN) {
					let nextPos = pos + 1;
					if (callbacks.comment !== undefined) {
						nextPos = callbacks.comment(
							input,
							commentStart,
							pos + 1,
							commentDataStart,
							commentDataEnd
						);
					}
					state = STATE_DATA;
					textStart = nextPos;
					pos = nextPos;
				} else if (cc === CC_EXCLAMATION_MARK) {
					// U+0021 EXCLAMATION MARK (!)
					// Switch to the comment end bang state.
					state = STATE_COMMENT_END_BANG;
					pos++;
				} else if (cc === CC_HYPHEN_MINUS) {
					// One of the two pending dashes joins the data; the other stays
					// pending, so the range grows by one rather than to `pos`.
					commentDataEnd++;
					pos++;
				} else {
					// Anything else: append two `-` to the comment data and reconsume in
					// comment, where NUL and `<` are handled.
					commentDataEnd = pos;
					state = STATE_COMMENT;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#comment-end-bang-state
			case 19: // STATE_COMMENT_END_BANG
				// `-`: Append two `-` and a `!` to the comment data, switch to comment end
				// dash.
				if (cc === CC_HYPHEN_MINUS) {
					commentDataEnd = pos;
					state = STATE_COMMENT_END_DASH;
					pos++;
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// This is an incorrectly-closed-comment parse error. Switch to the data
					// state. Emit the current comment token.
					reportError("incorrectly-closed-comment", pos, pos + 1, "warning");
					let nextPos = pos + 1;
					if (callbacks.comment !== undefined) {
						nextPos = callbacks.comment(
							input,
							commentStart,
							pos + 1,
							commentDataStart,
							commentDataEnd
						);
					}
					state = STATE_DATA;
					textStart = nextPos;
					pos = nextPos;
				} else {
					// Anything else: append two `-` and a `!` to the comment data and
					// reconsume in comment, where NUL and `<` are handled.
					commentDataEnd = pos;
					state = STATE_COMMENT;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#bogus-comment-state
			case 20: // STATE_BOGUS_COMMENT
				// Consume the next input character:
				// U+003E GREATER-THAN SIGN (>)
				// Switch to the data state. Emit the current comment token.
				if (cc === CC_GREATER_THAN) {
					let nextPos = pos + 1;
					if (callbacks.comment !== undefined) {
						nextPos = callbacks.comment(
							input,
							commentStart,
							pos + 1,
							commentDataStart,
							commentDataEnd
						);
					}
					state = STATE_DATA;
					textStart = nextPos;
					pos = nextPos;
				} else {
					// U+0000 NULL: unexpected-null-character (append U+FFFD).
					if (cc === CC_NULL) {
						reportError("unexpected-null-character", pos, pos + 1, "warning");
					}
					// Fast-forward over ordinary bogus-comment text (memoized `indexOf`
					// scheme); stop on `>` / NUL.
					pos++;
					if (nextGt < pos) {
						nextGt = input.indexOf(">", pos);
						if (nextGt === -1) nextGt = len;
					}
					if (nextNul < pos) {
						nextNul = input.indexOf("\0", pos);
						if (nextNul === -1) nextNul = len;
					}
					pos = Math.min(nextGt, nextNul);
					commentDataEnd = pos;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#comment-less-than-sign-state
			case 21: // STATE_COMMENT_LESS_THAN_SIGN
				// `!`: Append the input character to the comment data, switch to comment
				// less-than sign bang.
				if (cc === CC_EXCLAMATION_MARK) {
					state = STATE_COMMENT_LESS_THAN_SIGN_BANG;
					pos++;
					commentDataEnd = pos;
				} else if (cc === CC_LESS_THAN) {
					// U+003C LESS-THAN SIGN (<)
					// Append the current input character to the comment token's data.
					pos++;
					commentDataEnd = pos;
				} else {
					// Anything else
					// Reconsume in the comment state.
					state = STATE_COMMENT;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#comment-less-than-sign-bang-state
			case 22: // STATE_COMMENT_LESS_THAN_SIGN_BANG
				// Consume the next input character:
				// U+002D HYPHEN-MINUS (-)
				// Switch to the comment less-than sign bang dash state.
				if (cc === CC_HYPHEN_MINUS) {
					state = STATE_COMMENT_LESS_THAN_SIGN_BANG_DASH;
					pos++;
				} else {
					// Anything else
					// Reconsume in the comment state.
					state = STATE_COMMENT;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#comment-less-than-sign-bang-dash-state
			case 23: // STATE_COMMENT_LESS_THAN_SIGN_BANG_DASH
				// Consume the next input character:
				// U+002D HYPHEN-MINUS (-)
				// Switch to the comment less-than sign bang dash dash state.
				if (cc === CC_HYPHEN_MINUS) {
					state = STATE_COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH;
					pos++;
				} else {
					// Anything else
					// Reconsume in the comment end dash state.
					state = STATE_COMMENT_END_DASH;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#comment-less-than-sign-bang-dash-dash-state
			case 24: // STATE_COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH
				// `>` / EOF: reconsume in comment end. Anything else: nested-comment parse
				// error, reconsume in comment end.
				if (cc !== CC_GREATER_THAN) {
					reportError("nested-comment", pos, pos + 1, "warning");
				}
				state = STATE_COMMENT_END;
				// Reconsume
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#doctype-state
			case 25: // STATE_DOCTYPE
				// Whitespace (tab, LF, FF, space)
				// Switch to the before DOCTYPE name state.
				if (isAsciiWhitespace(cc)) {
					state = STATE_BEFORE_DOCTYPE_NAME;
					pos++;
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// Reconsume in the before DOCTYPE name state.
					state = STATE_BEFORE_DOCTYPE_NAME;
				} else {
					// Anything else
					// This is a missing-whitespace-before-doctype-name parse error. Reconsume
					// in the before DOCTYPE name state.
					reportError(
						"missing-whitespace-before-doctype-name",
						pos,
						pos + 1,
						"warning"
					);
					state = STATE_BEFORE_DOCTYPE_NAME;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#before-doctype-name-state
			case 26: // STATE_BEFORE_DOCTYPE_NAME
				// Whitespace (tab, LF, FF, space)
				// Ignore the character.
				if (isAsciiWhitespace(cc)) {
					pos++;
				} else if (cc === CC_NULL) {
					// NUL: unexpected-null-character parse error. Create a new DOCTYPE token.
					// Set the token's name to a U+FFFD, switch to DOCTYPE name.
					reportError("unexpected-null-character", pos, pos + 1, "warning");
					state = STATE_DOCTYPE_NAME;
					doctypeNameStart = pos;
					pos++;
					doctypeNameEnd = pos;
				} else if (cc === CC_GREATER_THAN) {
					// `>`: missing-doctype-name parse error. Create a new DOCTYPE token, force
					// quirks, switch to data. Emit the token.
					reportError("missing-doctype-name", pos, pos + 1, "warning");
					doctypeForceQuirks = true;
					let nextPos = pos + 1;
					if (callbacks.doctype !== undefined) {
						nextPos = callbacks.doctype(
							input,
							commentStart,
							pos + 1,
							doctypeNameStart,
							doctypeNameEnd,
							doctypePublicStart,
							doctypePublicEnd,
							doctypeSystemStart,
							doctypeSystemEnd,
							doctypeForceQuirks
						);
					}
					state = STATE_DATA;
					textStart = nextPos;
					pos = nextPos;
				} else {
					// ASCII upper alpha, and anything else: create a DOCTYPE token, set
					// its name to the input character - lowercased in the first case -
					// and switch to DOCTYPE name.
					state = STATE_DOCTYPE_NAME;
					doctypeNameStart = pos;
					pos++;
					doctypeNameEnd = pos;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#doctype-name-state
			case 27: // STATE_DOCTYPE_NAME
				// Whitespace (tab, LF, FF, space)
				// Switch to the after DOCTYPE name state.
				if (isAsciiWhitespace(cc)) {
					state = STATE_AFTER_DOCTYPE_NAME;
					pos++;
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// Switch to the data state. Emit the current DOCTYPE token.
					let nextPos = pos + 1;
					if (callbacks.doctype !== undefined) {
						nextPos = callbacks.doctype(
							input,
							commentStart,
							pos + 1,
							doctypeNameStart,
							doctypeNameEnd,
							doctypePublicStart,
							doctypePublicEnd,
							doctypeSystemStart,
							doctypeSystemEnd,
							doctypeForceQuirks
						);
					}
					state = STATE_DATA;
					textStart = nextPos;
					pos = nextPos;
				} else if (cc === CC_NULL) {
					// U+0000 NULL
					// This is an unexpected-null-character parse error. Append a U+FFFD
					// REPLACEMENT CHARACTER character to the current DOCTYPE token's name.
					reportError("unexpected-null-character", pos, pos + 1, "warning");
					pos++;
					doctypeNameEnd = pos;
				} else {
					// ASCII upper alpha: Append the lowercased input character to the DOCTYPE
					// token's name. Anything else: Append the input character to the DOCTYPE
					// token's name.
					pos++;
					doctypeNameEnd = pos;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#after-doctype-name-state
			case 28: // STATE_AFTER_DOCTYPE_NAME
				// Consume the next input character:
				if (isAsciiWhitespace(cc)) {
					// Whitespace (tab, LF, FF, space)
					// Ignore the character.
					pos++;
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// Switch to the data state. Emit the current DOCTYPE token.
					let nextPos = pos + 1;
					if (callbacks.doctype !== undefined) {
						nextPos = callbacks.doctype(
							input,
							commentStart,
							pos + 1,
							doctypeNameStart,
							doctypeNameEnd,
							doctypePublicStart,
							doctypePublicEnd,
							doctypeSystemStart,
							doctypeSystemEnd,
							doctypeForceQuirks
						);
					}
					state = STATE_DATA;
					textStart = nextPos;
					pos = nextPos;
				} else if (
					pos + 5 < len &&
					(cc === 0x50 || cc === 0x70) /* P or p */ &&
					(input.charCodeAt(pos + 1) | 0x20) === 0x75 /* u */ &&
					(input.charCodeAt(pos + 2) | 0x20) === 0x62 /* b */ &&
					(input.charCodeAt(pos + 3) | 0x20) === 0x6c /* l */ &&
					(input.charCodeAt(pos + 4) | 0x20) === 0x69 /* i */ &&
					(input.charCodeAt(pos + 5) | 0x20) === 0x63 /* c */
				) {
					// ASCII case-insensitive match for the word "PUBLIC"
					pos += 6;
					state = STATE_AFTER_DOCTYPE_PUBLIC_KEYWORD;
				} else if (
					pos + 5 < len &&
					(cc === 0x53 || cc === 0x73) /* S or s */ &&
					(input.charCodeAt(pos + 1) | 0x20) === 0x79 /* y */ &&
					(input.charCodeAt(pos + 2) | 0x20) === 0x73 /* s */ &&
					(input.charCodeAt(pos + 3) | 0x20) === 0x74 /* t */ &&
					(input.charCodeAt(pos + 4) | 0x20) === 0x65 /* e */ &&
					(input.charCodeAt(pos + 5) | 0x20) === 0x6d /* m */
				) {
					// ASCII case-insensitive match for the word "SYSTEM"
					pos += 6;
					state = STATE_AFTER_DOCTYPE_SYSTEM_KEYWORD;
				} else {
					// Anything else: invalid-character-sequence-after-doctype-name parse
					// error, force quirks, reconsume in bogus DOCTYPE.
					reportError(
						"invalid-character-sequence-after-doctype-name",
						pos,
						pos + 1,
						"warning"
					);
					doctypeForceQuirks = true;
					state = STATE_BOGUS_DOCTYPE;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#after-doctype-public-keyword-state
			case 29: // STATE_AFTER_DOCTYPE_PUBLIC_KEYWORD
				// Consume the next input character:
				if (isAsciiWhitespace(cc)) {
					// Whitespace (tab, LF, FF, space)
					// Switch to the before DOCTYPE public identifier state.
					state = STATE_BEFORE_DOCTYPE_PUBLIC_IDENTIFIER;
					pos++;
				} else if (cc === CC_QUOTATION_MARK) {
					// `"`: missing-whitespace-after-doctype-public-keyword parse error. Set
					// the DOCTYPE token's public identifier to the empty string (not missing),
					// then switch to the DOCTYPE public identifier (double-quoted) state.
					reportError(
						"missing-whitespace-after-doctype-public-keyword",
						pos,
						pos + 1,
						"warning"
					);
					state = STATE_DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED;
					pos++;
					doctypePublicStart = pos;
					doctypePublicEnd = pos;
				} else if (cc === CC_APOSTROPHE) {
					// `'`: missing-whitespace-after-doctype-public-keyword parse error. Set
					// the DOCTYPE token's public identifier to the empty string (not missing),
					// then switch to the DOCTYPE public identifier (single-quoted) state.
					reportError(
						"missing-whitespace-after-doctype-public-keyword",
						pos,
						pos + 1,
						"warning"
					);
					state = STATE_DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED;
					pos++;
					doctypePublicStart = pos;
					doctypePublicEnd = pos;
				} else if (cc === CC_GREATER_THAN) {
					// `>`: missing-doctype-public-identifier parse error, force quirks, switch
					// to data. Emit the DOCTYPE token.
					reportError(
						"missing-doctype-public-identifier",
						pos,
						pos + 1,
						"warning"
					);
					doctypeForceQuirks = true;
					let nextPos = pos + 1;
					if (callbacks.doctype !== undefined) {
						nextPos = callbacks.doctype(
							input,
							commentStart,
							pos + 1,
							doctypeNameStart,
							doctypeNameEnd,
							doctypePublicStart,
							doctypePublicEnd,
							doctypeSystemStart,
							doctypeSystemEnd,
							doctypeForceQuirks
						);
					}
					state = STATE_DATA;
					textStart = nextPos;
					pos = nextPos;
				} else {
					// Anything else: missing-quote-before-doctype-public-identifier parse
					// error, force quirks, reconsume in bogus DOCTYPE.
					reportError(
						"missing-quote-before-doctype-public-identifier",
						pos,
						pos + 1,
						"warning"
					);
					doctypeForceQuirks = true;
					state = STATE_BOGUS_DOCTYPE;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#before-doctype-public-identifier-state
			case 30: // STATE_BEFORE_DOCTYPE_PUBLIC_IDENTIFIER
				// Consume the next input character:
				if (isAsciiWhitespace(cc)) {
					// Whitespace (tab, LF, FF, space)
					// Ignore the character.
					pos++;
				} else if (cc === CC_QUOTATION_MARK) {
					// `"`: Set the DOCTYPE token's public identifier to the empty string (not
					// missing), then switch to the DOCTYPE public identifier (double-quoted)
					// state.
					state = STATE_DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED;
					pos++;
					doctypePublicStart = pos;
					doctypePublicEnd = pos;
				} else if (cc === CC_APOSTROPHE) {
					// `'`: Set the DOCTYPE token's public identifier to the empty string (not
					// missing), then switch to the DOCTYPE public identifier (single-quoted)
					// state.
					state = STATE_DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED;
					pos++;
					doctypePublicStart = pos;
					doctypePublicEnd = pos;
				} else if (cc === CC_GREATER_THAN) {
					// `>`: missing-doctype-public-identifier parse error, force quirks, switch
					// to data. Emit the DOCTYPE token.
					reportError(
						"missing-doctype-public-identifier",
						pos,
						pos + 1,
						"warning"
					);
					doctypeForceQuirks = true;
					let nextPos = pos + 1;
					if (callbacks.doctype !== undefined) {
						nextPos = callbacks.doctype(
							input,
							commentStart,
							pos + 1,
							doctypeNameStart,
							doctypeNameEnd,
							doctypePublicStart,
							doctypePublicEnd,
							doctypeSystemStart,
							doctypeSystemEnd,
							doctypeForceQuirks
						);
					}
					state = STATE_DATA;
					textStart = nextPos;
					pos = nextPos;
				} else {
					// Anything else: missing-quote-before-doctype-public-identifier parse
					// error, force quirks, reconsume in bogus DOCTYPE.
					reportError(
						"missing-quote-before-doctype-public-identifier",
						pos,
						pos + 1,
						"warning"
					);
					doctypeForceQuirks = true;
					state = STATE_BOGUS_DOCTYPE;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#doctype-public-identifier-(double-quoted)-state
			case 31: // STATE_DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED
				// Consume the next input character:
				if (cc === CC_QUOTATION_MARK) {
					// U+0022 QUOTATION MARK (")
					// Switch to the after DOCTYPE public identifier state.
					state = STATE_AFTER_DOCTYPE_PUBLIC_IDENTIFIER;
					pos++;
				} else if (cc === CC_NULL) {
					// NUL: unexpected-null-character parse error. Append a U+FFFD to the
					// DOCTYPE token's public identifier.
					reportError("unexpected-null-character", pos, pos + 1, "warning");
					pos++;
					doctypePublicEnd = pos;
				} else if (cc === CC_GREATER_THAN) {
					// `>`: abrupt-doctype-public-identifier parse error, force quirks, switch
					// to data. Emit the DOCTYPE token.
					reportError(
						"abrupt-doctype-public-identifier",
						pos,
						pos + 1,
						"warning"
					);
					doctypeForceQuirks = true;
					let nextPos = pos + 1;
					if (callbacks.doctype !== undefined) {
						nextPos = callbacks.doctype(
							input,
							commentStart,
							pos + 1,
							doctypeNameStart,
							doctypeNameEnd,
							doctypePublicStart,
							doctypePublicEnd,
							doctypeSystemStart,
							doctypeSystemEnd,
							doctypeForceQuirks
						);
					}
					state = STATE_DATA;
					textStart = nextPos;
					pos = nextPos;
				} else {
					// Anything else
					// Append the current input character to the current DOCTYPE token's public
					// identifier.
					pos++;
					doctypePublicEnd = pos;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#doctype-public-identifier-(single-quoted)-state
			case 32: // STATE_DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED
				// Consume the next input character:
				if (cc === CC_APOSTROPHE) {
					// U+0027 APOSTROPHE (')
					// Switch to the after DOCTYPE public identifier state.
					state = STATE_AFTER_DOCTYPE_PUBLIC_IDENTIFIER;
					pos++;
				} else if (cc === CC_NULL) {
					// NUL: unexpected-null-character parse error. Append a U+FFFD to the
					// DOCTYPE token's public identifier.
					reportError("unexpected-null-character", pos, pos + 1, "warning");
					pos++;
					doctypePublicEnd = pos;
				} else if (cc === CC_GREATER_THAN) {
					// `>`: abrupt-doctype-public-identifier parse error, force quirks, switch
					// to data. Emit the DOCTYPE token.
					reportError(
						"abrupt-doctype-public-identifier",
						pos,
						pos + 1,
						"warning"
					);
					doctypeForceQuirks = true;
					let nextPos = pos + 1;
					if (callbacks.doctype !== undefined) {
						nextPos = callbacks.doctype(
							input,
							commentStart,
							pos + 1,
							doctypeNameStart,
							doctypeNameEnd,
							doctypePublicStart,
							doctypePublicEnd,
							doctypeSystemStart,
							doctypeSystemEnd,
							doctypeForceQuirks
						);
					}
					state = STATE_DATA;
					textStart = nextPos;
					pos = nextPos;
				} else {
					// Anything else
					// Append the current input character to the current DOCTYPE token's public
					// identifier.
					pos++;
					doctypePublicEnd = pos;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#after-doctype-public-identifier-state
			case 33: // STATE_AFTER_DOCTYPE_PUBLIC_IDENTIFIER
				// Consume the next input character:
				if (isAsciiWhitespace(cc)) {
					// Whitespace (tab, LF, FF, space)
					// Switch to the between DOCTYPE public and system identifiers state.
					state = STATE_BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS;
					pos++;
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// Switch to the data state. Emit the current DOCTYPE token.
					let nextPos = pos + 1;
					if (callbacks.doctype !== undefined) {
						nextPos = callbacks.doctype(
							input,
							commentStart,
							pos + 1,
							doctypeNameStart,
							doctypeNameEnd,
							doctypePublicStart,
							doctypePublicEnd,
							doctypeSystemStart,
							doctypeSystemEnd,
							doctypeForceQuirks
						);
					}
					state = STATE_DATA;
					textStart = nextPos;
					pos = nextPos;
				} else if (cc === CC_QUOTATION_MARK) {
					// `"`: missing-whitespace-between-doctype-public-and-system-identifiers
					// parse error. Set the system identifier to empty (not missing), then
					// switch to DOCTYPE system identifier (double-quoted).
					reportError(
						"missing-whitespace-between-doctype-public-and-system-identifiers",
						pos,
						pos + 1,
						"warning"
					);
					state = STATE_DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;
					pos++;
					doctypeSystemStart = pos;
					doctypeSystemEnd = pos;
				} else if (cc === CC_APOSTROPHE) {
					// `'`: missing-whitespace-between-doctype-public-and-system-identifiers
					// parse error. Set the system identifier to empty (not missing), then
					// switch to DOCTYPE system identifier (single-quoted).
					reportError(
						"missing-whitespace-between-doctype-public-and-system-identifiers",
						pos,
						pos + 1,
						"warning"
					);
					state = STATE_DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
					pos++;
					doctypeSystemStart = pos;
					doctypeSystemEnd = pos;
				} else {
					// Anything else: missing-quote-before-doctype-system-identifier parse
					// error, force quirks, reconsume in bogus DOCTYPE.
					reportError(
						"missing-quote-before-doctype-system-identifier",
						pos,
						pos + 1,
						"warning"
					);
					doctypeForceQuirks = true;
					state = STATE_BOGUS_DOCTYPE;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#between-doctype-public-and-system-identifiers-state
			case 34: // STATE_BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS
				// Consume the next input character:
				if (isAsciiWhitespace(cc)) {
					// Whitespace (tab, LF, FF, space)
					// Ignore the character.
					pos++;
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// Switch to the data state. Emit the current DOCTYPE token.
					let nextPos = pos + 1;
					if (callbacks.doctype !== undefined) {
						nextPos = callbacks.doctype(
							input,
							commentStart,
							pos + 1,
							doctypeNameStart,
							doctypeNameEnd,
							doctypePublicStart,
							doctypePublicEnd,
							doctypeSystemStart,
							doctypeSystemEnd,
							doctypeForceQuirks
						);
					}
					state = STATE_DATA;
					textStart = nextPos;
					pos = nextPos;
				} else if (cc === CC_QUOTATION_MARK) {
					// `"`: Set the DOCTYPE token's system identifier to the empty string (not
					// missing), then switch to the DOCTYPE system identifier (double-quoted)
					// state.
					state = STATE_DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;
					pos++;
					doctypeSystemStart = pos;
					doctypeSystemEnd = pos;
				} else if (cc === CC_APOSTROPHE) {
					// `'`: Set the DOCTYPE token's system identifier to the empty string (not
					// missing), then switch to the DOCTYPE system identifier (single-quoted)
					// state.
					state = STATE_DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
					pos++;
					doctypeSystemStart = pos;
					doctypeSystemEnd = pos;
				} else {
					// Anything else: missing-quote-before-doctype-system-identifier parse
					// error, force quirks, reconsume in bogus DOCTYPE.
					reportError(
						"missing-quote-before-doctype-system-identifier",
						pos,
						pos + 1,
						"warning"
					);
					doctypeForceQuirks = true;
					state = STATE_BOGUS_DOCTYPE;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#after-doctype-system-keyword-state
			case 35: // STATE_AFTER_DOCTYPE_SYSTEM_KEYWORD
				// Consume the next input character:
				if (isAsciiWhitespace(cc)) {
					// Whitespace (tab, LF, FF, space)
					// Switch to the before DOCTYPE system identifier state.
					state = STATE_BEFORE_DOCTYPE_SYSTEM_IDENTIFIER;
					pos++;
				} else if (cc === CC_QUOTATION_MARK) {
					// `"`: missing-whitespace-after-doctype-system-keyword parse error. Set
					// the DOCTYPE token's system identifier to the empty string (not missing),
					// then switch to the DOCTYPE system identifier (double-quoted) state.
					reportError(
						"missing-whitespace-after-doctype-system-keyword",
						pos,
						pos + 1,
						"warning"
					);
					state = STATE_DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;
					pos++;
					doctypeSystemStart = pos;
					doctypeSystemEnd = pos;
				} else if (cc === CC_APOSTROPHE) {
					// `'`: missing-whitespace-after-doctype-system-keyword parse error. Set
					// the DOCTYPE token's system identifier to the empty string (not missing),
					// then switch to the DOCTYPE system identifier (single-quoted) state.
					reportError(
						"missing-whitespace-after-doctype-system-keyword",
						pos,
						pos + 1,
						"warning"
					);
					state = STATE_DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
					pos++;
					doctypeSystemStart = pos;
					doctypeSystemEnd = pos;
				} else if (cc === CC_GREATER_THAN) {
					// `>`: missing-doctype-system-identifier parse error, force quirks, switch
					// to data. Emit the DOCTYPE token.
					reportError(
						"missing-doctype-system-identifier",
						pos,
						pos + 1,
						"warning"
					);
					doctypeForceQuirks = true;
					let nextPos = pos + 1;
					if (callbacks.doctype !== undefined) {
						nextPos = callbacks.doctype(
							input,
							commentStart,
							pos + 1,
							doctypeNameStart,
							doctypeNameEnd,
							doctypePublicStart,
							doctypePublicEnd,
							doctypeSystemStart,
							doctypeSystemEnd,
							doctypeForceQuirks
						);
					}
					state = STATE_DATA;
					textStart = nextPos;
					pos = nextPos;
				} else {
					// Anything else: missing-quote-before-doctype-system-identifier parse
					// error, force quirks, reconsume in bogus DOCTYPE.
					reportError(
						"missing-quote-before-doctype-system-identifier",
						pos,
						pos + 1,
						"warning"
					);
					doctypeForceQuirks = true;
					state = STATE_BOGUS_DOCTYPE;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#before-doctype-system-identifier-state
			case 36: // STATE_BEFORE_DOCTYPE_SYSTEM_IDENTIFIER
				// Consume the next input character:
				if (isAsciiWhitespace(cc)) {
					// Whitespace (tab, LF, FF, space)
					// Ignore the character.
					pos++;
				} else if (cc === CC_QUOTATION_MARK) {
					// `"`: Set the DOCTYPE token's system identifier to the empty string (not
					// missing), then switch to the DOCTYPE system identifier (double-quoted)
					// state.
					state = STATE_DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;
					pos++;
					doctypeSystemStart = pos;
					doctypeSystemEnd = pos;
				} else if (cc === CC_APOSTROPHE) {
					// `'`: Set the DOCTYPE token's system identifier to the empty string (not
					// missing), then switch to the DOCTYPE system identifier (single-quoted)
					// state.
					state = STATE_DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
					pos++;
					doctypeSystemStart = pos;
					doctypeSystemEnd = pos;
				} else if (cc === CC_GREATER_THAN) {
					// `>`: missing-doctype-system-identifier parse error, force quirks, switch
					// to data. Emit the DOCTYPE token.
					reportError(
						"missing-doctype-system-identifier",
						pos,
						pos + 1,
						"warning"
					);
					doctypeForceQuirks = true;
					let nextPos = pos + 1;
					if (callbacks.doctype !== undefined) {
						nextPos = callbacks.doctype(
							input,
							commentStart,
							pos + 1,
							doctypeNameStart,
							doctypeNameEnd,
							doctypePublicStart,
							doctypePublicEnd,
							doctypeSystemStart,
							doctypeSystemEnd,
							doctypeForceQuirks
						);
					}
					state = STATE_DATA;
					textStart = nextPos;
					pos = nextPos;
				} else {
					// Anything else: missing-quote-before-doctype-system-identifier parse
					// error, force quirks, reconsume in bogus DOCTYPE.
					reportError(
						"missing-quote-before-doctype-system-identifier",
						pos,
						pos + 1,
						"warning"
					);
					doctypeForceQuirks = true;
					state = STATE_BOGUS_DOCTYPE;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#doctype-system-identifier-(double-quoted)-state
			case 37: // STATE_DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED
				// Consume the next input character:
				if (cc === CC_QUOTATION_MARK) {
					// U+0022 QUOTATION MARK (")
					// Switch to the after DOCTYPE system identifier state.
					state = STATE_AFTER_DOCTYPE_SYSTEM_IDENTIFIER;
					pos++;
				} else if (cc === CC_NULL) {
					// NUL: unexpected-null-character parse error. Append a U+FFFD to the
					// DOCTYPE token's system identifier.
					reportError("unexpected-null-character", pos, pos + 1, "warning");
					pos++;
					doctypeSystemEnd = pos;
				} else if (cc === CC_GREATER_THAN) {
					// `>`: abrupt-doctype-system-identifier parse error, force quirks, switch
					// to data. Emit the DOCTYPE token.
					reportError(
						"abrupt-doctype-system-identifier",
						pos,
						pos + 1,
						"warning"
					);
					doctypeForceQuirks = true;
					let nextPos = pos + 1;
					if (callbacks.doctype !== undefined) {
						nextPos = callbacks.doctype(
							input,
							commentStart,
							pos + 1,
							doctypeNameStart,
							doctypeNameEnd,
							doctypePublicStart,
							doctypePublicEnd,
							doctypeSystemStart,
							doctypeSystemEnd,
							doctypeForceQuirks
						);
					}
					state = STATE_DATA;
					textStart = nextPos;
					pos = nextPos;
				} else {
					// Anything else
					// Append the current input character to the current DOCTYPE token's system
					// identifier.
					pos++;
					doctypeSystemEnd = pos;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#doctype-system-identifier-(single-quoted)-state
			case 38: // STATE_DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED
				// Consume the next input character:
				if (cc === CC_APOSTROPHE) {
					// U+0027 APOSTROPHE (')
					// Switch to the after DOCTYPE system identifier state.
					state = STATE_AFTER_DOCTYPE_SYSTEM_IDENTIFIER;
					pos++;
				} else if (cc === CC_NULL) {
					// NUL: unexpected-null-character parse error. Append a U+FFFD to the
					// DOCTYPE token's system identifier.
					reportError("unexpected-null-character", pos, pos + 1, "warning");
					pos++;
					doctypeSystemEnd = pos;
				} else if (cc === CC_GREATER_THAN) {
					// `>`: abrupt-doctype-system-identifier parse error, force quirks, switch
					// to data. Emit the DOCTYPE token.
					reportError(
						"abrupt-doctype-system-identifier",
						pos,
						pos + 1,
						"warning"
					);
					doctypeForceQuirks = true;
					let nextPos = pos + 1;
					if (callbacks.doctype !== undefined) {
						nextPos = callbacks.doctype(
							input,
							commentStart,
							pos + 1,
							doctypeNameStart,
							doctypeNameEnd,
							doctypePublicStart,
							doctypePublicEnd,
							doctypeSystemStart,
							doctypeSystemEnd,
							doctypeForceQuirks
						);
					}
					state = STATE_DATA;
					textStart = nextPos;
					pos = nextPos;
				} else {
					// Anything else
					// Append the current input character to the current DOCTYPE token's system
					// identifier.
					pos++;
					doctypeSystemEnd = pos;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#after-doctype-system-identifier-state
			case 39: // STATE_AFTER_DOCTYPE_SYSTEM_IDENTIFIER
				// Consume the next input character:
				if (isAsciiWhitespace(cc)) {
					// Whitespace (tab, LF, FF, space)
					// Ignore the character.
					pos++;
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// Switch to the data state. Emit the current DOCTYPE token.
					let nextPos = pos + 1;
					if (callbacks.doctype !== undefined) {
						nextPos = callbacks.doctype(
							input,
							commentStart,
							pos + 1,
							doctypeNameStart,
							doctypeNameEnd,
							doctypePublicStart,
							doctypePublicEnd,
							doctypeSystemStart,
							doctypeSystemEnd,
							doctypeForceQuirks
						);
					}
					state = STATE_DATA;
					textStart = nextPos;
					pos = nextPos;
				} else {
					// Anything else: unexpected-character-after-doctype-system-identifier
					// parse error, reconsume in bogus DOCTYPE. (This does not set the DOCTYPE
					// token's force-quirks flag to on.)
					reportError(
						"unexpected-character-after-doctype-system-identifier",
						pos,
						pos + 1,
						"warning"
					);
					state = STATE_BOGUS_DOCTYPE;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#bogus-doctype-state
			case 40: // STATE_BOGUS_DOCTYPE
				// Consume the next input character:
				if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// Switch to the data state. Emit the DOCTYPE token.
					let nextPos = pos + 1;
					if (callbacks.doctype !== undefined) {
						nextPos = callbacks.doctype(
							input,
							commentStart,
							pos + 1,
							doctypeNameStart,
							doctypeNameEnd,
							doctypePublicStart,
							doctypePublicEnd,
							doctypeSystemStart,
							doctypeSystemEnd,
							doctypeForceQuirks
						);
					}
					state = STATE_DATA;
					textStart = nextPos;
					pos = nextPos;
				} else if (cc === CC_NULL) {
					// U+0000 NULL
					// This is an unexpected-null-character parse error. Ignore the character.
					reportError("unexpected-null-character", pos, pos + 1, "warning");
					pos++;
				} else {
					// Anything else
					// Ignore the character.
					pos++;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#cdata-section-state
			case 41: // STATE_CDATA_SECTION
				// Consume the next input character:
				// U+005D RIGHT SQUARE BRACKET (])
				// Switch to the CDATA section bracket state.
				if (cc === CC_RIGHT_SQUARE_BRACKET) {
					state = STATE_CDATA_SECTION_BRACKET;
					pos++;
				} else if (cc === CC_NULL) {
					// U+0000 NULL is an unexpected-null-character parse error.
					reportError("unexpected-null-character", pos, pos + 1, "warning");
					pos++;
				} else {
					// Anything else: emit the input character. Fast-forwards to the
					// next `]` or NUL, the code points with arcs of their own, in one
					// scan each - both memoized, so neither rescans per character.
					pos++;
					if (nextBracket < pos) {
						nextBracket = input.indexOf("]", pos);
						if (nextBracket === -1) nextBracket = len;
					}
					if (nextNul < pos) {
						nextNul = input.indexOf("\0", pos);
						if (nextNul === -1) nextNul = len;
					}
					pos = Math.min(nextBracket, nextNul);
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#cdata-section-bracket-state
			case 42: // STATE_CDATA_SECTION_BRACKET
				// Consume the next input character:
				// U+005D RIGHT SQUARE BRACKET (])
				// Switch to the CDATA section end state.
				if (cc === CC_RIGHT_SQUARE_BRACKET) {
					state = STATE_CDATA_SECTION_END;
					pos++;
				} else {
					// Anything else
					// Emit a U+005D RIGHT SQUARE BRACKET character token. Reconsume in the
					// CDATA section state.
					state = STATE_CDATA_SECTION;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#cdata-section-end-state
			case 43: // STATE_CDATA_SECTION_END
				// Consume the next input character:
				// U+005D RIGHT SQUARE BRACKET (])
				// Emit a U+005D RIGHT SQUARE BRACKET character token.
				if (cc === CC_RIGHT_SQUARE_BRACKET) {
					pos++;
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// Switch to the data state. The `]]` just consumed closes the
					// section rather than joining its content.
					commentDataEnd = pos - 2;
					let nextPos = pos + 1;
					if (callbacks.comment !== undefined) {
						nextPos = callbacks.comment(
							input,
							commentStart,
							pos + 1,
							commentDataStart,
							commentDataEnd
						);
					}
					state = STATE_DATA;
					textStart = nextPos;
					pos = nextPos;
				} else {
					// Anything else
					// Emit two U+005D RIGHT SQUARE BRACKET character tokens. Reconsume in the
					// CDATA section state.
					state = STATE_CDATA_SECTION;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#rcdata-state
			case 44: // STATE_RCDATA
				// Consume the next input character:
				if (cc === CC_AMPERSAND) {
					// `&`: Set the return state to the RCDATA state, switch to character
					// reference. (RCDATA processes references; RAWTEXT/script/PLAINTEXT do
					// not.)
					returnState = STATE_RCDATA;
					state = STATE_CHARACTER_REFERENCE;
					pos++;
				} else if (cc === CC_LESS_THAN) {
					// U+003C LESS-THAN SIGN (<)
					// Switch to the RCDATA less-than sign state.
					tagStart = pos;
					state = STATE_RCDATA_LESS_THAN_SIGN;
					pos++;
				} else if (cc === CC_NULL) {
					// U+0000 NULL is an unexpected-null-character parse error.
					reportError("unexpected-null-character", pos, pos + 1, "warning");
					pos++;
				} else {
					// Fast-forward over ordinary RCDATA text (same memoized
					// `indexOf` scheme as the data state) - batches only this
					// state's "anything else" arc; `&` / `<` / NUL keep their own.
					pos++;
					if (nextLt < pos) {
						nextLt = input.indexOf("<", pos);
						if (nextLt === -1) nextLt = len;
					}
					if (nextAmp < pos) {
						nextAmp = input.indexOf("&", pos);
						if (nextAmp === -1) nextAmp = len;
					}
					if (nextNul < pos) {
						nextNul = input.indexOf("\0", pos);
						if (nextNul === -1) nextNul = len;
					}
					pos = Math.min(nextLt, nextAmp, nextNul);
					// Fused: take this state's `<` arc without another dispatch.
					if (pos === nextLt && pos < len) {
						tagStart = pos;
						state = STATE_RCDATA_LESS_THAN_SIGN;
						pos++;
					}
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#rcdata-less-than-sign-state
			case 45: // STATE_RCDATA_LESS_THAN_SIGN
				// `/`: switch to RCDATA end tag open. (Spec sets a temporary buffer here;
				// we track the would-be content via offset ranges instead.)
				if (cc === CC_SOLIDUS) {
					state = STATE_RCDATA_END_TAG_OPEN;
					pos++;
				} else {
					// Anything else
					// Emit a U+003C LESS-THAN SIGN character token. Reconsume in the RCDATA
					// state.
					state = STATE_RCDATA;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#rcdata-end-tag-open-state
			case 46: // STATE_RCDATA_END_TAG_OPEN
				// ASCII alpha: Create a new end tag token, set its tag name to the empty
				// string, reconsume in RCDATA end tag name.
				if (isAsciiAlpha(cc)) {
					tagNameStart = pos;
					state = STATE_RCDATA_END_TAG_NAME;
					// Reconsume
				} else {
					// Anything else
					// Emit a U+003C LESS-THAN SIGN character token and a U+002F SOLIDUS
					// character token. Reconsume in the RCDATA state.
					state = STATE_RCDATA;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#rcdata-end-tag-name-state
			case 47: // STATE_RCDATA_END_TAG_NAME
				// Whitespace (tab, LF, FF, space): If the current end tag token is an
				// appropriate end tag token, then switch to the before attribute name
				// state. Otherwise, treat it as per the "anything else" entry below.
				if (isAsciiWhitespace(cc)) {
					tagNameEnd = pos;
					if (
						rangeAsciiCaseInsensitiveMatch(
							input,
							tagNameStart,
							tagNameEnd,
							lastOpenTagName
						)
					) {
						flushText(tagStart);
						state = STATE_BEFORE_ATTRIBUTE_NAME;
						pos++;
					} else {
						state = STATE_RCDATA;
						// Reconsume
					}
				} else if (cc === CC_SOLIDUS) {
					// `/`: If the current end tag token is an appropriate end tag token, then
					// switch to the self-closing start tag state. Otherwise, treat it as per
					// the "anything else" entry below.
					tagNameEnd = pos;
					if (
						rangeAsciiCaseInsensitiveMatch(
							input,
							tagNameStart,
							tagNameEnd,
							lastOpenTagName
						)
					) {
						flushText(tagStart);
						state = STATE_SELF_CLOSING_START_TAG;
						pos++;
					} else {
						state = STATE_RCDATA;
						// Reconsume
					}
				} else if (cc === CC_GREATER_THAN) {
					// `>`: If the current end tag token is an appropriate end tag token, then
					// switch to the data state and emit the tag token. Otherwise, treat it as
					// per the "anything else" entry below.
					tagNameEnd = pos;
					if (
						rangeAsciiCaseInsensitiveMatch(
							input,
							tagNameStart,
							tagNameEnd,
							lastOpenTagName
						)
					) {
						flushText(tagStart);
						state = STATE_DATA;
						pos = emitCloseTag(pos + 1);
					} else {
						state = STATE_RCDATA;
						// Reconsume
					}
				} else if (isAsciiAlpha(cc)) {
					// ASCII alpha: append it lowercased to the tag name and as written to
					// the temporary buffer. Fused, so the whole run is one dispatch.
					pos++;
					while (pos < len && isAsciiAlpha(input.charCodeAt(pos))) pos++;
				} else {
					// Anything else: emit `<`, `/` and the temporary buffer in order,
					// then reconsume in RCDATA.
					state = STATE_RCDATA;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#rawtext-state
			case 48: // STATE_RAWTEXT
				// Consume the next input character:
				// U+003C LESS-THAN SIGN (<)
				// Switch to the RAWTEXT less-than sign state.
				if (cc === CC_LESS_THAN) {
					tagStart = pos;
					state = STATE_RAWTEXT_LESS_THAN_SIGN;
					pos++;
				} else if (cc === CC_NULL) {
					// U+0000 NULL is an unexpected-null-character parse error.
					reportError("unexpected-null-character", pos, pos + 1, "warning");
					pos++;
				} else {
					// Fast-forward over ordinary RAWTEXT text (same memoized
					// `indexOf` scheme as the data state) - batches only this
					// state's "anything else" arc; `<` / NUL keep their own.
					pos++;
					if (nextLt < pos) {
						nextLt = input.indexOf("<", pos);
						if (nextLt === -1) nextLt = len;
					}
					if (nextNul < pos) {
						nextNul = input.indexOf("\0", pos);
						if (nextNul === -1) nextNul = len;
					}
					pos = Math.min(nextLt, nextNul);
					// Fused: take this state's `<` arc without another dispatch.
					if (pos === nextLt && pos < len) {
						tagStart = pos;
						state = STATE_RAWTEXT_LESS_THAN_SIGN;
						pos++;
					}
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#rawtext-less-than-sign-state
			case 49: // STATE_RAWTEXT_LESS_THAN_SIGN
				// `/`: switch to RAWTEXT end tag open. (Spec sets a temporary buffer here;
				// we track via offset ranges instead.)
				if (cc === CC_SOLIDUS) {
					state = STATE_RAWTEXT_END_TAG_OPEN;
					pos++;
				} else {
					// Anything else
					// Emit a U+003C LESS-THAN SIGN character token. Reconsume in the RAWTEXT
					// state.
					state = STATE_RAWTEXT;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#rawtext-end-tag-open-state
			case 50: // STATE_RAWTEXT_END_TAG_OPEN
				// ASCII alpha: Create a new end tag token, set its tag name to the empty
				// string, reconsume in RAWTEXT end tag name.
				if (isAsciiAlpha(cc)) {
					tagNameStart = pos;
					state = STATE_RAWTEXT_END_TAG_NAME;
					// Reconsume
				} else {
					// Anything else
					// Emit a U+003C LESS-THAN SIGN character token and a U+002F SOLIDUS
					// character token. Reconsume in the RAWTEXT state.
					state = STATE_RAWTEXT;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#rawtext-end-tag-name-state
			case 51: // STATE_RAWTEXT_END_TAG_NAME
				// Whitespace (tab, LF, FF, space): If the current end tag token is an
				// appropriate end tag token, then switch to the before attribute name
				// state. Otherwise, treat it as per the "anything else" entry below.
				if (isAsciiWhitespace(cc)) {
					tagNameEnd = pos;
					if (
						rangeAsciiCaseInsensitiveMatch(
							input,
							tagNameStart,
							tagNameEnd,
							lastOpenTagName
						)
					) {
						flushText(tagStart);
						state = STATE_BEFORE_ATTRIBUTE_NAME;
						pos++;
					} else {
						state = STATE_RAWTEXT;
					}
				} else if (cc === CC_SOLIDUS) {
					// `/`: If the current end tag token is an appropriate end tag token, then
					// switch to the self-closing start tag state. Otherwise, treat it as per
					// the "anything else" entry below.
					tagNameEnd = pos;
					if (
						rangeAsciiCaseInsensitiveMatch(
							input,
							tagNameStart,
							tagNameEnd,
							lastOpenTagName
						)
					) {
						flushText(tagStart);
						state = STATE_SELF_CLOSING_START_TAG;
						pos++;
					} else {
						state = STATE_RAWTEXT;
					}
				} else if (cc === CC_GREATER_THAN) {
					// `>`: If the current end tag token is an appropriate end tag token, then
					// switch to the data state and emit the tag token. Otherwise, treat it as
					// per the "anything else" entry below.
					tagNameEnd = pos;
					if (
						rangeAsciiCaseInsensitiveMatch(
							input,
							tagNameStart,
							tagNameEnd,
							lastOpenTagName
						)
					) {
						flushText(tagStart);
						state = STATE_DATA;
						pos = emitCloseTag(pos + 1);
					} else {
						state = STATE_RAWTEXT;
					}
				} else if (isAsciiAlpha(cc)) {
					// ASCII alpha: append it lowercased to the tag name and as written to
					// the temporary buffer. Fused, so the whole run is one dispatch.
					pos++;
					while (pos < len && isAsciiAlpha(input.charCodeAt(pos))) pos++;
				} else {
					// Anything else: emit `<`, `/` and the temporary buffer in order,
					// then reconsume in RAWTEXT.
					state = STATE_RAWTEXT;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#script-data-state
			case 52: // STATE_SCRIPT_DATA
				// Consume the next input character:
				// U+003C LESS-THAN SIGN (<)
				// Switch to the script data less-than sign state.
				if (cc === CC_LESS_THAN) {
					tagStart = pos;
					state = STATE_SCRIPT_DATA_LESS_THAN_SIGN;
					pos++;
				} else if (cc === CC_NULL) {
					// U+0000 NULL is an unexpected-null-character parse error.
					reportError("unexpected-null-character", pos, pos + 1, "warning");
					pos++;
				} else {
					// Fast-forward over ordinary script-data text (same memoized
					// `indexOf` scheme as the data state) - batches only this
					// state's "anything else" arc; `<` / NUL keep their own.
					pos++;
					if (nextLt < pos) {
						nextLt = input.indexOf("<", pos);
						if (nextLt === -1) nextLt = len;
					}
					if (nextNul < pos) {
						nextNul = input.indexOf("\0", pos);
						if (nextNul === -1) nextNul = len;
					}
					pos = Math.min(nextLt, nextNul);
					// Fused: take this state's `<` arc without another dispatch.
					if (pos === nextLt && pos < len) {
						tagStart = pos;
						state = STATE_SCRIPT_DATA_LESS_THAN_SIGN;
						pos++;
					}
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#script-data-less-than-sign-state
			case 53: // STATE_SCRIPT_DATA_LESS_THAN_SIGN
				// `/`: switch to script data end tag open. (Spec sets a temporary buffer
				// here; we track via offset ranges instead.)
				if (cc === CC_SOLIDUS) {
					state = STATE_SCRIPT_DATA_END_TAG_OPEN;
					pos++;
				} else if (cc === CC_EXCLAMATION_MARK) {
					// U+0021 EXCLAMATION MARK (!)
					// Switch to the script data escape start state. Emit a U+003C LESS-THAN
					// SIGN character token and a U+0021 EXCLAMATION MARK character token.
					state = STATE_SCRIPT_DATA_ESCAPE_START;
					pos++;
				} else {
					// Anything else
					// Emit a U+003C LESS-THAN SIGN character token. Reconsume in the script
					// data state.
					state = STATE_SCRIPT_DATA;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#script-data-end-tag-open-state
			case 54: // STATE_SCRIPT_DATA_END_TAG_OPEN
				// ASCII alpha: Create a new end tag token, set its tag name to the empty
				// string, reconsume in script data end tag name.
				if (isAsciiAlpha(cc)) {
					tagNameStart = pos;
					state = STATE_SCRIPT_DATA_END_TAG_NAME;
					// Reconsume
				} else {
					// Anything else
					// Emit a U+003C LESS-THAN SIGN character token and a U+002F SOLIDUS
					// character token. Reconsume in the script data state.
					state = STATE_SCRIPT_DATA;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#script-data-end-tag-name-state
			case 55: // STATE_SCRIPT_DATA_END_TAG_NAME
				// Whitespace (tab, LF, FF, space): If the current end tag token is an
				// appropriate end tag token, then switch to the before attribute name
				// state. Otherwise, treat it as per the "anything else" entry below.
				if (isAsciiWhitespace(cc)) {
					tagNameEnd = pos;
					if (
						rangeAsciiCaseInsensitiveMatch(
							input,
							tagNameStart,
							tagNameEnd,
							lastOpenTagName
						)
					) {
						flushText(tagStart);
						state = STATE_BEFORE_ATTRIBUTE_NAME;
						pos++;
					} else {
						state = STATE_SCRIPT_DATA;
					}
				} else if (cc === CC_SOLIDUS) {
					// `/`: If the current end tag token is an appropriate end tag token, then
					// switch to the self-closing start tag state. Otherwise, treat it as per
					// the "anything else" entry below.
					tagNameEnd = pos;
					if (
						rangeAsciiCaseInsensitiveMatch(
							input,
							tagNameStart,
							tagNameEnd,
							lastOpenTagName
						)
					) {
						flushText(tagStart);
						state = STATE_SELF_CLOSING_START_TAG;
						pos++;
					} else {
						state = STATE_SCRIPT_DATA;
					}
				} else if (cc === CC_GREATER_THAN) {
					// `>`: If the current end tag token is an appropriate end tag token, then
					// switch to the data state and emit the tag token. Otherwise, treat it as
					// per the "anything else" entry below.
					tagNameEnd = pos;
					if (
						rangeAsciiCaseInsensitiveMatch(
							input,
							tagNameStart,
							tagNameEnd,
							lastOpenTagName
						)
					) {
						flushText(tagStart);
						state = STATE_DATA;
						pos = emitCloseTag(pos + 1);
					} else {
						state = STATE_SCRIPT_DATA;
					}
				} else if (isAsciiAlpha(cc)) {
					// ASCII upper alpha / ASCII lower alpha
					// Fused: consume the whole alpha run in one dispatch.
					pos++;
					while (pos < len && isAsciiAlpha(input.charCodeAt(pos))) pos++;
				} else {
					// Anything else: emit `<`, `/` and the temporary buffer in order,
					// then reconsume in script data.
					state = STATE_SCRIPT_DATA;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#script-data-escape-start-state
			case 56: // STATE_SCRIPT_DATA_ESCAPE_START
				// `-`: switch to script data escape start dash. Emit a U+002D HYPHEN-MINUS
				// character token.
				if (cc === CC_HYPHEN_MINUS) {
					state = STATE_SCRIPT_DATA_ESCAPE_START_DASH;
					pos++;
				} else {
					// Anything else
					// Reconsume in the script data state.
					state = STATE_SCRIPT_DATA;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#script-data-escape-start-dash-state
			case 57: // STATE_SCRIPT_DATA_ESCAPE_START_DASH
				// `-`: switch to script data escaped dash dash. Emit a U+002D HYPHEN-MINUS
				// character token.
				if (cc === CC_HYPHEN_MINUS) {
					state = STATE_SCRIPT_DATA_ESCAPED_DASH_DASH;
					pos++;
				} else {
					// Anything else
					// Reconsume in the script data state.
					state = STATE_SCRIPT_DATA;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#script-data-escaped-state
			case 58: // STATE_SCRIPT_DATA_ESCAPED
				// `-`: switch to script data escaped dash. Emit a U+002D HYPHEN-MINUS
				// character token.
				if (cc === CC_HYPHEN_MINUS) {
					state = STATE_SCRIPT_DATA_ESCAPED_DASH;
					pos++;
				} else if (cc === CC_LESS_THAN) {
					// U+003C LESS-THAN SIGN (<)
					// Switch to the script data escaped less-than sign state.
					tagStart = pos;
					state = STATE_SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN;
					pos++;
				} else {
					// Anything else
					// Emit the current input character as a character token.
					// U+0000 NULL is an unexpected-null-character parse error.
					if (cc === CC_NULL) {
						reportError("unexpected-null-character", pos, pos + 1, "warning");
					}
					// Fast-forward ordinary escaped script text without re-entering
					// the state switch; stop on the significant code points above.
					pos++;
					while (pos < len) {
						const c2 = input.charCodeAt(pos);
						if (
							c2 === CC_HYPHEN_MINUS ||
							c2 === CC_LESS_THAN ||
							c2 === CC_NULL
						) {
							break;
						}
						pos++;
					}
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#script-data-escaped-dash-state
			case 59: // STATE_SCRIPT_DATA_ESCAPED_DASH
				// `-`: switch to script data escaped dash dash. Emit a U+002D HYPHEN-MINUS
				// character token.
				if (cc === CC_HYPHEN_MINUS) {
					state = STATE_SCRIPT_DATA_ESCAPED_DASH_DASH;
					pos++;
				} else if (cc === CC_LESS_THAN) {
					// U+003C LESS-THAN SIGN (<)
					// Switch to the script data escaped less-than sign state.
					tagStart = pos;
					state = STATE_SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN;
					pos++;
				} else {
					// Anything else
					// Switch to the script data escaped state. Emit the current input character
					// as a character token. U+0000 NULL is an unexpected-null-character error.
					if (cc === CC_NULL) {
						reportError("unexpected-null-character", pos, pos + 1, "warning");
					}
					state = STATE_SCRIPT_DATA_ESCAPED;
					pos++;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#script-data-escaped-dash-dash-state
			case 60: // STATE_SCRIPT_DATA_ESCAPED_DASH_DASH
				// Consume the next input character:
				// U+002D HYPHEN-MINUS (-)
				// Emit a U+002D HYPHEN-MINUS character token.
				if (cc === CC_HYPHEN_MINUS) {
					pos++;
				} else if (cc === CC_LESS_THAN) {
					// U+003C LESS-THAN SIGN (<)
					// Switch to the script data escaped less-than sign state.
					tagStart = pos;
					state = STATE_SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN;
					pos++;
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// Switch to the script data state. Emit a U+003E GREATER-THAN SIGN
					// character token.
					state = STATE_SCRIPT_DATA;
					pos++;
				} else {
					// Anything else
					// Switch to the script data escaped state. Emit the current input character
					// as a character token. U+0000 NULL is an unexpected-null-character error.
					if (cc === CC_NULL) {
						reportError("unexpected-null-character", pos, pos + 1, "warning");
					}
					state = STATE_SCRIPT_DATA_ESCAPED;
					pos++;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#script-data-escaped-less-than-sign-state
			case 61: // STATE_SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN
				// `/`: switch to script data escaped end tag open. (Spec sets a temporary
				// buffer; we track via offset ranges.)
				if (cc === CC_SOLIDUS) {
					state = STATE_SCRIPT_DATA_ESCAPED_END_TAG_OPEN;
					pos++;
				} else if (isAsciiAlpha(cc)) {
					// ASCII alpha: Set the temporary buffer to the empty string. Emit a U+003C
					// LESS-THAN SIGN character token, reconsume in script data double escape
					// start.
					scriptMatch = 0;
					state = STATE_SCRIPT_DATA_DOUBLE_ESCAPE_START;
					// Reconsume
				} else {
					// Anything else
					// Emit a U+003C LESS-THAN SIGN character token. Reconsume in the script
					// data escaped state.
					state = STATE_SCRIPT_DATA_ESCAPED;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#script-data-escaped-end-tag-open-state
			case 62: // STATE_SCRIPT_DATA_ESCAPED_END_TAG_OPEN
				// ASCII alpha: Create a new end tag token, set its tag name to the empty
				// string, reconsume in script data escaped end tag name.
				if (isAsciiAlpha(cc)) {
					tagNameStart = pos;
					state = STATE_SCRIPT_DATA_ESCAPED_END_TAG_NAME;
					// Reconsume
				} else {
					// Anything else
					// Emit a U+003C LESS-THAN SIGN character token and a U+002F SOLIDUS
					// character token. Reconsume in the script data escaped state.
					state = STATE_SCRIPT_DATA_ESCAPED;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#script-data-escaped-end-tag-name-state
			case 63: // STATE_SCRIPT_DATA_ESCAPED_END_TAG_NAME
				// Whitespace (tab, LF, FF, space): If the current end tag token is an
				// appropriate end tag token, then switch to the before attribute name
				// state. Otherwise, treat it as per the "anything else" entry below.
				if (isAsciiWhitespace(cc)) {
					tagNameEnd = pos;
					if (
						rangeAsciiCaseInsensitiveMatch(
							input,
							tagNameStart,
							tagNameEnd,
							lastOpenTagName
						)
					) {
						flushText(tagStart);
						state = STATE_BEFORE_ATTRIBUTE_NAME;
						pos++;
					} else {
						state = STATE_SCRIPT_DATA_ESCAPED;
					}
				} else if (cc === CC_SOLIDUS) {
					// `/`: If the current end tag token is an appropriate end tag token, then
					// switch to the self-closing start tag state. Otherwise, treat it as per
					// the "anything else" entry below.
					tagNameEnd = pos;
					if (
						rangeAsciiCaseInsensitiveMatch(
							input,
							tagNameStart,
							tagNameEnd,
							lastOpenTagName
						)
					) {
						flushText(tagStart);
						state = STATE_SELF_CLOSING_START_TAG;
						pos++;
					} else {
						state = STATE_SCRIPT_DATA_ESCAPED;
					}
				} else if (cc === CC_GREATER_THAN) {
					// `>`: If the current end tag token is an appropriate end tag token, then
					// switch to the data state and emit the tag token. Otherwise, treat it as
					// per the "anything else" entry below.
					tagNameEnd = pos;
					if (
						rangeAsciiCaseInsensitiveMatch(
							input,
							tagNameStart,
							tagNameEnd,
							lastOpenTagName
						)
					) {
						flushText(tagStart);
						state = STATE_DATA;
						pos = emitCloseTag(pos + 1);
					} else {
						state = STATE_SCRIPT_DATA_ESCAPED;
					}
				} else if (isAsciiAlpha(cc)) {
					// ASCII upper alpha / ASCII lower alpha
					// Fused: consume the whole alpha run in one dispatch.
					pos++;
					while (pos < len && isAsciiAlpha(input.charCodeAt(pos))) pos++;
				} else {
					// Anything else: emit `<`, `/` and the temporary buffer in order,
					// then reconsume in script data escaped.
					state = STATE_SCRIPT_DATA_ESCAPED;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#script-data-double-escape-start-state
			case 64: // STATE_SCRIPT_DATA_DOUBLE_ESCAPE_START
				// Whitespace, `/` or `>`: switch to script data double escaped where the
				// temporary buffer is "script", otherwise to script data escaped, and
				// emit the input character.
				if (
					isAsciiWhitespace(cc) ||
					cc === CC_SOLIDUS ||
					cc === CC_GREATER_THAN
				) {
					state =
						scriptMatch === 6
							? STATE_SCRIPT_DATA_DOUBLE_ESCAPED
							: STATE_SCRIPT_DATA_ESCAPED;
					pos++;
				} else if (isAsciiUpperAlpha(cc) || isAsciiLowerAlpha(cc)) {
					// ASCII alpha: advance the `"script"` match counter while the
					// lowercased char is the expected one, otherwise snap to the
					// sentinel so a later char cannot revive the match.
					const lower = isAsciiUpperAlpha(cc) ? cc + 0x20 : cc;
					if (scriptMatch < 6 && lower === "script".charCodeAt(scriptMatch)) {
						scriptMatch++;
					} else {
						scriptMatch = 7;
					}
					pos++;
				} else {
					// Anything else
					// Reconsume in the script data escaped state.
					state = STATE_SCRIPT_DATA_ESCAPED;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#script-data-double-escaped-state
			case 65: // STATE_SCRIPT_DATA_DOUBLE_ESCAPED
				// `-`: switch to script data double escaped dash. Emit a U+002D
				// HYPHEN-MINUS character token.
				if (cc === CC_HYPHEN_MINUS) {
					state = STATE_SCRIPT_DATA_DOUBLE_ESCAPED_DASH;
					pos++;
				} else if (cc === CC_LESS_THAN) {
					// U+003C LESS-THAN SIGN (<)
					// Switch to the script data double escaped less-than sign state. Emit a
					// U+003C LESS-THAN SIGN character token.
					state = STATE_SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN;
					pos++;
				} else {
					// Anything else
					// Emit the current input character as a character token.
					// U+0000 NULL is an unexpected-null-character parse error.
					if (cc === CC_NULL) {
						reportError("unexpected-null-character", pos, pos + 1, "warning");
					}
					// Fast-forward ordinary double-escaped script text without re-entering
					// the state switch; stop on the significant code points above.
					pos++;
					while (pos < len) {
						const c2 = input.charCodeAt(pos);
						if (
							c2 === CC_HYPHEN_MINUS ||
							c2 === CC_LESS_THAN ||
							c2 === CC_NULL
						) {
							break;
						}
						pos++;
					}
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#script-data-double-escaped-dash-state
			case 66: // STATE_SCRIPT_DATA_DOUBLE_ESCAPED_DASH
				// `-`: switch to script data double escaped dash dash. Emit a U+002D
				// HYPHEN-MINUS character token.
				if (cc === CC_HYPHEN_MINUS) {
					state = STATE_SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH;
					pos++;
				} else if (cc === CC_LESS_THAN) {
					// U+003C LESS-THAN SIGN (<)
					// Switch to the script data double escaped less-than sign state. Emit a
					// U+003C LESS-THAN SIGN character token.
					state = STATE_SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN;
					pos++;
				} else {
					// Anything else
					// Switch to the script data double escaped state. Emit the current input
					// character as a character token. NULL is unexpected-null-character.
					if (cc === CC_NULL) {
						reportError("unexpected-null-character", pos, pos + 1, "warning");
					}
					state = STATE_SCRIPT_DATA_DOUBLE_ESCAPED;
					pos++;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#script-data-double-escaped-dash-dash-state
			case 67: // STATE_SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH
				// Consume the next input character:
				// U+002D HYPHEN-MINUS (-)
				// Emit a U+002D HYPHEN-MINUS character token.
				if (cc === CC_HYPHEN_MINUS) {
					pos++;
				} else if (cc === CC_LESS_THAN) {
					// U+003C LESS-THAN SIGN (<)
					// Switch to the script data double escaped less-than sign state. Emit a
					// U+003C LESS-THAN SIGN character token.
					state = STATE_SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN;
					pos++;
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// Switch to the script data state. Emit a U+003E GREATER-THAN SIGN
					// character token.
					state = STATE_SCRIPT_DATA;
					pos++;
				} else {
					// Anything else
					// Switch to the script data double escaped state. Emit the current input
					// character as a character token. NULL is unexpected-null-character.
					if (cc === CC_NULL) {
						reportError("unexpected-null-character", pos, pos + 1, "warning");
					}
					state = STATE_SCRIPT_DATA_DOUBLE_ESCAPED;
					pos++;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#script-data-double-escaped-less-than-sign-state
			case 68: // STATE_SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN
				// `/`: Set the temporary buffer to the empty string, switch to script data
				// double escape end. Emit a U+002F SOLIDUS character token.
				if (cc === CC_SOLIDUS) {
					scriptMatch = 0;
					state = STATE_SCRIPT_DATA_DOUBLE_ESCAPE_END;
					pos++;
				} else {
					// Anything else
					// Reconsume in the script data double escaped state.
					state = STATE_SCRIPT_DATA_DOUBLE_ESCAPED;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#script-data-double-escape-end-state
			case 69: // STATE_SCRIPT_DATA_DOUBLE_ESCAPE_END
				// Whitespace, `/` or `>`: switch to script data escaped where the
				// temporary buffer is "script", otherwise to script data double escaped,
				// and emit the input character.
				if (
					isAsciiWhitespace(cc) ||
					cc === CC_SOLIDUS ||
					cc === CC_GREATER_THAN
				) {
					state =
						scriptMatch === 6
							? STATE_SCRIPT_DATA_ESCAPED
							: STATE_SCRIPT_DATA_DOUBLE_ESCAPED;
					pos++;
				} else if (isAsciiUpperAlpha(cc) || isAsciiLowerAlpha(cc)) {
					// ASCII alpha: advance the `"script"` match counter while the
					// lowercased char is the expected one, otherwise snap to the
					// sentinel so a later char cannot revive the match.
					const lower = isAsciiUpperAlpha(cc) ? cc + 0x20 : cc;
					if (scriptMatch < 6 && lower === "script".charCodeAt(scriptMatch)) {
						scriptMatch++;
					} else {
						scriptMatch = 7;
					}
					pos++;
				} else {
					// Anything else
					// Reconsume in the script data double escaped state.
					state = STATE_SCRIPT_DATA_DOUBLE_ESCAPED;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#plaintext-state
			case 70: // STATE_PLAINTEXT
				// Consume the next input character:
				// U+0000 NULL is an unexpected-null-character parse error.
				// Anything else: emit the current input character.
				if (cc === CC_NULL) {
					reportError("unexpected-null-character", pos, pos + 1, "warning");
					pos++;
				} else {
					// Fast-forward to the next NULL (or EOF) in one native scan.
					pos++;
					const nul = input.indexOf("\0", pos);
					pos = nul === -1 ? len : nul;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#character-reference-state
			case 71: // STATE_CHARACTER_REFERENCE
				// Set the temporary buffer to the empty string. Append a U+0026
				// AMPERSAND (&) character to the temporary buffer.
				// `charRefStart` points at that `&` (one before the current pos).
				charRefStart = pos - 1;
				// Consume the next input character:
				if (isAsciiAlphanumeric(cc)) {
					// ASCII alphanumeric
					// Reconsume in the named character reference state.
					state = STATE_NAMED_CHARACTER_REFERENCE;
					// Reconsume
				} else if (cc === CC_NUMBER_SIGN) {
					// `#`: Append the input character to the temporary buffer. Set the
					// character reference code to zero, switch to numeric character reference.
					charRefCode = 0;
					state = STATE_NUMERIC_CHARACTER_REFERENCE;
					pos++;
				} else {
					// Anything else
					// Flush code points consumed as a character reference.
					// Reconsume in the return state.
					state = returnState;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#named-character-reference-state
			case 72: /* STATE_NAMED_CHARACTER_REFERENCE */ {
				// Consume the longest run naming a character reference: measure the
				// alphanumeric run, capped at MAX_ENTITY_NAME_LEN - 1 as the `;` is
				// separate, then walk it longest-first for the first prefix in the table.
				let runLen = 0;
				while (
					pos + runLen < len &&
					isAsciiAlphanumeric(input.charCodeAt(pos + runLen)) &&
					runLen < MAX_ENTITY_NAME_LEN - 1
				) {
					runLen++;
				}
				const hasSemicolon =
					pos + runLen < len && input.charCodeAt(pos + runLen) === CC_SEMICOLON;
				namedEntityConsumed = 0;
				let matchedWithSemicolon = false;
				// Try the full run with its trailing `;` first - the overwhelmingly
				// common case (`&amp;`, `&nbsp;`, ...) then needs exactly one slice.
				if (hasSemicolon && runLen > 0) {
					// A span equal to one the table matched earlier is in the table
					// too: comparing the two saves the slice and the lookup.
					if (matchedEntities === undefined) {
						matchedEntities = new Int32Array(32);
					}
					const slot = (cc + (runLen << 2)) & 31;
					const seen = matchedEntities[slot];
					let same = 0;
					if (seen !== 0) {
						while (
							same <= runLen &&
							input.charCodeAt(seen + same) === input.charCodeAt(pos + same)
						) {
							same++;
						}
					}
					if (same > runLen) {
						namedEntityConsumed = runLen + 1;
						matchedWithSemicolon = true;
					} else if (
						HTML_ENTITIES[input.slice(pos, pos + runLen + 1)] !== undefined
					) {
						namedEntityConsumed = runLen + 1;
						matchedWithSemicolon = true;
						matchedEntities[slot] = pos;
					}
				}
				if (namedEntityConsumed === 0) {
					// Slice the candidate run once; prefixes come from this short
					// string instead of re-slicing the input per length.
					const run = input.slice(pos, pos + runLen);
					for (let n = runLen; n > 0; n--) {
						const bare = n === runLen ? run : run.slice(0, n);
						if (HTML_ENTITIES[bare] !== undefined) {
							namedEntityConsumed = n;
							break;
						}
					}
				}
				if (namedEntityConsumed > 0) {
					// A legacy match without its `;` is a
					// missing-semicolon-after-character-reference parse error, except
					// where the spec's attribute rule silences it.
					if (!matchedWithSemicolon) {
						const next = input.charCodeAt(pos + namedEntityConsumed);
						const inAttribute =
							returnState === STATE_ATTRIBUTE_VALUE_DOUBLE_QUOTED ||
							returnState === STATE_ATTRIBUTE_VALUE_SINGLE_QUOTED ||
							returnState === STATE_ATTRIBUTE_VALUE_UNQUOTED;
						if (!(
							inAttribute &&
							(next === CC_EQUALS || isAsciiAlphanumeric(next))
						)) {
							reportError(
								"missing-semicolon-after-character-reference",
								pos + namedEntityConsumed,
								pos + namedEntityConsumed + 1,
								"warning"
							);
						}
					}
					pos += namedEntityConsumed;
					state = returnState;
				} else {
					// No match - flush code points consumed as a character
					// reference. Switch to the ambiguous ampersand state.
					state = STATE_AMBIGUOUS_AMPERSAND;
				}
				break;
			}

			// https://html.spec.whatwg.org/multipage/parsing.html#ambiguous-ampersand-state
			case 73: // STATE_AMBIGUOUS_AMPERSAND
				// Consume the next input character:
				if (isAsciiAlphanumeric(cc)) {
					// ASCII alphanumeric: append the input character to the attribute's
					// value where the reference was consumed in one, otherwise emit it.
					pos++;
				} else if (cc === CC_SEMICOLON) {
					// U+003B SEMICOLON (;)
					// This is an unknown-named-character-reference parse error.
					// Reconsume in the return state.
					reportError(
						"unknown-named-character-reference",
						pos,
						pos + 1,
						"warning"
					);
					state = returnState;
					// Reconsume
				} else {
					// Anything else
					// Reconsume in the return state.
					state = returnState;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#numeric-character-reference-state
			case 74: // STATE_NUMERIC_CHARACTER_REFERENCE
				// Set the character reference code to zero (0).
				// Consume the next input character:
				if (cc === 0x78 || cc === 0x58) {
					// U+0078 / U+0058: Append the input character to the temporary buffer,
					// switch to hexadecimal character reference start.
					state = STATE_HEXADECIMAL_CHARACTER_REFERENCE_START;
					pos++;
				} else {
					// Anything else
					// Reconsume in the decimal character reference start state.
					state = STATE_DECIMAL_CHARACTER_REFERENCE_START;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#hexadecimal-character-reference-start-state
			case 75: // STATE_HEXADECIMAL_CHARACTER_REFERENCE_START
				// ASCII hex digit: reconsume in hexadecimal character reference.
				// Anything else: absence-of-digits-in-numeric-character-reference parse
				// error, flush the consumed code points and reconsume in the return.
				if (isAsciiHexDigit(cc)) {
					state = STATE_HEXADECIMAL_CHARACTER_REFERENCE;
				} else {
					reportError(
						"absence-of-digits-in-numeric-character-reference",
						pos,
						pos + 1,
						"warning"
					);
					state = returnState;
				}
				// Reconsume
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#decimal-character-reference-start-state
			case 76: // STATE_DECIMAL_CHARACTER_REFERENCE_START
				// ASCII digit: reconsume in the decimal character reference state. Anything
				// else: absence-of-digits-in-numeric-character-reference parse error. Flush
				// code points consumed as a character reference, reconsume in return.
				if (isAsciiDigit(cc)) {
					state = STATE_DECIMAL_CHARACTER_REFERENCE;
				} else {
					reportError(
						"absence-of-digits-in-numeric-character-reference",
						pos,
						pos + 1,
						"warning"
					);
					state = returnState;
				}
				// Reconsume
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#hexadecimal-character-reference-state
			case 77: // STATE_HEXADECIMAL_CHARACTER_REFERENCE
				// Consume the next input character:
				if (isAsciiHexDigit(cc)) {
					// ASCII hex digit: multiply the reference code by 16 and add the
					// input character's value. Accumulation stops past the Unicode range
					// so it cannot overflow, and still flags as outside-range.
					if (charRefCode < 0x110000) {
						const v = cc <= 0x39 ? cc - 0x30 : (cc | 0x20) - 0x61 + 10;
						charRefCode = charRefCode * 16 + v;
					}
					pos++;
				} else if (cc === CC_SEMICOLON) {
					// U+003B SEMICOLON
					// Switch to the numeric character reference end state.
					state = STATE_NUMERIC_CHARACTER_REFERENCE_END;
					pos++;
				} else {
					// Anything else: missing-semicolon-after-character-reference parse error,
					// reconsume in numeric character reference end.
					reportError(
						"missing-semicolon-after-character-reference",
						pos,
						pos + 1,
						"warning"
					);
					state = STATE_NUMERIC_CHARACTER_REFERENCE_END;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#decimal-character-reference-state
			case 78: // STATE_DECIMAL_CHARACTER_REFERENCE
				// Consume the next input character:
				if (isAsciiDigit(cc)) {
					// ASCII digit: multiply the reference code by 10 and add the input
					// character's value. Accumulation stops past the Unicode range so it
					// cannot overflow, and still flags as outside-range.
					if (charRefCode < 0x110000) {
						charRefCode = charRefCode * 10 + (cc - 0x30);
					}
					pos++;
				} else if (cc === CC_SEMICOLON) {
					// U+003B SEMICOLON
					// Switch to the numeric character reference end state.
					state = STATE_NUMERIC_CHARACTER_REFERENCE_END;
					pos++;
				} else {
					// Anything else: missing-semicolon-after-character-reference parse error,
					// reconsume in numeric character reference end.
					reportError(
						"missing-semicolon-after-character-reference",
						pos,
						pos + 1,
						"warning"
					);
					state = STATE_NUMERIC_CHARACTER_REFERENCE_END;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#numeric-character-reference-end-state
			case 79: // STATE_NUMERIC_CHARACTER_REFERENCE_END
				// Check the character reference code and report the matching
				// WHATWG validation parse error.
				validateNumericReference(pos);
				// Flush code points consumed as a character reference.
				// Switch to the return state.
				state = returnState;
				// Reconsume
				break;

			/* istanbul ignore next -- @preserve: defensive fallback, all states are explicit above */
			default:
				pos++;
		}
	}

	// WHY: EOF in a non-data state, per the WHATWG spec. An in-progress comment,
	// doctype, cdata or tag emits its partial range and an `eof-in-X` parse
	// error, at severity `"error"` because that range is missing its terminator.
	// A data / `<` / `</` / `<!` input emits `eof-before-tag-name` and falls
	// through to flush the pending text, which still holds the lone `<`. Inside a
	// character reference, the end-of-reference processing runs first - the
	// numeric end states never do at EOF - then the return state's branch below.
	if (
		state >= STATE_CHARACTER_REFERENCE &&
		state <= STATE_NUMERIC_CHARACTER_REFERENCE_END
	) {
		if (
			state === STATE_NUMERIC_CHARACTER_REFERENCE ||
			state === STATE_HEXADECIMAL_CHARACTER_REFERENCE_START ||
			state === STATE_DECIMAL_CHARACTER_REFERENCE_START
		) {
			// No digits before EOF.
			reportError(
				"absence-of-digits-in-numeric-character-reference",
				len,
				len,
				"warning"
			);
		} else if (
			state === STATE_HEXADECIMAL_CHARACTER_REFERENCE ||
			state === STATE_DECIMAL_CHARACTER_REFERENCE
		) {
			// Digits but no closing `;` before EOF.
			reportError(
				"missing-semicolon-after-character-reference",
				len,
				len,
				"warning"
			);
			validateNumericReference(len);
		} else if (state === STATE_NUMERIC_CHARACTER_REFERENCE_END) {
			validateNumericReference(len);
		}
		state = returnState;
	}

	if (
		(state >= STATE_TAG_NAME && state <= STATE_SELF_CLOSING_START_TAG) ||
		state === STATE_RCDATA_END_TAG_NAME ||
		state === STATE_RAWTEXT_END_TAG_NAME ||
		state === STATE_SCRIPT_DATA_END_TAG_NAME ||
		state === STATE_SCRIPT_DATA_ESCAPED_END_TAG_NAME
	) {
		// A deliberate deviation from the spec's per-character emission model:
		// the in-progress tag is emitted up to EOF so the consumer still sees it.
		// In raw text the spec reads it as text, which is no parse error.
		if (state >= STATE_TAG_NAME && state <= STATE_SELF_CLOSING_START_TAG) {
			reportError("eof-in-tag", len, len, "error");
		} else if (state === STATE_SCRIPT_DATA_ESCAPED_END_TAG_NAME) {
			reportError("eof-in-script-html-comment-like-text", len, len, "error");
		}
		// If we hit EOF mid-attribute-name, the name runs to EOF. Set
		// attributeNameEnd here so the emitted attribute range is valid.
		if (state === STATE_ATTRIBUTE_NAME && attributeNameStart !== -1) {
			attributeNameEnd = len;
		}
		if (attributeNameStart !== -1) emitAttribute(len);
		// At EOF before the tag-name end was recorded the name runs to EOF, and
		// `tagNameEnd` may carry over from a previous tag - so it is reset
		// whenever missing or stale, below `tagNameStart`.
		if (tagNameStart !== -1 && tagNameEnd < tagNameStart) {
			tagNameEnd = len;
		}
		// The spec drops the end tag EOF cut, so it never has attributes to report.
		tagHasAttributes = false;
		flushText(tagStart);
		pos =
			input.charCodeAt(tagStart + 1) === CC_SOLIDUS
				? emitCloseTag(len)
				: emitOpenTag(len, false);
	} else if (
		(state >= STATE_COMMENT_START && state <= STATE_BOGUS_COMMENT) ||
		(state >= STATE_COMMENT_LESS_THAN_SIGN &&
			state <= STATE_COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH) ||
		state === STATE_MARKUP_DECLARATION_OPEN
	) {
		// EOF in markup-declaration-open takes the spec's "anything else"
		// branch: incorrectly-opened-comment, then a bogus comment (which has
		// no EOF error of its own). Bogus comments at EOF are likewise normal.
		if (state === STATE_MARKUP_DECLARATION_OPEN) {
			reportError("incorrectly-opened-comment", commentStart, len, "warning");
			// The bogus comment this becomes has nothing left to consume.
			commentDataStart = len;
			commentDataEnd = len;
		} else if (state !== STATE_BOGUS_COMMENT) {
			reportError("eof-in-comment", len, len, "error");
		} else if (
			processingInstructionTargetValid &&
			input.charCodeAt(commentStart + 1) === CC_QUESTION_MARK
		) {
			reportError("eof-in-processing-instruction", len, len, "error");
		}
		if (callbacks.comment !== undefined) {
			pos = callbacks.comment(
				input,
				commentStart,
				len,
				commentDataStart,
				commentDataEnd
			);
		}
	} else if (state >= STATE_CDATA_SECTION && state <= STATE_CDATA_SECTION_END) {
		reportError("eof-in-cdata", len, len, "error");
		if (callbacks.comment !== undefined) {
			// No `]]>` closed it, so everything after `<![CDATA[` is content.
			pos = callbacks.comment(input, commentStart, len, commentDataStart, len);
		}
	} else if (state >= STATE_DOCTYPE && state <= STATE_BOGUS_DOCTYPE) {
		// EOF in bogus DOCTYPE emits the token with no parse error (spec).
		if (state !== STATE_BOGUS_DOCTYPE) {
			reportError("eof-in-doctype", len, len, "error");
			doctypeForceQuirks = true;
		}
		if (callbacks.doctype !== undefined) {
			pos = callbacks.doctype(
				input,
				commentStart,
				len,
				doctypeNameStart,
				doctypeNameEnd,
				doctypePublicStart,
				doctypePublicEnd,
				doctypeSystemStart,
				doctypeSystemEnd,
				doctypeForceQuirks
			);
		}
	} else {
		if (
			state >= STATE_SCRIPT_DATA_ESCAPED &&
			state <= STATE_SCRIPT_DATA_DOUBLE_ESCAPE_END
		) {
			// Inside `<script><!-- ... ` at EOF: eof-in-script-html-comment-like-text.
			// The escaped end tag name state is a tag above; the others reconsume
			// into an escaped or double-escaped state at EOF, per spec.
			reportError("eof-in-script-html-comment-like-text", len, len, "error");
		} else if (state === STATE_TAG_OPEN || state === STATE_END_TAG_OPEN) {
			// `<` or `</` with nothing after; spec calls this
			// eof-before-tag-name. The lone `<` / `</` is preserved in the
			// pending text span which is flushed below.
			reportError("eof-before-tag-name", len, len, "warning");
		}
		if (textStart < len && callbacks.text !== undefined) {
			callbacks.text(input, textStart, len);
		}
	}

	return pos;
};

/**
 * Whether a code unit is XML's `S` production (§2.3): space, tab, LF or CR.
 * @param {number} cc code unit
 * @returns {boolean} true for XML whitespace
 */
const isXmlWhitespace = (cc) =>
	cc <= CC_SPACE &&
	(cc === CC_SPACE || cc === CC_TAB || cc === CC_LF || cc === CC_CR);

// A name's run up to whitespace, `/`, `>`, `=`, `<`, a quote, `[` or `?`: one
// builtin call where a char loop costs two calls a char in unoptimized code.
const XML_NAME_REGEXP = /[^\t\n\r />=<"'[?]*/y;

/**
 * Where a name ends: the first code unit XML's `Name` cannot hold and the markup
 * around it uses as a delimiter. Lenient on purpose, as the HTML tokenizer is.
 * @param {string} input source
 * @param {number} pos where the name starts
 * @returns {number} offset past the name
 */
const xmlNameEnd = (input, pos) => {
	XML_NAME_REGEXP.lastIndex = pos;
	XML_NAME_REGEXP.test(input);
	return XML_NAME_REGEXP.lastIndex;
};

/**
 * Whether a code unit may open a name (§2.3 `NameStartChar`), read leniently:
 * anything but ASCII that cannot, so a `<` before a digit or a space is text.
 * @param {number} cc code unit
 * @returns {boolean} true when a tag name can start with it
 */
const isXmlNameStart = (cc) =>
	cc >= 0x80 ||
	(cc >= 0x41 && cc <= 0x5a) ||
	(cc >= 0x61 && cc <= 0x7a) ||
	cc === CC_LOW_LINE ||
	cc === 0x3a;

/**
 * @param {string} input source
 * @param {number} pos offset
 * @returns {number} offset of the first non-whitespace code unit at or past it
 */
const skipXmlWhitespace = (input, pos) => {
	const len = input.length;
	while (pos < len && isXmlWhitespace(input.charCodeAt(pos))) pos++;
	return pos;
};

/**
 * Where a DOCTYPE's internal subset ends: its `]`, skipping what a declaration
 * may quote and the comments and processing instructions it may hold.
 * @param {string} input source
 * @param {number} pos offset past the `[`
 * @returns {number} offset of the closing `]`, or the input length when missing
 */
const xmlInternalSubsetEnd = (input, pos) => {
	const len = input.length;
	while (pos < len) {
		const cc = input.charCodeAt(pos);
		if (cc === CC_RIGHT_SQUARE_BRACKET) return pos;
		if (cc === CC_QUOTATION_MARK || cc === CC_APOSTROPHE) {
			const close = input.indexOf(cc === CC_APOSTROPHE ? "'" : '"', pos + 1);
			pos = close === -1 ? len : close + 1;
		} else if (input.startsWith("<!--", pos)) {
			const close = input.indexOf("-->", pos + 4);
			pos = close === -1 ? len : close + 3;
		} else if (input.startsWith("<?", pos)) {
			const close = input.indexOf("?>", pos + 2);
			pos = close === -1 ? len : close + 2;
		} else {
			pos++;
		}
	}
	return len;
};

/**
 * Read a quoted DOCTYPE identifier.
 * @param {string} input source
 * @param {number} pos offset of the opening quote
 * @returns {number} offset of the closing quote, or -1 when there is no quote at `pos`
 */
const xmlQuotedEnd = (input, pos) => {
	const cc = input.charCodeAt(pos);
	if (cc !== CC_QUOTATION_MARK && cc !== CC_APOSTROPHE) return -1;
	const close = input.indexOf(cc === CC_APOSTROPHE ? "'" : '"', pos + 1);
	return close === -1 ? input.length : close;
};

/**
 * Tokenize XML 1.0 markup (§2.4-§4.1) into the callbacks `tokenize` drives, so
 * one tree builder serves both. Never throws: a document that is not well-formed
 * reads on the way a lenient processor would, reporting nothing.
 * @param {string} input input string
 * @param {number} pos current position
 * @param {HtmlTokenCallbacks} callbacks callbacks
 * @returns {number} final position
 */
const tokenizeXml = (input, pos = 0, callbacks = {}) => {
	const len = input.length;
	if (callbacks.parseError !== undefined && input.includes("\0", pos)) {
		callbacks.parseError(
			input,
			"unexpected-null-character",
			pos,
			pos,
			"warning"
		);
	}
	let textStart = pos;
	while (pos < len) {
		const lt = input.indexOf("<", pos);
		if (lt === -1) break;
		const next = input.charCodeAt(lt + 1);
		let end = -1;
		if (next === CC_EXCLAMATION_MARK) {
			if (input.startsWith("--", lt + 2)) {
				const close = input.indexOf("-->", lt + 4);
				const dataEnd = close === -1 ? len : close;
				end = close === -1 ? len : close + 3;
				if (textStart < lt && callbacks.text !== undefined) {
					callbacks.text(input, textStart, lt);
				}
				if (callbacks.comment !== undefined) {
					callbacks.comment(input, lt, end, lt + 4, dataEnd);
				}
			} else if (input.startsWith("[CDATA[", lt + 2)) {
				const close = input.indexOf("]]>", lt + 9);
				const dataEnd = close === -1 ? len : close;
				end = close === -1 ? len : close + 3;
				if (textStart < lt && callbacks.text !== undefined) {
					callbacks.text(input, textStart, lt);
				}
				if (callbacks.comment !== undefined) {
					callbacks.comment(input, lt, end, lt + 9, dataEnd);
				}
			} else if (
				rangeAsciiCaseInsensitiveMatch(input, lt + 2, lt + 9, "doctype")
			) {
				end = tokenizeXmlDoctype(input, lt, callbacks, textStart);
			} else {
				// A declaration outside the DTD is not XML: read it as a comment, the
				// way the HTML tokenizer reads a bogus one.
				const close = input.indexOf(">", lt + 2);
				end = close === -1 ? len : close + 1;
				if (textStart < lt && callbacks.text !== undefined) {
					callbacks.text(input, textStart, lt);
				}
				if (callbacks.comment !== undefined) {
					callbacks.comment(input, lt, end, lt + 2, close === -1 ? len : close);
				}
			}
		} else if (next === CC_QUESTION_MARK) {
			const close = input.indexOf("?>", lt + 2);
			end = close === -1 ? len : close + 2;
			if (textStart < lt && callbacks.text !== undefined) {
				callbacks.text(input, textStart, lt);
			}
			if (close !== -1 && callbacks.comment !== undefined) {
				callbacks.comment(input, lt, end, lt + 2, close);
			}
		} else if (next === CC_SOLIDUS) {
			const nameStart = lt + 2;
			// The name is scanned keeping the code unit that ended it, mostly `>`.
			const nameEnd = xmlNameEnd(input, nameStart);
			const cc = nameEnd < len ? input.charCodeAt(nameEnd) : 0;
			if (nameEnd !== nameStart) {
				const close =
					nameEnd < len && cc === CC_GREATER_THAN
						? nameEnd
						: input.indexOf(">", nameEnd);
				end = close === -1 ? len : close + 1;
				if (textStart < lt && callbacks.text !== undefined) {
					callbacks.text(input, textStart, lt);
				}
				if (close !== -1 && callbacks.closeTag !== undefined) {
					callbacks.closeTag(input, lt, end, nameStart, nameEnd);
				}
			}
		} else if (isXmlNameStart(next)) {
			const nameStart = lt + 1;
			// A name start is a name of one code point at least.
			const nameEnd = xmlNameEnd(input, nameStart + 1);
			if (textStart < lt && callbacks.text !== undefined) {
				callbacks.text(input, textStart, lt);
			}
			end = tokenizeXmlStartTag(input, lt, nameStart, nameEnd, callbacks);
		}
		if (end === -1) {
			// A `<` that opens nothing stays in the text, as it does in HTML.
			pos = lt + 1;
		} else {
			pos = end;
			textStart = end;
		}
	}
	if (textStart < len && callbacks.text !== undefined) {
		callbacks.text(input, textStart, len);
	}
	return len;
};

/**
 * @param {string} input source
 * @param {number} start offset of the `<`
 * @param {number} nameStart offset of the tag name
 * @param {number} nameEnd offset past the tag name
 * @param {HtmlTokenCallbacks} callbacks callbacks
 * @returns {number} offset past the tag
 */
const tokenizeXmlStartTag = (input, start, nameStart, nameEnd, callbacks) => {
	const len = input.length;
	let pos = nameEnd;
	// Each code unit is read once: what ends a skip or a name is kept for the
	// test that follows it, 0 standing for the end of the input.
	while (true) {
		let cc = 0;
		while (
			pos < len &&
			(cc = input.charCodeAt(pos)) <= CC_SPACE &&
			(cc === CC_SPACE || cc === CC_TAB || cc === CC_LF || cc === CC_CR)
		) {
			pos++;
		}
		if (pos >= len) {
			if (callbacks.parseError !== undefined) {
				callbacks.parseError(input, "eof-in-tag", len, len, "error");
			}
			if (callbacks.openTag !== undefined) {
				callbacks.openTag(input, start, len, nameStart, nameEnd, false);
			}
			return len;
		}
		if (cc === CC_GREATER_THAN) {
			if (callbacks.openTag !== undefined) {
				callbacks.openTag(input, start, pos + 1, nameStart, nameEnd, false);
			}
			return pos + 1;
		}
		// A `<` cannot sit in a tag, so the next one starts markup of its own.
		if (cc === CC_LESS_THAN) {
			if (callbacks.openTag !== undefined) {
				callbacks.openTag(input, start, pos, nameStart, nameEnd, false);
			}
			return pos;
		}
		if (cc === CC_SOLIDUS && input.charCodeAt(pos + 1) === CC_GREATER_THAN) {
			if (callbacks.openTag !== undefined) {
				callbacks.openTag(input, start, pos + 2, nameStart, nameEnd, true);
			}
			return pos + 2;
		}
		const attributeStart = pos;
		// The name is scanned from `cc`, which the skip already read, and ends
		// with `cc` holding what ended it.
		XML_NAME_REGEXP.lastIndex = pos;
		XML_NAME_REGEXP.test(input);
		pos = XML_NAME_REGEXP.lastIndex;
		cc = pos < len ? input.charCodeAt(pos) : 0;
		const attributeEnd = pos;
		// A stray `/`, quote or `=` is skipped so the tag still ends where it should.
		if (attributeEnd === attributeStart) {
			pos++;
			continue;
		}
		if (
			cc <= CC_SPACE &&
			(cc === CC_SPACE || cc === CC_TAB || cc === CC_LF || cc === CC_CR)
		) {
			pos = skipXmlWhitespace(input, pos + 1);
			cc = pos < len ? input.charCodeAt(pos) : 0;
		}
		let valueStart = -1;
		let valueEnd = -1;
		let quoteType = QUOTE_NONE;
		if (cc === CC_EQUALS) {
			let quote = ++pos < len ? input.charCodeAt(pos) : 0;
			// The quote mostly follows the `=`, which the compare answers without a call.
			if (quote <= CC_SPACE && isXmlWhitespace(quote)) {
				pos = skipXmlWhitespace(input, pos + 1);
				quote = pos < len ? input.charCodeAt(pos) : 0;
			}
			if (quote === CC_QUOTATION_MARK || quote === CC_APOSTROPHE) {
				quoteType = quote === CC_QUOTATION_MARK ? QUOTE_DOUBLE : QUOTE_SINGLE;
				valueStart = pos + 1;
				const close = input.indexOf(
					quote === CC_QUOTATION_MARK ? '"' : "'",
					valueStart
				);
				valueEnd = close === -1 ? len : close;
				pos = close === -1 ? len : close + 1;
			} else {
				valueStart = pos;
				while (
					pos < len &&
					!isXmlWhitespace(input.charCodeAt(pos)) &&
					input.charCodeAt(pos) !== CC_GREATER_THAN
				) {
					pos++;
				}
				valueEnd = pos;
			}
		}
		if (callbacks.attribute !== undefined) {
			callbacks.attribute(
				input,
				attributeStart,
				attributeEnd,
				valueStart,
				valueEnd,
				quoteType
			);
		}
	}
};

/**
 * @param {string} input source
 * @param {number} start offset of the `<`
 * @param {HtmlTokenCallbacks} callbacks callbacks
 * @param {number} textStart start of the text still to flush before the declaration
 * @returns {number} offset past the declaration
 */
const tokenizeXmlDoctype = (input, start, callbacks, textStart) => {
	const len = input.length;
	let pos = skipXmlWhitespace(input, start + 9);
	const nameStart = pos;
	const nameEnd = xmlNameEnd(input, pos);
	pos = skipXmlWhitespace(input, nameEnd);
	let publicStart = -1;
	let publicEnd = -1;
	let systemStart = -1;
	let systemEnd = -1;
	if (input.startsWith("PUBLIC", pos)) {
		pos = skipXmlWhitespace(input, pos + 6);
		const close = xmlQuotedEnd(input, pos);
		if (close !== -1) {
			publicStart = pos + 1;
			publicEnd = close;
			pos = skipXmlWhitespace(input, close + 1);
		}
	} else if (input.startsWith("SYSTEM", pos)) {
		pos = skipXmlWhitespace(input, pos + 6);
	}
	const systemClose = xmlQuotedEnd(input, pos);
	if (systemClose !== -1) {
		systemStart = pos + 1;
		systemEnd = systemClose;
		pos = skipXmlWhitespace(input, systemClose + 1);
	}
	let subsetStart = -1;
	let subsetEnd = -1;
	if (input.charCodeAt(pos) === CC_LEFT_SQUARE_BRACKET) {
		subsetStart = pos + 1;
		subsetEnd = xmlInternalSubsetEnd(input, subsetStart);
		pos = subsetEnd + 1;
	}
	const close = input.indexOf(">", pos);
	const end = close === -1 ? len : close + 1;
	if (textStart < start && callbacks.text !== undefined) {
		callbacks.text(input, textStart, start);
	}
	if (callbacks.doctype !== undefined) {
		callbacks.doctype(
			input,
			start,
			end,
			nameEnd === nameStart ? -1 : nameStart,
			nameEnd === nameStart ? -1 : nameEnd,
			publicStart,
			publicEnd,
			systemStart,
			systemEnd,
			false,
			subsetStart,
			subsetEnd
		);
	}
	return end;
};

// WHATWG numeric-character-reference-end remap for 0x80-0x9F: these C1 control
// code points decode to the matching Windows-1252 glyph, with a parse error,
// rather than to the control character itself.
const NUMERIC_C1_REMAP = {
	0x80: "\u20AC",
	0x82: "\u201A",
	0x83: "\u0192",
	0x84: "\u201E",
	0x85: "\u2026",
	0x86: "\u2020",
	0x87: "\u2021",
	0x88: "\u02C6",
	0x89: "\u2030",
	0x8a: "\u0160",
	0x8b: "\u2039",
	0x8c: "\u0152",
	0x8e: "\u017D",
	0x91: "\u2018",
	0x92: "\u2019",
	0x93: "\u201C",
	0x94: "\u201D",
	0x95: "\u2022",
	0x96: "\u2013",
	0x97: "\u2014",
	0x98: "\u02DC",
	0x99: "\u2122",
	0x9a: "\u0161",
	0x9b: "\u203A",
	0x9c: "\u0153",
	0x9e: "\u017E",
	0x9f: "\u0178"
};

/**
 * @param {number} code numeric character reference code point
 * @returns {string} decoded character per WHATWG remap rules
 */
const decodeNumericReference = (code) => {
	// WHY: numeric-character-reference-end-state maps 0x00, anything above
	// 0x10FFFF and the surrogates to U+FFFD, 0x80-0x9F through the table above,
	// and everything else - noncharacters and C0 controls included - to itself.
	// Its parse-error classes are not raised here: the scanner has already run.
	if (code === 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) {
		return "\uFFFD";
	}
	if (code >= 0x80 && code <= 0x9f) {
		const remapped = /** @type {Record<number, string>} */ (NUMERIC_C1_REMAP)[
			code
		];
		if (remapped !== undefined) return remapped;
	}
	return String.fromCodePoint(code);
};

/**
 * Decode a single matched character reference.
 * @param {string} match the matched reference text
 * @param {number} nextCharCode char code following the match in the source (NaN at the end)
 * @param {boolean=} isAttribute true when the match came from an attribute value
 * @returns {string} decoded text, or `match` itself when it stays literal
 */
// The last named reference `decodeNamedReference` found in the table.
let lastEntityName = "";
let lastEntityValue = "";

/**
 * Decode a named character reference spanning `[start, end)` of `str` (the
 * `&` at `start`, the optional `;` included). Slices the name once; WHATWG
 * longest-prefix and consumed-as-part-of-an-attribute semantics as before.
 * @param {string} str the raw string
 * @param {number} start offset of the reference's `&`
 * @param {number} end offset just past the reference (past the `;` if present)
 * @param {number} nextCharCode char code following the reference (NaN at the end)
 * @param {boolean=} isAttribute true when the reference came from an attribute value
 * @returns {string | undefined} decoded text, or `undefined` when it stays literal
 */
const decodeNamedReference = (str, start, end, nextCharCode, isAttribute) => {
	// Mirrors the old `match.slice(1)`: the name keeps its trailing `;`.
	const name = str.slice(start + 1, end);
	const matchEndsWithSemi = name.charCodeAt(name.length - 1) === 0x3b;

	// Attribute-context guard: a match not ending in `;` whose next source
	// character is `=` or alphanumeric is flushed literally rather than decoded.
	// The greedy scan absorbed the alphanumerics, so only `=` can reach here.
	if (isAttribute && !matchEndsWithSemi && nextCharCode === 0x3d /* = */) {
		return undefined;
	}

	// Fast path: the scan usually captures exactly one entity (`&amp;`,
	// `&lt;`, `&nbsp;`, ...), so the whole `name` is the match.
	if (name.length <= MAX_ENTITY_NAME_LEN) {
		// Text repeats a few references (`&amp;`, `&nbsp;`): comparing the last one
		// found skips the table's keyed lookup, which internalizes a fresh slice.
		if (name === lastEntityName) return lastEntityValue;
		const full = HTML_ENTITIES[name];
		if (full !== undefined) {
			// V8 copies a slice under 13 characters, so a short one pins no source.
			if (name.length < 13) {
				lastEntityName = name;
				lastEntityValue = full;
			}
			return full;
		}
	}

	// Capping the longest-prefix search at MAX_ENTITY_NAME_LEN keeps `&` plus
	// thousands of alphanumerics linear-time; nothing past it can match, so it
	// rides along in `name.slice(i)`. The full length was handled just above.
	const searchLen =
		name.length > MAX_ENTITY_NAME_LEN ? MAX_ENTITY_NAME_LEN : name.length - 1;
	for (let i = searchLen; i > 0; i--) {
		const prefix = name.slice(0, i);
		if (HTML_ENTITIES[prefix] !== undefined) {
			// Attribute-context longest-prefix guard: if the matched
			// prefix doesn't end with `;` and the leftover starts with
			// an alphanumeric character, leave literal per WHATWG.
			if (
				isAttribute &&
				i < name.length &&
				prefix.charCodeAt(prefix.length - 1) !== 0x3b
			) {
				return undefined;
			}
			return HTML_ENTITIES[prefix] + name.slice(i);
		}
	}
	return undefined;
};

/** @typedef {{ text: string, map: number[] | undefined }} DecodedEntitiesWithMap */

/**
 * Decode HTML character references in a string. Handles all numeric
 * references (with WHATWG remap of 0x00, surrogates, out-of-range, and the
 * C1 Windows-1252 table) and the full WHATWG named character references
 * table. Unknown or malformed references are left as literal text.
 *
 * When `isAttribute` is `true`, applies the WHATWG
 * "consumed-as-part-of-an-attribute" rule: a named reference without a
 * trailing `;` whose next character is `=` or ASCII alphanumeric is left
 * undecoded, so e.g. `&amp=foo` stays literal in an attribute value but
 * decodes to `&=foo` in text.
 *
 * With `withMap` the result also carries a boundary map from the decoded
 * string back to raw offsets, so spans computed on the decoded text (e.g.
 * srcset candidate URLs) can be translated to source ranges. `map[i]` is the
 * raw offset of decoded boundary `i` (`0..text.length`); boundaries inside a
 * reference's decoded text map to the reference start. `map` is `undefined`
 * when nothing was decoded (then `text === str`).
 * @overload
 * @param {string} str the raw string from the token slice
 * @param {boolean=} isAttribute true if `str` came from an attribute value
 * @returns {string} decoded string
 */
/**
 * @overload
 * @param {string} str the raw string from the token slice
 * @param {boolean | undefined} isAttribute true if `str` came from an attribute value
 * @param {true} withMap also build the decoded-to-raw boundary map
 * @returns {DecodedEntitiesWithMap} decoded text and offset map
 */
/**
 * @param {string} str the raw string from the token slice
 * @param {boolean=} isAttribute true if `str` came from an attribute value
 * @param {boolean=} withMap also build the decoded-to-raw boundary map
 * @returns {string | DecodedEntitiesWithMap} decoded string (with map when `withMap`)
 */
const decodeEntities = (str, isAttribute, withMap) => {
	// WHY: a hand-rolled scan of the three reference forms - `&#x<hex>+`,
	// `&#<dec>+`, `&<alpha><alnum>*`, kept apart so `&#65b` does not eat the `b`
	// as hex. Entity-dense text then pays no regex machinery and no per-match
	// object, and a string whose references all stay literal is returned as it
	// came. Map bookkeeping is gated on `withMap` at the rare per-reference
	// points, so the dominant no-map mode pays nothing for sharing this code.
	let amp = str.indexOf("&");
	if (amp === -1) return withMap ? { text: str, map: undefined } : str;
	let out = "";
	let last = 0;
	/** @type {number[] | undefined} */
	let map;
	do {
		// `end` stays 0 where the `&` starts no well-formed reference. A numeric
		// reference accumulates during the digit scan, saturating above the
		// code-point range since every overflow decodes alike, so it needs no slice.
		let end = 0;
		let code = -1;
		let cc = str.charCodeAt(amp + 1);
		if (cc === 0x23 /* # */) {
			cc = str.charCodeAt(amp + 2);
			let p;
			if (cc === 0x78 /* x */ || cc === 0x58 /* X */) {
				code = 0;
				p = amp + 3;
				while (isAsciiHexDigit((cc = str.charCodeAt(p)))) {
					code = code * 16 + (cc <= 0x39 ? cc - 0x30 : (cc | 0x20) - 0x57);
					if (code > 0x10ffff) code = 0x110000;
					p++;
				}
				if (p > amp + 3) end = p;
			} else {
				code = 0;
				p = amp + 2;
				while (isAsciiDigit((cc = str.charCodeAt(p)))) {
					code = code * 10 + (cc - 0x30);
					if (code > 0x10ffff) code = 0x110000;
					p++;
				}
				if (p > amp + 2) end = p;
			}
		} else if (isAsciiAlpha(cc)) {
			code = -1;
			let p = amp + 2;
			while (isAsciiAlphanumeric(str.charCodeAt(p))) p++;
			end = p;
		}
		if (end !== 0) {
			if (str.charCodeAt(end) === 0x3b /* ; */) end++;
			// Numeric references always decode; named ones may stay literal.
			const decoded =
				code >= 0
					? decodeNumericReference(code)
					: decodeNamedReference(
							str,
							amp,
							end,
							str.charCodeAt(end),
							isAttribute
						);
			if (decoded !== undefined) {
				if (withMap) map = mapReference(map, last, amp, decoded.length);
				out += str.slice(last, amp);
				out += decoded;
				last = end;
			}
			amp = str.indexOf("&", end);
		} else {
			amp = str.indexOf("&", amp + 1);
		}
	} while (amp !== -1);
	if (last === 0) return withMap ? { text: str, map: undefined } : str;
	const text = out + str.slice(last);
	return withMap
		? finishMap(text, /** @type {number[]} */ (map), last, str.length)
		: text;
};

// Map-mode bookkeeping for `decodeEntities`, kept out of the scanner body so
// the dominant no-map mode stays small enough to inline.
/**
 * @param {number[] | undefined} map boundary map so far
 * @param {number} last raw offset the literal run starts at
 * @param {number} amp raw offset of the decoded reference
 * @param {number} decodedLength length of the decoded text
 * @returns {number[]} the map, with the literal run's and reference's boundaries appended
 */
const mapReference = (map, last, amp, decodedLength) => {
	if (map === undefined) map = [];
	for (let r = last; r < amp; r++) map.push(r);
	for (let i = 0; i < decodedLength; i++) map.push(amp);
	return map;
};

/**
 * @param {string} text decoded text
 * @param {number[]} map boundary map so far
 * @param {number} last raw offset of the trailing literal run
 * @param {number} rawLength raw string length
 * @returns {DecodedEntitiesWithMap} the finished result
 */
const finishMap = (text, map, last, rawLength) => {
	for (let r = last; r < rawLength; r++) map.push(r);
	map.push(rawLength);
	return { text, map };
};

// A template engine's delimiters: `<%` (EJS, ERB, lodash), `<?` (PHP) and the
// `<!--#` of server-side includes.
const TEMPLATE_OPENER_REGEXP = /<(?:%|\?|!--#)/g;

/**
 * How many template delimiters a value spells.
 * @param {string} value the value
 * @returns {number} the count
 */
const templateOpenerCount = (value) => {
	if (!value.includes("<")) return 0;
	const found = value.match(TEMPLATE_OPENER_REGEXP);
	return found === null ? 0 : found.length;
};

// Every character `escapeAttribute` has a case for.
const ATTRIBUTE_ESCAPE_STOP_REGEXP = /[\n\r"&'<\u00A0]/g;

/**
 * Escape a string per the WHATWG "escape a string" algorithm
 * (https://html.spec.whatwg.org/multipage/parsing.html#escapingString) in
 * attribute mode: `&`, U+00A0 and whichever quote delimits the value \u2014 the
 * other one stands literal, which is what makes `alt='say "hi"'` legal. CR/LF
 * are additionally encoded as numeric references so the result stays
 * single-line (usable in a `data:` URI). Single pass, returns the input
 * unchanged when nothing needs escaping.
 * @param {string} s string to escape
 * @param {number=} delimiter the quote the value is written in, `"` by default
 * @param {boolean=} minimal leave an `&` no reference can start after it bare,
 * and U+00A0 and a newline literal, as `_escapeTextContent` does for a text
 * node, but escape a `<` opening a template delimiter (`<%`, `<?`, `<!--#`)
 * the source escaped
 * @returns {string} HTML attribute-safe string
 */
const escapeAttribute = (s, delimiter, minimal) => {
	const quote = delimiter === CC_APOSTROPHE ? CC_APOSTROPHE : CC_QUOTATION_MARK;
	// fast path: native indexOf scans beat any per-character loop
	if (
		!s.includes("&") &&
		!s.includes(quote === CC_APOSTROPHE ? "'" : '"') &&
		(minimal === true
			? !S._escapeTemplateOpeners || !s.includes("<")
			: !s.includes("\u00A0") && !s.includes("\n")) &&
		!s.includes("\r")
	) {
		return s;
	}
	let out = "";
	let last = 0;
	for (let i = 0; i < s.length; i++) {
		// Straight to the next character the switch has a case for.
		ATTRIBUTE_ESCAPE_STOP_REGEXP.lastIndex = i;
		if (!ATTRIBUTE_ESCAPE_STOP_REGEXP.test(s)) break;
		i = ATTRIBUTE_ESCAPE_STOP_REGEXP.lastIndex - 1;
		let rep;
		switch (s.charCodeAt(i)) {
			case CC_AMPERSAND: {
				// §13.2.5.41: a `&` the parser cannot continue into a reference is
				// data - asked of the table, since `&c` names none. The minifier
				// writes it bare; generated markup escapes it.
				if (minimal === true && !startsCharacterReference(s, i, true, true)) {
					continue;
				}
				rep = "&amp;";
				break;
			}
			// Only the delimiter is escaped, so the compare costs a quote, not a
			// character: everything ordinary still falls straight through.
			case CC_QUOTATION_MARK:
				if (quote !== CC_QUOTATION_MARK) continue;
				rep = "&quot;";
				break;
			case CC_APOSTROPHE:
				if (quote !== CC_APOSTROPHE) continue;
				rep = "&#39;";
				break;
			case CC_NO_BREAK_SPACE:
				// WHY: the minifier keeps it literal, so that a value's own spelling
				// does not decide the output: a source writing the character and one
				// writing `&nbsp;` are the same attribute and print as one. Generated
				// markup still escapes it, matching `escapeText` against
				// `_escapeTextContent` on the text side. Both spellings are the same
				// DOM, and the literal is the shorter of the two.
				if (minimal === true) continue;
				rep = "&nbsp;";
				break;
			case CC_LESS_THAN: {
				// Inert to HTML, but a template engine the page goes through next
				// would run a delimiter (`<%`, `<?`, `<!--#`) the source kept escaped.
				const next = s.charCodeAt(i + 1);
				if (
					minimal !== true ||
					!S._escapeTemplateOpeners ||
					(next !== 0x25 &&
						next !== CC_QUESTION_MARK &&
						!s.startsWith("!--#", i + 1))
				) {
					continue;
				}
				rep = "&lt;";
				break;
			}
			case CC_LF:
				// A quoted value holds a newline as it is; the minifier writes it so.
				if (minimal === true) continue;
				rep = "&#10;";
				break;
			case CC_CR:
				// The input stream turns a raw one into a newline (§13.2.3.5).
				rep = "&#13;";
				break;
			default:
				continue;
		}
		out += s.slice(last, i) + rep;
		last = i + 1;
	}
	return out + s.slice(last);
};

/**
 * Escape a string per the WHATWG "escape a string" algorithm in text mode:
 * `&`, U+00A0, `<` and `>`. CR/LF are additionally encoded as numeric
 * references so the result stays single-line (usable in a `data:` URI).
 * Single pass, returns the input unchanged when nothing needs escaping.
 * @param {string} s string to escape
 * @returns {string} HTML text-content-safe string
 */
const escapeText = (s) => {
	// fast path: native indexOf scans beat any per-character loop
	if (
		!s.includes("&") &&
		!s.includes("<") &&
		!s.includes(">") &&
		!s.includes("\u00A0") &&
		!s.includes("\n") &&
		!s.includes("\r")
	) {
		return s;
	}
	let out = "";
	let last = 0;
	for (let i = 0; i < s.length; i++) {
		let rep;
		switch (s.charCodeAt(i)) {
			case CC_AMPERSAND:
				rep = "&amp;";
				break;
			case CC_LESS_THAN:
				rep = "&lt;";
				break;
			case CC_GREATER_THAN:
				rep = "&gt;";
				break;
			case CC_NO_BREAK_SPACE:
				rep = "&nbsp;";
				break;
			case CC_LF:
				rep = "&#10;";
				break;
			case CC_CR:
				rep = "&#13;";
				break;
			default:
				continue;
		}
		out += s.slice(last, i) + rep;
		last = i + 1;
	}
	return out + s.slice(last);
};

/**
 * @param {string} name meta name
 * @param {string} content meta content
 * @returns {string} meta tag
 */
const metaTag = (name, content) => {
	// og: uses property=; all others (including twitter:) use name=
	const attr = name.startsWith("og:")
		? `property="${escapeAttribute(name)}"`
		: `name="${escapeAttribute(name)}"`;
	return `<meta ${attr} content="${escapeAttribute(content)}">`;
};

/**
 * @param {string | { href: string, target?: string }} base base option
 * @returns {string} base tag
 */
const baseTag = (base) => {
	const href = typeof base === "string" ? base : base.href;
	const targetAttr =
		typeof base === "object" && base.target
			? ` target="${escapeAttribute(base.target)}"`
			: "";
	return `<base href="${escapeAttribute(href)}"${targetAttr}>`;
};

/**
 * Serializes head tags in spec order - charset, base, meta, title - for a page
 * built from scratch; an authored page merges the same options in `parse`.
 * @param {OutputHtmlOptions} opts html options
 * @returns {string} head tags string
 */
const buildHeadTags = (opts) => {
	let out = "";
	const meta = opts.meta;
	if (meta && meta.charset) {
		out += `<meta charset="${escapeAttribute(meta.charset)}">`;
	}
	if (opts.base) out += baseTag(opts.base);
	if (meta) {
		for (const [name, content] of Object.entries(meta)) {
			if (name === "charset") continue;
			out += metaTag(name, content);
		}
	}
	if (opts.title) {
		out += `<title>${escapeText(opts.title)}</title>`;
	}
	return out;
};

// cspell:ignore definitionurl malignmark mglyph selectedcontent megamorphic attributeless rowspan imagesizes novalidate maxlength

// WHATWG HTML tree construction (https://html.spec.whatwg.org/multipage/parsing.html#tree-construction)
// on top of tokenize. Scripting is always disabled (webpack is a build tool).

// Namespaces (mirrors swc_html_ast::Namespace)
const NS_HTML = 0;
const NS_MATHML = 1;
const NS_SVG = 2;
// XML elements do not participate in HTML, MathML or SVG tree construction.
// The fourth value fits in the existing two-bit namespace field.
const NS_XML = 3;

/**
 * An element's namespace (Infra §8): its MathML or SVG `Flag` bit, neither for HTML.
 * @type {{ HTML: 0, MathML: 1, SVG: 2, XML: 3 }}
 */
const Namespace = {
	HTML: NS_HTML,
	MathML: NS_MATHML,
	SVG: NS_SVG,
	XML: NS_XML
};

/**
 * AST node `type` discriminators. Numeric for the same reason as the CSS
 * `NodeType`: compact integer `===` dispatch on the tree-construction and
 * visitor-walk hot paths.
 * @type {{ Document: 1, DocumentFragment: 2, Element: 3, Text: 4, Comment: 5, Doctype: 6, ProcessingInstruction: 7, Attribute: 8 }}
 */
const NodeType = {
	Document: 1,
	DocumentFragment: 2,
	Element: 3,
	Text: 4,
	Comment: 5,
	Doctype: 6,
	ProcessingInstruction: 7,
	// An element's attribute, as the DOM's `Attr`: read through the path with a
	// negative id (`Field.attributes`), never visited by the walk.
	Attribute: 8
};

/**
 * The parts of a node read with `field`, `fieldCount` and `fieldNamed`, named
 * as the DOM names them. A single-node field reads as a list of at most one.
 * @type {{ attributes: 1, content: 2 }}
 */
const Field = {
	// An element's attributes, a list of `Attribute` nodes.
	attributes: 1,
	// A `<template>`'s content fragment, a single node.
	content: 2
};

/**
 * A contiguous run of attribute ids in the attribute columns - how a start-tag
 * token and an element refer to their attributes. `start` is the first id
 * (`count` 0 = none).
 * @typedef {{ start: number, count: number }} AttributeRun
 */

// Shared frozen empty run for attributeless elements and synthesized tags.
const EMPTY_ATTRS = /** @type {AttributeRun} */ (
	Object.freeze({ start: 0, count: 0 })
);

// WHY: struct-of-arrays AST backend. One node is one integer id
// (`HtmlNodeRef`) into the parallel columns below, so there is no per-node
// object and no per-parent children array: shape lives in the four link
// columns, and the only heap references are the payload and attribute side
// arrays. The columns belong to the tree (`S`) and are reused across its
// parses - grown, and shrunk on release only past `SHRINK_CAPACITY` - so a
// steady-state parse allocates almost nothing per node, at the price of a tree
// being valid only until its next parse. Id 0 is reserved so the links can use it as
// null.

// Released columns all share these: growth replaces a column before any write.
const EMPTY_U8 = new Uint8Array(0);
const EMPTY_I32 = new Int32Array(0);

const NS_MASK = 3;
const FLAG_SELF_CLOSING = 4;

/**
 * The bits of a node's flags column read with `flag`; an element's namespace is
 * its MathML or SVG bit, neither set for HTML.
 * @type {{ mathml: 1, svg: 2, selfClosing: 4 }}
 */
const Flag = {
	mathml: NS_MATHML,
	svg: NS_SVG,
	selfClosing: FLAG_SELF_CLOSING
};

/**
 * The parts of a node read with `rangeOf` and `textOf`.
 * @type {{ name: 1, value: 2, content: 3, startTag: 4, endTag: 5, publicId: 6, systemId: 7 }}
 */
const Part = {
	// An element's, attribute's, doctype's or processing instruction's name.
	name: 1,
	// An attribute's value, inside its quotes; a text's, comment's or PI's data.
	value: 2,
	// An element's content, between its start and end tags.
	content: 3,
	// An element's start tag, `<` to `>`.
	startTag: 4,
	// An element's end tag, when the source wrote one.
	endTag: 5,
	// A doctype's public identifier, inside its quotes.
	publicId: 6,
	// A doctype's system identifier, inside its quotes.
	systemId: 7
};
// A `<template>` element: `_contentEnds` holds its content-fragment ref
// instead of a raw-text body-end offset (the two never coexist on one node).
const FLAG_HAS_TEMPLATE = 8;
// A `<template shadowrootmode>` kept where it was written, and its host: the
// engine takes it out of the tree, so nothing may move it away from that host.
const FLAG_SHADOW_ROOT = 16;
const FLAG_SHADOW_HOST = 32;
// The element whose content prints from source, and everything still open around
// it. A flag, not a lookup: the walk asks this of every node.
const FLAG_FOSTER_REGION = 128;
// An element that stops a "have an element in scope" walk (§13.2.4.2), decided
// once at creation: an element's namespace and name never change after it.
const FLAG_SCOPE_BOUNDARY = 64;

/**
 * @param {HtmlNodeRef} el an element
 * @returns {boolean} whether a shadow root can be attached to it
 */
const isShadowHost = (el) => {
	if (namespaceOf(el) !== NS_HTML) return false;
	const tagName = tagNameOf(el);
	if (SHADOW_HOSTS.has(tagName)) return true;
	return (
		tagName.includes("-") &&
		tagName.charCodeAt(0) >= 97 &&
		tagName.charCodeAt(0) <= 122 &&
		!RESERVED_ELEMENT_NAMES.has(tagName)
	);
};

/** @type {(el: HtmlNodeRef) => string} */
const tagNameOf = (el) => S._strings[el];
/** @type {(n: HtmlNodeRef) => string} a text's, comment's or processing instruction's data */
const dataOf = (n) => S._strings[n];

/**
 * @param {HtmlNodeRef} n node
 * @returns {HtmlNodeRef} its first child (0 = none)
 */
const firstChild = (n) => S._firstChildren[n];

/**
 * The cursor slot for `n`'s children, claimed afresh when it holds another
 * node's or an earlier epoch's reads.
 * @param {HtmlNodeRef} n node
 * @returns {number} the slot
 */
const cursorSlot = (n) => {
	const slot = n & (CURSOR_SLOTS - 1);
	if (
		S._cursorEpochs[slot] !== S._cursorEpoch ||
		S._cursorParents[slot] !== n
	) {
		S._cursorEpochs[slot] = S._cursorEpoch;
		S._cursorParents[slot] = n;
		S._cursorIndexes[slot] = 0;
		S._cursorChildren[slot] = S._firstChildren[n];
		S._cursorCounts[slot] = -1;
	}
	return slot;
};
/**
 * @param {HtmlNodeRef} n node
 * @returns {HtmlNodeRef} its next sibling (0 = none)
 */
const nextSibling = (n) => S._nextSiblings[n];
/**
 * @param {HtmlNodeRef} n node
 * @returns {HtmlNodeRef} its parent (0 = none; a `<template>`'s content links to its fragment)
 */
const parentOf = (n) => S._parents[n];
// A `<template>`'s content-fragment ref (in the shared `_contentEnds` slot),
// or 0 when `el` is not a template - the tree builder's spec "template contents".
/** @type {(el: HtmlNodeRef) => HtmlDocumentFragment} */
const templateContentOf = (el) =>
	(S._flags[el] & FLAG_HAS_TEMPLATE) !== 0 ? S._contentEnds[el] : 0;
/** @type {(el: HtmlNodeRef) => number} */
const namespaceOf = (el) => S._flags[el] & NS_MASK;

// === Attribute columns ===

/**
 * The attribute capacity an XML document is growing towards, carried over from
 * the attributes per byte its start holds: an icon set writes one every 20 bytes
 * and a font one every 300, so no ratio of the input length fits both.
 * @param {number} need minimum capacity
 * @param {number} doubled the capacity doubling grows to
 * @returns {number} the capacity to grow to, never under `doubled`
 */
const xmlAttrCapacity = (need, doubled) => {
	// Where the last token ended: the tag holding this attribute starts there.
	if (S.tokenEnd <= 0) return doubled;
	const predicted = Math.ceil((need / S.tokenEnd) * S._input.length);
	// A dense start may not speak for the rest, so it is trusted up to fourfold.
	let cap = Math.min(predicted + Math.ceil(predicted / 8), need * 4);
	// The headroom alone must not take the columns past what a release keeps.
	if (cap > SHRINK_CAPACITY && predicted <= SHRINK_CAPACITY) {
		cap = SHRINK_CAPACITY;
	}
	return cap > doubled ? cap : doubled;
};

/**
 * @param {number} need minimum capacity
 * @param {boolean=} exact allocate `need` directly (initial pre-size) instead of doubling
 */
const growAttrColumns = (need, exact) => {
	let cap = S._attrCapacity || 4096;
	if (exact) {
		if (need > cap) cap = need;
	} else {
		while (cap < need) cap *= 2;
		// A capacity over the shrink threshold is released after the parse, so
		// doubling just past the pre-size costs the next one its columns.
		if (cap > SHRINK_CAPACITY && need <= SHRINK_CAPACITY) {
			cap = SHRINK_CAPACITY;
		}
		// Each doubling the document is known to outgrow is columns copied twice.
		if (S._xmlMode) cap = xmlAttrCapacity(need, cap);
	}
	const nameStart = new Int32Array(cap);
	nameStart.set(S._attrNameStarts);
	S._attrNameStarts = nameStart;
	const nameEnd = new Int32Array(cap);
	nameEnd.set(S._attrNameEnds);
	S._attrNameEnds = nameEnd;
	const valStart = new Int32Array(cap);
	valStart.set(S._attrValueStarts);
	S._attrValueStarts = valStart;
	const valEnd = new Int32Array(cap);
	valEnd.set(S._attrValueEnds);
	S._attrValueEnds = valEnd;
	const fl = new Uint8Array(cap);
	fl.set(S._attrFlags);
	S._attrFlags = fl;
	// Keep the string columns filled to capacity (see `growNodeColumns`), each
	// in one store: appended slot by slot, a column is reallocated as it grows.
	const filled = S._attrNames.length;
	S._attrNames.length = cap;
	S._attrNames.fill("", filled);
	S._attrValues.length = cap;
	S._attrValues.fill(null, filled);
	S._attrCapacity = cap;
};

/** @type {(name: string, value: string | null, nameStart: number, nameEnd: number, valueStart: number, valueEnd: number) => number} */
const makeAttr = (name, value, nameStart, nameEnd, valueStart, valueEnd) => {
	const i = ++S._attrCount;
	if (i >= S._attrCapacity) growAttrColumns(i + 1);
	S._attrNameStarts[i] = nameStart;
	S._attrNameEnds[i] = nameEnd;
	S._attrValueStarts[i] = valueStart;
	S._attrValueEnds[i] = valueEnd;
	S._attrFlags[i] = 0;
	// Ids are sequential, so these indexed writes append (arrays stay packed).
	S._attrNames[i] = name;
	S._attrValues[i] = value;
	return i;
};

/**
 * Whether a span reads as HTML vocabulary rather than as another language's
 * text: an attribute name or list token starts with an ASCII letter, `_` or
 * `-`, and no delimiter a template engine wraps a statement in appears in it.
 * @param {string} text the string holding the span
 * @param {number} start first index
 * @param {number} end index after the last
 * @returns {boolean} true when the span is a word
 */
const isWordSpan = (text, start, end) => {
	const first = text.charCodeAt(start);
	if (
		!(first >= 0x61 && first <= 0x7a) &&
		!(first >= 0x41 && first <= 0x5a) &&
		first !== 0x5f &&
		first !== 0x2d
	) {
		return false;
	}
	for (let i = start + 1; i < end; i++) {
		const c = text.charCodeAt(i);
		if (c === 0x7b || c === 0x7d || c === 0x3c || c === 0x3e) return false;
	}
	return true;
};

/** @type {(i: number) => string} */
const attrValueOf = (i) => {
	const v = S._attrValues[i];
	return v !== null
		? v
		: S._input.slice(S._attrValueStarts[i], S._attrValueEnds[i]);
};

/**
 * An attribute's value as the element is handed it. The tree construction
 * matches values the tokenizer has already resolved references in, so how one
 * is spelled must not decide which branch a token takes.
 * @param {number} i the attribute
 * @returns {string} the value with its character references resolved
 */
const attrValueDecoded = (i) =>
	S._xmlMode ? xmlAttributeValue(i) : decodeEntities(attrValueOf(i), true);

/**
 * Where an attribute ends: past its value's closing quote, or its name when
 * it has no value.
 * @param {number} i the attribute
 * @returns {number} its end offset
 */
const attrEnd = (i) => {
	const valueStart = S._attrValueStarts[i];
	if (valueStart === -1) return S._attrNameEnds[i];
	const valueEnd = S._attrValueEnds[i];
	const quote = S._input.charCodeAt(valueStart - 1);
	return quote === CC_QUOTATION_MARK || quote === CC_APOSTROPHE
		? valueEnd + 1
		: valueEnd;
};

/**
 * Where the end tag the source wrote for an element starts, read back off its
 * range: an element's end spans the end tag naming it, so that tag is the
 * last thing in it.
 * @param {HtmlNodeRef} n element
 * @returns {number} the offset of its end tag's `<`, -1 when the source left it out
 */
const endTagStart = (n) => {
	const end = S._ends[n];
	if (end === 0 || S._input.charCodeAt(end - 1) !== 62) return -1;
	let i = end - 2;
	for (;;) {
		// Past the start, `charCodeAt` reads NaN, which ends the walk too.
		const c = S._input.charCodeAt(i);
		if (c !== 0x20 && c !== 0x09 && c !== 0x0a && c !== 0x0c && c !== 0x0d) {
			break;
		}
		i--;
	}
	const name = tagNameOf(n);
	const nameEnd = i + 1;
	const nameStart = nameEnd - name.length;
	return nameStart >= 2 &&
		S._input.charCodeAt(nameStart - 1) === 47 &&
		S._input.charCodeAt(nameStart - 2) === 60 &&
		(S._xmlMode
			? S._input.slice(nameStart, nameEnd) === name
			: rangeAsciiCaseInsensitiveMatch(S._input, nameStart, nameEnd, name))
		? nameStart - 2
		: -1;
};

/**
 * Whether the source wrote this element's start tag: a parser-inserted one
 * borrows another token's offsets, so its written name does not match.
 * @param {HtmlNodeRef} n element
 * @returns {boolean} whether its start tag is in the source
 */
const hasSourceTag = (n) => {
	const start = S._starts[n];
	const nameEnd = S._nameEnds[n];
	const stored = S._strings[n];
	// The source spelling the stored name exactly is a yes without a fold. Else
	// fold in place, no slice; an adjusted foreign name (`foreignObject`) carries
	// upper case the fold cannot match, so a miss falls back to the old compare.
	return (
		(stored.length === nameEnd - start - 1 &&
			S._input.startsWith(stored, start + 1)) ||
		rangeAsciiCaseInsensitiveMatch(S._input, start + 1, nameEnd, stored) ||
		S._input.slice(start + 1, nameEnd).toLowerCase() === stored.toLowerCase()
	);
};

/**
 * @param {HtmlNodeRef} n element
 * @returns {string} its start tag as written, `""` when the parser inserted it
 */
const openTagOf = (n) =>
	hasSourceTag(n) ? S._input.slice(S._starts[n], S._tagEnds[n]) : "";

/**
 * Generated from the start tag's own name (exact source casing, so foreign
 * camelCase holds), since an omitted optional end tag serializes the same.
 * @param {HtmlNodeRef} n element
 * @returns {string} its end tag, `""` when the parser inserted it
 */
const closeTagOf = (n) => {
	const nameEnd = S._nameEnds[n];
	return nameEnd === 0 ? "" : `</${S._input.slice(S._starts[n] + 1, nameEnd)}>`;
};

// Scalar position reads for the parser, printer and plugins, which must not
// allocate the arrays the path's `range`, `loc` and `rangeOf` return.
/** @type {(n: HtmlNodeRef) => number} where a node or attribute starts */
const startOf = (n) => (n < 0 ? S._attrNameStarts[-n] : S._starts[n]);
/** @type {(n: HtmlNodeRef) => number} where a node or attribute ends */
const endOf = (n) => (n < 0 ? attrEnd(-n) : S._ends[n]);
/** @type {(n: HtmlNodeRef) => number} where an element's tag name ends (0 for a parser-inserted tag) */
const nameEndOf = (n) => S._nameEnds[n];
/** @type {(n: HtmlNodeRef) => number} where an element's opening tag ends */
const contentStartOf = (n) => S._tagEnds[n];

/** @type {(n: HtmlNodeRef) => number} how many attributes an element has */
const attributeCountOf = (n) => S._attrCounts[n];

/** @type {(i: number, n: HtmlNodeRef) => number} an element's i-th attribute id */
const attributeAt = (i, n) => S._attrStarts[n] + i;

/** @type {(name: string, n: HtmlNodeRef) => number} an element's attribute id by name (0 = none) */
const findAttribute = (name, n) =>
	findAttr(S._attrStarts[n], S._attrCounts[n], name);

/** @type {(i: number) => string} an attribute's name */
const attrNameOf = (i) => S._attrNames[i];

/**
 * An element's attributes as objects, raw values and offsets included: what
 * the printer reads where it compares or reorders them.
 * @param {HtmlNodeRef} n element
 * @returns {HtmlAttribute[]} its attributes
 */
const attributeList = (n) => {
	/** @type {HtmlAttribute[]} */
	const out = [];
	const start = S._attrStarts[n];
	for (let i = start; i < start + S._attrCounts[n]; i++) {
		out.push({
			name: S._attrNames[i],
			value: attrValueOf(i),
			serializedName: attrSerializedName(i),
			nameStart: S._attrNameStarts[i],
			nameEnd: S._attrNameEnds[i],
			valueStart: S._attrValueStarts[i],
			valueEnd: S._attrValueEnds[i]
		});
	}
	return out;
};

// Linear name lookup in a run - attribute lists are short, a loop beats a Map.
/** @type {(start: number, count: number, name: string) => number} */
const findAttr = (start, count, name) => {
	for (let i = start; i < start + count; i++) {
		if (S._attrNames[i] === name) return i;
	}
	return 0;
};

/** @type {(i: number) => number} exact copy of an attribute into a new id */
const copyAttr = (i) => {
	const c = makeAttr(
		S._attrNames[i],
		S._attrValues[i],
		S._attrNameStarts[i],
		S._attrNameEnds[i],
		S._attrValueStarts[i],
		S._attrValueEnds[i]
	);
	S._attrFlags[c] = S._attrFlags[i];
	return c;
};

// Derived html5lib serializer name: a `FOREIGN_ATTR_NS`-adjusted attribute is
// flagged and keyed by its name, a camelCase-adjusted one carries an uppercase
// letter and serializes as itself, and everything else is the plain name.
/** @type {(i: number) => string | undefined} */
const attrSerializedName = (i) => {
	if ((S._attrFlags[i] & 1) !== 0) return FOREIGN_ATTR_NS[S._attrNames[i]];
	const name = S._attrNames[i];
	return /[A-Z]/.test(name) ? name : undefined;
};

/**
 * @param {number} need minimum capacity
 * @param {boolean=} exact allocate `need` directly (initial pre-size) instead of doubling
 */
const growNodeColumns = (need, exact) => {
	let cap = S._nodeCapacity || 4096;
	// `exact` (the initial pre-size): allocate the estimate directly. Doubling
	// from 4096 would overshoot it to the next power of two (~2x) and waste that
	// capacity for the process lifetime. Incremental growth still doubles.
	if (exact) {
		if (need > cap) cap = need;
	} else {
		while (cap < need) cap *= 2;
		// A capacity over the shrink threshold is released after the parse, so
		// doubling just past the pre-size costs the next one its columns.
		if (cap > SHRINK_CAPACITY && need <= SHRINK_CAPACITY) {
			cap = SHRINK_CAPACITY;
		}
	}
	const ty = new Uint8Array(cap);
	ty.set(S._types);
	S._types = ty;
	const fl = new Uint8Array(cap);
	fl.set(S._flags);
	S._flags = fl;
	const st = new Int32Array(cap);
	st.set(S._starts);
	S._starts = st;
	const en = new Int32Array(cap);
	en.set(S._ends);
	S._ends = en;
	const tagEnd = new Int32Array(cap);
	tagEnd.set(S._tagEnds);
	S._tagEnds = tagEnd;
	const nameEnd = new Int32Array(cap);
	nameEnd.set(S._nameEnds);
	S._nameEnds = nameEnd;
	const cEnd = new Int32Array(cap);
	cEnd.set(S._contentEnds);
	S._contentEnds = cEnd;
	const parent = new Int32Array(cap);
	parent.set(S._parents);
	S._parents = parent;
	const first = new Int32Array(cap);
	first.set(S._firstChildren);
	S._firstChildren = first;
	const last = new Int32Array(cap);
	last.set(S._lastChildren);
	S._lastChildren = last;
	const next = new Int32Array(cap);
	next.set(S._nextSiblings);
	S._nextSiblings = next;
	const aStart = new Int32Array(cap);
	aStart.set(S._attrStarts);
	S._attrStarts = aStart;
	const aCount = new Int32Array(cap);
	aCount.set(S._attrCounts);
	S._attrCounts = aCount;
	// Keep the string column filled to capacity so per-node writes are in-place
	// packed stores, not length-growing appends re-paying the regrowth cascade.
	for (let i = S._strings.length; i < cap; i++) S._strings.push("");
	S._nodeCapacity = cap;
};

/** Start a new parse: invalidate all prior refs, release prior heap refs. */
const resetColumns = () => {
	if (S._xmlAttributeValues.length !== 0) S._xmlAttributeValues.length = 0;
	// Overwrite the used prefix (releases the prior parse's strings) instead of
	// truncating: a `length = 0` would right-size the backing store and make
	// every write of the next parse a length-growing append again.
	const written =
		S._nodeCount > S._nodeHighWater ? S._nodeCount : S._nodeHighWater;
	const usedNodes = Math.min(written, S._strings.length - 1);
	S._strings.fill("", 0, usedNodes + 1);
	const usedAttrs = Math.min(S._attrCount, S._attrNames.length - 1);
	S._attrNames.fill("", 0, usedAttrs + 1);
	S._attrValues.fill(null, 0, usedAttrs + 1);
	S._nodeCount = 0;
	S._nodeHighWater = 0;
	S._attrCount = 0;
	// Clearing allocates a fresh table even when the collection is empty.
	if (S._mergedAttrNodes.size !== 0) S._mergedAttrNodes.clear();
	if (S._foreignSyntaxAttrRuns.size !== 0) S._foreignSyntaxAttrRuns.clear();
	if (S._piTargets.size !== 0) S._piTargets.clear();
	S._doctypePublicId = null;
	S._doctypeSystemId = null;
	S._doctypePublicStart = -1;
	S._doctypePublicEnd = -1;
	S._doctypeSystemStart = -1;
	S._doctypeSystemEnd = -1;
};

// WHY: the columns grow to the largest document parsed and are shrunk on
// release above this capacity, so one pathological file cannot pin tens of MB
// for the process lifetime. Strictly above: `growNodeColumns` clamps a doubling
// to exactly this capacity, so releasing at it re-allocates every column again.
const SHRINK_CAPACITY = 65536;
const SPARSE_MARKUP_LIMIT = 512;

// Release the side arrays' heap references (strings, attribute names/values)
// once a walk has consumed the tree, so the retained columns don't pin the
// parsed source until the next parse.
const releaseColumns = () => {
	if (S._xmlAttributeValues.length !== 0) S._xmlAttributeValues.length = 0;
	// Kept regime: overwrite the used prefix in place (see `resetColumns`);
	// oversized arrays are dropped entirely, mirroring the typed columns below.
	if (S._strings.length > SHRINK_CAPACITY) {
		S._strings.length = 0;
	} else {
		const written =
			S._nodeCount > S._nodeHighWater ? S._nodeCount : S._nodeHighWater;
		const usedNodes = Math.min(written, S._strings.length - 1);
		S._strings.fill("", 0, usedNodes + 1);
	}
	if (S._attrNames.length > SHRINK_CAPACITY) {
		S._attrNames.length = 0;
		S._attrValues.length = 0;
	} else {
		const usedAttrs = Math.min(S._attrCount, S._attrNames.length - 1);
		S._attrNames.fill("", 0, usedAttrs + 1);
		S._attrValues.fill(null, 0, usedAttrs + 1);
	}
	// The printer's sort buffers grew to the widest tag and longest token list
	// this document held; dropping them keeps one page off the module forever.
	if (S._sortOrderScratch.length !== 0) S._sortOrderScratch.length = 0;
	if (S._sortKeyScratch.length !== 0) S._sortKeyScratch.length = 0;
	if (S._tokenSpanStarts.length !== 0) S._tokenSpanStarts.length = 0;
	if (S._tokenSpanEnds.length !== 0) S._tokenSpanEnds.length = 0;
	if (S._tokenSpanKeys.length !== 0) S._tokenSpanKeys.length = 0;
	S._nodeCount = 0;
	S._nodeHighWater = 0;
	S._attrCount = 0;
	// Clearing allocates a fresh table even when the collection is empty.
	if (S._mergedAttrNodes.size !== 0) S._mergedAttrNodes.clear();
	if (S._foreignSyntaxAttrRuns.size !== 0) S._foreignSyntaxAttrRuns.clear();
	if (S._piTargets.size !== 0) S._piTargets.clear();
	S._input = "";
	S._locConverter = undefined;
	S._doctypePublicId = null;
	S._doctypeSystemId = null;
	S._doctypePublicStart = -1;
	S._doctypePublicEnd = -1;
	S._doctypeSystemStart = -1;
	S._doctypeSystemEnd = -1;
	if (S._nodeCapacity > SHRINK_CAPACITY) {
		S._nodeCapacity = 0;
		S._types = EMPTY_U8;
		S._flags = EMPTY_U8;
		S._starts = EMPTY_I32;
		S._ends = EMPTY_I32;
		S._tagEnds = EMPTY_I32;
		S._nameEnds = EMPTY_I32;
		S._contentEnds = EMPTY_I32;
		S._parents = EMPTY_I32;
		S._firstChildren = EMPTY_I32;
		S._lastChildren = EMPTY_I32;
		S._nextSiblings = EMPTY_I32;
		S._attrStarts = EMPTY_I32;
		S._attrCounts = EMPTY_I32;
	}
	if (S._attrCapacity > SHRINK_CAPACITY) {
		S._attrCapacity = 0;
		S._attrNameStarts = EMPTY_I32;
		S._attrNameEnds = EMPTY_I32;
		S._attrValueStarts = EMPTY_I32;
		S._attrValueEnds = EMPTY_I32;
		S._attrFlags = EMPTY_U8;
	}
};

/** @type {(type: number, start: number, end: number) => HtmlNodeRef} */
// The element-only columns (tagEnds/nameEnds/contentEnds/attrStarts/
// attrCounts) are left stale here - they are only ever read for Element
// nodes, and every Element writes them in mkEl/cloneSubtree.
const makeNode = (type, start, end) => {
	const tree = S;
	const i = ++tree._nodeCount;
	if (i >= tree._nodeCapacity) growNodeColumns(i + 1);
	tree._types[i] = type;
	tree._flags[i] = 0;
	tree._starts[i] = start;
	tree._ends[i] = end;
	tree._parents[i] = 0;
	tree._firstChildren[i] = 0;
	tree._lastChildren[i] = 0;
	tree._nextSiblings[i] = 0;
	// `_strings[i]` is written by every caller right after this returns
	// (tag name / text / comment data; "" at the few string-less sites), as a
	// packed in-place store - no placeholder double-write here.
	return i;
};

// Raw child append - no text merging, no `<template>` content redirect (the
// tree builder layers those on top). `node` must be detached (`next` = 0).
/** @type {(parent: HtmlNodeRef, node: HtmlNodeRef) => void} */
const appendChild = (parent, node) => {
	const tree = S;
	tree._parents[node] = parent;
	const last = tree._lastChildren[parent];
	if (last === 0) tree._firstChildren[parent] = node;
	else tree._nextSiblings[last] = node;
	tree._lastChildren[parent] = node;
};

/** @type {(data: string, start: number, end: number) => HtmlNodeRef} */
const makeTextNode = (data, start, end) => {
	const i = makeNode(NodeType.Text, start, end);
	S._strings[i] = data;
	return i;
};

/** @type {(data: string, start: number, end: number) => HtmlNodeRef} */
const makeCommentNode = (data, start, end) => {
	const i = makeNode(NodeType.Comment, start, end);
	S._strings[i] = data;
	return i;
};

/** @type {(target: string, data: string, start: number, end: number) => HtmlNodeRef} */
const makeProcessingInstructionNode = (target, data, start, end) => {
	const i = makeNode(NodeType.ProcessingInstruction, start, end);
	S._strings[i] = data;
	S._piTargets.set(i, target);
	return i;
};

// Marker entry in the active-formatting-elements list (never a valid ref).
const AFE_MARKER = -1;

/**
 * Clones an element's attribute run, dropping source offsets so the consumer
 * emits no duplicate dependency for the reopened element's spans.
 * @param {HtmlElement} el element whose attributes are cloned
 * @returns {AttributeRun} the cloned run
 */
const cloneAttrs = (el) => {
	const start = S._attrStarts[el];
	const count = S._attrCounts[el];
	const newStart = S._attrCount + 1;
	for (let i = start; i < start + count; i++) {
		const c = makeAttr(S._attrNames[i], attrValueOf(i), -1, -1, -1, -1);
		S._attrFlags[c] = S._attrFlags[i];
	}
	return { start: newStart, count };
};

/**
 * Merges a repeated `<html>`/`<body>` tag's attributes into the element, adding
 * only names not already present. Runs are contiguous, so any addition
 * re-allocates the whole run and orphans the old slots.
 * @param {HtmlElement} el element receiving the attributes
 * @param {AttributeRun} run attributes of the repeated tag
 * @returns {void}
 */
const mergeAttrs = (el, run) => {
	const start = S._attrStarts[el];
	const count = S._attrCounts[el];
	let extra = 0;
	for (let i = run.start; i < run.start + run.count; i++) {
		if (findAttr(start, count, S._attrNames[i]) === 0) extra++;
	}
	if (extra === 0) return;
	const newStart = S._attrCount + 1;
	for (let i = start; i < start + count; i++) copyAttr(i);
	for (let i = run.start; i < run.start + run.count; i++) {
		if (findAttr(start, count, S._attrNames[i]) === 0) copyAttr(i);
	}
	S._attrStarts[el] = newStart;
	S._attrCounts[el] = count + extra;
	S._mergedAttrNodes.add(el);
};

/**
 * A materialized attribute as returned by `A.attributes` (tests/tooling) -
 * the parser-facing representation is an id into the attribute columns, read
 * through the scalar `A.attr*` accessors.
 * @typedef {object} HtmlAttribute
 * @property {string} name lowercased (and, in foreign content, adjusted) attribute name
 * @property {string} value
 * @property {string=} serializedName name used by the html5lib tree serializer (foreign-namespaced)
 * @property {number} nameStart source offset, or -1 on adoption-agency clones
 * @property {number} nameEnd
 * @property {number} valueStart source offset, or -1 when valueless / on clones
 * @property {number} valueEnd
 */

/**
 * A node reference into the struct-of-arrays AST: an integer id indexing the
 * parallel `_h*` columns. Read fields through the exported accessor `A`. Refs
 * are only valid until the next `parseHtml` call - the columns are reused
 * across parses - so consume a tree fully before parsing again.
 * @typedef {number} HtmlNodeRef
 */

/** @typedef {HtmlNodeRef} HtmlElement ref to an Element node */
/** @typedef {HtmlNodeRef} HtmlText ref to a Text node */
/** @typedef {HtmlNodeRef} HtmlComment ref to a Comment node */
/** @typedef {HtmlNodeRef} HtmlDoctype ref to a Doctype node */
/** @typedef {HtmlNodeRef} HtmlProcessingInstruction ref to a ProcessingInstruction node */
/** @typedef {HtmlNodeRef} HtmlDocument ref to the Document node */
/** @typedef {HtmlNodeRef} HtmlDocumentFragment ref to a DocumentFragment node */
/** @typedef {HtmlNodeRef} HtmlNode */

/**
 * An attribute as a node: a negative id, which the shared reads (`A.name`,
 * `A.value`, `A.start`, ...) take. Same validity contract as `HtmlNodeRef`.
 * @typedef {number} HtmlAttributeRef
 */

/** @typedef {{ start: number, end: number, tagEnd: number, nameEnd: number }} TagPos */

// Tree-construction token `type` discriminators. Numeric for the same reason
// as `NodeType` / the CSS `TT_*` constants: the insertion modes dispatch on
// `t.type` per token, and integer `===` beats string comparison there.
const TOKEN_CHAR = 1;
const TOKEN_COMMENT = 2;
const TOKEN_DOCTYPE = 3;
const TOKEN_START_TAG = 4;
const TOKEN_END_TAG = 5;
const TOKEN_EOF = 6;
const TOKEN_PROCESSING_INSTRUCTION = 7;

/** @typedef {{ type: typeof TOKEN_CHAR, data: string, start: number, end: number }} CharToken */
/** @typedef {{ type: typeof TOKEN_COMMENT, data: string, start: number, end: number }} CommentToken */
/** @typedef {{ type: typeof TOKEN_DOCTYPE, name: string, publicId: (string | null), systemId: (string | null), publicStart: number, publicEnd: number, systemStart: number, systemEnd: number, forceQuirks: boolean, start: number, end: number }} DoctypeToken */
/** @typedef {{ type: typeof TOKEN_START_TAG, name: string, attrs: AttributeRun, selfClosing: boolean, pos: TagPos, swallowNewline?: boolean }} StartTagToken */
/** @typedef {{ type: typeof TOKEN_END_TAG, name: string, pos: TagPos }} EndTagToken */
/** @typedef {{ type: typeof TOKEN_EOF }} EofToken */
/** @typedef {{ type: typeof TOKEN_PROCESSING_INSTRUCTION, name: string, data: string, start: number, end: number }} ProcessingInstructionToken the target rides in `name`, as the doctype's does */

/**
 * Every insertion mode handles a processing instruction token on the same arc
 * as a comment token, so the arcs test both.
 * @param {Token} t current token
 * @returns {t is CommentToken | ProcessingInstructionToken} true for a comment or processing instruction token
 */
const isCommentOrProcessingInstruction = (t) =>
	t.type === TOKEN_COMMENT || t.type === TOKEN_PROCESSING_INSTRUCTION;

/**
 * Internal token passed through the tree-construction insertion modes.
 * @typedef {CharToken | CommentToken | DoctypeToken | StartTagToken | EndTagToken | EofToken | ProcessingInstructionToken} Token
 */

/**
 * The tree builder reuses a single mutable token (with a reused `pos`) instead
 * of allocating one object per tokenizer callback. All fields are always
 * present so the shape never changes - keeping the `process`/insertion-mode
 * `t.*` reads monomorphic - and fields irrelevant to the current `type` carry
 * stale values that those handlers never read. Tokens that must outlive the
 * current callback (buffered table characters, synthesized re-dispatches) are
 * copied into fresh plain objects instead.
 * @typedef {{ type: number, name: string, data: string, attrs: AttributeRun, selfClosing: boolean, start: number, end: number, publicId: (string | null), systemId: (string | null), publicStart: number, publicEnd: number, systemStart: number, systemEnd: number, forceQuirks: boolean, swallowNewline: boolean, pos: TagPos }} MutableToken
 */

/** @typedef {{ parent: HtmlNodeRef, beforeNode: HtmlNodeRef }} InsertionPlace `beforeNode` 0 = plain append */

// Insertion modes (§13.2.4.1). Numeric for the same reason as the token and
// `NodeType` enums: `runMode` dispatches on `mode` once per token.
const MODE_INITIAL = 1;
const MODE_BEFORE_HTML = 2;
const MODE_BEFORE_HEAD = 3;
const MODE_IN_HEAD = 4;
const MODE_IN_HEAD_NOSCRIPT = 5;
const MODE_AFTER_HEAD = 6;
const MODE_IN_BODY = 7;
const MODE_TEXT = 8;
const MODE_IN_TABLE = 9;
const MODE_IN_TABLE_TEXT = 10;
const MODE_IN_CAPTION = 11;
const MODE_IN_COLUMN_GROUP = 12;
const MODE_IN_TABLE_BODY = 13;
const MODE_IN_ROW = 14;
const MODE_IN_CELL = 15;
const MODE_IN_TEMPLATE = 16;
const MODE_AFTER_BODY = 17;
const MODE_IN_FRAMESET = 18;
const MODE_AFTER_FRAMESET = 19;
const MODE_AFTER_AFTER_BODY = 20;
const MODE_AFTER_AFTER_FRAMESET = 21;

// The §13.2.6.4.18 re-dispatch table, bound to this file's numbering. A name the
// binding does not cover would silently dispatch to `undefined`, so it throws.
/** @type {Record<string, number>} */
const MODE_BY_NAME = {
	IN_TABLE: MODE_IN_TABLE,
	IN_COLUMN_GROUP: MODE_IN_COLUMN_GROUP,
	IN_TABLE_BODY: MODE_IN_TABLE_BODY,
	IN_ROW: MODE_IN_ROW
};
const TEMPLATE_START_TAG_MODES = new Map(
	Object.entries(TEMPLATE_START_TAG_MODE_NAMES).map(([tag, name]) => {
		const mode = MODE_BY_NAME[name];
		if (mode === undefined) throw new Error(`Unknown insertion mode ${name}`);
		return [tag, mode];
	})
);

/**
 * MathML/SVG specials are handled via namespace checks rather than one table.
 * @param {HtmlElement} el element to test
 * @returns {boolean} true when the element is "special" (§13.2.4.2)
 */
const isSpecial = (el) => {
	const ns = namespaceOf(el);
	const tag = tagNameOf(el);
	if (ns === NS_HTML) return SPECIAL.has(tag);
	if (ns === NS_MATHML) return MATHML_SPECIAL.has(tag);
	// SVG, the one namespace left: no other reaches the HTML tree builder.
	return SVG_SPECIAL.has(tag.toLowerCase());
};

/**
 * `<font color|face|size>` breaks out of foreign content (§13.2.6.5).
 * @param {AttributeRun} run the tag's attributes
 * @returns {boolean} true when one of the breakout attributes is present
 */
const hasFontBreakoutAttr = (run) => {
	for (let i = run.start; i < run.start + run.count; i++) {
		if (FONT_BREAKOUT_ATTRS.has(S._attrNames[i])) return true;
	}
	return false;
};

/**
 * Hash of `name` for the intern tables below; must stay in sync with the range
 * hash in `internLowerName`, whose fold every name in the tables already has.
 * @param {string} name lowercase name
 * @returns {number} hash
 */
const hashLowerName = (name) => {
	let h = name.length;
	for (let i = 0; i < name.length; i++) {
		h = (Math.imul(h, 31) + name.charCodeAt(i)) | 0;
	}
	return h;
};

// Text-run scan classes for the `skip.text` fast path: 2 = stop the fast
// path (& / NUL / CR), 1 = ASCII whitespace, 0 = ordinary text.
const TEXT_SCAN_CLASS = new Uint8Array(128);
TEXT_SCAN_CLASS[0x09] = 1;
TEXT_SCAN_CLASS[0x0a] = 1;
TEXT_SCAN_CLASS[0x0c] = 1;
TEXT_SCAN_CLASS[0x20] = 1;
TEXT_SCAN_CLASS[0x26] = 2;
TEXT_SCAN_CLASS[0x00] = 2;
TEXT_SCAN_CLASS[0x0d] = 2;

/**
 * @param {Iterable<string>} names lowercase names to intern
 * @returns {{ mask: number, hashes: Int32Array, values: (string | undefined)[], memo: string[], sourceBacked: number[], noted: Uint8Array }} open-addressed intern table
 */
const buildNameInternTable = (names) => {
	// Open-addressed table (~25% load): the per-name probe is one or two array
	// reads instead of a `Map#get`, and the tables are built once at startup.
	const unique = [...new Set(names)];
	let size = 8;
	while (size < unique.length * 4) size <<= 1;
	const mask = size - 1;
	const hashes = new Int32Array(size);
	/** @type {(string | undefined)[]} */
	const values = Array.from({ length: size });
	for (const name of unique) {
		const h = hashLowerName(name);
		let slot = h & mask;
		// Two names sharing a hash take two slots rather than one bucket, so a
		// slot holds one string and the lookup's load stays monomorphic.
		while (values[slot] !== undefined) slot = (slot + 1) & mask;
		hashes[slot] = h;
		values[slot] = name;
	}
	// `memo` short-circuits the hash walk for a name just seen, with `""` as the
	// empty slot so the load stays monomorphic. `sourceBacked` lists the slots
	// holding a slice of the input - the only ones the next parse drops.
	return {
		mask,
		hashes,
		values,
		memo: /** @type {string[]} */ (Array.from({ length: 512 })).fill(""),
		sourceBacked: [],
		noted: new Uint8Array(512)
	};
};

/** @typedef {ReturnType<typeof buildNameInternTable>} NameInternTable */

/**
 * Drop the memo entries holding a slice of the last parsed input, so no parse
 * retains another's source. Past the memo's own size a full clear is cheaper.
 * @param {NameInternTable} table intern table
 * @returns {void}
 */
const dropSourceBackedNames = (table) => {
	const slots = table.sourceBacked;
	if (slots.length === 0) return;
	const { memo, noted } = table;
	// A slot a known name has since claimed is dropped with the rest: the entry is
	// safe to keep, but noting that costs a write on the path every name takes.
	if (slots.length >= memo.length) {
		memo.fill("");
		noted.fill(0);
	} else {
		for (const slot of slots) {
			memo[slot] = "";
			noted[slot] = 0;
		}
	}
	slots.length = 0;
};

/**
 * The lowercased name for `input[start..end)`, returning the shared interned
 * string for known names - skipping the per-tag `slice().toLowerCase()`
 * allocation, and making the tree builder's many Set/Map lookups and `===`
 * comparisons on the name hit one string instance with a cached hash.
 * @param {NameInternTable} table intern table
 * @param {string} input source text
 * @param {number} start name start
 * @param {number} end name end
 * @returns {string} lowercased name
 */
const internLowerName = (table, input, start, end) => {
	// A document spells the same few names over and over, so a direct-mapped memo
	// keyed on folded first char and length answers most calls in one compare.
	// Every hit re-verifies, so a collision misses rather than lies.
	let c0 = input.charCodeAt(start);
	if (c0 >= 0x41 && c0 <= 0x5a) c0 += 0x20;
	const memo = table.memo;
	const memoSlot = (Math.imul(c0, 31) + (end - start)) & 511;
	const cached = memo[memoSlot];
	// The source spelling a name in lowercase is the common case: one builtin
	// call, where the matcher loops a call a character.
	if (
		cached.length !== 0 &&
		cached.length === end - start &&
		input.startsWith(cached, start)
	) {
		return cached;
	}
	if (
		cached.length !== 0 &&
		rangeAsciiCaseInsensitiveMatch(input, start, end, cached)
	) {
		return cached;
	}
	let h = end - start;
	for (let i = start; i < end; i++) {
		let c = input.charCodeAt(i);
		if (c >= 0x41 && c <= 0x5a) c += 0x20;
		h = (Math.imul(h, 31) + c) | 0;
	}
	const { mask, hashes, values } = table;
	let slot = h & mask;
	for (;;) {
		const hit = values[slot];
		// Only an empty slot ends the walk: a name that hashes the same as another
		// sits one slot along, so an equal hash that does not match is not a miss.
		if (hit === undefined) break;
		if (
			hashes[slot] === h &&
			rangeAsciiCaseInsensitiveMatch(input, start, end, hit)
		) {
			return (memo[memoSlot] = hit);
		}
		slot = (slot + 1) & mask;
	}
	// Unknown name (custom element, data-* attribute, non-ASCII, ...). Only ASCII
	// folds - a Unicode `toLowerCase` maps U+212A onto `k` and U+0130 onto two
	// characters, neither of which the tokenizer does.
	if (table.noted[memoSlot] === 0) {
		table.noted[memoSlot] = 1;
		table.sourceBacked.push(memoSlot);
	}
	return (memo[memoSlot] = asciiLowercase(input.slice(start, end)));
};

// Every tag name the tree builder compares against (the sets above already
// cover most of the spec), plus the remaining standard/foreign names so
// ordinary documents intern every tag.
const TAG_NAME_INTERN = buildNameInternTable([
	...VOID,
	...SPECIAL,
	...FORMATTING,
	...HEADING,
	...MATHML_TEXT_INTEGRATION,
	...MATHML_SPECIAL,
	...SVG_SPECIAL,
	...HTML_SCOPE,
	...TABLE_CONTEXT,
	...VOID_FORMATTING,
	...NO_DECODE_TEXT,
	...FOREIGN_BREAKOUT,
	...HEAD_ELEMENTS,
	...Object.keys(SVG_TAG_ADJUST),
	..."a abbr audio bdi bdo canvas cite data datalist del dfn dialog ins kbd label legend map mark math menuitem meter optgroup option output picture progress q rb rp rt rtc ruby samp selectedcontent slot span sub sup svg time u var video".split(
		" "
	)
]);

// Common attribute names (unknown ones - data-*, ARIA, events - fall back).
const ATTR_NAME_INTERN = buildNameInternTable(
	"href src srcset sizes alt title class id style name type value content charset rel media target action method placeholder disabled checked selected multiple readonly required hidden tabindex role lang dir width height loading decoding async defer integrity crossorigin referrerpolicy nonce as for colspan rowspan span label max min step pattern autocomplete autofocus autoplay controls loop muted poster preload download ping imagesrcset imagesizes slot part is property http-equiv accept enctype novalidate maxlength minlength size cols rows wrap open scope headers datetime cite usemap ismap shape coords start reversed face color encoding xmlns".split(
		" "
	)
);

/**
 * Hoisted so the many `open.some(...)` "is there an open HTML `<template>`?"
 * checks reuse one predicate instead of allocating an arrow per call.
 * @param {HtmlElement} e element to test
 * @returns {boolean} true for an HTML `<template>` element
 */
const isHtmlTemplateEl = (e) =>
	tagNameOf(e) === "template" && namespaceOf(e) === NS_HTML;

/**
 * Shared empty skip set so the common (no-skip) call allocates nothing.
 * @type {HtmlAstSkip}
 */
const EMPTY_SKIP = Object.freeze({});

/**
 * Optional node kinds a consumer can drop from the AST for speed/memory. Each
 * is a pure output reduction - tree construction (and quirks detection) runs
 * unchanged, so element structure and offsets are identical either way.
 * @typedef {object} HtmlAstSkip
 * @property {boolean=} text drop every `Text` node. Raw-text element bodies (`<script>`/`<style>`/...) aren't emitted either - their content span is recorded as the element's `contentEnd` (see `RAW_TEXT_ELEMENTS`) so a consumer can read `[tagEnd, contentEnd]` by offset. For consumers that read text by offset (e.g. `HtmlParser`), never the html5lib serializer.
 * @property {boolean=} comments drop comment nodes entirely. Not for consumers that read comments (e.g. webpack magic comments).
 * @property {boolean=} doctype drop the doctype node; quirks-mode detection is unaffected.
 */

/**
 * @typedef {object} HtmlParseOptions
 * @property {string=} fragmentContext context element name for fragment parsing (e.g. `td`, `svg path`); omit for a full document
 * @property {boolean=} xml parse as XML instead of applying the HTML tree-construction rules
 * @property {HtmlAstSkip=} skip node kinds to omit from the AST (see `HtmlAstSkip`); omit to build the full tree
 * @property {boolean=} scripting parse as a browser with scripting on does, where a `noscript` holds raw text; off by default, so what it holds is read as markup
 * @property {boolean=} srcdoc parse as an `<iframe srcdoc>` document, which is never in quirks mode whatever its doctype says
 * @property {((input: string, code: string, start: number, end: number, severity: ParseErrorSeverity) => void)=} parseError optional callback for each parse error of the tokenizer, as `HtmlTokenCallbacks#parseError` receives it, and of tree construction, named as html5lib names them since WHATWG names only one; those are `"warning"`
 */

/**
 * @param {string} name raw SVG tag name
 * @returns {string} case-adjusted SVG tag name
 */
const adjustSvgTag = (name) => SVG_TAG_ADJUST[name] || name;

/**
 * @param {string} p lowercased public id
 * @returns {boolean} whether it is HTML 4.01 Frameset or Transitional, whose mode
 * turns on whether a system id is given
 */
const isHtml401Loose = (p) =>
	p.startsWith("-//w3c//dtd html 4.01 frameset//") ||
	p.startsWith("-//w3c//dtd html 4.01 transitional//");

/**
 * Whether readers disagree on the mode: an empty system id is given, which the
 * standard reads as present, but some browsers read as missing.
 * @param {string | null} pub public id
 * @param {string | null} sys system id
 * @returns {boolean} true when the document mode depends on the reader
 */
const isDisputedDoctype = (pub, sys) =>
	sys === "" && pub !== null && isHtml401Loose(pub.toLowerCase());

/**
 * @param {string} name doctype name
 * @param {string | null} pub public id
 * @param {string | null} sys system id
 * @returns {boolean} whether the doctype forces quirks mode
 */
const isQuirky = (name, pub, sys) => {
	if (name !== "html") return true;
	// An empty identifier is one the doctype spells, not a missing one.
	const p = pub !== null ? pub.toLowerCase() : null;
	const sl = sys !== null ? sys.toLowerCase() : null;
	if (p !== null) {
		if (QUIRKY_EXACT.has(p)) return true;
		for (const pre of QUIRKY_PREFIXES) if (p.startsWith(pre)) return true;
		if (sl === null && isHtml401Loose(p)) return true;
	}
	if (sl === "http://www.ibm.com/data/dtd/v11/ibmxhtml1-transitional.dtd") {
		return true;
	}
	return false;
};

// One bit per name set the "in body" rules and `mkEl` test a tag name against.
const KIND_NO_END_TAG = 1;
const KIND_HTML_SCOPE = 2;
const KIND_HEAD_ELEMENT = 4;
const KIND_BLOCK_START = 8;
const KIND_BLOCK_END = 16;
const KIND_HEADING = 32;
const KIND_FORMATTING = 64;
const KIND_APPLET_MARQUEE_OBJECT = 128;
const KIND_VOID_FORMATTING = 256;
const KIND_PARAM_SOURCE_TRACK = 512;
const KIND_IGNORED_BODY_TABLE_START = 1024;
const KIND_IMPLIED = 2048;

// Every interned tag name with the bits of the sets holding it, so one lookup
// answers what a `Set#has` per rule did.
/** @type {Map<string, number>} */
const TAG_KINDS = new Map();
for (const name of TAG_NAME_INTERN.values) {
	if (name !== undefined) TAG_KINDS.set(name, 0);
}
for (const [kind, names] of /** @type {[number, Set<string>][]} */ ([
	[KIND_NO_END_TAG, NO_END_TAG],
	[KIND_HTML_SCOPE, HTML_SCOPE],
	[KIND_HEAD_ELEMENT, HEAD_ELEMENTS],
	[KIND_BLOCK_START, BLOCK_START],
	[KIND_BLOCK_END, BLOCK_END],
	[KIND_HEADING, HEADING],
	[KIND_FORMATTING, FORMATTING],
	[KIND_APPLET_MARQUEE_OBJECT, APPLET_MARQUEE_OBJECT],
	[KIND_VOID_FORMATTING, VOID_FORMATTING],
	[KIND_PARAM_SOURCE_TRACK, PARAM_SOURCE_TRACK],
	[KIND_IGNORED_BODY_TABLE_START, IGNORED_BODY_TABLE_STARTS],
	[KIND_IMPLIED, IMPLIED]
])) {
	for (const name of names) {
		TAG_KINDS.set(name, (TAG_KINDS.get(name) || 0) | kind);
	}
}

// The last name `tagKind` found: a tag's rules, the element they insert and
// the end tag closing it ask about the same one.
let lastKindName = "";
let lastKind = 0;

/**
 * The `KIND_*` bits of an HTML tag name.
 * @param {string} name lowercased tag name
 * @returns {number} its bits, `0` for a name in none of the sets
 */
const tagKind = (name) => {
	if (name === lastKindName) return lastKind;
	const kind = TAG_KINDS.get(name);
	// An unknown name can be a slice of the source, which is not kept here.
	if (kind === undefined) return 0;
	lastKindName = name;
	return (lastKind = kind);
};

/**
 * Whether a foreign element of this name and namespace bounds a scope
 * (§13.2.4.2); an HTML name's answer is its tag kind's `KIND_HTML_SCOPE` bit.
 * @param {string} tagName the element's name
 * @param {number} ns the element's namespace, MathML or SVG
 * @returns {boolean} true when it stops a "have an element in scope" walk
 */
const boundsScope = (tagName, ns) => {
	if (ns === NS_MATHML) return MATHML_SPECIAL.has(tagName);
	if (ns === NS_SVG) return SVG_SPECIAL.has(tagName.toLowerCase());
	return false;
};

/**
 * Allocates an element node.
 * @param {string} tagName tag name
 * @param {number} ns namespace flag (`NS_HTML`, `NS_MATHML`, `NS_SVG`)
 * @param {AttributeRun} attrs the element's attributes
 * @param {TagPos | null | undefined} pos source position, absent for synthesized elements
 * @returns {HtmlElement} the new element
 */
const mkEl = (tagName, ns, attrs, pos) => {
	const tree = S;
	// Inlined element allocation: every column is written exactly once (the
	// generic makeNode would zero five columns mkEl immediately overwrites).
	const el = ++tree._nodeCount;
	if (el >= tree._nodeCapacity) growNodeColumns(el + 1);
	tree._types[el] = NodeType.Element;
	// An HTML element printed with no end tag is marked self-closing: the void
	// ones, and those tree construction pops at once, never receive children.
	let flags = ns;
	if (ns === NS_HTML) {
		const kind = tagKind(tagName);
		if ((kind & KIND_NO_END_TAG) !== 0) flags |= FLAG_SELF_CLOSING;
		if ((kind & KIND_HTML_SCOPE) !== 0) flags |= FLAG_SCOPE_BOUNDARY;
	} else if (boundsScope(tagName, ns)) {
		flags |= FLAG_SCOPE_BOUNDARY;
	}
	tree._flags[el] = flags;
	if (pos) {
		tree._starts[el] = pos.start;
		tree._ends[el] = pos.end;
		tree._tagEnds[el] = pos.tagEnd;
		tree._nameEnds[el] = pos.nameEnd;
		// End of a raw-text element's body under `skip.text` (defaults to the
		// body start, i.e. empty); lets consumers read `<script>`/`<style>`
		// content as [`tagEnd`, `contentEnd`] without a `Text` node.
		tree._contentEnds[el] = pos.tagEnd;
	} else {
		tree._starts[el] = 0;
		tree._ends[el] = 0;
		tree._tagEnds[el] = 0;
		tree._nameEnds[el] = 0;
		tree._contentEnds[el] = 0;
	}
	tree._parents[el] = 0;
	tree._firstChildren[el] = 0;
	tree._lastChildren[el] = 0;
	tree._nextSiblings[el] = 0;
	tree._attrStarts[el] = attrs.start;
	tree._attrCounts[el] = attrs.count;
	tree._strings[el] = tagName;
	return el;
};

/**
 * A `<template>`'s children live in its content fragment; inserting into a
 * template really inserts there (the spec's "template contents" redirect).
 * @param {HtmlNodeRef} parent container
 * @returns {HtmlNodeRef} effective container to link children into
 */
const effParent = (parent) => {
	const tc = templateContentOf(parent);
	return tc !== 0 ? tc : parent;
};

/**
 * Elements that stop a "have an element in scope" walk (§13.2.4.2).
 * @param {HtmlElement} el element to test
 * @returns {boolean} true when the element bounds a scope
 */
const isScopeBoundary = (el) => (S._flags[el] & FLAG_SCOPE_BOUNDARY) !== 0;

/**
 * Compares two attribute values, by source range while both are unresolved -
 * `attrValueOf` would slice a string per side just to throw it away.
 * @param {number} i first attribute id
 * @param {number} j second attribute id
 * @returns {boolean} true when both values are equal
 */
const attrValueEquals = (i, j) => {
	if (S._attrValues[i] === null && S._attrValues[j] === null) {
		const start = S._attrValueStarts[i];
		const len = S._attrValueEnds[i] - start;
		const otherStart = S._attrValueStarts[j];
		if (len !== S._attrValueEnds[j] - otherStart) return false;
		for (let k = 0; k < len; k++) {
			if (
				S._input.charCodeAt(start + k) !== S._input.charCodeAt(otherStart + k)
			) {
				return false;
			}
		}
		return true;
	}
	return attrValueOf(i) === attrValueOf(j);
};

/**
 * Compares two elements' attribute runs, as the active-formatting-elements
 * "Noah's Ark" clause does.
 * @param {HtmlElement} a first element
 * @param {HtmlElement} b second element
 * @returns {boolean} true when both carry the same attributes
 */
const sameAttrs = (a, b) => {
	const aStart = S._attrStarts[a];
	const aCount = S._attrCounts[a];
	const bStart = S._attrStarts[b];
	const bCount = S._attrCounts[b];
	if (aCount !== bCount) return false;
	// Names are unique (deduped), counts tiny - a nested scan beats a Map
	// here on this formatting-element hot path.
	for (let i = bStart; i < bStart + bCount; i++) {
		const j = findAttr(aStart, aCount, S._attrNames[i]);
		if (j === 0 || !attrValueEquals(j, i)) return false;
	}
	return true;
};

/**
 * @param {string} s text to test
 * @returns {boolean} true when the text starts with HTML whitespace
 */
const startsWithAsciiWhitespace = (s) => {
	const c = s.charCodeAt(0);
	return c === 0x09 || c === 0x0a || c === 0x0c || c === 0x0d || c === 0x20;
};

/**
 * @param {string} s text to test
 * @returns {boolean} true when the text is HTML whitespace only
 */
const isAllAsciiWhitespace = (s) => {
	for (let i = 0; i < s.length; i++) {
		const c = s.charCodeAt(i);
		// HTML whitespace: tab / LF / FF / CR / space. A charCodeAt loop avoids
		// the `for...of` code-point iterator + per-char string + Set lookup.
		if (c !== 0x09 && c !== 0x0a && c !== 0x0c && c !== 0x0d && c !== 0x20) {
			return false;
		}
	}
	return true;
};

// A whitespace run the printer can shorten: two of them in a row, or a lone one
// that is not already a space.
const COLLAPSIBLE_WHITESPACE_REGEXP = /[\t\n\f\r]|[ ][ ]/;

/**
 * Collapse every run of HTML whitespace to one space - never remove one:
 * `a <b>c</b>` and `a<b>c</b>` render differently.
 * @param {string} s text data
 * @returns {string} the collapsed text
 */
const collapseWhitespaceRuns = (s) => {
	// Most text collapses to itself, and one scan answers that before the walk
	// below reaches its first run.
	if (!COLLAPSIBLE_WHITESPACE_REGEXP.test(s)) return s;
	let out = "";
	let last = 0;
	let run = -1;
	for (let i = 0; i <= s.length; i++) {
		const c = i === s.length ? 0 : s.charCodeAt(i);
		const isAsciiWhitespace =
			c === 0x09 || c === 0x0a || c === 0x0c || c === 0x0d || c === 0x20;
		if (isAsciiWhitespace) {
			if (run === -1) run = i;
			continue;
		}
		// A one-character run is already a single space unless it is a tab or a
		// newline, which still print shorter as one.
		if (run !== -1 && (i - run > 1 || s.charCodeAt(run) !== 0x20)) {
			out += `${s.slice(last, run)} `;
			last = i;
		}
		run = -1;
	}
	// The test above found a run this rewrote, so `out` is never empty here.
	return out + s.slice(last);
};

/**
 * @param {HtmlElement} el element to test
 * @returns {boolean} true for a MathML text integration point (§13.2.6.5)
 */
const mathmlTextIntegrationPoint = (el) =>
	namespaceOf(el) === NS_MATHML && MATHML_TEXT_INTEGRATION.has(tagNameOf(el));

/**
 * @param {HtmlElement} el element to test
 * @returns {boolean} true for an HTML integration point (§13.2.6.5)
 */
const htmlIntegrationPoint = (el) => {
	if (namespaceOf(el) === NS_MATHML && tagNameOf(el) === "annotation-xml") {
		const enc = findAttr(S._attrStarts[el], S._attrCounts[el], "encoding");
		if (enc !== 0) {
			const value = attrValueDecoded(enc).toLowerCase();
			if (value === "text/html" || value === "application/xhtml+xml") {
				return true;
			}
		}
		return false;
	}
	if (
		namespaceOf(el) === NS_SVG &&
		SVG_SPECIAL.has(tagNameOf(el).toLowerCase())
	) {
		return true;
	}
	return false;
};

/**
 * Rewrites SVG camelCase names and flags namespaced ones for the serializer.
 * In place: the run is consumed only by this tag's element.
 * @param {AttributeRun} run the tag's attributes
 * @param {number} ns namespace flag of the tag
 * @returns {AttributeRun} the same run
 */
const adjustForeignAttrs = (run, ns) => {
	for (let i = run.start; i < run.start + run.count; i++) {
		const name = S._attrNames[i];
		if (ns === NS_SVG && SVG_ATTR_ADJUST[name]) {
			S._attrNames[i] = SVG_ATTR_ADJUST[name];
		}
		if (FOREIGN_ATTR_NS[name]) {
			S._attrFlags[i] |= 1;
		}
	}
	return run;
};

/**
 * Only `definitionurl` is rewritten (in place - the run is consumed only by
 * this tag's element); the camelCase name serializes as itself.
 * @param {AttributeRun} run the tag's attributes
 * @returns {AttributeRun} the same run
 */
const adjustMathmlAttrs = (run) => {
	for (let i = run.start; i < run.start + run.count; i++) {
		if (S._attrNames[i] === "definitionurl") {
			S._attrNames[i] = "definitionURL";
		}
	}
	return run;
};

/**
 * @returns {boolean} whether the parser is parsing template contents
 */
const parsingTemplateContents = () =>
	S._open.some(isHtmlTemplateEl) ||
	(S._fragment !== 0 && isHtmlTemplateEl(S._fragment));

const SHELL_END_HTML = 1;
const SHELL_END_HEAD = 2;
const SHELL_END_BODY = 4;
const decode = decodeEntities;

/**
 * @param {number} code Unicode code point
 * @returns {boolean} whether XML 1.0 permits the character
 */
const isXmlChar = (code) =>
	code === CC_TAB ||
	code === CC_LF ||
	code === CC_CR ||
	(code >= 0x20 && code <= 0xd7ff) ||
	(code >= 0xe000 && code <= 0xfffd) ||
	(code >= 0x10000 && code <= 0x10ffff);

const XML_CHARACTER_REFERENCE_REGEXP = /&#(?:x([\da-fA-F]+)|(\d+));/g;
// An `&` opening no well-formed reference (§4.1, a `Name` per §2.3), which a
// strict parser refuses. One class per part, surrogates read per code unit, so
// a long name never backtracks; the decoder kept it as text, so it is escaped.
const XML_BARE_AMPERSAND_REGEXP =
	/&(?!(?:#(?:x[\da-fA-F]+|\d+)|[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u2070-\u218F\u2C00-\u2FEF\u3001-\uDB7F\uF900-\uFDCF\uFDF0-\uFFFD\u200C-\u200D][-.0-9:A-Z_a-z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u203F\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uDFFF\uF900-\uFDCF\uFDF0-\uFFFD\u200C-\u200D]*);)/;
// WHY: §3.3.3 normalizes each literal whitespace character of an attribute value
// to a space after §2.11 has folded CRLF, so a CRLF is one space; replacement
// text of an entity is already folded, so there each character counts alone.
const XML_ATTRIBUTE_LINE_END_REGEXP = /\r\n?|[\t\n]/g;
// What `decodeXmlAttribute` and `escapeXmlAttribute` act on, so a value
// holding none of it is returned as is
const XML_ATTRIBUTE_DECODED_REGEXP = /[&\t\n\r]/;
const XML_ATTRIBUTE_DOUBLE_QUOTED_REGEXP = /[&<"\t\n\r]/;
const XML_ATTRIBUTE_SINGLE_QUOTED_REGEXP = /[&<'\t\n\r]/;
const XML_WHITESPACE_REGEXP = /[\t\n\r]/g;
const XML_LINE_END_REGEXP = /\r\n?/g;
// Entities an entity may name before the rest is left as written.
const XML_ENTITY_DEPTH_LIMIT = 16;
// Characters one parse may expand entities into beyond the source itself, so
// a declaration nesting its references ("billion laughs") stays bounded.
const XML_ENTITY_EXPANSION_BUDGET = 1 << 20;

const XML_VALUE_PAGE_BITS = 6;
/**
 * @typedef {object} XmlAttributeDeclaration
 * @property {boolean} tokenized whether the type is not CDATA, so §3.3.3 also trims and collapses spaces
 * @property {string | null} defaultValue the default as written, null for `#REQUIRED` / `#IMPLIED`
 */

/**
 * @param {string} match the reference as written
 * @param {string | undefined} hex hexadecimal digits of a character reference
 * @param {string | undefined} decimal decimal digits of a character reference
 * @returns {string} the character, or U+FFFD for one XML does not allow
 */
const xmlCharacterReference = (match, hex, decimal) => {
	const code = Number.parseInt(
		hex === undefined ? /** @type {string} */ (decimal) : hex,
		hex === undefined ? 10 : 16
	);
	return isXmlChar(code) ? String.fromCodePoint(code) : "\uFFFD";
};

/**
 * Whether a code unit ends the name of an entity reference, which is read as
 * leniently as one is declared: a delimiter of the markup around a reference,
 * or white space as a regular expression's `\s` has it.
 * @param {number} cc code unit
 * @returns {boolean} true when the name of a reference cannot hold it
 */
const endsXmlReferenceName = (cc) =>
	cc > CC_GREATER_THAN
		? cc >= CC_NO_BREAK_SPACE &&
			(cc === CC_NO_BREAK_SPACE ||
				cc === 0x1680 ||
				(cc >= 0x2000 && cc <= 0x200a) ||
				cc === 0x2028 ||
				cc === 0x2029 ||
				cc === 0x202f ||
				cc === 0x205f ||
				cc === 0x3000 ||
				cc === 0xfeff)
		: cc === CC_SEMICOLON ||
			cc === CC_AMPERSAND ||
			cc === CC_NUMBER_SIGN ||
			cc === CC_LESS_THAN ||
			cc === CC_GREATER_THAN ||
			cc === CC_QUOTATION_MARK ||
			cc === CC_APOSTROPHE ||
			cc === CC_EQUALS ||
			cc === CC_SOLIDUS ||
			cc === 0x25 /* % */ ||
			cc === CC_SPACE ||
			(cc >= CC_TAB && cc <= CC_CR);

/**
 * What a predefined entity (§4.6) stands for. It is matched where it is written,
 * so the commonest references cost no name string and no lookup by one.
 * @param {string} value text
 * @param {number} start offset of the name of a reference
 * @param {number} end offset past the name
 * @returns {string | undefined} the character, undefined for any other name
 */
const xmlPredefinedEntity = (value, start, end) => {
	switch (end - start) {
		case 2:
			if (value.charCodeAt(start + 1) === 0x74 /* t */) {
				const first = value.charCodeAt(start);
				if (first === 0x6c /* l */) return "<";
				if (first === 0x67 /* g */) return ">";
			}
			return undefined;
		case 3:
			return value.startsWith("amp", start) ? "&" : undefined;
		case 4:
			if (value.startsWith("quot", start)) return '"';
			return value.startsWith("apos", start) ? "'" : undefined;
		default:
			return undefined;
	}
};

/**
 * The memo of what entities decode to that a reference may use: only one
 * outside any other entity, read while the parse runs.
 * @param {boolean} attribute whether the reference is in an attribute value
 * @returns {Map<string, { text: string, cost: number }> | null} that memo, null when none applies
 */
const xmlEntityMemo = (attribute) => {
	if (!S._xmlEntityMemoOpen || S._xmlEntityStack.length !== 0) return null;
	if (attribute) {
		if (S._xmlAttributeEntityMemo === null) {
			S._xmlAttributeEntityMemo = new Map();
		}
		return S._xmlAttributeEntityMemo;
	}
	if (S._xmlTextEntityMemo === null) S._xmlTextEntityMemo = new Map();
	return S._xmlTextEntityMemo;
};

/**
 * Resolve character and entity references (§4.4): the five predefined names,
 * and the internal general entities the document's DTD declared. Which other
 * names resolve is up to that DTD.
 * @param {string} value source text, its line ends already folded
 * @param {boolean} attribute whether `value` is (part of) an attribute value
 * @returns {string} decoded text
 */
const decodeXmlReferences = (value, attribute) => {
	// WHY: a scan of the three reference forms, as `decodeEntities` reads HTML's,
	// so a reference pays no regex machinery, match object or callback. A text
	// whose references all stay as written is returned as it came.
	const len = value.length;
	let out = "";
	let last = 0;
	for (
		let amp = value.indexOf("&");
		amp !== -1;
		amp = value.indexOf("&", amp + 1)
	) {
		// A character reference accumulates during the digit scan, saturating
		// above the code point range, where every value decodes alike.
		let code = -1;
		let start = amp + 1;
		let end = start;
		let cc = value.charCodeAt(end);
		if (cc !== CC_NUMBER_SIGN) {
			while (end < len && !endsXmlReferenceName(value.charCodeAt(end))) {
				end++;
			}
		} else if (value.charCodeAt(end + 1) === 0x78 /* x */) {
			start = end += 2;
			code = 0;
			while (isAsciiHexDigit((cc = value.charCodeAt(end)))) {
				code = code * 16 + (cc <= 0x39 ? cc - 0x30 : (cc | 0x20) - 0x57);
				if (code > 0x10ffff) code = 0x110000;
				end++;
			}
		} else {
			start = ++end;
			code = 0;
			while (isAsciiDigit((cc = value.charCodeAt(end)))) {
				code = code * 10 + (cc - 0x30);
				if (code > 0x10ffff) code = 0x110000;
				end++;
			}
		}
		// Without digits or a name, or without its `;`, the `&` opens no reference.
		if (end === start || value.charCodeAt(end) !== CC_SEMICOLON) continue;
		/** @type {string | undefined} */
		let decoded;
		if (code !== -1) {
			decoded = isXmlChar(code) ? String.fromCodePoint(code) : "\uFFFD";
		} else {
			decoded = xmlPredefinedEntity(value, start, end);
			if (decoded === undefined) {
				const name = value.slice(start, end);
				const memo = xmlEntityMemo(attribute);
				const known = memo === null ? undefined : memo.get(name);
				if (known !== undefined && S._xmlExpansionBudget >= known.cost) {
					S._xmlExpansionBudget -= known.cost;
					decoded = known.text;
				} else {
					const replacement =
						S._xmlEntities === null ? undefined : S._xmlEntities.get(name);
					// An undeclared or recursive entity, or one past the limits, stays as written.
					if (
						replacement === undefined ||
						S._xmlEntityStack.length >= XML_ENTITY_DEPTH_LIMIT ||
						S._xmlEntityStack.includes(name) ||
						S._xmlExpansionBudget < replacement.length
					) {
						continue;
					}
					const budget = S._xmlExpansionBudget;
					S._xmlExpansionBudget -= replacement.length;
					S._xmlEntityStack.push(name);
					const text = attribute
						? replacement.replace(XML_WHITESPACE_REGEXP, " ")
						: replacement;
					decoded = text.includes("&")
						? decodeXmlReferences(text, attribute)
						: text;
					S._xmlEntityStack.pop();
					if (memo !== null) {
						memo.set(name, {
							text: decoded,
							cost: budget - S._xmlExpansionBudget
						});
					}
				}
			}
		}
		out += value.slice(last, amp);
		out += decoded;
		last = end + 1;
		amp = end;
	}
	return last === 0 ? value : out + value.slice(last);
};

/**
 * Decode the character data of XML content.
 * @param {string} value source text, its line ends already folded
 * @returns {string} decoded text
 */
const decodeXmlEntities = (value) =>
	value.includes("&") ? decodeXmlReferences(value, false) : value;

/**
 * An attribute value as §3.3.3 normalizes a CDATA one: literal whitespace
 * becomes a space, then references are resolved.
 * @param {string} value the value as written
 * @returns {string} normalized value
 */
const decodeXmlAttribute = (value) => {
	// Most values hold nothing to normalize or resolve.
	if (XML_ATTRIBUTE_DECODED_REGEXP.test(value)) {
		const spaced = value.replace(XML_ATTRIBUTE_LINE_END_REGEXP, " ");
		return spaced.includes("&") ? decodeXmlReferences(spaced, true) : spaced;
	}
	return value;
};

/**
 * @param {number} i attribute index
 * @param {string} value its normalized XML value
 * @returns {void}
 */
const setXmlAttributeValue = (i, value) => {
	const page = i >> XML_VALUE_PAGE_BITS;
	// The page list grows by appending, so it stays packed whichever id comes first.
	while (S._xmlAttributeValues.length <= page) {
		S._xmlAttributeValues.push(undefined);
	}
	let values = S._xmlAttributeValues[page];
	if (values === undefined) {
		// An id not set yet reads as `undefined`, which is what a hole reads as.
		values = /** @type {(string | undefined)[]} */ (
			// eslint-disable-next-line unicorn/no-new-array
			new Array(1 << XML_VALUE_PAGE_BITS)
		);
		S._xmlAttributeValues[page] = values;
	}
	values[i & ((1 << XML_VALUE_PAGE_BITS) - 1)] = value;
};

/**
 * @param {number} i attribute index
 * @returns {string} its normalized XML value, without spending the expansion budget again
 */
const xmlAttributeValue = (i) => {
	const page = i >> XML_VALUE_PAGE_BITS;
	const values =
		page < S._xmlAttributeValues.length
			? S._xmlAttributeValues[page]
			: undefined;
	const known =
		values === undefined
			? undefined
			: values[i & ((1 << XML_VALUE_PAGE_BITS) - 1)];
	if (known !== undefined) return known;
	const raw = attrValueOf(i);
	// Nothing to normalize or resolve reads the same every time, so is not stored.
	if (!XML_ATTRIBUTE_DECODED_REGEXP.test(raw)) return raw;
	const value = decodeXmlAttribute(raw);
	setXmlAttributeValue(i, value);
	return value;
};

/**
 * Whether an attribute's value may hold a reference (§4.1), which only an `&`
 * opens: resolving one reads the entities declared and the expansion budget left
 * as they stand, where any other value normalizes the same whenever it is read.
 * @param {number} i attribute index
 * @returns {boolean} false when the value, read from the source, holds no `&`
 */
const xmlAttributeMayHoldReference = (i) =>
	// Held as a string: an entity's replacement text, a DTD's default, or no value.
	S._attrValues[i] !== null ||
	xmlSourceHoldsAmpersand(S._attrValueStarts[i], S._attrValueEnds[i]);

/**
 * Whether the source holds an `&` in a range. Ranges are asked about in source
 * order, so the source is searched once per `&` rather than once per range.
 * @param {number} start offset of the range
 * @param {number} end offset past it
 * @returns {boolean} true when an `&` is in `[start, end)`
 */
const xmlSourceHoldsAmpersand = (start, end) => {
	if (S._xmlNextAmpersand < start) {
		const next = S._input.indexOf("&", start);
		S._xmlNextAmpersand = next === -1 ? S._input.length : next;
	}
	return S._xmlNextAmpersand < end;
};

/**
 * Escape text for XML content (§2.4): `&`, `<` and `>`, and a CR, which §2.11
 * would otherwise read back as a LF. Only a `]]>` needs its `>` escaped, but a
 * bare one costs gzip what it saves raw where the text also spells `&lt;`.
 * @param {string} data decoded text
 * @returns {string} the text as character data
 */
const escapeXmlText = (data) =>
	data
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/\r/g, "&#13;");

/**
 * Whether XML text or an attribute value, as written in its source, may be
 * written back unchanged: no `<` and every `&` opening a reference (§4.1).
 * @example
 * isXmlWellFormedText("a &amp; b"); // true
 * isXmlWellFormedText("&undeclared;"); // true: a reference, declared or not
 * isXmlWellFormedText("a & b"); // false: a strict parser refuses the bare `&`
 * @param {string} raw the text or attribute value as written
 * @returns {boolean} true when it is well-formed as written
 */
const isXmlWellFormedText = (raw) =>
	!raw.includes("<") && !XML_BARE_AMPERSAND_REGEXP.test(raw);

/**
 * Escape an attribute value for XML (§3.1): `&`, `<` and the delimiter, plus the
 * whitespace §3.3.3 would otherwise normalize to a space.
 * @param {string} value decoded value
 * @param {string} quote the delimiter it is written between
 * @returns {string} the value as written between `quote`s
 */
const escapeXmlAttribute = (value, quote) => {
	// Most values hold nothing to escape: one scan then spares six replacements.
	const escaped =
		quote === '"'
			? XML_ATTRIBUTE_DOUBLE_QUOTED_REGEXP
			: XML_ATTRIBUTE_SINGLE_QUOTED_REGEXP;
	if (!escaped.test(value)) {
		return value;
	}
	let out = value.replace(/&/g, "&amp;").replace(/</g, "&lt;");
	out =
		quote === '"' ? out.replace(/"/g, "&quot;") : out.replace(/'/g, "&apos;");
	return out
		.replace(/\t/g, "&#9;")
		.replace(/\n/g, "&#10;")
		.replace(/\r/g, "&#13;");
};

/**
 * Read an attribute-list declaration (§3.3) into `_xmlAttributeDeclarations`.
 * @param {string} input source
 * @param {number} pos offset past `<!ATTLIST`
 * @param {number} end offset of the internal subset's `]`
 * @returns {number} offset past the declaration
 */
const readXmlAttributeListDeclaration = (input, pos, end) => {
	pos = skipXmlWhitespace(input, pos);
	const elementEnd = xmlNameEnd(input, pos);
	const element = input.slice(pos, elementEnd);
	pos = elementEnd;
	while (pos < end) {
		pos = skipXmlWhitespace(input, pos);
		if (pos >= end || input.charCodeAt(pos) === CC_GREATER_THAN) break;
		const nameEnd = xmlNameEnd(input, pos);
		if (nameEnd === pos) break;
		const name = input.slice(pos, nameEnd);
		pos = skipXmlWhitespace(input, nameEnd);
		// AttType: a keyword, an enumeration, or NOTATION and an enumeration.
		let tokenized = true;
		if (input.startsWith("CDATA", pos)) {
			tokenized = false;
			pos += 5;
		} else {
			if (input.startsWith("NOTATION", pos)) {
				pos = skipXmlWhitespace(input, pos + 8);
			}
			if (input.charCodeAt(pos) === 0x28 /* ( */) {
				const close = input.indexOf(")", pos);
				pos = close === -1 || close > end ? end : close + 1;
			} else {
				pos = xmlNameEnd(input, pos);
			}
		}
		pos = skipXmlWhitespace(input, pos);
		/** @type {string | null} */
		let defaultValue = null;
		if (input.startsWith("#FIXED", pos)) {
			pos = skipXmlWhitespace(input, pos + 6);
		} else if (input.charCodeAt(pos) === 0x23 /* # */) {
			pos = xmlNameEnd(input, pos + 1);
		}
		const quote = input.charCodeAt(pos);
		if (quote === CC_QUOTATION_MARK || quote === CC_APOSTROPHE) {
			const close = input.indexOf(quote === CC_APOSTROPHE ? "'" : '"', pos + 1);
			if (close === -1 || close > end) return end;
			defaultValue = input.slice(pos + 1, close);
			pos = close + 1;
		}
		if (S._xmlAttributeDeclarations === null) {
			S._xmlAttributeDeclarations = new Map();
		}
		let declarations = S._xmlAttributeDeclarations.get(element);
		if (declarations === undefined) {
			declarations = new Map();
			S._xmlAttributeDeclarations.set(element, declarations);
		}
		// §3.3: the first declaration of an attribute binds it.
		if (!declarations.has(name)) {
			declarations.set(name, { tokenized, defaultValue });
		}
	}
	const close = input.indexOf(">", pos);
	return close === -1 || close > end ? end : close + 1;
};

/**
 * Apply what the DTD declares to a start tag's attribute run: a tokenized type's
 * value is trimmed and its spaces collapsed, and a missing attribute with a
 * default gets one. Both are stored as a spelling `decodeXmlAttribute` reads.
 * @param {{ start: number, count: number }} attrs the tag's attribute run, updated in place
 * @param {Map<string, XmlAttributeDeclaration>} declarations the element's declared attributes
 * @returns {void}
 */
const applyXmlAttributeDeclarations = (attrs, declarations) => {
	const start = attrs.start;
	const count = attrs.count;
	for (let i = start; i < start + count; i++) {
		const declaration = declarations.get(S._attrNames[i]);
		if (declaration === undefined || !declaration.tokenized) continue;
		const value = xmlAttributeValue(i);
		const collapsed = value.replace(/ +/g, " ").replace(/^ | $/g, "");
		if (collapsed !== value) {
			S._attrValues[i] = escapeXmlAttribute(collapsed, '"');
			setXmlAttributeValue(i, collapsed);
		}
	}
	// By key: an entry is a pair made per declaration and start tag.
	for (const name of declarations.keys()) {
		const declaration = /** @type {XmlAttributeDeclaration} */ (
			declarations.get(name)
		);
		if (declaration.defaultValue === null) continue;
		let present = false;
		for (let i = start; i < start + count; i++) {
			if (S._attrNames[i] === name) {
				present = true;
				break;
			}
		}
		if (present) continue;
		let value = decodeXmlAttribute(declaration.defaultValue);
		if (declaration.tokenized) {
			value = value.replace(/ +/g, " ").replace(/^ | $/g, "");
		}
		// No source offsets: the attribute is the DTD's, not the tag's.
		const index = makeAttr(
			name,
			escapeXmlAttribute(value, '"'),
			-1,
			-1,
			-1,
			-1
		);
		writeSvgAttribute(index, value);
		if (attrs.count === 0) attrs.start = index;
		attrs.count++;
	}
};

/**
 * Read the general entities an internal DTD subset declares (§4.2). A literal's
 * character references are expanded as it is declared; its entity references
 * wait until the entity is used.
 * @param {string} input source
 * @param {number} start offset past the `[`
 * @param {number} end offset of the `]`
 * @returns {void}
 */
const readXmlInternalSubset = (input, start, end) => {
	let pos = start;
	while (pos < end) {
		const cc = input.charCodeAt(pos);
		if (cc === 0x25 /* % */) {
			// §5.1: once a parameter entity went unread, a non-validating processor
			// must not process the declarations after it.
			return;
		}
		if (cc !== CC_LESS_THAN) {
			pos++;
			continue;
		}
		if (input.startsWith("<!--", pos)) {
			const close = input.indexOf("-->", pos + 4);
			pos = close === -1 ? end : close + 3;
			continue;
		}
		if (input.startsWith("<?", pos)) {
			const close = input.indexOf("?>", pos + 2);
			pos = close === -1 ? end : close + 2;
			continue;
		}
		if (input.startsWith("<!ATTLIST", pos)) {
			pos = readXmlAttributeListDeclaration(input, pos + 9, end);
			continue;
		}
		const isEntity = input.startsWith("<!ENTITY", pos);
		let i = skipXmlWhitespace(input, pos + (isEntity ? 8 : 2));
		const parameter = isEntity && input.charCodeAt(i) === 0x25;
		if (parameter) i = skipXmlWhitespace(input, i + 1);
		const nameStart = i;
		const nameEnd = xmlNameEnd(input, i);
		i = skipXmlWhitespace(input, nameEnd);
		const quote = input.charCodeAt(i);
		if (
			isEntity &&
			!parameter &&
			nameEnd !== nameStart &&
			(quote === CC_QUOTATION_MARK || quote === CC_APOSTROPHE)
		) {
			const close = input.indexOf(quote === CC_APOSTROPHE ? "'" : '"', i + 1);
			if (close === -1 || close > end) return;
			const name = input.slice(nameStart, nameEnd);
			if (S._xmlEntities === null) S._xmlEntities = new Map();
			// §4.2: the first declaration of a name binds it.
			if (!S._xmlEntities.has(name)) {
				S._xmlEntities.set(
					name,
					input
						.slice(i + 1, close)
						.replace(XML_LINE_END_REGEXP, "\n")
						.replace(XML_CHARACTER_REFERENCE_REGEXP, xmlCharacterReference)
				);
			}
			i = close + 1;
		}
		// The rest of the declaration: skip what it quotes, since a literal may
		// hold a `>`.
		while (i < end) {
			const c = input.charCodeAt(i);
			if (c === CC_GREATER_THAN) break;
			if (c === CC_QUOTATION_MARK || c === CC_APOSTROPHE) {
				const close = input.indexOf(c === CC_APOSTROPHE ? "'" : '"', i + 1);
				i = close === -1 ? end : close + 1;
			} else {
				i++;
			}
		}
		pos = i + 1;
	}
};

const cur = () => {
	const open = S._open;
	return /** @type {HtmlElement} */ (
		open.length > 0 ? open[open.length - 1] : 0
	);
};
/**
 * Remove an element from the middle of the open element stack. A removal that
 * leaves still-open descendants above it breaks the streamed walk whether or
 * not the walk entered the element: it drops off the stack without its subtree
 * ending, so those descendants would be entered under a parent the walk has no
 * open-stack evidence for. Removing the top is just a pop and keeps streaming -
 * which is the common `</form>` after implied end tags.
 * @param {number} index position in `open` to remove
 * @returns {void}
 */
const removeOpenAt = (index) => {
	S._open.splice(index, 1);
	S._openSpliced = true;
	S._openStackChanged = true;
	if (S._streaming && index < S._open.length) S._streamHalted = true;
};

/**
 * Pop the open element stack. Every pop routes through here so the streamed
 * walk has a single completion point - the HTML analog of the CSS parser's
 * `onRule` sink - instead of being polled once per token.
 * @returns {HtmlElement} the popped element
 */
const popOpen = () => {
	const tree = S;
	const el = /** @type {HtmlElement} */ (tree._open.pop());
	// A parser-inserted element keeps the range it was made with.
	if (tree._nameEnds[el] !== 0) endClosedElement(el);
	// Only mark: an element's end offset is assigned after it is popped, so the
	// walk has to wait for the token to finish.
	tree._openStackChanged = true;
	return el;
};

/**
 * Pop the element the end tag being processed names, which ends where that
 * tag does: the end `popOpen` works out would be replaced by it at once.
 * @returns {HtmlElement} the popped element
 */
const popOpenAtTokenEnd = () => {
	const el = /** @type {HtmlElement} */ (S._open.pop());
	S._ends[el] = S.tokenEnd;
	S._openStackChanged = true;
	return el;
};

/**
 * End a popped element where the token closing it starts, never before its
 * own tag or last child; an end tag naming it moves the end past the tag.
 * Kept out of `popOpen` so that stays small enough to inline into `runMode`.
 * @param {HtmlElement} el the element
 */
const endClosedElement = (el) => {
	// What it holds so far: its start tag, or the end tag a caller just set.
	let end = S._ends[el];
	const at = currentTokenStart();
	if (at > end) end = at;
	const last = S._lastChildren[el];
	if (last !== 0 && S._ends[last] > end) end = S._ends[last];
	S._ends[el] = end;
};

/**
 * @returns {number} where the token being processed starts (the input's end at EOF)
 */
const currentTokenStart = () => {
	const type = S._tok.type;
	if (type === TOKEN_START_TAG || type === TOKEN_END_TAG) {
		return S._tok.pos.start;
	}
	return type === TOKEN_EOF ? S._input.length : S._tok.start;
};

const adjustedCurrent = () => {
	const tree = S;
	if (tree._open.length === 1 && tree._fragment) return tree._fragment;
	return cur();
};

/**
 * Appends a node, merging it into the previous sibling when both are text.
 * @param {HtmlNodeRef} parent container
 * @param {HtmlNodeRef} node node to append
 * @returns {void}
 */
const appendTo = (parent, node) => {
	const tree = S;
	const p = effParent(parent);
	const last = tree._lastChildren[p];
	if (
		tree._types[node] === NodeType.Text &&
		last !== 0 &&
		tree._types[last] === NodeType.Text
	) {
		tree._strings[last] += tree._strings[node];
		tree._ends[last] = tree._ends[node];
		return;
	}
	appendChild(p, node);
};

/**
 * @param {HtmlNodeRef} parent container
 * @param {HtmlNodeRef} beforeNode node to insert before (`0` = append)
 * @returns {InsertionPlace} the shared insertion place
 */
const placeAt = (parent, beforeNode) => {
	const tree = S;
	tree._sharedPlace.parent = parent;
	tree._sharedPlace.beforeNode = beforeNode;
	return tree._sharedPlace;
};

/**
 * §13.2.6.1 "appropriate place for inserting a node", the foster-parenting
 * branch: where a node goes when the target is a table context - inside the
 * innermost `<template>` when one stands above the innermost `<table>`, else
 * before that table, and at the root when neither is open.
 * @returns {[HtmlNodeRef, HtmlNodeRef]} the parent and the node to insert before (`0` = append)
 */
const fosterPlace = () => {
	// The innermost of each still open, found in one walk down the stack.
	let lastTemplate = -1;
	let lastTable = -1;
	for (let i = S._open.length - 1; i >= 0; i--) {
		if (namespaceOf(S._open[i]) !== NS_HTML) continue;
		const name = tagNameOf(S._open[i]);
		if (lastTemplate === -1 && name === "template") lastTemplate = i;
		else if (lastTable === -1 && name === "table") lastTable = i;
	}
	if (lastTemplate !== -1 && (lastTable === -1 || lastTemplate > lastTable)) {
		return [S._open[lastTemplate], 0];
	}
	if (lastTable === -1) return [S._open[0], 0];
	const table = S._open[lastTable];
	// No script runs to take an open table out of the tree, so it has a parent:
	// the spec's "no parent node" fallback before the element below it is moot.
	return [S._parents[table], table];
};

// "appropriate place for inserting a node"
const appropriatePlace = () => {
	const target = cur();
	if (
		S.fosterParenting &&
		TABLE_CONTEXT.has(tagNameOf(target)) &&
		namespaceOf(target) === NS_HTML
	) {
		const [parent, beforeNode] = fosterPlace();
		return placeAt(parent, beforeNode);
	}
	return placeAt(target, 0);
};

/**
 * Inserts a node at an insertion place, appending when `beforeNode` is `0`.
 * @param {InsertionPlace} place where the node goes
 * @param {HtmlNodeRef} node node to insert
 * @returns {void}
 */
const insertAtPlace = (place, node) => {
	const before = place.beforeNode;
	if (before !== 0) {
		const p = effParent(place.parent);
		// Only `fosterPlace` names a `before` (the open table, under `parent`), and
		// text takes `insertCharacters`, so a non-text node goes in before it. The
		// sibling scan stays off the hot path: insert-before is the rare foster one.
		let prev = 0;
		let c = S._firstChildren[p];
		while (c !== 0 && c !== before) {
			prev = c;
			c = S._nextSiblings[c];
		}
		S._parents[node] = p;
		S._nextSiblings[node] = before;
		if (prev === 0) S._firstChildren[p] = node;
		else S._nextSiblings[prev] = node;
		recordFostered(before, node);
	} else {
		appendTo(place.parent, node);
	}
};

/**
 * Remember that `node` was foster parented out of `table`. The parent it landed
 * in is not recorded: the adoption agency can move it elsewhere afterwards, so
 * only the tree answers that.
 * @param {HtmlNodeRef} table the table it was written inside
 * @param {HtmlNodeRef} node the fostered node
 * @returns {void}
 */
const recordFostered = (table, node) => {
	if (S._fosteredLog === null) S._fosteredLog = [];
	S._fosteredLog.push(table, node);
};

/**
 * Inserts a character run at the appropriate place (§13.2.6.1).
 * @param {string} data decoded text
 * @param {number} start source offset of the run
 * @param {number} end source offset past the run
 * @returns {void}
 */
const insertCharacters = (data, start, end) => {
	const tree = S;
	const place = appropriatePlace();
	// `skip.text` drops every `Text` node, which construction has already used,
	// so element structure is unaffected. A raw-text element instead records its
	// body end, giving a consumer the span [`tagEnd`, `contentEnd`].
	if (tree.skipText) {
		const p = place.parent;
		if (
			tree._types[p] === NodeType.Element &&
			RAW_TEXT_ELEMENTS.has(tagNameOf(p))
		) {
			tree._contentEnds[p] = end;
		}
		return;
	}
	// Inlined text insert: a run merging into the adjacent text sibling, common
	// with inline formatting, appends the string alone rather than allocating a
	// throwaway node. Mirrors `insertAtPlace` / `appendTo`, `end` included.
	const p = effParent(place.parent);
	const before = place.beforeNode;
	if (before !== 0) {
		// `before` is the open table `fosterPlace` named, under `parent`.
		let prev = 0;
		let c = tree._firstChildren[p];
		while (c !== 0 && c !== before) {
			prev = c;
			c = tree._nextSiblings[c];
		}
		if (prev !== 0 && tree._types[prev] === NodeType.Text) {
			tree._strings[prev] += data;
			return;
		}
		const node = makeTextNode(data, start, end);
		tree._parents[node] = p;
		tree._nextSiblings[node] = before;
		if (prev === 0) tree._firstChildren[p] = node;
		else tree._nextSiblings[prev] = node;
		recordFostered(before, node);
	} else {
		const last = tree._lastChildren[p];
		if (last !== 0 && tree._types[last] === NodeType.Text) {
			tree._strings[last] += data;
			tree._ends[last] = end;
			return;
		}
		appendChild(p, makeTextNode(data, start, end));
	}
};

/**
 * Every insertion mode inserts a processing instruction where it inserts a
 * comment (§13.2.6.4). `skip.comments` drops comments alone.
 * @param {CommentToken | ProcessingInstructionToken} t comment or processing instruction token
 * @param {InsertionPlace=} place explicit insertion place
 * @returns {void}
 */
const insertCommentOrProcessingInstruction = (t, place) => {
	const isPi = t.type === TOKEN_PROCESSING_INSTRUCTION;
	if (S._skipComments && !isPi) return;
	const p = place || appropriatePlace();
	insertAtPlace(
		p,
		isPi
			? makeProcessingInstructionNode(t.name, t.data, t.start, t.end)
			: makeCommentNode(t.data, t.start, t.end)
	);
};

/**
 * Inserts an HTML element and pushes it onto the open element stack.
 * @param {string} tagName tag name
 * @param {AttributeRun} attrs the element's attributes
 * @param {TagPos | null} pos source position, `null` for a synthesized element
 * @returns {HtmlElement} the inserted element
 */
const insertHtmlElement = (tagName, attrs, pos) => {
	const el = mkEl(tagName, NS_HTML, attrs, pos);
	const place = appropriatePlace();
	insertAtPlace(place, el);
	S._open.push(el);
	return el;
};

/**
 * Inserts a MathML/SVG element and pushes it onto the open element stack.
 * @param {string} tagName tag name
 * @param {number} ns namespace flag (`NS_MATHML`, `NS_SVG`)
 * @param {AttributeRun} attrs the element's attributes
 * @param {TagPos | null} pos source position, `null` for a synthesized element
 * @returns {HtmlElement} the inserted element
 */
const insertForeignElement = (tagName, ns, attrs, pos) => {
	const el = mkEl(tagName, ns, attrs, pos);
	const place = appropriatePlace();
	insertAtPlace(place, el);
	S._open.push(el);
	return el;
};

// ---- scopes ----
// Scope "kind" selects which extra elements act as boundaries, as a small int so
// the checks below - several per body tag - allocate no predicate closure.
const SCOPE_DEFAULT = 0;
const SCOPE_BUTTON = 1;
const SCOPE_LIST_ITEM = 2;
/**
 * @param {HtmlElement} el element to test
 * @param {number} kind scope kind (`SCOPE_DEFAULT`, `SCOPE_BUTTON`, `SCOPE_LIST_ITEM`)
 * @returns {boolean} true when the element bounds that scope
 */
const isBoundaryForKind = (el, kind) => {
	if (isScopeBoundary(el)) return true;
	if (namespaceOf(el) !== NS_HTML) return false;
	if (kind === SCOPE_BUTTON) return tagNameOf(el) === "button";
	if (kind === SCOPE_LIST_ITEM) {
		return tagNameOf(el) === "ol" || tagNameOf(el) === "ul";
	}
	return false;
};
/**
 * "have an element in scope": walks the open stack from the top until the
 * named HTML element is found (true) or a scope boundary is hit (false).
 * @param {string} tagName tag name to look for
 * @param {number} kind scope kind (`SCOPE_DEFAULT`, `SCOPE_BUTTON`, `SCOPE_LIST_ITEM`)
 * @returns {boolean} true when the element is in that scope
 */
const hasNameInScope = (tagName, kind) => {
	const tree = S;
	// `open[0]` is the `<html>` element, a boundary for every kind of scope.
	const open = tree._open;
	const flags = tree._flags;
	const strings = tree._strings;
	for (let i = open.length - 1; i > 0; i--) {
		const el = open[i];
		const f = flags[el];
		if ((f & NS_MASK) === NS_HTML && strings[el] === tagName) {
			return true;
		}
		if ((f & FLAG_SCOPE_BOUNDARY) !== 0) return false;
		if (kind !== SCOPE_DEFAULT && isBoundaryForKind(el, kind)) return false;
	}
	return false;
};
/**
 * @param {string} tagName tag name to look for
 * @returns {boolean} true when the element is in scope
 */
const inScope = (tagName) => hasNameInScope(tagName, SCOPE_DEFAULT);
/**
 * @param {string} tagName tag name to look for
 * @returns {boolean} true when the element is in button scope
 */
const inButtonScope = (tagName) => hasNameInScope(tagName, SCOPE_BUTTON);
/**
 * @param {string} tagName tag name to look for
 * @returns {boolean} true when the element is in list item scope
 */
const inListItemScope = (tagName) => hasNameInScope(tagName, SCOPE_LIST_ITEM);
/**
 * @param {HtmlElement} target element to look for
 * @returns {boolean} true when that element itself is in scope
 */
const inScopeEl = (target) => {
	// `open[0]` is the `<html>` element, a scope boundary and never the target.
	for (let i = S._open.length - 1; i > 0; i--) {
		const el = S._open[i];
		if (el === target) return true;
		if (isScopeBoundary(el)) return false;
	}
	return false;
};
/**
 * @param {string | Set<string>} target a single tag name (the common case) or a set of names
 * @returns {boolean} true when one of them is in table scope
 */
const inTableScope = (target) => {
	const set = typeof target === "string" ? null : target;
	// `open[0]` is the `<html>` element, which stops a table scope walk.
	for (let i = S._open.length - 1; i > 0; i--) {
		const el = S._open[i];
		if (namespaceOf(el) === NS_HTML) {
			if (set ? set.has(tagNameOf(el)) : tagNameOf(el) === target) {
				return true;
			}
			if (TABLE_SCOPE_STOP.has(tagNameOf(el))) return false;
		}
	}
	return false;
};
const generateImpliedEndTags = (except = "") => {
	const tree = S;
	const open = tree._open;
	const flags = tree._flags;
	const strings = tree._strings;
	while (open.length) {
		const el = open[open.length - 1];
		const name = strings[el];
		if (
			(flags[el] & NS_MASK) === NS_HTML &&
			(tagKind(name) & KIND_IMPLIED) !== 0 &&
			name !== except
		) {
			popOpen();
		} else {
			break;
		}
	}
};
const generateImpliedEndTagsThorough = () => {
	while (S._open.length) {
		const el = cur();
		if (namespaceOf(el) === NS_HTML && IMPLIED_THOROUGH.has(tagNameOf(el))) {
			popOpen();
		} else {
			break;
		}
	}
};

// ---- active formatting elements ----

/**
 * `splice` allocates an array for the removed element on every call; the list
 * is short, so shifting in place is both cheaper and allocation-free.
 * @param {number} i position in `afe` to remove
 * @returns {void}
 */
const afeRemoveAt = (i) => {
	const last = S._afe.length - 1;
	for (let k = i; k < last; k++) S._afe[k] = S._afe[k + 1];
	S._afe.pop();
};
/**
 * Pushes a formatting element, applying the "Noah's Ark" clause: a third
 * equal entry since the last marker drops the earliest of them.
 * @param {HtmlElement} el formatting element to push
 * @returns {void}
 */
const pushAfe = (el) => {
	let count = 0;
	for (let i = S._afe.length - 1; i >= 0; i--) {
		const e = S._afe[i];
		if (e === AFE_MARKER) break;
		if (
			tagNameOf(e) === tagNameOf(el) &&
			namespaceOf(e) === namespaceOf(el) &&
			sameAttrs(e, el)
		) {
			count++;
			if (count === 3) {
				afeRemoveAt(i);
				break;
			}
		}
	}
	S._afe.push(el);
};
const insertMarker = () => S._afe.push(AFE_MARKER);
const clearAfeToMarker = () => {
	while (S._afe.length) {
		if (S._afe.pop() === AFE_MARKER) break;
	}
};
const reconstructAfe = () => {
	if (S._afe.length === 0) return;
	let i = S._afe.length - 1;
	if (S._afe[i] === AFE_MARKER || S._open.includes(S._afe[i])) return;
	while (i > 0) {
		i--;
		if (S._afe[i] === AFE_MARKER || S._open.includes(S._afe[i])) {
			i++;
			break;
		}
	}
	for (; i < S._afe.length; i++) {
		const e = S._afe[i];
		// §13.2.6.4.7 gives `a` and `nobr` a start-tag rule of their own; every other
		// formatting element re-nests as written.
		S._printFromSource = true;
		const el = mkEl(tagNameOf(e), namespaceOf(e), cloneAttrs(e), null);
		const place = appropriatePlace();
		insertAtPlace(place, el);
		S._open.push(el);
		S._afe[i] = el;
	}
};

// ---- close p ----
const closePElement = () => {
	generateImpliedEndTags("p");
	if (!isHtmlNamed(cur(), "p")) {
		treeError("unexpected-end-tag", /** @type {Token} */ (S._tok));
	}
	// pop until a p has been popped
	const endTag = S._tok.type === TOKEN_END_TAG;
	while (S._open.length) {
		const el = S._open[S._open.length - 1];
		if (namespaceOf(el) === NS_HTML && tagNameOf(el) === "p") {
			if (endTag) popOpenAtTokenEnd();
			else popOpen();
			break;
		}
		popOpen();
	}
};

/**
 * Pops the open element stack through the named HTML element.
 * @param {string} tagName tag name to pop through
 * @returns {void}
 */
const popUntil = (tagName) => {
	const tree = S;
	const endTag = tree._tok.type === TOKEN_END_TAG;
	const open = tree._open;
	const flags = tree._flags;
	const strings = tree._strings;
	while (open.length) {
		const el = open[open.length - 1];
		if ((flags[el] & NS_MASK) === NS_HTML && strings[el] === tagName) {
			if (endTag) popOpenAtTokenEnd();
			else popOpen();
			break;
		}
		popOpen();
	}
};
/**
 * Pops the open element stack through the first of the named HTML elements.
 * @param {Set<string>} set tag names to pop through
 * @returns {void}
 */
const popUntilOneOf = (set) => {
	const endTag = S._tok.type === TOKEN_END_TAG;
	while (S._open.length) {
		const el = S._open[S._open.length - 1];
		if (namespaceOf(el) === NS_HTML && set.has(tagNameOf(el))) {
			if (endTag) popOpenAtTokenEnd();
			else popOpen();
			break;
		}
		popOpen();
	}
};

// ---- reset insertion mode appropriately ----
const resetInsertionMode = () => {
	let last = false;
	for (let i = S._open.length - 1; i >= 0; i--) {
		let node = S._open[i];
		if (i === 0) {
			last = true;
			if (S._fragment) node = S._fragment;
		}
		const tn = tagNameOf(node);
		if (namespaceOf(node) === NS_HTML) {
			if ((tn === "td" || tn === "th") && !last) {
				S.mode = MODE_IN_CELL;
				return;
			}
			if (tn === "tr") {
				S.mode = MODE_IN_ROW;
				return;
			}
			if (TBODY_GROUP.has(tn)) {
				S.mode = MODE_IN_TABLE_BODY;
				return;
			}
			if (tn === "caption") {
				S.mode = MODE_IN_CAPTION;
				return;
			}
			if (tn === "colgroup") {
				S.mode = MODE_IN_COLUMN_GROUP;
				return;
			}
			if (tn === "table") {
				S.mode = MODE_IN_TABLE;
				return;
			}
			if (tn === "template") {
				S.mode = S._templateModes[S._templateModes.length - 1];
				return;
			}
			if (tn === "head" && !last) {
				S.mode = MODE_IN_HEAD;
				return;
			}
			if (tn === "body") {
				S.mode = MODE_IN_BODY;
				return;
			}
			if (tn === "frameset") {
				S.mode = MODE_IN_FRAMESET;
				return;
			}
			if (tn === "html") {
				S.mode = S.head ? MODE_AFTER_HEAD : MODE_BEFORE_HEAD;
				return;
			}
		}
		if (last) {
			S.mode = MODE_IN_BODY;
			return;
		}
	}
};

// ---------- token processing ----------
/**
 * Splits a character token's leading whitespace; per the spec each character
 * is its own token, so a mixed run can straddle a mode change.
 * @param {CharToken} t character token
 * @param {boolean} insert whether to insert the leading whitespace
 * @returns {CharToken | null} the non-whitespace remainder, `null` when the token was all whitespace
 */
const leadingWs = (t, insert) => {
	const m = /^[\t\n\f\r ]+/.exec(t.data);
	const ws = m ? m[0] : "";
	// `t.data` is decoded and the offsets are raw, so counting one in the other
	// lines up only where decoding changed no length. Otherwise the whole span is
	// kept: too wide is harmless, too narrow names source that is not this text.
	const aligned = t.end - t.start === t.data.length;
	if (ws && insert) {
		insertCharacters(ws, t.start, aligned ? t.start + ws.length : t.end);
	}
	if (ws.length === t.data.length) return null;
	return {
		...t,
		data: t.data.slice(ws.length),
		start: aligned ? t.start + ws.length : t.start
	};
};

/**
 * Report a tree-construction parse error at a token, named as html5lib-python
 * names it, since WHATWG names only the tokenizer's.
 * @param {string} code parse-error code (kebab-case)
 * @param {Token} t the token being processed
 * @returns {void}
 */
const treeError = (code, t) => {
	if (S._parseError === undefined) return;
	const type = t.type;
	if (type === TOKEN_START_TAG || type === TOKEN_END_TAG) {
		S._parseError(S._input, code, t.pos.start, t.pos.end, "warning");
	} else if (type === TOKEN_EOF) {
		const end = S._input.length;
		S._parseError(S._input, code, end, end, "warning");
	} else {
		S._parseError(S._input, code, t.start, t.end, "warning");
	}
};

/**
 * @param {Token} t a token that is no DOCTYPE where one was expected
 * @returns {void}
 */
const expectedDoctype = (t) => {
	// §13.2.6.4.1: an `<iframe srcdoc>` document may leave its doctype out.
	if (S._parseError === undefined || S._srcdocDocument) return;
	const type = t.type;
	treeError(
		type === TOKEN_START_TAG
			? "expected-doctype-but-got-start-tag"
			: type === TOKEN_END_TAG
				? "expected-doctype-but-got-end-tag"
				: type === TOKEN_EOF
					? "expected-doctype-but-got-eof"
					: "expected-doctype-but-got-chars",
		t
	);
};

/**
 * Runs one token through tree construction (§13.2.6).
 * @param {Token} t token to process
 * @returns {void}
 */
const process = (t) => {
	// Track the current token's end so explicit closes can set element `.end`.
	// Dispatch on `type` instead of the `in` operator, which goes megamorphic
	// across the token union and shows up on the per-token hot path.
	const ty = t.type;
	if (ty === TOKEN_START_TAG || ty === TOKEN_END_TAG) S.tokenEnd = t.pos.end;
	else if (ty !== TOKEN_EOF) S.tokenEnd = t.end;
	// foreign content dispatch
	const ac = adjustedCurrent();
	const useForeign =
		S._open.length > 0 &&
		ac &&
		namespaceOf(ac) !== NS_HTML &&
		ty !== TOKEN_EOF &&
		shouldUseForeignRules(ac, t);
	if (useForeign) {
		foreignContent(t);
		return;
	}
	runMode(t);
};

/**
 * XML has no insertion modes: elements are appended to the current element
 * and an end tag closes the element with the same case-sensitive name.
 * @param {Token} t token to process
 * @returns {void}
 */
const processXml = (t) => {
	const ty = t.type;
	// `tokenizeXml` reports no end-of-file token, so every token has a range.
	if (S._xmlEntityRangeStart !== -1) {
		if (ty === TOKEN_START_TAG || ty === TOKEN_END_TAG) {
			t.pos.start = S._xmlEntityRangeStart;
			t.pos.end = S._xmlEntityRangeEnd;
			t.pos.tagEnd = S._xmlEntityRangeEnd;
			t.pos.nameEnd = 0;
		} else {
			const located = /** @type {CharToken} */ (t);
			located.start = S._xmlEntityRangeStart;
			located.end = S._xmlEntityRangeEnd;
		}
	}
	S.tokenEnd =
		ty === TOKEN_START_TAG || ty === TOKEN_END_TAG
			? t.pos.end
			: /** @type {CharToken} */ (t).end;
	if (ty === TOKEN_CHAR) {
		if (S._open.length === 0) return;
		insertCharacters(t.data, t.start, t.end);
		return;
	}
	if (ty === TOKEN_COMMENT || ty === TOKEN_PROCESSING_INSTRUCTION) {
		insertCommentOrProcessingInstruction(
			t,
			S._open.length === 0 ? { parent: S._doc, beforeNode: 0 } : undefined
		);
		return;
	}
	if (ty === TOKEN_DOCTYPE) {
		if (!S._skipDoctype) {
			const dt = makeNode(NodeType.Doctype, t.start, t.end);
			S._strings[dt] = t.name;
			S._doctypePublicId = t.publicId;
			S._doctypeSystemId = t.systemId;
			S._doctypePublicStart = t.publicStart;
			S._doctypePublicEnd = t.publicEnd;
			S._doctypeSystemStart = t.systemStart;
			S._doctypeSystemEnd = t.systemEnd;
			appendChild(S._doc, dt);
		}
		return;
	}
	if (ty === TOKEN_START_TAG) {
		if (S._xmlAttributeDeclarations !== null) {
			const declarations = S._xmlAttributeDeclarations.get(t.name);
			if (declarations !== undefined) {
				applyXmlAttributeDeclarations(t.attrs, declarations);
			}
		}
		// A source tag without an `&` holds no reference to resolve now. Its other
		// values are a DTD's, resolved already, or empty.
		if (
			S._xmlEntityRangeStart !== -1 ||
			xmlSourceHoldsAmpersand(t.pos.start, t.pos.end)
		) {
			for (let i = t.attrs.start; i < t.attrs.start + t.attrs.count; i++) {
				if (xmlAttributeMayHoldReference(i)) xmlAttributeValue(i);
			}
		}
		const el = mkEl(t.name, NS_XML, t.attrs, t.pos);
		if (t.selfClosing) S._flags[el] |= FLAG_SELF_CLOSING;
		// An element merges with no sibling, and XML has no template contents.
		appendChild(S._open.length === 0 ? S._doc : cur(), el);
		if (!t.selfClosing) S._open.push(el);
		return;
	}
	// An end tag, the one kind left. A misnested one closes the element it names
	// and the ones opened inside it; one naming no open element is dropped.
	const end = /** @type {EndTagToken} */ (t);
	for (let i = S._open.length - 1; i >= 0; i--) {
		if (tagNameOf(S._open[i]) !== end.name) continue;
		while (S._open.length > i + 1) popOpen();
		popOpenAtTokenEnd();
		return;
	}
};

/**
 * @param {HtmlElement} ac adjusted current node, a foreign element
 * @param {Token} t token to process
 * @returns {boolean} true when the token follows the foreign content rules
 */
const shouldUseForeignRules = (ac, t) => {
	if (t.type === TOKEN_START_TAG) {
		if (
			mathmlTextIntegrationPoint(ac) &&
			t.name !== "mglyph" &&
			t.name !== "malignmark"
		) {
			return false;
		}
		if (
			namespaceOf(ac) === NS_MATHML &&
			tagNameOf(ac) === "annotation-xml" &&
			t.name === "svg"
		) {
			return false;
		}
		if (htmlIntegrationPoint(ac)) return false;
		return true;
	}
	if (t.type === TOKEN_CHAR) {
		if (mathmlTextIntegrationPoint(ac)) return false;
		if (htmlIntegrationPoint(ac)) return false;
		return true;
	}
	if (t.type === TOKEN_END_TAG) return true;
	// A DOCTYPE, which every mode a foreign element is open in ignores, as the
	// foreign content rules do.
	return isCommentOrProcessingInstruction(t);
};

/**
 * "in foreign content" rules (§13.2.6.5).
 * @param {Token} t token to process
 * @returns {void}
 */
const foreignContent = (t) => {
	if (t.type === TOKEN_CHAR) {
		if (S.inputHasNul && S._parseError !== undefined) nulErrors(t);
		const data = S.inputHasNul ? t.data.replace(/\0/g, "\uFFFD") : t.data;
		insertCharacters(data, t.start, t.end);
		// eslint-disable-next-line no-control-regex
		if (/[^\t\n\f\r \u0000]/.test(t.data)) S.framesetOk = false;
		return;
	}
	if (isCommentOrProcessingInstruction(t)) {
		insertCommentOrProcessingInstruction(t);
		return;
	}
	if (t.type === TOKEN_START_TAG) {
		const acn = namespaceOf(adjustedCurrent());
		if (
			FOREIGN_BREAKOUT.has(t.name) ||
			(t.name === "font" && hasFontBreakoutAttr(t.attrs))
		) {
			treeError("unexpected-html-element-in-foreign-content", t);
			// pop until integration point / html / mathml-text-integration
			while (S._open.length > 1) {
				const c = cur();
				if (
					namespaceOf(c) === NS_HTML ||
					mathmlTextIntegrationPoint(c) ||
					htmlIntegrationPoint(c)
				) {
					break;
				}
				popOpen();
			}
			runMode(t);
			return;
		}
		const ns = acn;
		let name = t.name;
		let attrs = t.attrs;
		if (ns === NS_SVG) {
			name = adjustSvgTag(name);
		}
		if (ns === NS_MATHML) {
			attrs = adjustMathmlAttrs(attrs);
		}
		attrs = adjustForeignAttrs(attrs, ns);
		insertForeignElement(name, ns, attrs, t.pos);
		if (t.selfClosing) {
			popOpen();
			S.selfClosingAcknowledged = true;
		}
		return;
	}
	// Only an end tag is left: `shouldUseForeignRules` keeps a DOCTYPE out.
	const name = /** @type {EndTagToken} */ (t).name;
	if (
		name === "script" &&
		tagNameOf(cur()) === "script" &&
		namespaceOf(cur()) === NS_SVG
	) {
		popOpenAtTokenEnd();
		return;
	}
	// `</p>` and `</br>` break out: pop foreign elements up to the
	// nearest HTML element or integration point, then process in HTML.
	if (name === "p" || name === "br") {
		treeError("unexpected-html-element-in-foreign-content", t);
		while (
			S._open.length > 1 &&
			namespaceOf(cur()) !== NS_HTML &&
			!mathmlTextIntegrationPoint(cur()) &&
			!htmlIntegrationPoint(cur())
		) {
			popOpen();
		}
		runMode(t);
		return;
	}
	// any other end tag
	let i = S._open.length - 1;
	let node = S._open[i];
	if (tagNameOf(node).toLowerCase() !== name) {
		treeError("unexpected-end-tag", t);
	}
	while (i >= 0) {
		node = S._open[i];
		if (i === 0) return;
		if (
			namespaceOf(node) !== NS_HTML &&
			tagNameOf(node).toLowerCase() === name
		) {
			while (S._open.length > i) popOpen();
			S._ends[node] = S.tokenEnd;
			return;
		}
		i--;
		if (S._open[i] && namespaceOf(S._open[i]) === NS_HTML) {
			runMode(t);
			return;
		}
	}
};

// ---------- adoption agency algorithm ----------
/**
 * Adoption agency algorithm (§13.2.6.4.7).
 * @param {string} subject tag name of the end tag being handled
 * @param {TagPos | null} pos source position of that end tag
 * @returns {boolean} false when the caller must fall back to "any other end tag"
 */
const adoptionAgency = (subject, pos) => {
	// step 1
	const c = cur();
	if (
		namespaceOf(c) === NS_HTML &&
		tagNameOf(c) === subject &&
		!S._afe.includes(c)
	) {
		popOpen();
		return true;
	}
	let outer = 0;
	while (outer < 8) {
		outer++;
		// find formatting element
		let fmtIdx = -1;
		for (let i = S._afe.length - 1; i >= 0; i--) {
			if (S._afe[i] === AFE_MARKER) {
				if (afeNameBelowMarker(i, subject)) S._printFromSource = true;
				break;
			}
			if (
				tagNameOf(S._afe[i]) === subject &&
				namespaceOf(S._afe[i]) === NS_HTML
			) {
				fmtIdx = i;
				break;
			}
		}
		if (fmtIdx === -1) return false; // act as any other end tag
		const fmt = S._afe[fmtIdx];
		const openIdx = S._open.indexOf(fmt);
		if (openIdx === -1) {
			treeError("adoption-agency-1.2", /** @type {Token} */ (S._tok));
			afeRemoveAt(fmtIdx);
			return true;
		}
		if (!inScopeEl(fmt)) {
			treeError("adoption-agency-4.4", /** @type {Token} */ (S._tok));
			return true;
		}
		if (fmt !== cur()) {
			treeError("adoption-agency-1.3", /** @type {Token} */ (S._tok));
		}
		// step: furthest block
		let furthestIdx = -1;
		for (let i = openIdx + 1; i < S._open.length; i++) {
			if (isSpecial(S._open[i])) {
				furthestIdx = i;
				break;
			}
		}
		if (furthestIdx === -1) {
			while (S._open.length > openIdx) {
				S._ends[S._open[S._open.length - 1]] = S.tokenEnd;
				popOpen();
			}
			afeRemoveAt(fmtIdx);
			return true;
		}
		const furthest = S._open[furthestIdx];
		const commonAncestor = S._open[openIdx - 1];
		let bookmark = fmtIdx;
		let node = furthest;
		let lastNode = furthest;
		let nodeIdx = furthestIdx;
		let inner = 0;
		while (true) {
			inner++;
			nodeIdx--;
			node = S._open[nodeIdx];
			if (node === fmt) break;
			let nodeAfeIdx = S._afe.indexOf(node);
			if (inner > 3 && nodeAfeIdx !== -1) {
				afeRemoveAt(nodeAfeIdx);
				if (nodeAfeIdx < bookmark) bookmark--;
				nodeAfeIdx = -1;
			}
			if (nodeAfeIdx === -1) {
				removeOpenAt(nodeIdx);
				continue;
			}
			// create clone
			const clone = mkEl(
				tagNameOf(node),
				namespaceOf(node),
				cloneAttrs(node),
				null
			);
			S._afe[nodeAfeIdx] = clone;
			S._open[nodeIdx] = clone;
			node = clone;
			if (lastNode === furthest) bookmark = nodeAfeIdx + 1;
			// append lastNode to node
			detach(lastNode);
			appendTo(node, lastNode);
			lastNode = node;
		}
		// insert lastNode into common ancestor (with foster parenting)
		detach(lastNode);
		const place = placeForCommonAncestor(commonAncestor);
		insertAtPlace(place, lastNode);
		// create element for fmt token, take children of furthest
		S._printFromSource = true;
		const cloneFmt = mkEl(
			tagNameOf(fmt),
			namespaceOf(fmt),
			cloneAttrs(fmt),
			null
		);
		// Take the direct children of `furthest`; a template's content fragment
		// stays put. A declarative shadow root is not one of them - the engine took
		// it out of the tree on attaching, so it stays with its host.
		let k = S._firstChildren[furthest];
		S._firstChildren[furthest] = 0;
		S._lastChildren[furthest] = 0;
		while (k !== 0) {
			const next = S._nextSiblings[k];
			S._nextSiblings[k] = 0;
			S._parents[k] = 0;
			appendTo((S._flags[k] & FLAG_SHADOW_ROOT) === 0 ? cloneFmt : furthest, k);
			k = next;
		}
		appendTo(furthest, cloneFmt);
		// remove fmt from afe, insert clone at bookmark; the inner loop removes only
		// entries other than fmt, so it is still in both lists
		const curFmtIdx = S._afe.indexOf(fmt);
		afeRemoveAt(curFmtIdx);
		if (curFmtIdx < bookmark) bookmark--;
		S._afe.splice(bookmark, 0, cloneFmt);
		// remove fmt from open, insert clone below furthest
		removeOpenAt(S._open.indexOf(fmt));
		const newFurthestIdx = S._open.indexOf(furthest);
		S._open.splice(newFurthestIdx + 1, 0, cloneFmt);
		S._openSpliced = true;
		S._openStackChanged = true;
	}
	return true;
};

/**
 * @param {HtmlElement} commonAncestor common ancestor node of the adoption agency
 * @returns {InsertionPlace} where the moved node goes
 */
const placeForCommonAncestor = (commonAncestor) => {
	if (
		TABLE_CONTEXT.has(tagNameOf(commonAncestor)) &&
		namespaceOf(commonAncestor) === NS_HTML
	) {
		// The same place `appropriatePlace` fosters to, spelled as its own object:
		// the adoption agency holds this one while it moves nodes about, so the
		// shared one would be overwritten under it.
		const [parent, beforeNode] = fosterPlace();
		return { parent, beforeNode };
	}
	return { parent: commonAncestor, beforeNode: 0 };
};

/**
 * Unlinks a node from its parent so it can be inserted again.
 * @param {HtmlNodeRef} node node to detach
 * @returns {void}
 */
const detach = (node) => {
	const p = S._parents[node];
	if (p === 0) return;
	// A node with a parent is in that parent's child list: the walk finds it.
	let prev = 0;
	let c = S._firstChildren[p];
	while (c !== 0 && c !== node) {
		prev = c;
		c = S._nextSiblings[c];
	}
	if (prev === 0) S._firstChildren[p] = S._nextSiblings[node];
	else S._nextSiblings[prev] = S._nextSiblings[node];
	if (S._lastChildren[p] === node) S._lastChildren[p] = prev;
	S._nextSiblings[node] = 0;
	S._parents[node] = 0;
};

// ---------- insertion modes ----------

/** @type {Record<string, (t: Token) => void>} */
const modes = {};

/**
 * Dispatches the current insertion mode. An integer switch keeps each
 * `modes.x(t)` call site monomorphic, where `modes[mode]` would not.
 * @param {Token} t token to process
 * @returns {void}
 */
const runMode = (t) => {
	switch (S.mode) {
		case MODE_IN_BODY:
			return modes.inBody(t);
		case MODE_TEXT:
			return modes.text(t);
		case MODE_IN_CELL:
			return modes.inCell(t);
		case MODE_IN_ROW:
			return modes.inRow(t);
		case MODE_IN_TABLE_BODY:
			return modes.inTableBody(t);
		case MODE_IN_TABLE:
			return modes.inTable(t);
		case MODE_IN_TABLE_TEXT:
			return modes.inTableText(t);
		case MODE_IN_CAPTION:
			return modes.inCaption(t);
		case MODE_IN_COLUMN_GROUP:
			return modes.inColumnGroup(t);
		case MODE_IN_TEMPLATE:
			return modes.inTemplate(t);
		case MODE_IN_HEAD:
			return modes.inHead(t);
		case MODE_IN_HEAD_NOSCRIPT:
			return modes.inHeadNoscript(t);
		case MODE_AFTER_HEAD:
			return modes.afterHead(t);
		case MODE_BEFORE_HEAD:
			return modes.beforeHead(t);
		case MODE_BEFORE_HTML:
			return modes.beforeHtml(t);
		case MODE_INITIAL:
			return modes.initial(t);
		case MODE_AFTER_BODY:
			return modes.afterBody(t);
		case MODE_AFTER_AFTER_BODY:
			return modes.afterAfterBody(t);
		case MODE_IN_FRAMESET:
			return modes.inFrameset(t);
		case MODE_AFTER_FRAMESET:
			return modes.afterFrameset(t);
		// MODE_AFTER_AFTER_FRAMESET - every mode is enumerated, so the last
		// one is the `default` (also satisfies exhaustiveness linting).
		default:
			return modes.afterAfterFrameset(t);
	}
};

modes.initial = (t) => {
	if (t.type === TOKEN_CHAR) {
		const r = leadingWs(t, false);
		if (!r) return;
		expectedDoctype(r);
		S._quirks = !S._srcdocDocument;
		S.mode = MODE_BEFORE_HTML;
		process(r);
		return;
	}
	if (isCommentOrProcessingInstruction(t)) {
		insertCommentOrProcessingInstruction(t, { parent: S._doc, beforeNode: 0 });
		return;
	}
	if (t.type === TOKEN_DOCTYPE) {
		// `skip.doctype` drops the node only; quirks detection below is unaffected.
		if (!S._skipDoctype) {
			const dt = makeNode(NodeType.Doctype, t.start, t.end);
			S._strings[dt] = t.name;
			// At most one doctype node is ever inserted (later doctype tokens
			// are ignored), so its ids live in two per-parse scalars.
			S._doctypePublicId = t.publicId;
			S._doctypeSystemId = t.systemId;
			S._doctypePublicStart = t.publicStart;
			S._doctypePublicEnd = t.publicEnd;
			S._doctypeSystemStart = t.systemStart;
			S._doctypeSystemEnd = t.systemEnd;
			appendChild(S._doc, dt);
		}
		if (
			t.name !== "html" ||
			t.publicId !== null ||
			(t.systemId !== null && t.systemId !== "about:legacy-compat")
		) {
			treeError("unknown-doctype", t);
		}
		S._quirks =
			!S._srcdocDocument &&
			(t.forceQuirks || isQuirky(t.name, t.publicId, t.systemId));
		S._quirksDisputed =
			!S._srcdocDocument &&
			!t.forceQuirks &&
			t.name === "html" &&
			isDisputedDoctype(t.publicId, t.systemId);
		S.mode = MODE_BEFORE_HTML;
		return;
	}
	expectedDoctype(t);
	S._quirks = !S._srcdocDocument;
	S.mode = MODE_BEFORE_HTML;
	process(t);
};

modes.beforeHtml = (t) => {
	if (t.type === TOKEN_DOCTYPE) return treeError("unexpected-doctype", t);
	if (isCommentOrProcessingInstruction(t)) {
		insertCommentOrProcessingInstruction(t, { parent: S._doc, beforeNode: 0 });
		return;
	}
	if (t.type === TOKEN_CHAR) {
		const r = leadingWs(t, false);
		if (!r) return;
		t = r;
	}
	if (t.type === TOKEN_START_TAG && t.name === "html") {
		const el = mkEl("html", NS_HTML, t.attrs, t.pos);
		appendChild(S._doc, el);
		S._open.push(el);
		S.mode = MODE_BEFORE_HEAD;
		return;
	}
	if (t.type === TOKEN_END_TAG && !HEAD_BODY_HTML_BR.has(t.name)) {
		return treeError("unexpected-end-tag-before-html", t);
	}
	const el = mkEl("html", NS_HTML, EMPTY_ATTRS, null);
	appendChild(S._doc, el);
	S._open.push(el);
	S.mode = MODE_BEFORE_HEAD;
	process(t);
};

modes.beforeHead = (t) => {
	if (t.type === TOKEN_CHAR) {
		const r = leadingWs(t, false);
		if (!r) return;
		t = r;
	}
	if (isCommentOrProcessingInstruction(t)) {
		insertCommentOrProcessingInstruction(t);
		return;
	}
	if (t.type === TOKEN_DOCTYPE) return treeError("unexpected-doctype", t);
	if (t.type === TOKEN_START_TAG && t.name === "html") return modes.inBody(t);
	if (t.type === TOKEN_START_TAG && t.name === "head") {
		S.head = insertHtmlElement("head", t.attrs, t.pos);
		S.mode = MODE_IN_HEAD;
		return;
	}
	if (t.type === TOKEN_END_TAG && !HEAD_BODY_HTML_BR.has(t.name)) {
		return treeError("end-tag-after-implied-root", t);
	}
	S.head = insertHtmlElement("head", EMPTY_ATTRS, null);
	S.mode = MODE_IN_HEAD;
	process(t);
};

modes.inHead = (t) => {
	if (t.type === TOKEN_CHAR) {
		const r = leadingWs(t, true);
		if (!r) return;
		popOpen();
		S.mode = MODE_AFTER_HEAD;
		process(r);
		return;
	}
	if (isCommentOrProcessingInstruction(t)) {
		insertCommentOrProcessingInstruction(t);
		return;
	}
	if (t.type === TOKEN_DOCTYPE) return treeError("unexpected-doctype", t);
	if (t.type === TOKEN_START_TAG) {
		if (t.name === "html") return modes.inBody(t);
		if (HEAD_VOID_ELEMENTS.has(t.name)) {
			insertHtmlElement(t.name, t.attrs, t.pos);
			popOpen();
			return;
		}
		if (t.name === "title") {
			genericRcdata(t);
			return;
		}
		if (NOFRAMES_STYLE_NOSCRIPT.has(t.name)) {
			if (t.name === "noscript" && !S._scripting) {
				insertHtmlElement("noscript", t.attrs, t.pos);
				S.mode = MODE_IN_HEAD_NOSCRIPT;
				return;
			}
			genericRawtext(t);
			return;
		}
		if (t.name === "script") {
			genericRawtext(t);
			return;
		}
		if (t.name === "template") {
			insertHtmlElement("template", t.attrs, t.pos);
			insertMarker();
			S.framesetOk = false;
			S.mode = MODE_IN_TEMPLATE;
			S._templateModes.push(MODE_IN_TEMPLATE);
			const el = cur();
			const fragment = makeNode(NodeType.DocumentFragment, 0, 0);
			S._strings[fragment] = "";
			// Parent link so the iterative walk can ascend out of the content.
			S._parents[fragment] = el;
			S._contentEnds[el] = fragment;
			S._flags[el] |= FLAG_HAS_TEMPLATE;
			// The engine attaches this content to the parent as a shadow root and
			// drops the template from the tree; the one thing that leaves behind is
			// that the tree construction can no longer move it away from its host.
			const host = S._parents[el];
			const shadowRootMode = findAttr(
				t.attrs.start,
				t.attrs.count,
				"shadowrootmode"
			);
			if (
				shadowRootMode !== 0 &&
				host !== 0 &&
				host !== S._open[0] &&
				(S._flags[host] & FLAG_SHADOW_HOST) === 0 &&
				S._types[host] === NodeType.Element &&
				isShadowHost(host)
			) {
				const mode = attrValueDecoded(shadowRootMode).toLowerCase();
				if (mode === "open" || mode === "closed") {
					S._flags[el] |= FLAG_SHADOW_ROOT;
					S._flags[host] |= FLAG_SHADOW_HOST;
				}
			}
			return;
		}
		if (t.name === "head") {
			return treeError("two-heads-are-not-better-than-one", t);
		}
	}
	if (t.type === TOKEN_END_TAG) {
		if (t.name === "head") {
			S._sourceShellEnds |= SHELL_END_HEAD;
			popOpen();
			S.mode = MODE_AFTER_HEAD;
			return;
		}
		if (BODY_HTML_BR.has(t.name)) {
			/* fallthrough */
		} else if (t.name === "template") {
			if (!S._open.some(isHtmlTemplateEl)) {
				return treeError("unexpected-end-tag", t);
			}
			generateImpliedEndTagsThorough();
			if (!isHtmlTemplateEl(cur())) treeError("end-tag-too-early", t);
			popUntil("template");
			clearAfeToMarker();
			S._templateModes.pop();
			resetInsertionMode();
			return;
		} else {
			return treeError("unexpected-end-tag", t);
		}
	}
	// anything else
	popOpen();
	S.mode = MODE_AFTER_HEAD;
	process(t);
};

modes.inHeadNoscript = (t) => {
	if (t.type === TOKEN_DOCTYPE) return treeError("unexpected-doctype", t);
	if (t.type === TOKEN_START_TAG && t.name === "html") return modes.inBody(t);
	if (t.type === TOKEN_END_TAG && t.name === "noscript") {
		popOpen();
		S.mode = MODE_IN_HEAD;
		return;
	}
	if (t.type === TOKEN_CHAR) {
		// Each character is its own token: the whitespace before the first other
		// one is the head rules', so it stays in the `<noscript>`.
		const r = leadingWs(t, true);
		if (!r) return;
		t = r;
	}
	if (isCommentOrProcessingInstruction(t)) return modes.inHead(t);
	if (t.type === TOKEN_START_TAG && IN_HEAD_NOSCRIPT_PASSTHROUGH.has(t.name)) {
		return modes.inHead(t);
	}
	// A stray end tag other than </br>/</noscript> is ignored (the comment
	// or content stays inside <noscript>); only </br> and other content fall
	// back to popping <noscript>.
	if (t.type === TOKEN_END_TAG && t.name !== "br") {
		return treeError("unexpected-end-tag", t);
	}
	if (
		t.type === TOKEN_START_TAG &&
		(t.name === "head" || t.name === "noscript")
	) {
		return treeError("unexpected-start-tag", t);
	}
	treeError(
		t.type === TOKEN_CHAR
			? "char-in-head-noscript"
			: t.type === TOKEN_EOF
				? "eof-in-head-noscript"
				: "unexpected-inhead-noscript-tag",
		t
	);
	popOpen();
	S.mode = MODE_IN_HEAD;
	process(t);
};

modes.afterHead = (t) => {
	if (t.type === TOKEN_CHAR) {
		const r = leadingWs(t, true);
		if (!r) return;
		insertHtmlElement("body", EMPTY_ATTRS, null);
		S.framesetOk = true;
		S.mode = MODE_IN_BODY;
		process(r);
		return;
	}
	if (isCommentOrProcessingInstruction(t)) {
		insertCommentOrProcessingInstruction(t);
		return;
	}
	if (t.type === TOKEN_DOCTYPE) return treeError("unexpected-doctype", t);
	if (t.type === TOKEN_START_TAG) {
		if (t.name === "html") return modes.inBody(t);
		if (t.name === "body") {
			insertHtmlElement("body", t.attrs, t.pos);
			S.framesetOk = false;
			S.mode = MODE_IN_BODY;
			return;
		}
		if (t.name === "frameset") {
			insertHtmlElement("frameset", t.attrs, t.pos);
			S.mode = MODE_IN_FRAMESET;
			return;
		}
		if (HEAD_ELEMENTS.has(t.name)) {
			treeError("unexpected-start-tag-out-of-my-head", t);
			const headEl = S.head;
			S._open.push(headEl);
			modes.inHead(t);
			// None of these start tags pops what it was inserted into.
			removeOpenAt(S._open.indexOf(headEl));
			return;
		}
		if (t.name === "head") return treeError("unexpected-start-tag", t);
	}
	if (t.type === TOKEN_END_TAG) {
		if (t.name === "template") return modes.inHead(t);
		if (!BODY_HTML_BR.has(t.name)) return treeError("unexpected-end-tag", t);
	}
	insertHtmlElement("body", EMPTY_ATTRS, null);
	S.framesetOk = true;
	S.mode = MODE_IN_BODY;
	process(t);
};

modes.inBody = (t) => {
	if (t.type === TOKEN_CHAR) {
		// Deliberately not guarded by `inputHasNul`: this `includes` flattens the
		// decoded rope, and skipping it makes the inserts below allocate more.
		if (t.data.includes("\0")) {
			if (S._parseError !== undefined) nulErrors(t);
			t = { ...t, data: t.data.replace(/\0/g, "") };
		}
		if (t.data === "") return;
		reconstructAfe();
		insertCharacters(t.data, t.start, t.end);
		// After the implicit-body reset in "after head", `framesetOk` only goes
		// true->false, so once false skip this per-text-token whitespace scan.
		if (S.framesetOk && !isAllAsciiWhitespace(t.data)) S.framesetOk = false;
		return;
	}
	if (isCommentOrProcessingInstruction(t)) {
		insertCommentOrProcessingInstruction(t);
		return;
	}
	if (t.type === TOKEN_DOCTYPE) return treeError("unexpected-doctype", t);
	if (t.type === TOKEN_START_TAG) return startTagInBody(t);
	if (t.type === TOKEN_END_TAG) return endTagInBody(t);
	// The end of the input, the one kind of token left.
	if (S._templateModes.length) return modes.inTemplate(t);
	if (hasUnclosedElement()) treeError("expected-closing-tag-but-got-eof", t);
};

/**
 * Report each U+0000 NULL in a character token, every one a parse error.
 * @param {CharToken} t character token
 * @returns {void}
 */
const nulErrors = (t) => {
	const aligned = t.end - t.start === t.data.length;
	for (
		let i = t.data.indexOf("\0");
		i !== -1;
		i = t.data.indexOf("\0", i + 1)
	) {
		treeError("invalid-codepoint", {
			...t,
			start: aligned ? t.start + i : t.start,
			end: aligned ? t.start + i + 1 : t.end
		});
	}
};

/**
 * Whether the stack holds an element the end of the body leaves unclosed,
 * one whose end tag is not optional there.
 * @returns {boolean} true when one is open
 */
const hasUnclosedElement = () => {
	for (let i = 0; i < S._open.length; i++) {
		const node = S._open[i];
		if (
			namespaceOf(node) !== NS_HTML ||
			!END_TAG_OPTIONAL_AT_BODY_END.has(tagNameOf(node))
		) {
			return true;
		}
	}
	return false;
};

/**
 * @param {HtmlElement} node an element, or 0
 * @param {string} name tag name
 * @returns {boolean} whether it is the HTML element of that name
 */
const isHtmlNamed = (node, name) =>
	node !== 0 && namespaceOf(node) === NS_HTML && tagNameOf(node) === name;

const closeIfPInButtonScope = () => {
	if (inButtonScope("p")) closePElement();
};

/**
 * "any other end tag" in body: pops to the matching open element, stopping at
 * the first special element; also the adoption agency's no-element fallback.
 * @param {string} name tag name of the end tag
 * @returns {void}
 */
const anyOtherEndTag = (name) => {
	for (let i = S._open.length - 1; i >= 0; i--) {
		const node = S._open[i];
		if (namespaceOf(node) === NS_HTML && tagNameOf(node) === name) {
			generateImpliedEndTags(name);
			if (node !== cur()) {
				treeError("unexpected-end-tag", /** @type {Token} */ (S._tok));
			}
			while (S._open.length > i) {
				S._ends[S._open[S._open.length - 1]] = S.tokenEnd;
				popOpen();
			}
			return;
		}
		if (isSpecial(node)) {
			return treeError("unexpected-end-tag", /** @type {Token} */ (S._tok));
		}
	}
};

/**
 * "in body" start tag rules (§13.2.6.4.7).
 * @param {StartTagToken} t start tag token
 * @returns {void}
 */
const startTagInBody = (t) => {
	const name = t.name;
	const kind = tagKind(name);
	if (name === "html") {
		treeError("non-html-root", t);
		if (S._open.some(isHtmlTemplateEl)) {
			return;
		}
		mergeAttrs(S._open[0], t.attrs);
		return;
	}
	if ((kind & KIND_HEAD_ELEMENT) !== 0) {
		return modes.inHead(t);
	}
	if (name === "body") {
		treeError("unexpected-start-tag", t);
		const second = S._open[1];
		if (
			!second ||
			tagNameOf(second) !== "body" ||
			S._open.some(isHtmlTemplateEl)
		) {
			return;
		}
		S.framesetOk = false;
		mergeAttrs(second, t.attrs);
		return;
	}
	if (name === "frameset") {
		treeError("unexpected-start-tag", t);
		const second = S._open[1];
		if (!second || tagNameOf(second) !== "body") return;
		if (!S.framesetOk) return;
		detach(second);
		while (S._open.length > 1) popOpen();
		insertHtmlElement("frameset", t.attrs, t.pos);
		S.mode = MODE_IN_FRAMESET;
		return;
	}
	if ((kind & KIND_BLOCK_START) !== 0) {
		closeIfPInButtonScope();
		insertHtmlElement(name, t.attrs, t.pos);
		return;
	}
	if ((kind & KIND_HEADING) !== 0) {
		closeIfPInButtonScope();
		if (namespaceOf(cur()) === NS_HTML && HEADING.has(tagNameOf(cur()))) {
			treeError("unexpected-start-tag", t);
			popOpen();
		}
		insertHtmlElement(name, t.attrs, t.pos);
		return;
	}
	if (name === "pre" || name === "listing") {
		closeIfPInButtonScope();
		insertHtmlElement(name, t.attrs, t.pos);
		t.swallowNewline = true;
		S.framesetOk = false;
		return;
	}
	if (name === "form") {
		if (S._form && !parsingTemplateContents()) {
			return treeError("unexpected-start-tag", t);
		}
		closeIfPInButtonScope();
		// The end tag this needs generates implied end tags where the source's did
		// not, so anything open between the two forms moves.
		if (formResetWouldPop()) S._printFromSource = true;
		const el = insertHtmlElement("form", t.attrs, t.pos);
		if (!parsingTemplateContents()) {
			S._form = el;
		}
		return;
	}
	if (name === "li") {
		S.framesetOk = false;
		for (let i = S._open.length - 1; i >= 0; i--) {
			const node = S._open[i];
			if (namespaceOf(node) === NS_HTML && tagNameOf(node) === "li") {
				generateImpliedEndTags("li");
				if (!isHtmlNamed(cur(), "li")) treeError("end-tag-too-early", t);
				popUntil("li");
				break;
			}
			if (
				isSpecial(node) &&
				!(namespaceOf(node) === NS_HTML && ADDRESS_DIV_P.has(tagNameOf(node)))
			) {
				// A list-item-scope boundary (`ul`, `ol`, a table cell) keeps every item
				// below it out of reach of any `</li>`, whatever the print writes or drops.
				if (isBoundaryForKind(node, SCOPE_LIST_ITEM)) break;
				// Inlined rather than a call: this runs for every `<li>` in a list.
				for (let j = i - 1; j >= 0 && !S._printFromSource; j--) {
					const below = S._open[j];
					if (namespaceOf(below) === NS_HTML && tagNameOf(below) === "li") {
						S._printFromSource = true;
					}
				}
				break;
			}
		}
		closeIfPInButtonScope();
		insertHtmlElement("li", t.attrs, t.pos);
		return;
	}
	if (name === "dd" || name === "dt") {
		S.framesetOk = false;
		for (let i = S._open.length - 1; i >= 0; i--) {
			const node = S._open[i];
			if (
				namespaceOf(node) === NS_HTML &&
				(tagNameOf(node) === "dd" || tagNameOf(node) === "dt")
			) {
				generateImpliedEndTags(tagNameOf(node));
				if (!isHtmlNamed(cur(), tagNameOf(node))) {
					treeError("end-tag-too-early", t);
				}
				popUntil(tagNameOf(node));
				break;
			}
			if (
				isSpecial(node) &&
				!(namespaceOf(node) === NS_HTML && ADDRESS_DIV_P.has(tagNameOf(node)))
			) {
				for (let j = i - 1; j >= 0 && !S._printFromSource; j--) {
					const below = S._open[j];
					if (namespaceOf(below) !== NS_HTML) continue;
					const bn = tagNameOf(below);
					if (bn === "dd" || bn === "dt") S._printFromSource = true;
				}
				break;
			}
		}
		closeIfPInButtonScope();
		insertHtmlElement(name, t.attrs, t.pos);
		return;
	}
	if (name === "plaintext") {
		closeIfPInButtonScope();
		insertHtmlElement("plaintext", t.attrs, t.pos);
		return;
	}
	if (name === "button") {
		if (inScope("button")) {
			treeError("unexpected-start-tag-implies-end-tag", t);
			generateImpliedEndTags();
			popUntil("button");
		}
		reconstructAfe();
		insertHtmlElement("button", t.attrs, t.pos);
		S.framesetOk = false;
		return;
	}
	if (name === "a") {
		// if there's an <a> in afe after last marker
		for (let i = S._afe.length - 1; i >= 0; i--) {
			if (S._afe[i] === AFE_MARKER) {
				if (afeNameBelowMarker(i, "a")) S._printFromSource = true;
				break;
			}
			if (tagNameOf(S._afe[i]) === "a") {
				treeError("unexpected-start-tag-implies-end-tag", t);
				// That element, not the first `a` in the list: one below a marker is
				// another scope's, which this tag leaves alone.
				const el = S._afe[i];
				adoptionAgency("a", t.pos);
				const idx = S._afe.indexOf(el);
				// Left only when it was not in scope, so still on the stack (§13.2.6.4.7).
				if (idx !== -1) {
					afeRemoveAt(idx);
					removeOpenAt(S._open.indexOf(el));
				}
				break;
			}
		}
		reconstructAfe();
		const el = insertHtmlElement("a", t.attrs, t.pos);
		pushAfe(el);
		return;
	}
	if ((kind & KIND_FORMATTING) !== 0 && name !== "a" && name !== "nobr") {
		reconstructAfe();
		const el = insertHtmlElement(name, t.attrs, t.pos);
		pushAfe(el);
		return;
	}
	if (name === "nobr") {
		reconstructAfe();
		if (inScope("nobr")) {
			treeError("unexpected-start-tag-implies-end-tag", t);
			// The adoption agency returns false when a marker shields the nobr
			// from the active formatting list; then act as "any other end tag".
			if (!adoptionAgency("nobr", t.pos)) anyOtherEndTag("nobr");
			reconstructAfe();
		}
		const el = insertHtmlElement("nobr", t.attrs, t.pos);
		pushAfe(el);
		return;
	}
	if ((kind & KIND_APPLET_MARQUEE_OBJECT) !== 0) {
		reconstructAfe();
		insertHtmlElement(name, t.attrs, t.pos);
		insertMarker();
		S.framesetOk = false;
		return;
	}
	if (name === "table") {
		if (!S._quirks) closeIfPInButtonScope();
		insertHtmlElement("table", t.attrs, t.pos);
		S.framesetOk = false;
		S.mode = MODE_IN_TABLE;
		return;
	}
	if ((kind & KIND_VOID_FORMATTING) !== 0) {
		reconstructAfe();
		insertHtmlElement(name, t.attrs, t.pos);
		popOpen();
		S.framesetOk = false;
		return;
	}
	if (name === "input") {
		// `<input>` inside a select is dropped; if a select is open it is
		// closed first (keygen/textarea no longer behave this way).
		if (inScope("select")) {
			treeError("unexpected-input-in-select", t);
			popUntil("select");
			resetInsertionMode();
		} else if (
			S._fragment &&
			namespaceOf(S._fragment) === NS_HTML &&
			tagNameOf(S._fragment) === "select"
		) {
			return treeError("unexpected-input-in-select", t);
		}
		reconstructAfe();
		insertHtmlElement("input", t.attrs, t.pos);
		popOpen();
		const ty = findAttr(t.attrs.start, t.attrs.count, "type");
		if (ty === 0 || attrValueDecoded(ty).toLowerCase() !== "hidden") {
			S.framesetOk = false;
		}
		return;
	}
	if ((kind & KIND_PARAM_SOURCE_TRACK) !== 0) {
		insertHtmlElement(name, t.attrs, t.pos);
		popOpen();
		return;
	}
	if (name === "hr") {
		closeIfPInButtonScope();
		// An `<hr>` is a `<select>`'s own separator, so inside one it leaves what
		// it was written in; outside one it is ordinary content and nests.
		if (inScope("select")) {
			generateImpliedEndTags();
			if (inScope("option") || inScope("optgroup")) {
				treeError("unexpected-start-tag", t);
			}
		}
		insertHtmlElement("hr", t.attrs, t.pos);
		popOpen();
		S.framesetOk = false;
		return;
	}
	if (name === "image") {
		treeError("unexpected-start-tag-treated-as", t);
		return startTagInBody({ ...t, name: "img" });
	}
	if (name === "textarea") {
		genericRcdata(t, true);
		S.framesetOk = false;
		return;
	}
	if (name === "xmp") {
		closeIfPInButtonScope();
		reconstructAfe();
		S.framesetOk = false;
		genericRawtext(t);
		return;
	}
	if (name === "iframe") {
		S.framesetOk = false;
		genericRawtext(t);
		return;
	}
	if (name === "noembed" || (name === "noscript" && S._scripting)) {
		genericRawtext(t);
		return;
	}
	if (name === "select") {
		reconstructAfe();
		if (inScope("select")) {
			treeError("unexpected-select-in-select", t);
			generateImpliedEndTags();
			popUntil("select");
			resetInsertionMode();
			return;
		}
		insertHtmlElement("select", t.attrs, t.pos);
		S.framesetOk = false;
		return;
	}
	if (name === "optgroup" || name === "option") {
		// Inside a select these end what is open like a list item does, an
		// `<option>` sparing its `<optgroup>`; outside one only an option gives way.
		if (inScope("select")) {
			generateImpliedEndTags(name === "option" ? "optgroup" : "");
			if (inScope("option") || (name === "optgroup" && inScope("optgroup"))) {
				treeError("unexpected-start-tag-implies-end-tag", t);
			}
		} else if (
			namespaceOf(cur()) === NS_HTML &&
			tagNameOf(cur()) === "option"
		) {
			popOpen();
		}
		reconstructAfe();
		insertHtmlElement(name, t.attrs, t.pos);
		return;
	}
	if (name === "rb" || name === "rtc") {
		if (inScope("ruby")) generateImpliedEndTags();
		if (!isHtmlNamed(cur(), "ruby")) treeError("unexpected-start-tag", t);
		insertHtmlElement(name, t.attrs, t.pos);
		return;
	}
	if (name === "rp" || name === "rt") {
		if (inScope("ruby")) generateImpliedEndTags("rtc");
		if (!isHtmlNamed(cur(), "ruby") && !isHtmlNamed(cur(), "rtc")) {
			treeError("unexpected-start-tag", t);
		}
		insertHtmlElement(name, t.attrs, t.pos);
		return;
	}
	if (name === "math") {
		reconstructAfe();
		const attrs = adjustForeignAttrs(adjustMathmlAttrs(t.attrs), NS_MATHML);
		insertForeignElement("math", NS_MATHML, attrs, t.pos);
		if (t.selfClosing) {
			popOpen();
			S.selfClosingAcknowledged = true;
		}
		return;
	}
	if (name === "svg") {
		reconstructAfe();
		const attrs = adjustForeignAttrs(t.attrs, NS_SVG);
		insertForeignElement("svg", NS_SVG, attrs, t.pos);
		if (t.selfClosing) {
			popOpen();
			S.selfClosingAcknowledged = true;
		}
		return;
	}
	if ((kind & KIND_IGNORED_BODY_TABLE_START) !== 0) {
		return treeError("unexpected-start-tag-ignored", t);
	}
	// any other start tag
	reconstructAfe();
	insertHtmlElement(name, t.attrs, t.pos);
};

/**
 * "in body" end tag rules (§13.2.6.4.7).
 * @param {EndTagToken} t end tag token
 * @returns {void}
 */
const endTagInBody = (t) => {
	const name = t.name;
	const kind = tagKind(name);
	if (name === "template") return modes.inHead(t);
	if (name === "select") {
		if (!inScope("select")) return treeError("unexpected-end-tag", t);
		generateImpliedEndTags();
		if (!isHtmlNamed(cur(), "select")) treeError("end-tag-too-early", t);
		popUntil("select");
		return;
	}
	if (name === "body" || name === "html") {
		if (!inScope("body")) return treeError("unexpected-end-tag", t);
		if (hasUnclosedElement()) {
			treeError("expected-one-end-tag-but-got-another", t);
		}
		S._sourceShellEnds |= name === "html" ? SHELL_END_HTML : SHELL_END_BODY;
		S.mode = MODE_AFTER_BODY;
		if (name === "html") process(t);
		return;
	}
	if ((kind & KIND_BLOCK_END) !== 0) {
		if (!inScope(name)) return treeError("unexpected-end-tag", t);
		generateImpliedEndTags();
		if (!isHtmlNamed(cur(), name)) treeError("end-tag-too-early", t);
		popUntil(name);
		return;
	}
	if (name === "form") {
		if (!parsingTemplateContents()) {
			const node = S._form;
			S._form = 0;
			if (!node || !inScopeEl(node)) {
				return treeError("unexpected-end-tag", t);
			}
			// In scope, so on the stack, and no implied end tag pops a form.
			generateImpliedEndTags();
			if (node !== cur()) treeError("end-tag-too-early-ignored", t);
			removeOpenAt(S._open.indexOf(node));
		} else {
			if (!inScope("form")) return treeError("unexpected-end-tag", t);
			generateImpliedEndTags();
			if (!isHtmlNamed(cur(), "form")) {
				treeError("end-tag-too-early-ignored", t);
			}
			popUntil("form");
		}
		return;
	}
	if (name === "p") {
		if (!inButtonScope("p")) {
			treeError("unexpected-end-tag", t);
			insertHtmlElement("p", EMPTY_ATTRS, t.pos);
		}
		closePElement();
		return;
	}
	if (name === "li") {
		if (!inListItemScope("li")) return treeError("unexpected-end-tag", t);
		generateImpliedEndTags("li");
		if (!isHtmlNamed(cur(), "li")) treeError("end-tag-too-early", t);
		popUntil("li");
		return;
	}
	if (name === "dd" || name === "dt") {
		if (!inScope(name)) return treeError("unexpected-end-tag", t);
		generateImpliedEndTags(name);
		if (!isHtmlNamed(cur(), name)) treeError("end-tag-too-early", t);
		popUntil(name);
		return;
	}
	if ((kind & KIND_HEADING) !== 0) {
		let anyHeadingInScope = false;
		for (const h of HEADING) {
			if (inScope(h)) {
				anyHeadingInScope = true;
				break;
			}
		}
		if (!anyHeadingInScope) return treeError("unexpected-end-tag", t);
		generateImpliedEndTags();
		if (!isHtmlNamed(cur(), name)) treeError("end-tag-too-early", t);
		popUntilOneOf(HEADING);
		return;
	}
	if (name === "sarcasm") {
		/* take a deep breath */
	}
	if ((kind & KIND_FORMATTING) !== 0) {
		// With no such element in the list, §13.2.6.4.7 hands the token back rather
		// than swallowing it - which is what Noah's Ark leaves behind: an element
		// still open that the list no longer names.
		if (!adoptionAgency(name, t.pos)) anyOtherEndTag(name);
		return;
	}
	if ((kind & KIND_APPLET_MARQUEE_OBJECT) !== 0) {
		if (!inScope(name)) return treeError("unexpected-end-tag", t);
		generateImpliedEndTags();
		if (!isHtmlNamed(cur(), name)) treeError("end-tag-too-early", t);
		popUntil(name);
		clearAfeToMarker();
		return;
	}
	if (name === "br") {
		treeError("unexpected-end-tag-treated-as", t);
		reconstructAfe();
		insertHtmlElement("br", EMPTY_ATTRS, t.pos);
		popOpen();
		S.framesetOk = false;
		return;
	}
	anyOtherEndTag(name);
};

/**
 * Generic RAWTEXT: inserts the element and switches to "text" mode, which
 * appends the characters the tokenizer already emits and pops on the end tag.
 * @param {StartTagToken} t start tag token
 * @returns {void}
 */
const genericRawtext = (t) => {
	insertHtmlElement(t.name, t.attrs, t.pos);
	S._originalMode = S.mode;
	S.mode = MODE_TEXT;
};
/**
 * Generic RCDATA, as `genericRawtext` for the elements whose text is decoded.
 * @param {StartTagToken} t start tag token
 * @param {boolean=} swallow whether a newline right after the tag is dropped
 * @returns {void}
 */
const genericRcdata = (t, swallow = false) => {
	insertHtmlElement(t.name, t.attrs, t.pos);
	if (swallow) t.swallowNewline = true;
	S._originalMode = S.mode;
	S.mode = MODE_TEXT;
};

modes.text = (t) => {
	if (t.type === TOKEN_CHAR) {
		insertCharacters(t.data, t.start, t.end);
		return;
	}
	// The element this mode was entered for (`<html>` in a fragment) is open.
	if (t.type === TOKEN_EOF) {
		treeError("expected-named-closing-tag-but-got-eof", t);
		popOpen();
		S.mode = S._originalMode;
		process(t);
		return;
	}
	// An end tag, the one kind left: the raw text states emit nothing else.
	const end = /** @type {EndTagToken} */ (t);
	// One the input ran out inside, past its name, is dropped (eof-in-tag).
	if (S.eofInTag) return;
	// Rawtext rather than an end tag where it cannot close the current
	// element: a name that does not match, or one running to EOF with no
	// delimiter, which the tokenizer still emits as a partial tag.
	if (end.name !== tagNameOf(cur()) || end.pos.end === end.pos.nameEnd) {
		insertCharacters(
			S._input.slice(end.pos.start, end.pos.end),
			end.pos.start,
			end.pos.end
		);
		return;
	}
	// span the close tag, like every other explicit-close pop
	popOpenAtTokenEnd();
	S.mode = S._originalMode;
};

// ---------- table modes ----------

modes.inTable = (t) => {
	if (t.type === TOKEN_CHAR) {
		const c = cur();
		const name = tagNameOf(c);
		if (
			(TABLE_CONTEXT.has(name) || name === "template") &&
			namespaceOf(c) === NS_HTML
		) {
			S._pendingTableChars = { list: [], hasNonWs: false };
			S._originalMode = S.mode;
			S.mode = MODE_IN_TABLE_TEXT;
			return process(t);
		}
	}
	if (isCommentOrProcessingInstruction(t)) {
		insertCommentOrProcessingInstruction(t);
		return;
	}
	if (t.type === TOKEN_DOCTYPE) return treeError("unexpected-doctype", t);
	if (t.type === TOKEN_START_TAG) {
		const name = t.name;
		if (name === "caption") {
			clearStackToTableContext();
			insertMarker();
			insertHtmlElement("caption", t.attrs, t.pos);
			S.mode = MODE_IN_CAPTION;
			return;
		}
		if (name === "colgroup") {
			clearStackToTableContext();
			insertHtmlElement("colgroup", t.attrs, t.pos);
			S.mode = MODE_IN_COLUMN_GROUP;
			return;
		}
		if (name === "col") {
			clearStackToTableContext();
			insertHtmlElement("colgroup", EMPTY_ATTRS, t.pos);
			S.mode = MODE_IN_COLUMN_GROUP;
			return process(t);
		}
		if (TBODY_GROUP.has(name)) {
			clearStackToTableContext();
			insertHtmlElement(name, t.attrs, t.pos);
			S.mode = MODE_IN_TABLE_BODY;
			return;
		}
		if (TD_TH_TR.has(name)) {
			clearStackToTableContext();
			insertHtmlElement("tbody", EMPTY_ATTRS, t.pos);
			S.mode = MODE_IN_TABLE_BODY;
			return process(t);
		}
		if (name === "table") {
			treeError("unexpected-start-tag-implies-end-tag", t);
			if (!inTableScope("table")) return;
			popUntil("table");
			resetInsertionMode();
			return process(t);
		}
		if (STYLE_SCRIPT_TEMPLATE.has(name)) {
			return modes.inHead(t);
		}
		if (name === "input") {
			const ty = findAttr(t.attrs.start, t.attrs.count, "type");
			if (ty !== 0 && attrValueDecoded(ty).toLowerCase() === "hidden") {
				treeError("unexpected-hidden-input-in-table", t);
				insertHtmlElement("input", t.attrs, t.pos);
				popOpen();
				return;
			}
		}
		if (name === "form") {
			treeError("unexpected-form-in-table", t);
			const inTemplate = parsingTemplateContents();
			if (S._form && !inTemplate) {
				return;
			}
			const el = insertHtmlElement("form", t.attrs, t.pos);
			if (!inTemplate) S._form = el;
			popOpen();
			return;
		}
	}
	if (t.type === TOKEN_END_TAG) {
		if (t.name === "table") {
			if (!inTableScope("table")) return treeError("unexpected-end-tag", t);
			popUntil("table");
			resetInsertionMode();
			return;
		}
		if (IN_TABLE_IGNORED_ENDS.has(t.name)) {
			return treeError("unexpected-end-tag", t);
		}
		if (t.name === "template") return modes.inHead(t);
	}
	if (t.type === TOKEN_EOF) return modes.inBody(t);
	// anything else: foster parenting
	if (t.type === TOKEN_CHAR) {
		characterErrors("unexpected-character-implies-table-voodoo", t, true);
	} else {
		treeError(
			t.type === TOKEN_START_TAG
				? "unexpected-start-tag-implies-table-voodoo"
				: "unexpected-end-tag-implies-table-voodoo",
			t
		);
	}
	S.fosterParenting = true;
	modes.inBody(t);
	S.fosterParenting = false;
};

modes.inTableText = (t) => {
	if (t.type === TOKEN_CHAR) {
		let data = t.data;
		if (S.inputHasNul && data.includes("\0")) {
			if (S._parseError !== undefined) nulErrors(t);
			data = data.replace(/\0/g, "");
		}
		if (data === "") return;
		// Snapshot into a fresh token: these are buffered and replayed after
		// later tokens arrive, so they must not alias the reused token.
		/** @type {CharToken} */
		const tc = { type: TOKEN_CHAR, data, start: t.start, end: t.end };
		const pending = /** @type {{ list: CharToken[], hasNonWs: boolean }} */ (
			S._pendingTableChars
		);
		pending.list.push(tc);
		if (!isAllAsciiWhitespace(tc.data)) pending.hasNonWs = true;
		return;
	}
	// flush
	const chars = /** @type {{ list: CharToken[], hasNonWs: boolean }} */ (
		S._pendingTableChars
	);
	S._pendingTableChars = null;
	S.mode = S._originalMode;
	for (const ct of chars.list) {
		if (chars.hasNonWs) {
			characterErrors("unexpected-character-implies-table-voodoo", ct, true);
		}
		if (chars.hasNonWs) {
			S.fosterParenting = true;
			modes.inBody(ct);
			S.fosterParenting = false;
		} else {
			insertCharacters(ct.data, ct.start, ct.end);
		}
	}
	process(t);
};

const clearStackToTableContext = () => {
	while (S._open.length) {
		const c = cur();
		if (namespaceOf(c) === NS_HTML && CLEAR_TABLE.has(tagNameOf(c))) {
			break;
		}
		popOpen();
	}
};
const clearStackToTableBodyContext = () => {
	while (S._open.length) {
		const c = cur();
		if (namespaceOf(c) === NS_HTML && CLEAR_TABLE_BODY.has(tagNameOf(c))) {
			break;
		}
		popOpen();
	}
};
const clearStackToTableRowContext = () => {
	while (S._open.length) {
		const c = cur();
		if (namespaceOf(c) === NS_HTML && CLEAR_TABLE_ROW.has(tagNameOf(c))) {
			break;
		}
		popOpen();
	}
};

modes.inCaption = (t) => {
	if (
		(t.type === TOKEN_END_TAG && t.name === "caption") ||
		(t.type === TOKEN_START_TAG && CAPTION_TABLE_STARTS.has(t.name)) ||
		(t.type === TOKEN_END_TAG && t.name === "table")
	) {
		if (!inTableScope("caption")) {
			return treeError(
				t.type === TOKEN_START_TAG
					? "unexpected-start-tag"
					: "unexpected-end-tag",
				t
			);
		}
		generateImpliedEndTags();
		if (!isHtmlNamed(cur(), "caption")) {
			treeError("expected-one-end-tag-but-got-another", t);
		}
		popUntil("caption");
		clearAfeToMarker();
		S.mode = MODE_IN_TABLE;
		if (!(t.type === TOKEN_END_TAG && t.name === "caption")) {
			return process(t);
		}
		return;
	}
	if (t.type === TOKEN_END_TAG && CAPTION_IGNORED_ENDS.has(t.name)) {
		return treeError("unexpected-end-tag", t);
	}
	return modes.inBody(t);
};

modes.inColumnGroup = (t) => {
	if (t.type === TOKEN_CHAR) {
		const r = leadingWs(t, true);
		if (!r) return;
		if (tagNameOf(cur()) !== "colgroup") {
			characterErrors("unexpected-char-in-column-group", r);
			// Each character is a token of its own: the whitespace between the
			// ignored ones is still inserted.
			const ws = r.data.replace(/[^\t\n\f\r ]/g, "");
			if (ws) insertCharacters(ws, r.start, r.end);
			return;
		}
		popOpen();
		S.mode = MODE_IN_TABLE;
		process(r);
		return;
	}
	if (isCommentOrProcessingInstruction(t)) {
		insertCommentOrProcessingInstruction(t);
		return;
	}
	if (t.type === TOKEN_DOCTYPE) return treeError("unexpected-doctype", t);
	if (t.type === TOKEN_START_TAG && t.name === "html") return modes.inBody(t);
	if (t.type === TOKEN_START_TAG && t.name === "col") {
		insertHtmlElement("col", t.attrs, t.pos);
		popOpen();
		return;
	}
	if (t.type === TOKEN_END_TAG && t.name === "colgroup") {
		if (tagNameOf(cur()) !== "colgroup") {
			return treeError("unexpected-end-tag", t);
		}
		popOpen();
		S.mode = MODE_IN_TABLE;
		return;
	}
	if (t.type === TOKEN_END_TAG && t.name === "col") {
		return treeError("no-end-tag", t);
	}
	if (
		(t.type === TOKEN_START_TAG || t.type === TOKEN_END_TAG) &&
		t.name === "template"
	) {
		return modes.inHead(t);
	}
	if (t.type === TOKEN_EOF) return modes.inBody(t);
	if (tagNameOf(cur()) !== "colgroup") {
		return treeError(
			t.type === TOKEN_START_TAG
				? "unexpected-start-tag"
				: "unexpected-end-tag",
			t
		);
	}
	popOpen();
	S.mode = MODE_IN_TABLE;
	process(t);
};

modes.inTableBody = (t) => {
	if (t.type === TOKEN_START_TAG && t.name === "tr") {
		clearStackToTableBodyContext();
		insertHtmlElement("tr", t.attrs, t.pos);
		S.mode = MODE_IN_ROW;
		return;
	}
	if (t.type === TOKEN_START_TAG && (t.name === "th" || t.name === "td")) {
		treeError("unexpected-cell-in-table-body", t);
		clearStackToTableBodyContext();
		insertHtmlElement("tr", EMPTY_ATTRS, t.pos);
		S.mode = MODE_IN_ROW;
		return process(t);
	}
	if (t.type === TOKEN_END_TAG && TBODY_GROUP.has(t.name)) {
		if (!inTableScope(t.name)) {
			return treeError("unexpected-end-tag-in-table-body", t);
		}
		clearStackToTableBodyContext();
		popOpen();
		S.mode = MODE_IN_TABLE;
		return;
	}
	if (
		(t.type === TOKEN_START_TAG && TBODY_TRIGGER_STARTS.has(t.name)) ||
		(t.type === TOKEN_END_TAG && t.name === "table")
	) {
		if (!inTableScope(TBODY_GROUP)) {
			return treeError(
				t.type === TOKEN_START_TAG
					? "unexpected-start-tag"
					: "unexpected-end-tag",
				t
			);
		}
		clearStackToTableBodyContext();
		popOpen();
		S.mode = MODE_IN_TABLE;
		return process(t);
	}
	if (t.type === TOKEN_END_TAG && TBODY_IGNORED_ENDS.has(t.name)) {
		return treeError("unexpected-end-tag-in-table-body", t);
	}
	return modes.inTable(t);
};

modes.inRow = (t) => {
	if (t.type === TOKEN_START_TAG && (t.name === "th" || t.name === "td")) {
		clearStackToTableRowContext();
		insertHtmlElement(t.name, t.attrs, t.pos);
		S.mode = MODE_IN_CELL;
		insertMarker();
		return;
	}
	if (t.type === TOKEN_END_TAG && t.name === "tr") {
		if (!inTableScope("tr")) return treeError("unexpected-end-tag", t);
		clearStackToTableRowContext();
		popOpen();
		S.mode = MODE_IN_TABLE_BODY;
		return;
	}
	if (
		(t.type === TOKEN_START_TAG && ROW_TRIGGER_STARTS.has(t.name)) ||
		(t.type === TOKEN_END_TAG && t.name === "table")
	) {
		if (!inTableScope("tr")) {
			return treeError(
				t.type === TOKEN_START_TAG
					? "unexpected-start-tag"
					: "unexpected-end-tag",
				t
			);
		}
		clearStackToTableRowContext();
		popOpen();
		S.mode = MODE_IN_TABLE_BODY;
		return process(t);
	}
	if (t.type === TOKEN_END_TAG && TBODY_GROUP.has(t.name)) {
		// A table section opens only right inside a table or template, and this
		// mode follows it only with a row open inside it: with one in table scope,
		// a `tr` is too.
		if (!inTableScope(t.name)) return treeError("unexpected-end-tag", t);
		clearStackToTableRowContext();
		popOpen();
		S.mode = MODE_IN_TABLE_BODY;
		return process(t);
	}
	if (t.type === TOKEN_END_TAG && ROW_IGNORED_ENDS.has(t.name)) {
		return treeError("unexpected-end-tag-in-table-row", t);
	}
	return modes.inTable(t);
};

modes.inCell = (t) => {
	if (t.type === TOKEN_END_TAG && (t.name === "td" || t.name === "th")) {
		if (!inTableScope(t.name)) return treeError("unexpected-end-tag", t);
		generateImpliedEndTags();
		if (!isHtmlNamed(cur(), t.name)) treeError("unexpected-cell-end-tag", t);
		popUntil(t.name);
		clearAfeToMarker();
		S.mode = MODE_IN_ROW;
		return;
	}
	if (t.type === TOKEN_START_TAG && CAPTION_TABLE_STARTS.has(t.name)) {
		// The spec asserts a cell in table scope: only a cell opens this mode.
		closeCell();
		return process(t);
	}
	if (t.type === TOKEN_END_TAG && TABLE_CONTEXT.has(t.name)) {
		if (!inTableScope(t.name)) return treeError("unexpected-end-tag", t);
		closeCell();
		return process(t);
	}
	if (t.type === TOKEN_END_TAG && CELL_IGNORED_ENDS.has(t.name)) {
		return treeError("unexpected-end-tag", t);
	}
	return modes.inBody(t);
};
const closeCell = () => {
	generateImpliedEndTags();
	if (!isHtmlNamed(cur(), "td") && !isHtmlNamed(cur(), "th")) {
		treeError("unexpected-cell-end-tag", /** @type {Token} */ (S._tok));
	}
	popUntilOneOf(TD_TH);
	clearAfeToMarker();
	S.mode = MODE_IN_ROW;
};

modes.inTemplate = (t) => {
	if (
		t.type === TOKEN_CHAR ||
		isCommentOrProcessingInstruction(t) ||
		t.type === TOKEN_DOCTYPE
	) {
		return modes.inBody(t);
	}
	if (t.type === TOKEN_START_TAG) {
		if (HEAD_ELEMENTS.has(t.name)) {
			return modes.inHead(t);
		}
		const target = TEMPLATE_START_TAG_MODES.get(t.name) || MODE_IN_BODY;
		S._templateModes[S._templateModes.length - 1] = target;
		S.mode = target;
		return process(t);
	}
	if (t.type === TOKEN_END_TAG) {
		if (t.name === "template") return modes.inHead(t);
		return treeError("unexpected-end-tag", t);
	}
	// The end of the file, the one token left.
	if (!S._open.some(isHtmlTemplateEl)) {
		return;
	}
	treeError("eof-in-template", t);
	popUntil("template");
	clearAfeToMarker();
	S._templateModes.pop();
	resetInsertionMode();
	return process(t);
};

modes.afterBody = (t) => {
	if (t.type === TOKEN_CHAR && isAllAsciiWhitespace(t.data)) {
		return modes.inBody(t);
	}
	if (isCommentOrProcessingInstruction(t)) {
		insertCommentOrProcessingInstruction(t, {
			parent: S._open[0],
			beforeNode: 0
		});
		return;
	}
	if (t.type === TOKEN_DOCTYPE) return treeError("unexpected-doctype", t);
	if (t.type === TOKEN_START_TAG && t.name === "html") return modes.inBody(t);
	if (t.type === TOKEN_END_TAG && t.name === "html") {
		if (S._fragment) {
			return treeError("unexpected-end-tag-after-body-innerhtml", t);
		}
		S._sourceShellEnds |= SHELL_END_HTML;
		S.mode = MODE_AFTER_AFTER_BODY;
		return;
	}
	if (t.type === TOKEN_EOF) return;
	treeError(
		t.type === TOKEN_START_TAG
			? "unexpected-start-tag-after-body"
			: t.type === TOKEN_END_TAG
				? "unexpected-end-tag-after-body"
				: "unexpected-char-after-body",
		t
	);
	S.mode = MODE_IN_BODY;
	process(t);
};

/**
 * Report a parse error per character of a token, as the spec processes one
 * character token at a time.
 * @param {string} code parse-error code
 * @param {CharToken} t character token
 * @param {boolean=} whitespaceToo whether ASCII whitespace is an error as well
 * @returns {void}
 */
const characterErrors = (code, t, whitespaceToo = false) => {
	if (S._parseError === undefined) return;
	const data = t.data;
	const aligned = t.end - t.start === data.length;
	for (let i = 0; i < data.length; i++) {
		if (!whitespaceToo && isAsciiWhitespace(data.charCodeAt(i))) continue;
		treeError(code, {
			...t,
			start: aligned ? t.start + i : t.start,
			end: aligned ? t.start + i + 1 : t.end
		});
	}
};

modes.inFrameset = (t) => {
	if (t.type === TOKEN_CHAR) {
		characterErrors("unexpected-char-in-frameset", t);
		const ws = t.data.replace(/[^\t\n\f\r ]/g, "");
		if (ws) insertCharacters(ws, t.start, t.end);
		return;
	}
	if (isCommentOrProcessingInstruction(t)) {
		insertCommentOrProcessingInstruction(t);
		return;
	}
	if (t.type === TOKEN_DOCTYPE) return treeError("unexpected-doctype", t);
	if (t.type === TOKEN_START_TAG && t.name === "html") return modes.inBody(t);
	if (t.type === TOKEN_START_TAG && t.name === "frameset") {
		insertHtmlElement("frameset", t.attrs, t.pos);
		return;
	}
	if (t.type === TOKEN_END_TAG && t.name === "frameset") {
		if (tagNameOf(cur()) === "html") {
			return treeError("unexpected-frameset-in-frameset-innerhtml", t);
		}
		popOpen();
		if (!S._fragment && tagNameOf(cur()) !== "frameset") {
			S.mode = MODE_AFTER_FRAMESET;
		}
		return;
	}
	if (t.type === TOKEN_START_TAG && t.name === "frame") {
		insertHtmlElement("frame", t.attrs, t.pos);
		popOpen();
		S.selfClosingAcknowledged = true;
		return;
	}
	if (t.type === TOKEN_START_TAG && t.name === "noframes") {
		return modes.inHead(t);
	}
	if (t.type === TOKEN_EOF) {
		if (S._open.length > 1) treeError("eof-in-frameset", t);
		return;
	}
	treeError(
		t.type === TOKEN_START_TAG
			? "unexpected-start-tag-in-frameset"
			: "unexpected-end-tag-in-frameset",
		t
	);
};

modes.afterFrameset = (t) => {
	if (t.type === TOKEN_CHAR) {
		characterErrors("unexpected-char-after-frameset", t);
		const ws = t.data.replace(/[^\t\n\f\r ]/g, "");
		if (ws) insertCharacters(ws, t.start, t.end);
		return;
	}
	if (isCommentOrProcessingInstruction(t)) {
		insertCommentOrProcessingInstruction(t);
		return;
	}
	if (t.type === TOKEN_DOCTYPE) return treeError("unexpected-doctype", t);
	if (t.type === TOKEN_START_TAG && t.name === "html") return modes.inBody(t);
	if (t.type === TOKEN_END_TAG && t.name === "html") {
		S._sourceShellEnds |= SHELL_END_HTML;
		S.mode = MODE_AFTER_AFTER_FRAMESET;
		return;
	}
	if (t.type === TOKEN_START_TAG && t.name === "noframes") {
		return modes.inHead(t);
	}
	if (t.type === TOKEN_EOF) return;
	treeError(
		t.type === TOKEN_START_TAG
			? "unexpected-start-tag-after-frameset"
			: "unexpected-end-tag-after-frameset",
		t
	);
};

modes.afterAfterBody = (t) => {
	if (isCommentOrProcessingInstruction(t)) {
		insertCommentOrProcessingInstruction(t, { parent: S._doc, beforeNode: 0 });
		return;
	}
	if (t.type === TOKEN_DOCTYPE) return modes.inBody(t);
	if (t.type === TOKEN_CHAR && isAllAsciiWhitespace(t.data)) {
		return modes.inBody(t);
	}
	if (t.type === TOKEN_START_TAG && t.name === "html") return modes.inBody(t);
	if (t.type === TOKEN_EOF) return;
	expectedEof(t);
	S.mode = MODE_IN_BODY;
	process(t);
};

/**
 * @param {Token} t a token after the document's end
 * @returns {void}
 */
const expectedEof = (t) => {
	if (S._parseError === undefined) return;
	treeError(
		t.type === TOKEN_START_TAG
			? "expected-eof-but-got-start-tag"
			: t.type === TOKEN_END_TAG
				? "expected-eof-but-got-end-tag"
				: "expected-eof-but-got-char",
		t
	);
};

modes.afterAfterFrameset = (t) => {
	if (isCommentOrProcessingInstruction(t)) {
		insertCommentOrProcessingInstruction(t, { parent: S._doc, beforeNode: 0 });
		return;
	}
	if (t.type === TOKEN_DOCTYPE) return modes.inBody(t);
	if (t.type === TOKEN_CHAR && isAllAsciiWhitespace(t.data)) {
		return modes.inBody(t);
	}
	if (t.type === TOKEN_START_TAG && t.name === "html") return modes.inBody(t);
	if (t.type === TOKEN_START_TAG && t.name === "noframes") {
		return modes.inHead(t);
	}
	if (t.type === TOKEN_CHAR) {
		return characterErrors("expected-eof-but-got-char", t);
	}
	if (t.type !== TOKEN_EOF) expectedEof(t);
};

const dispatch = () => {
	const tree = S;
	process(
		/** @type {Token} */ (/** @type {Token | MutableToken} */ (tree._tok))
	);
	// One boolean per token: only a stack change can complete a subtree.
	if (tree._streamEligible && (tree._openStackChanged || tree._openSpliced)) {
		streamAfterToken();
	}
};

/**
 * Bring a streamed walk up to date once a token changed the open stack.
 * @returns {void}
 */
const streamAfterToken = () => {
	S._openStackChanged = false;
	if (S._streaming) {
		streamSync();
	} else if (S._nodeCount >= STREAM_MIN_NODES) {
		// Big enough to be worth recycling: start streaming here. The tree so
		// far is unvisited, so the first sync enters the open stack and flushes
		// everything already finished under it.
		S._streaming = true;
		streamSync();
	}
};

// WHY: tokenizer callbacks hoisted to module scope, over the parser state on
// `S`, so `tokenize`'s indirect `callbacks.text(...)` / `openTag` /
// `attribute(...)` sites see one stable function identity across every parse.
// They stay monomorphic and V8 inlines them; a fresh per-parse closure made
// them megamorphic and blocked that. `parseHtml` refreshes only
// `fragmentContext` on the shared object before each tokenize.

/** @type {() => boolean} */
const currentNodeIsForeign = () => {
	const tree = S;
	const open = tree._open;
	const n = open.length;
	if (n === 0) return false;
	const node = n === 1 && tree._fragment ? tree._fragment : open[n - 1];
	return node !== 0 && (tree._flags[node] & NS_MASK) !== NS_HTML;
};
/**
 * Whether the tree builder skips the tokenizer switch for this start tag, so
 * its content stays markup: foreign content, every frameset-mode tag but
 * `noframes`, which those modes ignore rather than hand to the head rules, and
 * a tag the column group mode ignored, the only way it is still the mode after
 * one (no colgroup to close: a `<template>`'s, or a fragment's).
 * @param {string} name the start tag's lowercased name
 * @returns {boolean} true when the tokenizer stays in the data state
 */
const vetoesContentMode = (name) => {
	if (currentNodeIsForeign()) return true;
	return (
		S.mode === MODE_IN_COLUMN_GROUP ||
		(name !== "noframes" &&
			(S.mode === MODE_IN_FRAMESET ||
				S.mode === MODE_AFTER_FRAMESET ||
				S.mode === MODE_AFTER_AFTER_FRAMESET))
	);
};
/** @type {NonNullable<HtmlParseOptions["parseError"]>} */
const reportParseError = (input, code, start, end, severity) => {
	if (code === "eof-in-tag") S.eofInTag = true;
	else if (code === "unexpected-null-character") S.inputHasNul = true;
	// An XML entity's replacement text is tokenized too; its offsets name no source.
	if (S._parseError !== undefined && input === S._input) {
		S._parseError(input, code, start, end, severity);
	}
};
/**
 * @param {string} input input
 * @param {number} rangeStart start of the range
 * @param {number} rangeEnd end of the range
 * @returns {string} the range with NULLs replaced, per the DOCTYPE states
 */
const doctypePart = (input, rangeStart, rangeEnd) => {
	const raw = input.slice(rangeStart, rangeEnd);
	return S.inputHasNul ? raw.replace(/\0/g, "\uFFFD") : raw;
};
/** @type {(input: string, start: number, end: number, nameStart: number, nameEnd: number, publicStart: number, publicEnd: number, systemStart: number, systemEnd: number, forceQuirks: boolean) => number} */
const handleDoctypeToken = (
	input,
	start,
	end,
	nameStart,
	nameEnd,
	publicStart,
	publicEnd,
	systemStart,
	systemEnd,
	forceQuirks
) => {
	// Only the token immediately after the start tag may be the swallowed
	// newline; anything else clears the flag (§13.2.6.4.7 "the next token").
	S.swallowNextNewline = false;
	S._tok.type = TOKEN_DOCTYPE;
	// A missing name and an empty one are alike to every consumer here, since the
	// spec's name states always append a character. Folding is ASCII-only, as
	// those states lowercase upper alpha and append the rest as written.
	S._tok.name =
		nameStart === -1
			? ""
			: asciiLowercase(doctypePart(input, nameStart, nameEnd));
	S._tok.publicId =
		publicStart === -1 ? null : doctypePart(input, publicStart, publicEnd);
	S._tok.systemId =
		systemStart === -1 ? null : doctypePart(input, systemStart, systemEnd);
	S._tok.publicStart = publicStart;
	S._tok.publicEnd = publicEnd;
	S._tok.systemStart = systemStart;
	S._tok.systemEnd = systemEnd;
	S._tok.forceQuirks = forceQuirks;
	S._tok.start = start;
	S._tok.end = end;
	dispatch();
	return end;
};
// A `<?...>` bogus comment is a processing instruction when its target is
// well-formed (§13.2.5). The tokenizer reports the source range; the DOM-level
// distinction is drawn here, so `tokenize` keeps reporting one comment token.
const PI_SCAN_COMMENT = 0;
const PI_SCAN_MATCH = 1;
// Cut short by EOF - the spec emits only an end-of-file token, so no node.
const PI_SCAN_DROP = 2;

/**
 * @param {string} input source
 * @param {number} start offset of the `<`
 * @param {number} end offset past the token
 * @returns {number} one of the `PI_SCAN_*` outcomes
 */
const scanProcessingInstruction = (input, start, end) => {
	const targetStart = start + 2;
	// Nothing after `<?`, so EOF landed in the open state and drops the token.
	if (targetStart >= end) return PI_SCAN_DROP;
	const first = input.charCodeAt(targetStart);
	if (!isAsciiAlpha(first) && first !== CC_LOW_LINE) return PI_SCAN_COMMENT;
	let i = targetStart + 1;
	while (i < end) {
		const cc = input.charCodeAt(i);
		if (
			isAsciiWhitespace(cc) ||
			cc === CC_QUESTION_MARK ||
			cc === CC_GREATER_THAN
		) {
			break;
		}
		if (
			!isAsciiAlphanumeric(cc) &&
			cc !== CC_HYPHEN_MINUS &&
			cc !== CC_LOW_LINE
		) {
			return PI_SCAN_COMMENT;
		}
		i++;
	}
	// EOF while still reading the target drops the token, whatever it spells; a
	// target that ends at a delimiter is judged below first.
	if (i === end) return PI_SCAN_DROP;
	// Reserved for XML, and common enough in legacy pages to keep as comments.
	if (
		rangeAsciiCaseInsensitiveMatch(input, targetStart, i, "xml") ||
		rangeAsciiCaseInsensitiveMatch(input, targetStart, i, "xml-stylesheet")
	) {
		return PI_SCAN_COMMENT;
	}
	S._piScanTargetEnd = i;
	// The rest ran into EOF instead of the closing `>`, so the token is dropped.
	if (input.charCodeAt(end - 1) !== CC_GREATER_THAN) return PI_SCAN_DROP;
	let contentEnd = end - 1;
	while (i < contentEnd && isAsciiWhitespace(input.charCodeAt(i))) i++;
	// A `?` right before the `>` closes the instruction instead of being data.
	if (contentEnd > i && input.charCodeAt(contentEnd - 1) === CC_QUESTION_MARK) {
		contentEnd--;
	}
	S._piScanDataStart = i;
	S._piScanDataEnd = contentEnd;
	return PI_SCAN_MATCH;
};

/** @type {(input: string, start: number, end: number, dataStart: number, dataEnd: number) => number} */
const handleCommentToken = (input, start, end, dataStart, dataEnd) => {
	// Only the token immediately after the start tag may be the swallowed
	// newline; anything else clears the flag (§13.2.6.4.7 "the next token").
	S.swallowNextNewline = false;
	// A CDATA section in foreign content arrives through this callback but is
	// character data, not a comment.
	if (
		input.startsWith("<![CDATA[", start) &&
		S._open.length > 0 &&
		adjustedCurrent() &&
		namespaceOf(adjustedCurrent()) !== NS_HTML
	) {
		const data = input.slice(dataStart, dataEnd).replace(/\r\n?/g, "\n");
		if (data !== "") {
			S._tok.type = TOKEN_CHAR;
			// A NUL stays a NUL: foreign content replaces it without clearing
			// frameset-ok, and an HTML integration point drops it (§13.2.5.69).
			S._tok.data = data;
			S._tok.start = start;
			S._tok.end = end;
			dispatch();
		}
		return end;
	}
	if (input.charCodeAt(start + 1) === CC_QUESTION_MARK) {
		const scan = scanProcessingInstruction(input, start, end);
		if (scan === PI_SCAN_DROP) return end;
		if (scan === PI_SCAN_MATCH) {
			S._tok.type = TOKEN_PROCESSING_INSTRUCTION;
			S._tok.name = input.slice(start + 2, S._piScanTargetEnd);
			const piRaw = input.slice(S._piScanDataStart, S._piScanDataEnd);
			S._tok.data = S.inputHasNul ? piRaw.replace(/\0/g, "\uFFFD") : piRaw;
			S._tok.start = start;
			S._tok.end = end;
			dispatch();
			return end;
		}
	}
	S._tok.type = TOKEN_COMMENT;
	const commentRaw = input.slice(dataStart, dataEnd);
	S._tok.data = S.inputHasNul
		? commentRaw.replace(/\0/g, "\uFFFD")
		: commentRaw;
	S._tok.start = start;
	S._tok.end = end;
	dispatch();
	return end;
};
/**
 * Whether `[start, end)` of the input holds a `&`. The parse's next `&` is
 * searched once per `&` rather than once per text run, as runs come in order.
 * @param {string} input the parse's source
 * @param {number} start offset of the run
 * @param {number} end offset past the run
 * @returns {boolean} whether the run holds a `&`
 */
const textHasAmpersand = (input, start, end) => {
	let amp = S.nextAmpersand;
	if (amp < start) {
		amp = input.indexOf("&", start);
		if (amp === -1) amp = input.length;
		S.nextAmpersand = amp;
	}
	return amp < end;
};
/** @type {(input: string, start: number, end: number) => number} */
const handleTextToken = (input, start, end) => {
	const tree = S;
	let data = "";
	// Whether `data` is known to hold no NUL: `skip.text`'s marker, or a run with
	// no reference to decode while the tokenizer has reported no NUL.
	let nulFree = false;
	// `skip.text` drops the node, so only whitespace-ness matters. Absent `&`,
	// `\0`, `\r` and a pending newline-swallow the decoded value is the raw range,
	// so a canonical marker stands in for it without slicing or decoding.
	if (tree.skipText && !tree.swallowNextNewline) {
		let hasNonWhitespace = false;
		let i = start;
		for (; i < end; i++) {
			const charCode = input.charCodeAt(i);
			// 2 = break (& / NUL / CR), 1 = whitespace, 0 = other.
			const scanClass = charCode < 128 ? TEXT_SCAN_CLASS[charCode] : 0;
			if (scanClass === 2) break;
			if (scanClass === 0) hasNonWhitespace = true;
		}
		if (i === end) {
			data = hasNonWhitespace ? "x" : " ";
			nulFree = true;
		}
	}
	if (!nulFree) {
		const raw = input.slice(start, end);
		// CR normalization only when a CR is actually present (common case has none).
		const normalized =
			tree.inputHasCr && raw.includes("\r") ? raw.replace(/\r\n?/g, "\n") : raw;
		data = normalized;
		// `decode` returns a run without `&` as it came and only a reported NUL is
		// replaced, so the current element is read for the few runs holding either.
		if (tree.inputHasNul || textHasAmpersand(input, start, end)) {
			const top = adjustedCurrent();
			const rawMode =
				tree.mode === MODE_TEXT ||
				(top && namespaceOf(top) === NS_HTML && tagNameOf(top) === "plaintext");
			// The PLAINTEXT state never ends, and the insertion mode a `<plaintext>` was
			// opened in (a table's, a cell's, a caption's) stays the mode around it.
			const noDecode =
				top &&
				namespaceOf(top) === NS_HTML &&
				(NO_DECODE_TEXT.has(tagNameOf(top)) ||
					(tree._scripting && tagNameOf(top) === "noscript")) &&
				(tree.mode === MODE_TEXT ||
					tree.mode === MODE_IN_BODY ||
					tagNameOf(top) === "plaintext");
			if (!noDecode) data = decode(normalized, false);
			// In RAWTEXT/RCDATA/script/PLAINTEXT, NULL becomes U+FFFD (tokenizer
			// rule); in data state NULLs pass through to be dropped in "in body".
			if (rawMode && tree.inputHasNul && data.includes("\0")) {
				data = data.replace(/\0/g, "\uFFFD");
			}
		} else {
			nulFree = true;
		}
		// pre/listing/textarea swallow a leading newline (post entity decode).
		if (tree.swallowNextNewline) {
			tree.swallowNextNewline = false;
			if (data[0] === "\n") data = data.slice(1);
		}
		if (data === "") return end;
	}
	// "In body" inserts a run holding no NUL as it is, and "in cell" hands it
	// there (§13.2.6.4.7, §13.2.6.4.15): no token to fill, no mode to dispatch.
	if (
		nulFree &&
		(tree.mode === MODE_IN_BODY || tree.mode === MODE_IN_CELL) &&
		!currentNodeIsForeign()
	) {
		tree.tokenEnd = end;
		reconstructAfe();
		insertCharacters(data, start, end);
		if (tree.framesetOk && !isAllAsciiWhitespace(data)) tree.framesetOk = false;
		if (tree._streamEligible && (tree._openStackChanged || tree._openSpliced)) {
			streamAfterToken();
		}
		return end;
	}
	tree._tok.type = TOKEN_CHAR;
	tree._tok.data = data;
	tree._tok.start = start;
	tree._tok.end = end;
	dispatch();
	return end;
};
/** @type {(input: string, nameStart: number, nameEnd: number, valueStart: number, valueEnd: number, quoteType: number) => number} */
const handleAttributeToken = (
	input,
	nameStart,
	nameEnd,
	valueStart,
	valueEnd,
	quoteType
) => {
	const tree = S;
	const name = internLowerName(ATTR_NAME_INTERN, input, nameStart, nameEnd);
	if (tree.pendAttrStart === 0) {
		tree.pendAttrStart = tree._attrCount + 1;
		tree.pendAttrDropped = false;
	}
	// Drop duplicate attribute names (per spec). Plain loop avoids a
	// per-attribute closure allocation on this hot path.
	let dup = false;
	for (let i = tree.pendAttrStart; i <= tree._attrCount; i++) {
		if (tree._attrNames[i] === name) {
			dup = true;
			break;
		}
	}
	if (dup) tree.pendAttrDropped = true;
	if (!dup) {
		// The raw value is read from the source by offset on demand, since
		// consumers re-resolve requests from it and the offsets have to stay
		// aligned. Only a valueless attribute stores an override.
		makeAttr(
			name,
			valueStart !== -1 ? null : "",
			nameStart,
			nameEnd,
			valueStart,
			valueEnd
		);
	}
	if (valueStart === -1) return nameEnd;
	return quoteType !== QUOTE_NONE ? valueEnd + 1 : valueEnd;
};
/** @type {(input: string, start: number, end: number, nameStart: number, nameEnd: number, selfClosing: boolean) => number} */
const handleStartTagToken = (
	input,
	start,
	end,
	nameStart,
	nameEnd,
	selfClosing
) => {
	const tree = S;
	// Only the token immediately after the start tag may be the swallowed
	// newline; anything else clears the flag (§13.2.6.4.7 "the next token").
	tree.swallowNextNewline = false;
	// A start tag the tokenizer only emitted because it hit EOF mid-tag
	// is dropped, matching the spec's eof-in-tag handling.
	if (tree.eofInTag) {
		// Any attribute slots already allocated for it are orphaned.
		tree.pendAttrStart = 0;
		tree.pendAttrDropped = false;
		return end;
	}
	const name = internLowerName(TAG_NAME_INTERN, input, nameStart, nameEnd);
	if (name === "selectedcontent") tree._sawSelectedContent = true;
	tree._tok.type = TOKEN_START_TAG;
	tree._tok.name = name;
	// The reused token carries the tag's attribute run; every consumer of
	// `t.attrs` runs synchronously within this dispatch.
	tree._tok.attrs.start = tree.pendAttrStart;
	tree._tok.attrs.count =
		tree.pendAttrStart === 0 ? 0 : tree._attrCount + 1 - tree.pendAttrStart;
	// Only a name the run kept is tested: a dropped one repeats one of them.
	if (tree.pendAttrDropped) {
		for (let i = tree.pendAttrStart; i <= tree._attrCount; i++) {
			const attributeName = tree._attrNames[i];
			if (!isWordSpan(attributeName, 0, attributeName.length)) {
				tree._foreignSyntaxAttrRuns.add(tree.pendAttrStart);
				break;
			}
		}
	}
	tree.pendAttrStart = 0;
	tree.pendAttrDropped = false;
	tree._tok.selfClosing = selfClosing;
	tree._tok.swallowNewline = false;
	tree._tok.pos.start = start;
	tree._tok.pos.end = end;
	tree._tok.pos.tagEnd = end;
	tree._tok.pos.nameEnd = nameEnd;
	tree.selfClosingAcknowledged = false;
	// "In body" takes a start tag in HTML content without the token dispatch,
	// which would hand it to the same rules (§13.2.6.4.7).
	if (tree.mode === MODE_IN_BODY && !currentNodeIsForeign()) {
		tree.tokenEnd = end;
		startTagInBody(/** @type {StartTagToken} */ (tree._tok));
		if (tree._streamEligible && (tree._openStackChanged || tree._openSpliced)) {
			streamAfterToken();
		}
	} else {
		dispatch();
	}
	if (
		selfClosing &&
		tree._parseError !== undefined &&
		!tree.selfClosingAcknowledged &&
		!VOID.has(name) &&
		!ACKNOWLEDGED_NON_VOID.has(name)
	) {
		treeError(
			"non-void-html-element-start-tag-with-trailing-solidus",
			/** @type {Token} */ (tree._tok)
		);
	}
	if (tree._tok.swallowNewline) tree.swallowNextNewline = true;
	return end;
};
/** @type {(input: string, start: number, end: number, nameStart: number, nameEnd: number) => number} */
const handleEndTagToken = (input, start, end, nameStart, nameEnd) => {
	const tree = S;
	// Only the token immediately after the start tag may be the swallowed
	// newline; anything else clears the flag (§13.2.6.4.7 "the next token").
	tree.swallowNextNewline = false;
	// The context's text has no end tag, so this one and all after it are text.
	if (tree._fragmentRawText) {
		if (input.includes("\0", start)) tree.inputHasNul = true;
		handleTextToken(input, start, input.length);
		return input.length;
	}
	// Dropped like a start tag the input ran out inside: `</p` and `</br` would
	// otherwise build the element a stray one of them inserts (§13.2.6.4.7).
	// Not in raw text, whose text mode reads an unfinished end tag as text.
	if (tree.eofInTag && tree.mode !== MODE_TEXT) {
		tree.pendAttrStart = 0;
		tree.pendAttrDropped = false;
		return end;
	}
	// Most end tags close the current element: compare the raw range against
	// its already-interned tag name - one case-folding walk, no hash/probe.
	let name;
	if (tree._open.length > 0) {
		const topName = tree._strings[tree._open[tree._open.length - 1]];
		if (rangeAsciiCaseInsensitiveMatch(input, nameStart, nameEnd, topName)) {
			name = topName;
		}
	}
	if (name === undefined) {
		name = internLowerName(TAG_NAME_INTERN, input, nameStart, nameEnd);
	}
	// End tags drop any parsed attributes (the slots are orphaned).
	tree.pendAttrStart = 0;
	tree.pendAttrDropped = false;
	tree._tok.type = TOKEN_END_TAG;
	tree._tok.name = name;
	tree._tok.pos.start = start;
	tree._tok.pos.end = end;
	tree._tok.pos.tagEnd = end;
	tree._tok.pos.nameEnd = nameEnd;
	// As a start tag: "in body" takes one in HTML content without the dispatch.
	if (tree.mode === MODE_IN_BODY && !currentNodeIsForeign()) {
		tree.tokenEnd = end;
		endTagInBody(/** @type {EndTagToken} */ (tree._tok));
		if (tree._streamEligible && (tree._openStackChanged || tree._openSpliced)) {
			streamAfterToken();
		}
		return end;
	}
	dispatch();
	return end;
};
/** @type {HtmlTokenCallbacks} */
const PARSE_CALLBACKS = {
	isForeign: currentNodeIsForeign,
	vetoesContentMode,
	fragmentContext: undefined,
	scripting: false,
	parseError: reportParseError,
	doctype: handleDoctypeToken,
	comment: handleCommentToken,
	text: handleTextToken,
	attribute: handleAttributeToken,
	openTag: handleStartTagToken,
	closeTag: handleEndTagToken
};

const dispatchXml = () => {
	processXml(
		/** @type {Token} */ (/** @type {Token | MutableToken} */ (S._tok))
	);
};

// A reference in the shape `decodeXmlReferences` reads one, matched in place.
const XML_REFERENCE_STICKY_REGEXP =
	/&(?:#(?:x[\da-fA-F]+|\d+)|([^\s&;#<>"'=/%]+));/y;

/**
 * @param {string} data decoded character data
 * @param {number} start source offset the token is reported at
 * @param {number} end source offset past it
 * @returns {void}
 */
const dispatchXmlCharacters = (data, start, end) => {
	if (data === "") return;
	S._tok.type = TOKEN_CHAR;
	S._tok.data = data;
	S._tok.start = start;
	S._tok.end = end;
	dispatchXml();
};

/**
 * Whether an entity's replacement text is markup once the entities it names are
 * expanded too. Memoized per parse, so nesting costs one visit per name.
 * @param {string} name declared entity name
 * @param {number=} depth entities traversed so far
 * @returns {boolean} true when expanding it can build a node other than text
 */
const xmlEntityHoldsMarkup = (name, depth = 0) => {
	if (S._xmlMarkupEntities === null) S._xmlMarkupEntities = new Map();
	const known = S._xmlMarkupEntities.get(name);
	if (known !== undefined) return known;
	// Beyond the expansion limit, tokenize conservatively without searching deeper.
	if (depth >= XML_ENTITY_DEPTH_LIMIT) return true;
	// A cycle reads its own name as text-only, which is what it expands to.
	S._xmlMarkupEntities.set(name, false);
	const replacement = /** @type {Map<string, string>} */ (S._xmlEntities).get(
		name
	);
	let holds = replacement !== undefined && replacement.includes("<");
	if (replacement !== undefined && !holds) {
		for (
			let i = replacement.indexOf("&");
			i !== -1 && !holds;
			i = replacement.indexOf("&", i + 1)
		) {
			XML_REFERENCE_STICKY_REGEXP.lastIndex = i;
			const match = XML_REFERENCE_STICKY_REGEXP.exec(replacement);
			holds =
				match !== null &&
				match[1] !== undefined &&
				xmlEntityHoldsMarkup(match[1], depth + 1);
		}
	}
	S._xmlMarkupEntities.set(name, holds);
	return holds;
};

/**
 * Where a position in a text token's folded text sits in the source: §2.11
 * folds each CRLF to one LF, so each one before it moves the position on by one.
 * The scan resumes from a position already mapped, so a token costs one pass.
 * @param {string} text the token's text, line ends folded
 * @param {number} start source offset of the text
 * @param {number} end source offset past it
 * @param {number} from a position in the text at or before `at`
 * @param {number} fromOffset the source offset `from` was read from
 * @param {number} at the position to map
 * @returns {number} the source offset it was read from
 */
const xmlSourceOffset = (text, start, end, from, fromOffset, at) => {
	if (text.length === end - start) return start + at;
	const source = S._input;
	let offset = fromOffset;
	for (let i = from; i < at; i++) {
		offset +=
			source.charCodeAt(offset) === CC_CR &&
			source.charCodeAt(offset + 1) === CC_LF
				? 2
				: 1;
	}
	return offset;
};

/**
 * Dispatch XML character data, expanding a reference to an entity whose
 * replacement text is itself markup (§4.4.2 "included") by tokenizing it in
 * place. What it builds is reported at the range of the reference that named it.
 * @param {string} text source text, line ends folded
 * @param {number} start source offset of the text
 * @param {number} end source offset past it
 * @returns {void}
 */
const dispatchXmlText = (text, start, end) => {
	if (S._xmlEntities === null || !text.includes("&")) {
		dispatchXmlCharacters(decodeXmlEntities(text), start, end);
		return;
	}
	let last = 0;
	let lastStart = start;
	for (let i = text.indexOf("&"); i !== -1; i = text.indexOf("&", i + 1)) {
		// An entity reference as `XML_REFERENCE_STICKY_REGEXP` reads one, scanned
		// where it is written: a match array per `&` costs more than its name.
		let nameEnd = i + 1;
		while (
			nameEnd < text.length &&
			!endsXmlReferenceName(text.charCodeAt(nameEnd))
		) {
			nameEnd++;
		}
		if (nameEnd === i + 1 || text.charCodeAt(nameEnd) !== CC_SEMICOLON) {
			continue;
		}
		const name = text.slice(i + 1, nameEnd);
		const replacement = S._xmlEntities.get(name);
		if (
			replacement === undefined ||
			!xmlEntityHoldsMarkup(name) ||
			S._xmlEntityStack.length >= XML_ENTITY_DEPTH_LIMIT ||
			S._xmlEntityStack.includes(name) ||
			S._xmlExpansionBudget < replacement.length
		) {
			continue;
		}
		const outer = S._xmlEntityRangeStart;
		// Inside an entity every node is reported at the outermost reference anyway.
		const referenceStart =
			outer === -1
				? xmlSourceOffset(text, start, end, last, lastStart, i)
				: start;
		dispatchXmlCharacters(
			decodeXmlEntities(text.slice(last, i)),
			lastStart,
			referenceStart
		);
		last = nameEnd + 1;
		lastStart =
			outer === -1
				? xmlSourceOffset(text, start, end, i, referenceStart, last)
				: end;
		i = last - 1;
		S._xmlExpansionBudget -= replacement.length;
		// The printer cannot rebuild a reference from what it expanded to, so a
		// document holding one prints as written.
		S._xmlVerbatim = true;
		if (outer === -1) {
			S._xmlEntityRangeStart = referenceStart;
			S._xmlEntityRangeEnd = lastStart;
		}
		S._xmlEntityStack.push(name);
		// A tag the replacement text ends inside is the entity's to drop, not the document's.
		const outerEofInTag = S.eofInTag;
		tokenizeXml(replacement, 0, XML_PARSE_CALLBACKS);
		S.eofInTag = outerEofInTag;
		S._xmlEntityStack.pop();
		if (outer === -1) S._xmlEntityRangeStart = -1;
	}
	dispatchXmlCharacters(
		decodeXmlEntities(last === 0 ? text : text.slice(last)),
		lastStart,
		end
	);
};

/** @type {(input: string, start: number, end: number, nameStart: number, nameEnd: number, publicStart: number, publicEnd: number, systemStart: number, systemEnd: number, forceQuirks: boolean, subsetStart?: number, subsetEnd?: number) => number} */
const handleXmlDoctypeToken = (
	input,
	start,
	end,
	nameStart,
	nameEnd,
	publicStart,
	publicEnd,
	systemStart,
	systemEnd,
	forceQuirks,
	subsetStart,
	subsetEnd
) => {
	// §2.8: only the first DOCTYPE declares anything. `tokenizeXml`, the one
	// caller, passes the subset's range every time, -1 for none.
	if (
		subsetStart !== -1 &&
		S._xmlEntities === null &&
		S._xmlAttributeDeclarations === null
	) {
		readXmlInternalSubset(
			input,
			/** @type {number} */ (subsetStart),
			/** @type {number} */ (subsetEnd)
		);
	}
	S._tok.type = TOKEN_DOCTYPE;
	S._tok.name = nameStart === -1 ? "" : doctypePart(input, nameStart, nameEnd);
	S._tok.publicId =
		publicStart === -1 ? null : doctypePart(input, publicStart, publicEnd);
	S._tok.systemId =
		systemStart === -1 ? null : doctypePart(input, systemStart, systemEnd);
	S._tok.publicStart = publicStart;
	S._tok.publicEnd = publicEnd;
	S._tok.systemStart = systemStart;
	S._tok.systemEnd = systemEnd;
	S._tok.forceQuirks = forceQuirks;
	S._tok.start = start;
	S._tok.end = end;
	dispatchXml();
	return end;
};

/** @type {(input: string, start: number, end: number, dataStart: number, dataEnd: number) => number} */
const handleXmlCommentToken = (input, start, end, dataStart, dataEnd) => {
	// Only `<![` opens a CDATA section: a comment or an instruction costs one read.
	const cdata =
		input.charCodeAt(start + 2) === CC_LEFT_SQUARE_BRACKET &&
		input.startsWith("<![CDATA[", start);
	// Character data needs an element to go in; outside the root it is a comment.
	if (cdata && S._open.length > 0) {
		const raw = input.slice(dataStart, dataEnd);
		const data =
			S._xmlEntityRangeStart === -1
				? raw.replace(XML_LINE_END_REGEXP, "\n")
				: raw;
		if (data !== "") {
			S._tok.type = TOKEN_CHAR;
			S._tok.data = S.inputHasNul ? data.replace(/\0/g, "\uFFFD") : data;
			S._tok.start = start;
			S._tok.end = end;
			dispatchXml();
		}
		return end;
	}
	if (input.charCodeAt(start + 1) === CC_QUESTION_MARK) {
		// §2.6: the target is a name, and the data starts past the whitespace after it.
		const targetEnd = xmlNameEnd(input, dataStart);
		S._tok.type = TOKEN_PROCESSING_INSTRUCTION;
		S._tok.name = input.slice(dataStart, targetEnd);
		const piRaw = input.slice(skipXmlWhitespace(input, targetEnd), dataEnd);
		S._tok.data =
			S.inputHasCr || S._xmlEntityRangeStart !== -1
				? piRaw.replace(XML_LINE_END_REGEXP, "\n")
				: piRaw;
	} else {
		S._tok.type = TOKEN_COMMENT;
		const raw = input.slice(dataStart, dataEnd);
		const commentRaw =
			S.inputHasCr || S._xmlEntityRangeStart !== -1
				? raw.replace(XML_LINE_END_REGEXP, "\n")
				: raw;
		S._tok.data = S.inputHasNul
			? commentRaw.replace(/\0/g, "\uFFFD")
			: commentRaw;
	}
	S._tok.start = start;
	S._tok.end = end;
	dispatchXml();
	return end;
};

/** @type {(input: string, start: number, end: number) => number} */
const handleXmlTextToken = (input, start, end) => {
	// Without declared entities, text builds a `Text` node and nothing else, and
	// `skip.text` drops it: only where it ended is left to record.
	if (S.skipText && S._xmlEntities === null) {
		S.tokenEnd = end;
		if (S._open.length !== 0) insertCharacters("", start, end);
		return end;
	}
	let text = input.slice(start, end);
	if (S.inputHasCr && S._xmlEntityRangeStart === -1) {
		text = text.replace(XML_LINE_END_REGEXP, "\n");
	}
	if (S.inputHasNul) text = text.replace(/\0/g, "\uFFFD");
	// Text of the source without an `&` holds no reference to decode or expand.
	if (S._xmlEntityRangeStart === -1 && !xmlSourceHoldsAmpersand(start, end)) {
		dispatchXmlCharacters(text, start, end);
	} else {
		dispatchXmlText(text, start, end);
	}
	return end;
};

/** @type {(input: string, nameStart: number, nameEnd: number, valueStart: number, valueEnd: number, quoteType: number) => number} */
const handleXmlAttributeToken = (
	input,
	nameStart,
	nameEnd,
	valueStart,
	valueEnd,
	quoteType
) => {
	// Names are case-sensitive and never interned: XML has no vocabulary to share.
	const name = input.slice(nameStart, nameEnd);
	if (S.pendAttrStart === 0) S.pendAttrStart = S._attrCount + 1;
	let duplicate = false;
	const names = S._attrNames;
	const count = S._attrCount;
	for (let i = S.pendAttrStart; i <= count; i++) {
		if (names[i] === name) {
			duplicate = true;
			break;
		}
	}
	if (!duplicate) {
		if (S._xmlEntityRangeStart !== -1) {
			// Inside an entity's replacement text, which no offset into the source reaches.
			makeAttr(
				name,
				valueStart === -1 ? "" : input.slice(valueStart, valueEnd),
				-1,
				-1,
				-1,
				-1
			);
		} else {
			// `makeAttr`, inlined: this runs once per attribute of the document.
			const i = count + 1;
			S._attrCount = i;
			if (i >= S._attrCapacity) growAttrColumns(i + 1);
			S._attrNameStarts[i] = nameStart;
			S._attrNameEnds[i] = nameEnd;
			S._attrValueStarts[i] = valueStart;
			S._attrValueEnds[i] = valueEnd;
			S._attrFlags[i] = 0;
			S._attrNames[i] = name;
			S._attrValues[i] = valueStart !== -1 ? null : "";
		}
	}
	if (valueStart === -1) return nameEnd;
	return quoteType !== QUOTE_NONE ? valueEnd + 1 : valueEnd;
};

/** @type {(input: string, start: number, end: number, nameStart: number, nameEnd: number, selfClosing: boolean) => number} */
const handleXmlStartTagToken = (
	input,
	start,
	end,
	nameStart,
	nameEnd,
	selfClosing
) => {
	const attrStart = S.pendAttrStart;
	S.pendAttrStart = 0;
	// The input ended inside the tag, which drops it as HTML's eof-in-tag does.
	if (S.eofInTag) return end;
	S._tok.type = TOKEN_START_TAG;
	S._tok.name = input.slice(nameStart, nameEnd);
	S._tok.attrs.start = attrStart;
	S._tok.attrs.count = attrStart === 0 ? 0 : S._attrCount + 1 - attrStart;
	S._tok.selfClosing = selfClosing;
	S._tok.pos.start = start;
	S._tok.pos.end = end;
	S._tok.pos.tagEnd = end;
	S._tok.pos.nameEnd = nameEnd;
	dispatchXml();
	return end;
};

/** @type {(input: string, start: number, end: number, nameStart: number, nameEnd: number) => number} */
const handleXmlEndTagToken = (input, start, end, nameStart, nameEnd) => {
	S.pendAttrStart = 0;
	S._tok.type = TOKEN_END_TAG;
	S._tok.name = input.slice(nameStart, nameEnd);
	S._tok.pos.start = start;
	S._tok.pos.end = end;
	S._tok.pos.tagEnd = end;
	S._tok.pos.nameEnd = nameEnd;
	dispatchXml();
	return end;
};

/** @type {HtmlTokenCallbacks} */
const XML_PARSE_CALLBACKS = {
	parseError: reportParseError,
	doctype: handleXmlDoctypeToken,
	comment: handleXmlCommentToken,
	text: handleXmlTextToken,
	attribute: handleXmlAttributeToken,
	openTag: handleXmlStartTagToken,
	closeTag: handleXmlEndTagToken
};

/**
 * `parseHtml` without its check, for the parses a `grammar` run makes itself.
 * @param {string} input HTML source
 * @param {number=} pos start byte offset (string input only; default `0`)
 * @param {HtmlParseOptions=} options parse options (fragment context, AST skips)
 * @returns {HtmlDocument} ref to the document node - read through `A`; valid until the next parse
 */
const parseHtmlUnchecked = (input, pos = 0, options = {}) => {
	S._input = input;
	S.nextAmpersand = -1;
	S.inputHasCr = input.includes("\r");
	// The tokenizer reports every literal NUL before emitting its token, letting
	// the parse-error callback set this flag without a separate full-input scan.
	S.inputHasNul = false;
	// Only an unknown name's entry is a slice of the last document; one naming a
	// known element is a shared constant, and stays warm across parses.
	dropSourceBackedNames(TAG_NAME_INTERN);
	dropSourceBackedNames(ATTR_NAME_INTERN);
	const { fragmentContext, skip = EMPTY_SKIP } = options;
	S._parseError = options.parseError;
	S._scripting = options.scripting === true;
	S._srcdocDocument = options.srcdoc === true;
	S._xmlMode = options.xml === true;
	S._xmlEntities = null;
	S._xmlAttributeDeclarations = null;
	S._xmlEntityRangeStart = -1;
	S._xmlNextAmpersand = -1;
	S._xmlMarkupEntities = null;
	S._xmlVerbatim = false;
	S._xmlEntityStack.length = 0;
	S._xmlExpansionBudget = XML_ENTITY_EXPANSION_BUDGET;
	S._sourceShellEnds = 0;
	S.skipText = skip.text === true;
	S._skipComments = skip.comments === true;
	S._skipDoctype = skip.doctype === true;
	resetColumns();
	if (S._entered.length !== 0) S._entered.length = 0;
	S._skipFrom = -1;
	S._streaming = false;
	S._docSkipped = false;
	S._openStackChanged = false;
	S._openSpliced = false;
	S._streamHalted = false;
	// WHY: pre-size the columns from the input length. A document past
	// `SHRINK_CAPACITY` re-enters with released columns, and the doubling
	// cascade would re-allocate and copy every one of them several times per
	// parse. The densest realistic HTML runs about 12 bytes per node and 50 per
	// attribute, so `len/12` and `len/48` reach the final capacity in one
	// allocation, a sparser document over-allocates scratch the release frees,
	// and doubling stays as the net under a short estimate. `skip.text`, which
	// `HtmlParser` uses, drops roughly half the nodes and so estimates `len/24`;
	// attributes are untouched by it.
	let nodeEstimate = (input.length / (S.skipText ? 24 : 12)) | 0;
	let attrEstimate = (input.length / 48) | 0;
	// A long inline style/script or comment has very few markup delimiters, so
	// estimating columns from its byte length wastes memory. Probe only until the
	// document proves dense; `indexOf` skips the long raw-text spans natively.
	if (
		nodeEstimate > (S._nodeCapacity || 4096) ||
		attrEstimate > (S._attrCapacity || 4096)
	) {
		let markupCount = 0;
		let searchFrom = 0;
		while (markupCount <= SPARSE_MARKUP_LIMIT) {
			const next = input.indexOf("<", searchFrom);
			if (next < 0) break;
			markupCount++;
			searchFrom = next + 1;
		}
		if (markupCount <= SPARSE_MARKUP_LIMIT) {
			nodeEstimate = Math.min(nodeEstimate, markupCount * 2 + 16);
			attrEstimate = Math.min(attrEstimate, markupCount * 8 + 16);
		}
	}
	if (S._streamEligible) {
		// Streaming recycles node ids, so a document past the threshold peaks at
		// the activation point plus a batch of headroom rather than at the whole
		// estimate. Attributes are not recycled, so their estimate stands.
		const cap = STREAM_MIN_NODES + FLUSH_BATCH * 2;
		if (nodeEstimate > cap) nodeEstimate = cap;
	}
	if (nodeEstimate > S._nodeCapacity) growNodeColumns(nodeEstimate, true);
	if (attrEstimate > S._attrCapacity) growAttrColumns(attrEstimate, true);
	S._locConverter = undefined;
	S._cursorEpoch = (S._cursorEpoch + 1) | 0;
	S._doc = makeNode(NodeType.Document, 0, 0);
	S._strings[S._doc] = "";
	S.mode = MODE_INITIAL;
	S._originalMode = 0;
	S._open.length = 0;
	S._afe.length = 0;
	S.head = 0;
	S._form = 0;
	S.framesetOk = true;
	S.pendAttrStart = 0;
	S.pendAttrDropped = false;
	S.fosterParenting = false;
	S._fosteredLog = null;
	S._printFromSource = false;
	S._fosteredRuns = null;
	S._fosteredNodes = null;
	S._fosterHolders = null;
	// Node slots are reused between parses, so the marks come off with the sets.
	if (S._fosterVerbatim !== null) {
		for (const n of S._fosterVerbatim) S._flags[n] &= ~FLAG_FOSTER_REGION;
	}
	S._fosterVerbatim = null;
	S._fosterOpenTail = null;
	S._fosterSpanEnd = 0;
	S._fosterMoves = null;
	S._templateModes.length = 0;
	S._quirks = false;
	S._quirksDisputed = false;
	S._fragment = 0;
	S.tokenEnd = 0;
	S._sharedPlace.parent = S._doc;
	S._sharedPlace.beforeNode = 0;
	S._pendingTableChars = null;
	S.swallowNextNewline = false;
	S.eofInTag = false;
	S._fragmentRawText = false;
	S._sawSelectedContent = false;

	// ---------- fragment setup ----------
	if (fragmentContext) {
		let ctxName = fragmentContext.toLowerCase();
		let ctxNs = NS_HTML;
		if (ctxName.startsWith("svg ")) {
			ctxNs = NS_SVG;
			ctxName = ctxName.slice(4);
		} else if (ctxName.startsWith("math ")) {
			ctxNs = NS_MATHML;
			ctxName = ctxName.slice(5);
		}
		S._fragment = mkEl(ctxName, ctxNs, EMPTY_ATTRS, null);
		const htmlEl = mkEl("html", NS_HTML, EMPTY_ATTRS, null);
		appendChild(S._doc, htmlEl);
		S._open.push(htmlEl);
		if (ctxNs !== NS_HTML) {
			S.mode = MODE_IN_BODY;
		} else if (["title", "textarea"].includes(ctxName)) {
			S._originalMode = MODE_IN_BODY;
			S.mode = MODE_TEXT;
		} else if (
			["style", "xmp", "iframe", "noembed", "noframes", "script"].includes(
				ctxName
			)
		) {
			S._originalMode = MODE_IN_BODY;
			S.mode = MODE_TEXT;
		} else if (ctxName === "noscript" || ctxName === "plaintext") {
			S.mode = MODE_IN_BODY;
		} else {
			resetInsertionMode();
		}
		if (ctxName === "template") {
			S._templateModes.push(MODE_IN_TEMPLATE);
			S.mode = MODE_IN_TEMPLATE;
		}
		S._fragmentRawText =
			ctxNs === NS_HTML &&
			getContentModeForTag(ctxName, S._scripting) !== STATE_DATA;
	}

	// A `skipChildren()` on the root means nothing under it is visited, so the
	// walk never starts and only the document's own `exit` is left to fire.
	if (S._streamEligible && !enterNode(S._doc)) {
		S._streamEligible = false;
		S._docSkipped = true;
	}
	if (S._xmlMode) {
		// Everything outside the root element is the document's too, so it spans all.
		S._ends[S._doc] = input.length;
		S._xmlEntityMemoOpen = true;
		// A `parseError` callback may throw; the next parse must not read these.
		try {
			tokenizeXml(S._input, pos, XML_PARSE_CALLBACKS);
		} finally {
			S._xmlEntityMemoOpen = false;
			S._xmlTextEntityMemo = null;
			S._xmlAttributeEntityMemo = null;
		}
	} else {
		// Set after the document's `enter`, which may run a nested process that
		// sets them too; the shared object keeps the tokenizer's call sites
		// monomorphic, and `tokenize` reads both only as it starts.
		PARSE_CALLBACKS.fragmentContext = S._fragment
			? tagNameOf(S._fragment)
			: undefined;
		PARSE_CALLBACKS.scripting = S._scripting;
		tokenize(S._input, pos, PARSE_CALLBACKS);
		S._tok.type = TOKEN_EOF;
		dispatch();
	}
	S._parseError = undefined;
	// What the input left open ends with it.
	for (let i = 0; i < S._open.length; i++) {
		if (S._nameEnds[S._open[i]] !== 0) {
			S._ends[S._open[i]] = S._input.length;
		}
	}

	// WHY: not while printing. The mirror is content the engine makes, with no
	// source text behind it, and the printer emits what it walks - so serializing
	// it would write the selected option's subtree into the document, which the
	// engine reading that output would then mirror a second time.
	if (S._sawSelectedContent && S._writer === undefined) {
		mirrorSelectedContent(S._doc, 0);
	}
	if (S._streamEligible) streamFinish(S._doc);
	else if (S._docSkipped) exitNode(S._doc);

	return S._doc;
};

/**
 * @param {string} input HTML source
 * @param {number=} pos start byte offset (string input only; default `0`)
 * @param {HtmlParseOptions=} options parse options (fragment context, AST skips)
 * @returns {HtmlDocument} ref to the document node - read through `A`; valid until the next parse
 */
const parseHtml = (input, pos, options) => {
	// WHY: its ids are read through `A`, which reads the tree a run is walking,
	// so a parse there would overwrite it; `process` gives a nested run its own.
	if (grammarDepth !== 0) {
		throw new Error(
			"html syntax: parseHtml was called during an HTML process run; nest the work with a SourceProcessor process instead"
		);
	}
	return parseHtmlUnchecked(input, pos, options);
};

/**
 * Deep-clone a node into fresh ids, dropping attribute source offsets and the
 * raw-text body span so cloned content does not re-emit dependencies.
 * @param {HtmlNodeRef} node node
 * @returns {HtmlNodeRef} clone
 */
const cloneSubtree = (node) => {
	const ty = S._types[node];
	const clone = makeNode(ty, S._starts[node], S._ends[node]);
	S._strings[clone] = S._strings[node];
	if (ty !== NodeType.Element) return clone;
	S._flags[clone] = S._flags[node];
	const attrs = cloneAttrs(node);
	S._attrStarts[clone] = attrs.start;
	S._attrCounts[clone] = attrs.count;
	S._tagEnds[clone] = S._tagEnds[node];
	S._nameEnds[clone] = S._nameEnds[node];
	// Empty body span: the clone re-emits no raw-text dependency.
	S._contentEnds[clone] = S._tagEnds[node];
	for (let k = S._firstChildren[node]; k !== 0; k = S._nextSiblings[k]) {
		appendChild(clone, cloneSubtree(k));
	}
	// Clone `<template>` content into the clone's own fragment.
	const tc = templateContentOf(node);
	if (tc !== 0) {
		const fragment = makeNode(NodeType.DocumentFragment, 0, 0);
		S._strings[fragment] = "";
		// Parent link so the iterative walk can ascend out of the content.
		S._parents[fragment] = clone;
		S._contentEnds[clone] = fragment;
		S._flags[clone] |= FLAG_HAS_TEMPLATE;
		for (let k = S._firstChildren[tc]; k !== 0; k = S._nextSiblings[k]) {
			appendChild(fragment, cloneSubtree(k));
		}
	}
	return clone;
};

/**
 * The selected option of a select: the last `<option selected>`, else the
 * first option (scanning direct children and `<optgroup>` children).
 * @param {HtmlElement} select select element
 * @returns {HtmlElement} selected option (0 = none)
 */
const selectedOption = (select) => {
	/** @type {HtmlElement[]} */
	const options = [];
	/** @param {HtmlElement} el element */
	const collect = (el) => {
		for (let c = S._firstChildren[el]; c !== 0; c = S._nextSiblings[c]) {
			if (S._types[c] !== NodeType.Element || namespaceOf(c) !== NS_HTML) {
				continue;
			}
			if (S._strings[c] === "option") options.push(c);
			else if (S._strings[c] === "optgroup") collect(c);
		}
	};
	collect(select);
	if (options.length === 0) return 0;
	for (let i = options.length - 1; i >= 0; i--) {
		const el = options[i];
		if (findAttr(S._attrStarts[el], S._attrCounts[el], "selected") !== 0) {
			return el;
		}
	}
	return options[0];
};

/**
 * Fill each `<selectedcontent>` with a clone of its `<select>`'s selected
 * option subtree (the customizable-select mirroring behavior). Not while
 * printing: the clone has no source behind it, and the printer writes what it
 * walks (see the call site).
 * @param {HtmlNodeRef} node node
 * @param {HtmlElement} select nearest ancestor select (0 = none)
 */
const mirrorSelectedContent = (node, select) => {
	// A `<template>`'s children live in its content fragment.
	const tc = templateContentOf(node);
	const container = tc !== 0 ? tc : node;
	for (
		let child = S._firstChildren[container];
		child !== 0;
		child = S._nextSiblings[child]
	) {
		if (S._types[child] !== NodeType.Element) continue;
		if (namespaceOf(child) === NS_HTML && S._strings[child] === "select") {
			mirrorSelectedContent(child, child);
		} else if (
			select !== 0 &&
			namespaceOf(child) === NS_HTML &&
			S._strings[child] === "selectedcontent"
		) {
			const option = selectedOption(select);
			if (option !== 0) {
				// Replace the children with clones of the option's subtree.
				S._firstChildren[child] = 0;
				S._lastChildren[child] = 0;
				for (
					let k = S._firstChildren[option];
					k !== 0;
					k = S._nextSiblings[k]
				) {
					appendChild(child, cloneSubtree(k));
				}
				// A `<select>` carried into the clone is a select of its own there, so
				// its `<selectedcontent>` mirrors inside the copy as it would anywhere.
				mirrorSelectedContent(child, 0);
			}
		} else if (
			select !== 0 &&
			namespaceOf(child) === NS_HTML &&
			S._strings[child] === "option"
		) {
			// An option is what a `<selectedcontent>` mirrors, so nothing inside one
			// mirrors: not a `<selectedcontent>` written there, and not a `<select>`
			// nested under it either.
			continue;
		} else {
			mirrorSelectedContent(child, select);
		}
	}
};

/**
 * Whether the `&` at `i` would be consumed as a character reference when the
 * text is read back (§13.2.5.72): only before `#` or a name the table holds.
 * Every other `&` the tokenizer flushes as literal text, so `R&D` needs no
 * escape - and neither does the `&` in a query string.
 * @param {string} s decoded text
 * @param {number} i the `&`'s index
 * @param {boolean=} terminated whether nothing can follow `s` in the same run
 * @param {boolean=} attribute whether `s` is an attribute value, where a name without its `;` before `=` or an alphanumeric stays text (§13.2.5.73)
 * @returns {boolean} true when it has to be escaped
 */
const startsCharacterReference = (s, i, terminated, attribute) => {
	// Unterminated, the next sibling's first characters could complete the run
	// once a comment between them is dropped (`a &am` + `p;`) - the same reason
	// the source fast path keeps out. An attribute value ends at its delimiter.
	let end = i + 1;
	while (end < s.length) {
		const c = s.charCodeAt(end);
		if (!isAsciiAlphanumeric(c) && c !== 0x23) break;
		end++;
	}
	if (end === s.length && terminated !== true) return true;
	const next = s.charCodeAt(i + 1);
	// `#` opens a numeric reference.
	if (next === 0x23) return true;
	if (!isAsciiAlphanumeric(next)) return false;
	// The named-reference table holds the names with and without their `;`, so
	// any prefix hit is a reference the tokenizer would take.
	const longest = Math.min(s.length, i + 1 + MAX_ENTITY_NAME_LEN);
	let matched = -1;
	for (let j = i + 2; j <= longest; j++) {
		if (HTML_ENTITIES[s.slice(i + 1, j)] !== undefined) {
			if (attribute !== true) return true;
			matched = j;
		}
	}
	if (matched === -1) return false;
	if (s.charCodeAt(matched - 1) === CC_SEMICOLON) return true;
	const after = s.charCodeAt(matched);
	return after !== CC_EQUALS && !isAsciiAlphanumeric(after);
};

/**
 * Rebuild an opening tag from the node's name and attributes, for elements with
 * no matching source tag (adoption-agency clones, reconstructed formatting
 * elements, renamed tokens like `<image>`). Attribute values are raw
 * (undecoded), so they re-parse to the original decoded values.
 * @param {HtmlPath} path the accessor positioned on the element
 * @returns {string} serialized opening tag
 */
const synthesizeOpenTag = (path) => {
	const tagName = tagNameOf(path.node);
	let out = `<${tagName}`;
	// Looked up once for the tag, as the attribute loop does for a written one.
	const enumeratedOn =
		S._minifying && namespaceOf(path.node) === NS_HTML
			? ENUMERATED_KEYWORDS[tagName]
			: undefined;
	// Only an HTML element is ever without a source tag, and no attribute of one
	// is adjusted, so each is written by its own name.
	let bare = false;
	const attributes = attributeList(path.node);
	const count = attributes.length;
	// In the order a written tag takes, which is the order a second pass sees.
	const order =
		S._sortAttributes && count > 1 && !holdsForeignSyntax(path, count)
			? sortedAttributes(path, count)
			: null;
	for (let k = 0; k < count; k++) {
		const attribute = attributes[order === null ? k : order[k]];
		const name = attribute.name;
		// A name opening with `=` would be read as the bare name's value.
		if (bare && name.charCodeAt(0) === CC_EQUALS) out += '=""';
		bare = attribute.value === "";
		if (bare) {
			out += ` ${name}`;
			continue;
		}
		// Nothing was written here for this tag, so there is no source spelling to
		// beat: the shortest one wins outright.
		if (!S._minifying || !S._transforms.normalizeAttributeQuotes) {
			out += ` ${name}="${attribute.value.replace(/"/g, "&quot;")}"`;
			continue;
		}
		const value = rewriteAttributeValue(
			tagName,
			name,
			attribute.value,
			false,
			enumeratedOn
		);
		const decoded = decodeEntities(value, true);
		const literalOpeners = templateOpenerCount(value);
		S._escapeTemplateOpeners = templateOpenerCount(decoded) > literalOpeners;
		// Both kinds in one value: only the source spelling keeps each as it is.
		out +=
			S._escapeTemplateOpeners && literalOpeners !== 0
				? ` ${name}="${value.replace(/"/g, "&quot;")}"`
				: ` ${name}=${minimalAttributeValue(decoded)}`;
		S._escapeTemplateOpeners = false;
	}
	return `${out}>`;
};

/**
 * Whether an element's default display puts whitespace at its edge outside every
 * line box, so none of it renders.
 * @param {HtmlPath} path the accessor
 * @param {HtmlNodeRef} node node (0 = none)
 * @returns {boolean} true when it is a block-level HTML element
 */
const isBlockLevel = (path, node) =>
	node !== 0 &&
	path.type(node) === NodeType.Element &&
	namespaceOf(node) === NS_HTML &&
	BLOCK_LEVEL_ELEMENTS.has(tagNameOf(node));

/**
 * Whether a text node's leading whitespace sits outside every line box, which is
 * so when it opens a block container. A block *sibling* in front of it would do
 * the same, but reading backwards costs a scan of the whole child list - so this
 * only keeps a space that renders, never drops one that does not.
 * @param {HtmlPath} path the accessor
 * @param {HtmlNodeRef} node the text node
 * @param {HtmlNodeRef} parent its parent (0 = none)
 * @returns {boolean} true when the leading whitespace renders as nothing
 */
const startsOutsideLineBox = (path, node, parent) =>
	parent !== 0 &&
	S._firstChildren[parent] === node &&
	isBlockLevel(path, parent);

/**
 * Whether a text node's trailing whitespace sits outside every line box: it
 * closes a block container, or a block element follows it.
 * @param {HtmlPath} path the accessor
 * @param {HtmlNodeRef} node the text node
 * @param {HtmlNodeRef} parent its parent (0 = none)
 * @returns {boolean} true when the trailing whitespace renders as nothing
 */
const endsOutsideLineBox = (path, node, parent) => {
	const next = nextSibling(node);
	if (next === 0) return parent !== 0 && isBlockLevel(path, parent);
	return isBlockLevel(path, next);
};

/**
 * Whether a node prints nothing at all, so what follows it in the output is its
 * next sibling. The three that can: a comment the inert-comment rule drops, an
 * element `removeEmptyElements` drops, and a whitespace-only text node the
 * active `collapseWhitespace` tier deletes - the same questions the printer asks
 * when it reaches them, asked here so the §13.1.2.4 tests read the output.
 * @param {HtmlPath} path the accessor
 * @param {HtmlNodeRef} node the node
 * @returns {boolean} true when it contributes no output
 */
const printsNothing = (path, node) => {
	const type = path.type(node);
	if (type === NodeType.Comment) {
		return (
			S._minifying &&
			!keepComment(dataOf(node), path.source(node), startOf(node))
		);
	}
	if (type === NodeType.Element) {
		return isRemovableEmptyElement(path, node);
	}
	if (type !== NodeType.Text) return false;
	const data = dataOf(node);
	if (!isAllAsciiWhitespace(data)) return false;
	const parent = parentOf(node);
	if (parent === 0 || namespaceOf(parent) !== NS_HTML) return false;
	const parentName = tagNameOf(parent);
	// A literal-text body is data - its whitespace is printed as written.
	if (LITERAL_TEXT_PARENTS.has(parentName)) return false;
	// Outside any block formatting context, so nothing ever renders it - which is
	// a reason to drop it, not a claim that a re-serializing pass already did.
	// Body text to a reader with scripting off, it collapses as body text does.
	if (
		whitespaceInertUnder(parent) &&
		!(S._minifying && headLeftBefore(path, node, parent, parentName))
	) {
		return S._minifying;
	}
	if (
		S._collapseWhitespace === "none" ||
		S._collapseWhitespace === "conservative"
	) {
		return false;
	}
	for (let ancestor = parent; ancestor !== 0; ancestor = parentOf(ancestor)) {
		if (
			namespaceOf(ancestor) === NS_HTML &&
			LEADING_NEWLINE_ELEMENTS.has(tagNameOf(ancestor))
		) {
			return false;
		}
	}
	// Whitespace-only, so it collapses to one space; either edge going empties it.
	return (
		S._collapseWhitespace === "all" ||
		startsOutsideLineBox(path, node, parent) ||
		endsOutsideLineBox(path, node, parent)
	);
};

/**
 * Whether whitespace directly under `parent` is outside any block formatting
 * context: under `<head>`, or under `<html>` - but not the `<html>` a fragment
 * parse roots its nodes in, which stand where the context element's would.
 * @param {HtmlNodeRef} parent an element
 * @returns {boolean} true when nothing renders whitespace there
 */
const whitespaceInertUnder = (parent) => {
	if (namespaceOf(parent) !== NS_HTML) return false;
	const name = tagNameOf(parent);
	return name === "head" || (name === "html" && S._fragment === 0);
};

// An end tag naming `noscript`, or text spelling one: a false match costs a reparse.
const NOSCRIPT_END_TAG_REGEXP = /<\/noscript[\t\n\f\r />]/gi;
const NOSCRIPT_START_TAG_REGEXP = /<noscript/i;

/**
 * Whether the source writes more `</noscript>` end tags than the tree closed a
 * `noscript` with: one it ignored can still close a `noscript` with scripting off.
 * @param {string} input the source
 * @returns {boolean} true when a reader with scripting off may read the print apart
 */
const noscriptEndIgnored = (input) => {
	const ends = input.match(NOSCRIPT_END_TAG_REGEXP);
	if (ends === null) return false;
	let closed = 0;
	for (let n = 1; n <= S._nodeCount; n++) {
		if (
			S._types[n] === NodeType.Element &&
			tagNameOf(n) === "noscript" &&
			endTagStart(n) !== -1
		) {
			closed++;
		}
	}
	return ends.length > closed;
};

/**
 * Whether a `noscript` read as text holds a `<`: with scripting off that text is
 * markup, and a comment, quote or raw-text element left open in it runs past
 * the end tag where the print may spell what follows differently.
 * @returns {boolean} true when a reader with scripting off may read the print apart
 */
const noscriptHoldsMarkup = () => {
	const tree = S;
	// An HTML tree holds a `noscript` only where the source spells its start tag
	// or as a fragment's context; in XML an entity's replacement text can spell one.
	if (
		!tree._xmlMode &&
		tree._fragment === 0 &&
		!NOSCRIPT_START_TAG_REGEXP.test(tree._input)
	) {
		return false;
	}
	const types = tree._types;
	const strings = tree._strings;
	const element = NodeType.Element;
	for (let n = 1; n <= tree._nodeCount; n++) {
		if (types[n] !== element || strings[n] !== "noscript") continue;
		for (let c = firstChild(n); c !== 0; c = nextSibling(c)) {
			if (types[c] === NodeType.Text && dataOf(c).includes("<")) {
				return true;
			}
		}
	}
	return false;
};

// One piece of a `noscript` body as the in-head-noscript mode reads it:
// whitespace, a comment closed where the tokenizer closes one (never an abrupt
// `<!-->` / `<!--->`), or a start tag, whose name is captured.
const HEAD_NOSCRIPT_PIECE_REGEXP =
	/[\t\n\f\r ]+|<!--(?!-?>)[\s\S]*?--!?>|<([a-z][^\t\n\f\r />]*)(?:[\t\n\f\r /][^>]*)?>/giy;

/**
 * Whether a reader with scripting off keeps all of a `noscript` body in the head:
 * whitespace, comments and the void elements its mode passes through, nothing else.
 * @param {string} body the body as written
 * @returns {boolean} true when that reader never leaves the head for it
 */
const staysInHead = (body) => {
	HEAD_NOSCRIPT_PIECE_REGEXP.lastIndex = 0;
	while (HEAD_NOSCRIPT_PIECE_REGEXP.lastIndex < body.length) {
		const piece = HEAD_NOSCRIPT_PIECE_REGEXP.exec(body);
		if (piece === null) return false;
		const name = piece[1];
		if (name === undefined) continue;
		const lowered = name.toLowerCase();
		if (
			!IN_HEAD_NOSCRIPT_PASSTHROUGH.has(lowered) ||
			!HEAD_VOID_ELEMENTS.has(lowered)
		) {
			return false;
		}
	}
	return true;
};

/**
 * Whether a reader with scripting off has left the head before `node`, at a
 * `noscript` holding what the head cannot, and so reads its whitespace as body text.
 * @param {HtmlPath} path the accessor
 * @param {HtmlNodeRef} node a whitespace-only text node
 * @param {HtmlNodeRef} parent its parent, the `head` or the `html` element
 * @param {string} parentName the parent's tag name
 * @returns {boolean} true when that reader has the whitespace in the body
 */
const headLeftBefore = (path, node, parent, parentName) => {
	// Under `<html>` the whitespace stands after the whole head, so all of it counts.
	const inHead = parentName === "head";
	for (
		let child = firstChild(inHead ? parent : S.head);
		child !== 0 && child !== (inHead ? node : 0);
		child = nextSibling(child)
	) {
		if (
			path.type(child) === NodeType.Element &&
			namespaceOf(child) === NS_HTML &&
			tagNameOf(child) === "noscript"
		) {
			const content = firstChild(child);
			if (content !== 0 && !staysInHead(dataOf(content))) return true;
		}
	}
	return false;
};

/**
 * The next sibling that prints something, skipping the ones that print nothing.
 * @param {HtmlPath} path the accessor
 * @param {HtmlNodeRef} node the node to start after
 * @returns {HtmlNodeRef} that sibling, or 0
 */
const nextPrintedSibling = (path, node) => {
	let next = nextSibling(node);
	while (next !== 0 && printsNothing(path, next)) {
		next = nextSibling(next);
	}
	return next;
};

// The elements whose start tag closes the one before it only inside a `ruby`.
const RUBY_SEGMENTS = new Set(["rb", "rp", "rt", "rtc"]);

/**
 * Whether an HTML `target` element is in scope above `node`. A `<rt>` start tag
 * only closes the one before it inside a `ruby`, and an `<optgroup>` only inside
 * a `select` (§13.2.6.4.7); without it an omitted end tag nests the next one.
 * @param {HtmlPath} path the accessor
 * @param {HtmlNodeRef} node the element
 * @param {string} target the tag name to look for
 * @returns {boolean} true when a `target` encloses it
 */
const hasInScope = (path, node, target) => {
	for (
		let parent = parentOf(node);
		parent !== 0 && path.type(parent) === NodeType.Element;
		parent = parentOf(parent)
	) {
		if (namespaceOf(parent) !== NS_HTML) return false;
		const name = tagNameOf(parent);
		if (name === target) return true;
		if (HTML_SCOPE.has(name)) return false;
	}
	return false;
};

// The list items whose closing start tag stops at a special element other than
// a `p` left open inside them (§13.2.6.4.7), instead of closing it.
const LIST_ITEMS = new Set(["dd", "dt", "li"]);

/**
 * Whether the start tag that closes `parent` in place of its end tag leaves
 * its open last child named `name` open: a list item's stops at a special one,
 * and outside a `select` an `<option>`'s closes only an option open last.
 * @param {HtmlPath} path the accessor
 * @param {string} name the child's lowercased tag name
 * @param {HtmlNodeRef} parent the parent element
 * @param {string} parentName the parent's lowercased tag name
 * @returns {boolean} true when the child has to keep its end tag
 */
const followerLeavesOpen = (path, name, parent, parentName) => {
	if (LIST_ITEMS.has(parentName)) {
		if (name === "p" || !SPECIAL.has(name)) return false;
	} else if (parentName !== "option" || hasInScope(path, parent, "select")) {
		return false;
	}
	return (
		nextPrintedSibling(path, parent) !== 0 &&
		canOmitEndTag(path, parentName, parent)
	);
};

/**
 * Whether an element's end tag may be omitted (§13.1.2.4). Reads what will be
 * printed rather than the tree: a comment minifying drops, and whitespace the
 * collapse tier deletes, are not content the tag has to stay for.
 * @param {HtmlPath} path the accessor positioned on the element
 * @param {string} name the element's lowercased tag name
 * @param {HtmlNodeRef} node the element
 * @returns {boolean} true when the end tag can be left out
 */
const canOmitEndTag = (path, name, node) => {
	if (namespaceOf(node) !== NS_HTML) return false;
	if (name === "html" || name === "head" || name === "body") {
		return S._removeImpliedTags !== "none" && canOmitShellEnd(path, name, node);
	}
	if (!S._transforms.removeOptionalTags) return false;
	if (OPTIONAL_END_TAG_UNLESS_TRAILING_NODE.has(name)) {
		// Whitespace or a comment behind it would move inside once the tag goes;
		// an element closes it through the insertion mode instead.
		const trailing = nextPrintedSibling(path, node);
		if (trailing === 0) {
			return !(name === "caption" && closedByTemplateEnd(path, node));
		}
		if (path.type(trailing) !== NodeType.Element) return false;
		// "In caption" only ends the caption at a table part: anything else, a
		// `<script>` beside it among them, goes to the body rules inside it.
		if (name === "caption") {
			return (
				namespaceOf(trailing) === NS_HTML &&
				CAPTION_TABLE_STARTS.has(tagNameOf(trailing))
			);
		}
		// A `<template>` does not close what it stands behind: §13.2.6.4.12 hands it
		// to the head rules, which insert it where it is.
		return !(
			namespaceOf(trailing) === NS_HTML && tagNameOf(trailing) === "template"
		);
	}
	const followers = OPTIONAL_END_TAG_FOLLOWERS.get(name);
	if (followers === undefined) return false;
	const next = nextPrintedSibling(path, node);
	if (next === 0) {
		if (!OPTIONAL_END_TAG_AT_END.has(name)) return false;
		const parent = parentOf(node);
		const parentIsHtml = parent !== 0 && namespaceOf(parent) === NS_HTML;
		// Left open inside a formatting element, this is the furthest block the
		// adoption agency needs - the parent's end tag would then restructure both.
		if (
			parentIsHtml &&
			SPECIAL.has(name) &&
			FORMATTING.has(tagNameOf(parent))
		) {
			return false;
		}
		if (!parentIsHtml) return false;
		// A `<template>`'s content is a fragment, not an element, and `</template>`
		// closes what is open inside it, but a cell's own marker would be left over.
		if (path.type(parent) !== NodeType.Element) {
			return name !== "td" && name !== "th";
		}
		const parentName = tagNameOf(parent);
		// The parent's end tag closes the innermost element of its name, this one.
		if (parentName === name) return false;
		if (followerLeavesOpen(path, name, parent, parentName)) return false;
		// "Any other end tag" walks past a node that is not special, so a parent's
		// end tag closes one of those whatever the parent is.
		if (!SPECIAL.has(name)) return true;
		// A special one blocks that walk instead, so only a parent whose end tag
		// generates implied end tags closes it. Under any other - `<canvas>`, a
		// custom element - it stays open and swallows what follows the parent.
		return P_ENDS_ON_PARENT_END_TAG.has(parentName);
	}
	if (
		path.type(next) !== NodeType.Element ||
		namespaceOf(next) !== NS_HTML ||
		!followers.has(tagNameOf(next))
	) {
		return false;
	}
	// A `<table>` start tag closes an open `p` only outside quirks mode - the
	// one follower whose reading the document mode decides.
	if (S._quirks && name === "p" && tagNameOf(next) === "table") return false;
	// Outside a `ruby` the follower's start tag closes nothing, so this one would
	// go on to hold it.
	if (RUBY_SEGMENTS.has(name) && !hasInScope(path, node, "ruby")) return false;
	if (name === "optgroup" && !hasInScope(path, node, "select")) return false;
	// A parser-implied `<tbody>` / `<tr>` is printed transparently, so there is
	// no start tag to close this element - its rows would continue this one.
	return (
		hasSourceTag(next) ||
		attributeCountOf(next) !== 0 ||
		!TRANSPARENT_IMPLIED_ELEMENTS.has(tagNameOf(next))
	);
};

/**
 * Whether only `</template>` would close this element: it is last in a
 * template's content. `</template>` then clears the formatting list back to one
 * marker, so the marker a cell or caption pushed is the one taken.
 * @param {HtmlPath} path the accessor
 * @param {HtmlNodeRef} node the element
 * @returns {boolean} true when the element sits directly in template content
 */
const closedByTemplateEnd = (path, node) => {
	const parent = parentOf(node);
	return parent !== 0 && path.type(parent) !== NodeType.Element;
};

/**
 * The last sibling before `node` that prints something, or 0 - the accessor only
 * walks forward, so this walks the chain. Skipping what prints nothing is what
 * keeps it the mirror of `nextPrintedSibling`: the two decide whether one of
 * `</thead>` and a `<tbody>` start tag may go, and reading a dropped whitespace
 * node from one side only would let both go and merge the rows into the head.
 * @param {HtmlPath} path the accessor
 * @param {HtmlNodeRef} node the element
 * @returns {HtmlNodeRef} the preceding printed sibling, or 0
 */
const previousPrintedSibling = (path, node) => {
	let previous = 0;
	for (
		let c = firstChild(parentOf(node));
		c !== 0 && c !== node;
		c = nextSibling(c)
	) {
		if (!printsNothing(path, c)) previous = c;
	}
	return previous;
};

/**
 * Whether an element is shaped like one the parser would re-imply: no attributes
 * to carry, and `child` opening it. Anything before that child (whitespace, a
 * comment) would land outside the implied element, so it blocks the omission.
 * @param {HtmlPath} path the accessor
 * @param {HtmlNodeRef} node the element
 * @param {string} child the tag name the implied element must start with
 * @returns {boolean} true when the shape allows dropping the start tag
 */
const impliedStartTagShape = (path, node, child) => {
	if (attributeCountOf(node) !== 0 || namespaceOf(node) !== NS_HTML) {
		return false;
	}
	// What will print, not what the tree holds: a comment minifying drops is not
	// content the tag has to stay for, the same way the end tags read it.
	let first = firstChild(node);
	while (first !== 0 && printsNothing(path, first)) {
		first = nextSibling(first);
	}
	if (
		first === 0 ||
		path.type(first) !== NodeType.Element ||
		namespaceOf(first) !== NS_HTML ||
		tagNameOf(first) !== child
	) {
		return false;
	}
	// Only "in table" implies the group: a `<template>`'s content takes the
	// `<tr>` / `<col>` as it stands, with nothing around it. A fragment's root
	// stands for its context element.
	const parent = parentOf(node);
	const table =
		S._fragment !== 0 && S._types[S._parents[parent]] === NodeType.Document
			? S._fragment
			: parent;
	return (
		path.type(table) === NodeType.Element &&
		namespaceOf(table) === NS_HTML &&
		tagNameOf(table) === "table"
	);
};

/**
 * Whether a `<tbody>` start tag may be omitted (§13.1.2.4): the parser re-implies
 * it when a `<tr>` opens a table section, but only if no earlier section ran into
 * it - a preceding `tbody` / `thead` / `tfoot` that also dropped its end tag would
 * swallow these rows instead.
 * @param {HtmlPath} path the accessor positioned on the element
 * @param {HtmlNodeRef} node the element
 * @returns {boolean} true when the start tag can be left out
 */
const canOmitTbodyStart = (path, node) => {
	if (!impliedStartTagShape(path, node, "tr")) return false;
	const previous = previousPrintedSibling(path, node);
	if (previous === 0 || path.type(previous) !== NodeType.Element) return true;
	const previousName = tagNameOf(previous);
	if (
		previousName !== "tbody" &&
		previousName !== "thead" &&
		previousName !== "tfoot"
	) {
		return true;
	}
	return !canOmitEndTag(path, previousName, previous);
};

/**
 * Whether a `<colgroup>` start tag may be omitted (§13.1.2.4): a `<col>` in a
 * table implies one, but only when the `<col>` is the first thing inside and no
 * preceding `<colgroup>` dropped its end tag - that one would take these columns.
 * @param {HtmlPath} path the accessor positioned on the element
 * @param {HtmlNodeRef} node the element
 * @returns {boolean} true when the start tag can be left out
 */
const canOmitColgroupStart = (path, node) => {
	if (!impliedStartTagShape(path, node, "col")) return false;
	const previous = previousPrintedSibling(path, node);
	if (
		previous === 0 ||
		path.type(previous) !== NodeType.Element ||
		tagNameOf(previous) !== "colgroup"
	) {
		return true;
	}
	return !canOmitEndTag(path, "colgroup", previous);
};

// Every rewrite on, which is what a print with no `transforms` option makes and
// what the walk-only passes hold. Frozen, since it is shared rather than copied.
/** @type {Required<HtmlTransformOptions>} */
const ALL_TRANSFORMS = Object.freeze({
	collapseBooleanAttributes: true,
	comments: "some",
	normalizeAttributeQuotes: true,
	normalizeEnumeratedAttributes: true,
	normalizeListAttributes: true,
	normalizeNumericAttributes: true,
	normalizeUrlAttributes: true,
	removeOptionalTags: true
});

/**
 * The rewrites this print makes, resolved once: each name is what the options
 * set it to, and what `ALL_TRANSFORMS` gives it where they set nothing - so no
 * read of the result asks whether the option was given. `comments` keeps
 * whatever it was given, which is still falsy only when it is `false`.
 *
 * Always a copy, and always made the one way: spreading the table and then
 * writing over a name it already has leaves the object's shape alone, so every
 * read of the result - and there is one per token - sees a single hidden class.
 * Handing the frozen table itself back where nothing is set would save this
 * object and cost each of those reads a second shape, `Object.freeze` giving a
 * frozen object a map of its own.
 * @param {HtmlTransformOptions | undefined} options the `transforms` option
 * @returns {Required<HtmlTransformOptions>} every rewrite resolved
 */
const transformsFrom = (options) => {
	/** @type {Required<HtmlTransformOptions>} */
	const out = { ...ALL_TRANSFORMS };
	if (options !== undefined) {
		for (const name of Object.keys(ALL_TRANSFORMS)) {
			const value = options[/** @type {keyof HtmlTransformOptions} */ (name)];
			if (value !== undefined) {
				/** @type {{ [name: string]: HtmlTransformOptions[keyof HtmlTransformOptions] }} */ (
					out
				)[name] = value;
			}
		}
	}
	return out;
};

// The same table, as a copy, for the reason `transformsFrom` always makes one.
/** @type {Required<HtmlTransformOptions>} */
const DEFAULT_TRANSFORMS = transformsFrom(undefined);

/**
 * The `comments` option resolved to what it means per comment: `true` every
 * one, `false` none, `"some"` the ones that carry something, or a predicate
 * over the comment's own text - which is what a pattern compiles to here, so no
 * print re-reads one per comment. A pattern is matched from the start each
 * time, since a `g` flag would otherwise carry an index between comments.
 * @param {Required<HtmlTransformOptions>["comments"]} comments the option
 * @returns {boolean | "some" | ((comment: string, line: number, column: number) => boolean)} what it keeps
 */
const keptComments = (comments) => {
	if (comments === "all") return true;
	if (typeof comments === "boolean" || comments === "some") return comments;
	if (typeof comments === "function") return comments;
	const pattern =
		typeof comments === "string" ? new RegExp(comments) : comments;
	return (comment) => {
		pattern.lastIndex = 0;
		return pattern.test(comment);
	};
};

/**
 * The per-transform switches out of a wider options object - what
 * `optimization.minimize.html` names beside the transforms that are off until
 * asked for. Exported so the minify function the minimizer plugin ships to its
 * workers can pick them without repeating the names.
 * @param {HtmlTransformOptions} options an options object that may carry them
 * @returns {HtmlTransformOptions | undefined} the switches, or undefined when none is set
 */
const pickTransforms = (options) => {
	/** @type {HtmlTransformOptions | undefined} */
	let out;
	for (const name of Object.keys(ALL_TRANSFORMS)) {
		const value = options[/** @type {keyof HtmlTransformOptions} */ (name)];
		if (value === undefined) continue;
		if (out === undefined) out = {};
		/** @type {{ [name: string]: HtmlTransformOptions[keyof HtmlTransformOptions] }} */ (
			out
		)[name] = value;
	}
	return out;
};

// Whether an `<iframe srcdoc>` is among what is deferred. A caller minifying
// them itself keeps the attribute on the normal path, which re-quotes it to
// whichever delimiter its content makes shorter.
/**
 * One value, written with whichever delimiter it needs fewer escapes inside - a
 * minified document is mostly `"`, so a value holding a `"` is shorter quoted
 * with `'`. Where neither costs anything the source's own delimiter is kept.
 * @param {string} value the value to write
 * @param {string} source the delimiter the source spelled it with, if any
 * @returns {string} the value, delimiters and all
 */
const quoteDecodedValue = (value, source) => {
	const double = value.includes('"');
	const single = value.includes("'");
	const quote =
		double !== single ? (double ? 39 : 34) : source === "'" ? 39 : 34;
	const delimiter = String.fromCharCode(quote);

	return `${delimiter}${escapeAttribute(value, quote, true)}${delimiter}`;
};

/**
 * One attribute, written with the delimiter `quoteDecodedValue` picks for its
 * value.
 * @param {string} name the attribute name
 * @param {string} value the value to write
 * @param {string} source the delimiter the source spelled it with, if any
 * @returns {string} the attribute, delimiter and all
 */
const writeQuotedAttribute = (name, value, source) =>
	` ${name}=${quoteDecodedValue(value, source)}`;

/**
 * Hand one nested body to the caller's renderer. Anything it throws is a
 * renderer that did not answer: a document must not fail to serialize because
 * something inside it did not parse.
 * @param {string} source the nested body
 * @param {string} type its language, e.g. `"css"` / `"javascript"` / `"svg"`
 * @param {string=} as which production of that language it is, for one with more than one
 * @returns {string | null} the rendered body, or null when there is no renderer or it declined
 */
const renderEmbeddedOrNull = (source, type, as) => {
	if (S._markedCharsets.length !== 0 && source.includes("\u0000")) {
		CHARSET_MARK_REGEXP.lastIndex = 0;
		if (nextCharsetMark(source) !== null) {
			return renderMarked(source, type, as);
		}
	}
	return renderOnce(source, type, as);
};

/**
 * Render a body holding `minifyOpenTag`'s marks, which would reach the renderer
 * as text: its dropped and kept spellings each render, and where the two answers
 * differ is marked again, for `emitMarked` to hold as it holds a tag.
 * @param {string} source the nested body, its marks in it
 * @param {string} type its language
 * @param {string=} as which production of that language it is
 * @returns {string | null} the rendered body, marked, or null when a spelling did not render
 */
const renderMarked = (source, type, as) => {
	const dropped = renderOnce(expandCharsetMarks(source, 0), type, as);
	const kept = renderOnce(expandCharsetMarks(source, 1), type, as);
	if (dropped === null || kept === null) return null;
	const start = sharedStart(dropped, kept);
	const end = sharedEnd(dropped, kept, start);
	const id = S._markedCharsets.length;
	S._markedCharsets.push(
		dropped.slice(start, dropped.length - end),
		kept.slice(start, kept.length - end)
	);
	return `${dropped.slice(0, start)}${charsetMark(id)}${dropped.slice(
		dropped.length - end
	)}`;
};

/**
 * `renderEmbeddedOrNull` for a body holding no mark.
 * @param {string} source the nested body
 * @param {string} type its language, e.g. `"css"` / `"javascript"` / `"svg"`
 * @param {string=} as which production of that language it is, for one with more than one
 * @returns {string | null} the rendered body, or null when there is no renderer or it declined
 */
const renderOnce = (source, type, as) => {
	if (
		S._embeddedAnswers === undefined &&
		S._renderEmbeddedSource === undefined
	) {
		return null;
	}
	const info =
		as === undefined
			? { type, hostType: HTML_TYPE }
			: { type, hostType: HTML_TYPE, as };
	if (S._embeddedAnswers !== undefined) {
		const answer = S._embeddedAnswers({ ...info, source });
		return typeof answer === "string" ? answer : null;
	}
	try {
		const rendered =
			/** @type {EmbeddedSourceRenderer} */
			(S._renderEmbeddedSource)(source, info);
		// Anything but text is a renderer that did not answer, not a body to write.
		return typeof rendered === "string" ? rendered : null;
	} catch (_err) {
		return null;
	}
};

/**
 * Record one nested body for a caller that answers asynchronously and print the
 * marker standing in for it. `onDeclined` spells what an untapped run spells,
 * so declining costs nothing the built-ins would have done.
 * @param {string} source the nested body
 * @param {string} type its language, e.g. `"css"` / `"javascript"` / `"svg"`
 * @param {(rendered: string | undefined) => string} build the text to print once the answer is in
 * @param {string=} as which production of that language it is, for one with more than one
 * @param {((rendered: string | undefined) => boolean)=} decides whether an answer overturns a choice this print made without it
 * @returns {string} the marker to print
 */
const deferEmbedded = (source, type, build, as, decides) => {
	const holes = /** @type {DeferredEmbeddedSource[]} */ (
		S._deferEmbeddedSource
	);
	const id = holes.length;

	holes.push({
		type,
		hostType: HTML_TYPE,
		source,
		build,
		...(as === undefined ? undefined : { as }),
		...(decides === undefined ? undefined : { decides })
	});

	return deferredWrite(id);
};

/**
 * Whether this element is the outermost `<svg>` of an SVG subtree - the whole
 * of which is offered to the renderer, so a nested one is part of its parent's.
 * @param {HtmlPath} path the accessor positioned on the element
 * @returns {boolean} true for an SVG root
 */
const isSvgRoot = (path) => {
	if (tagNameOf(path.node) !== "svg" || namespaceOf(path.node) !== NS_SVG) {
		return false;
	}
	const parent = parentOf(path.node);
	return parent === 0 || namespaceOf(parent) !== NS_SVG;
};

/**
 * Whether the `<html>` / `<head>` / `<body>` start tag §13.1.2.4 lets the parser
 * imply may be left out. A comment minification keeps, whitespace, or an element
 * the parser still reads as head content would move above the tag once it goes;
 * a comment it drops is gone from the output, so it is skipped over.
 * @param {HtmlPath} path the accessor
 * @param {string} name the element's lowercased tag name
 * @param {HtmlNodeRef} node the element
 * @returns {boolean} true when the start tag can be dropped
 */
const canOmitShellStart = (path, name, node) => {
	// An `<html>` in foreign content is an element like any other.
	if (
		(name !== "html" && name !== "head" && name !== "body") ||
		namespaceOf(node) !== NS_HTML
	) {
		return false;
	}
	if (attributeCountOf(node) !== 0) return false;
	let first = firstChild(node);
	while (first !== 0 && printsNothing(path, first)) {
		first = nextSibling(first);
	}
	if (first === 0) return name === "html" || S._removeImpliedTags === "all";
	const type = path.type(first);
	// A `<?...>` is a bogus comment to HTML, placed the same way a comment is.
	if (type === NodeType.Comment || type === NodeType.ProcessingInstruction) {
		return false;
	}
	if (name === "html") return true;
	if (S._removeImpliedTags !== "all") return false;
	if (name === "head") return type === NodeType.Element;
	// Whitespace `"all"` drops is not whitespace the tag has to stay for; any
	// lesser tier keeps it, and without the tag the parser drops it on the way in.
	// Text holding a `<` prints as written, its whitespace included.
	if (type === NodeType.Text) {
		const data = dataOf(first);
		return (
			!startsWithAsciiWhitespace(data) ||
			(S._collapseWhitespace === "all" && !data.includes("<"))
		);
	}
	// §13.2.6.4.6 hands every head element "after head" meets to the head, not
	// only the ones §13.1.2.4 names.
	const firstName = tagNameOf(first);
	return (
		!BODY_START_KEPT_BEFORE.has(firstName) && !HEAD_ELEMENTS.has(firstName)
	);
};

/**
 * Whether `</html>` / `</head>` / `</body>` can be left out without the parser
 * handing what follows to the element it closed: §4.13 lets an `html` or `body`
 * end tag go when a comment does not follow it, and a `head` one when neither a
 * comment nor whitespace does.
 * @param {HtmlPath} path the accessor
 * @param {string} name the element's lowercased tag name
 * @param {HtmlNodeRef} node the element
 * @returns {boolean} true when nothing behind the tag would move inside
 */
const shellEndTagOmittable = (path, name, node) => {
	let next = nextSibling(node);
	while (next !== 0 && printsNothing(path, next)) {
		next = nextSibling(next);
	}
	if (next === 0) return true;
	const type = path.type(next);
	if (type === NodeType.Comment || type === NodeType.ProcessingInstruction) {
		return false;
	}
	return (
		name !== "head" ||
		type !== NodeType.Text ||
		!startsWithAsciiWhitespace(dataOf(next))
	);
};

/**
 * The same, for the end tag - `"all"` only: `"smart"` prints the end tag of each
 * shell element whose start tag it prints, and every end tag the source spelled,
 * `</html>` included, because a reader checking a page downloaded whole looks for
 * it. A comment behind the tag would move inside the element it closed, and
 * whitespace behind `</head>` into `<body>`.
 * @param {HtmlPath} path the accessor
 * @param {string} name the element's lowercased tag name
 * @param {HtmlNodeRef} node the element
 * @returns {boolean} true when the end tag can be dropped
 */
const canOmitShellEnd = (path, name, node) =>
	S._removeImpliedTags === "all" && shellEndTagOmittable(path, name, node);

/**
 * The end tag a transparent implied element still prints: the parser re-implies
 * the start tag behind it, never the end tag, and outside `"all"` a shell tag
 * the source spelled stays - `</html>` is what a truncation check looks for.
 * @param {HtmlPath} path the accessor
 * @param {string} name the element's lowercased tag name
 * @param {HtmlNodeRef} node the element
 * @returns {string} the end tag, or `""` when nothing needs it
 */
const impliedCloseTag = (path, name, node) => {
	if (endTagReadsAsText(node)) return "";
	if (!SHELL_ELEMENTS.has(name)) {
		return canOmitEndTag(path, name, node) ? "" : `</${name}>`;
	}
	const spelled =
		name === "html"
			? SHELL_END_HTML
			: name === "head"
				? SHELL_END_HEAD
				: SHELL_END_BODY;
	return (S._sourceShellEnds & spelled) === 0 || S._removeImpliedTags === "all"
		? shellEndTagOmittable(path, name, node)
			? ""
			: `</${name}>`
		: `</${name}>`;
};

/**
 * Whether a parser-inserted table group has to print a start tag the source
 * never spelled. With `removeOptionalTags` off its end tag prints, and a
 * `</tbody>` with no `<tbody>` is not the document that was parsed.
 * @param {HtmlPath} path the accessor positioned on the element
 * @param {string} name its lowercased tag name
 * @param {HtmlNodeRef} node the element
 * @returns {boolean} true when the start tag has to be materialized
 */
const impliedTableGroupStartNeeded = (path, name, node) => {
	if (!S._transforms.removeOptionalTags) {
		return name === "tbody" || name === "colgroup";
	}
	// §4.13 lets the start tag go only when the group before it kept its end
	// tag, or that one would take these columns over.
	return name === "colgroup" && !canOmitColgroupStart(path, node);
};

/**
 * Whether an element's start tag may be left out: one the parser re-implies, or
 * a shell tag the option lets go. A shell element the source never spelled falls
 * through to the transparent-implied path, which already prints nothing for it.
 * @param {HtmlPath} path the accessor positioned on the element
 * @param {string} name its lowercased tag name
 * @param {HtmlNodeRef} node the element
 * @param {string} open what its start tag printed as, `""` when the source
 * spelled none
 * @returns {boolean} true when the start tag can be dropped
 */
const canOmitStartTag = (path, name, node, open) => {
	if (name === "tbody") {
		return S._transforms.removeOptionalTags && canOmitTbodyStart(path, node);
	}
	if (name === "colgroup") {
		return S._transforms.removeOptionalTags && canOmitColgroupStart(path, node);
	}
	return (
		open !== "" &&
		S._removeImpliedTags !== "none" &&
		canOmitShellStart(path, name, node)
	);
};

// The throwaway rule a `style` attribute's declaration list is minified inside.
// Its selector is only written and read back here, so it is the shortest one
// the printer cannot rewrite, and both halves are named from one place.

/**
 * How one attribute is written out, and whether it leaves the tag ending in an
 * unquoted value - the shortest of the minimal reference spelling, the value
 * bare, and the value quoted. `null` when none of them beats the source.
 * @param {string} attributeName the attribute's name
 * @param {string} value its rewritten value
 * @param {string} rawValue its value as the source spelled it
 * @param {string | null} decoded the value decoded, for one carrying character references, or null
 * @param {boolean} quoted whether the source spelled the value with a delimiter, which is two characters this has to beat
 * @param {string} delimiter the delimiter the source spelled it with, if any
 * @returns {{ text: string, unquotedTail: boolean } | null} what to emit, or null to leave the source alone
 */
const writeAttribute = (
	attributeName,
	value,
	rawValue,
	decoded,
	quoted,
	delimiter
) => {
	// `normalizeAttributeQuotes` holds back the delimiters, not the spelling
	// inside them, so a frozen value keeps the delimiter the source chose.
	const frozen = !S._transforms.normalizeAttributeQuotes;
	const minimal =
		decoded === null
			? null
			: frozen
				? quoteDecodedValue(decoded, delimiter)
				: minimalAttributeValue(decoded);
	const unquotable = !frozen && canUnquoteAttributeValue(value);

	if (
		minimal !== null &&
		minimal.length <
			(unquotable ? value.length : rawValue.length + (quoted ? 2 : 0))
	) {
		const opened = minimal.charCodeAt(0);

		return {
			text: ` ${attributeName}=${minimal}`,
			unquotedTail: opened !== CC_QUOTATION_MARK && opened !== CC_APOSTROPHE
		};
	}

	if (unquotable) {
		return { text: ` ${attributeName}=${value}`, unquotedTail: true };
	}

	if (value !== rawValue) {
		const quotedValue = frozen
			? quoteDecodedValue(value, delimiter)
			: quoteAttributeValue(value);

		if (quotedValue !== null) {
			return { text: ` ${attributeName}=${quotedValue}`, unquotedTail: false };
		}
	}

	return null;
};

/**
 * Write a `style` list the CSS minifier changed, at its shortest spelling. It is
 * written even where the source spells shorter, since a lowered list says more.
 * @param {string} attributeName the attribute's name
 * @param {string} list the minified declaration list
 * @param {string} delimiter the delimiter the source spelled it with, if any
 * @returns {{ text: string, unquotedTail: boolean }} what to emit
 */
const writeStyleList = (attributeName, list, delimiter) => {
	// Read when written, as `writeAttribute` reads it.
	const value = S._transforms.normalizeAttributeQuotes
		? minimalAttributeValue(list)
		: quoteDecodedValue(list, delimiter);
	const opened = value.charCodeAt(0);
	return {
		text: ` ${attributeName}=${value}`,
		unquotedTail: opened !== CC_QUOTATION_MARK && opened !== CC_APOSTROPHE
	};
};

/**
 * Offer a `style` attribute's declaration list to the renderer as the
 * block-contents production it is, which gives it the merges a rule's block
 * gets. The deferring path offers it at the attribute instead, where the shape
 * an answer has to land in is known.
 * @param {string} raw raw (undecoded) attribute value
 * @returns {string} the rendered declarations, or the value as written
 */
const minifyStyleAttribute = (raw) => {
	if (!rendersNow() || raw.trim() === "") return raw;
	const rendered = renderEmbeddedOrNull(raw, CSS_TYPE, BLOCK_CONTENTS);
	return rendered === null ? raw : rendered;
};

/**
 * Infra's strip leading and trailing ASCII whitespace: `String#trim` also eats
 * NBSP and the other Unicode spaces, which HTML's grammars read as characters.
 * @param {string} value the value
 * @returns {string} the trimmed value
 */
const stripAsciiWhitespace = (value) => {
	let start = 0;
	let end = value.length;
	while (start < end && isAsciiWhitespace(value.charCodeAt(start))) start++;
	while (end > start && isAsciiWhitespace(value.charCodeAt(end - 1))) end--;
	return start === 0 && end === value.length ? value : value.slice(start, end);
};

/**
 * Normalize a `<meta name=viewport>` content list: its grammar ignores the
 * whitespace around the `,` / `;` / `=` separators, so dropping that keeps every
 * pair intact.
 * @param {string} raw raw (undecoded) attribute value
 * @returns {string} the normalized list
 */
const normalizeViewport = (raw) =>
	stripAsciiWhitespace(raw)
		.replace(/[\t\n\f\r ]*([,;=])[\t\n\f\r ]*/g, "$1")
		.replace(/[\t\n\f\r ]+/g, " ");

/**
 * Wrap a rewritten attribute value in the shortest quote it admits, or null when
 * it carries both kinds and the source spelling has to stand.
 * @param {string} value the value
 * @returns {string | null} the quoted value, or null
 */
const quoteAttributeValue = (value) => {
	if (!value.includes('"')) return `"${value}"`;
	if (!value.includes("'")) return `'${value}'`;
	return null;
};

/**
 * The shortest way to write a decoded value: bare where the grammar allows it,
 * else under whichever quote costs less. `<`, `>` and the quote that is not the
 * delimiter carry no meaning inside a quoted value, so `alt="say &quot;hi&quot;"`
 * is `alt='say "hi"'` and `title="&lt;b&gt;"` is `title="<b>"`.
 * @param {string} value the decoded attribute value
 * @returns {string} the value as written, delimiters included
 */
const minimalAttributeValue = (value) => {
	const underDouble = escapeAttribute(value, CC_QUOTATION_MARK, true);
	// The two escapes part only at a quote, so a value without one escapes once.
	const underSingle =
		value.includes('"') || value.includes("'")
			? escapeAttribute(value, CC_APOSTROPHE, true)
			: underDouble;
	let best = `"${underDouble}"`;
	if (underSingle.length + 2 < best.length) best = `'${underSingle}'`;
	// A bare value costs no delimiters, so it wins whenever it is legal at all.
	if (
		underDouble.length < best.length &&
		canUnquoteAttributeValue(underDouble)
	) {
		best = underDouble;
	}
	if (
		underSingle !== underDouble &&
		underSingle.length < best.length &&
		canUnquoteAttributeValue(underSingle)
	) {
		best = underSingle;
	}
	return best;
};

/**
 * Whether an attribute only restates the element's own default - its value
 * naming that default, or naming no keyword at all where the invalid value
 * default is that same state - so dropping it leaves the DOM reading the same
 * value, but leaves an attribute selector, which matches the content attribute,
 * with nothing to match. Both tables are looked up per element by the caller,
 * not per attribute here: the answer is the same for every attribute of one tag.
 * @param {Record<string, string> | undefined} markers the element's marker table
 * @param {Record<string, string> | undefined} defaults the element's spec-default table
 * @param {string} tagName lowercased element name
 * @param {string} name lowercased attribute name
 * @param {string} value the attribute's raw value
 * @returns {boolean} true when the attribute may be dropped
 */
const isRedundantAttribute = (markers, defaults, tagName, name, value) => {
	// Looked up by what the value says, not how it was spelled - guarded on the
	// `&` so a value carrying no reference pays nothing.
	const lowered = asciiLowercase(
		stripAsciiWhitespace(
			value.includes("&") ? decodeEntities(value, true) : value
		)
	);
	// `<script type>`: only a spelling that names JavaScript, which is what the
	// element already runs. `module` and the empty spelling say something.
	if (tagName === "script" && name === "type") {
		return (
			lowered !== "" &&
			lowered !== "module" &&
			JAVASCRIPT_SCRIPT_TYPES.has(lowered)
		);
	}
	// `<script charset>` decides how a classic script is decoded, so it restates
	// the default only where the document declares UTF-8 itself. Undecided reads
	// as dropped: `minifyOpenTag` prints one held, to write back on a no.
	if (tagName === "script" && name === "charset") {
		return (
			// The attribute value the spec spells, not a Node encoding identifier.
			// eslint-disable-next-line unicorn/text-encoding-identifier-case
			(lowered === "utf-8" || lowered === "utf8") &&
			documentDeclaresUtf8() !== false
		);
	}
	if (markers !== undefined && markers[name] === lowered) return true;
	if (defaults === undefined || defaults[name] === undefined) return false;
	if (defaults[name] === lowered) return true;
	// A value naming no keyword takes the attribute's invalid value default,
	// which is the state a missing attribute names except where
	// `INVALID_VALUE_DEFAULT_DIFFERS` says the two part.
	const enumerated = ENUMERATED_KEYWORDS[tagName];
	const keywords = enumerated === undefined ? undefined : enumerated[name];
	if (keywords === undefined || keywords.has(lowered)) return false;
	return !INVALID_VALUE_DEFAULT_DIFFERS.has(`${tagName} ${name}`);
};

/**
 * Whether an empty attribute reads as its own absence, so `removeEmptyAttributes`
 * may drop it - only on the elements the spec defines it on, never `<x-foo rel="">`.
 * @param {string} elementName lowercased element name
 * @param {string} name lowercased attribute name
 * @param {string} value the attribute's raw value
 * @param {boolean=} decoded whether the value was already decoded
 * @returns {boolean} true when the attribute may be dropped
 */
const isRemovableEmptyAttribute = (
	elementName,
	name,
	value,
	decoded = false
) => {
	if (!S._removeEmptyAttributes) return false;
	const on = EMPTY_REMOVABLE_ATTRIBUTES.get(name);
	if (on === undefined || (on !== null && !on.has(elementName))) return false;
	// Read decoded: a reference is how a value is spelled, not what it says, and
	// the tokenizer hands the element the same empty either way. Guarded on the
	// `&`, and `stripAsciiWhitespace` returns the input when there is nothing to trim.
	return (
		stripAsciiWhitespace(
			!decoded && value.includes("&") ? decodeEntities(value, true) : value
		) === ""
	);
};

/**
 * Whether an embedded body's answer is in hand as the print goes, so a decision
 * made before it is printed can read it rather than the marker standing for it.
 * @returns {boolean} true with a synchronous renderer, or answers from a print before
 */
const rendersNow = () =>
	S._embeddedAnswers !== undefined ||
	(S._renderEmbeddedSource !== undefined &&
		S._deferEmbeddedSource === undefined);

/**
 * Whether a `style` attribute the renderer minifies to nothing goes with the
 * empty ones: the value it prints is empty, and an empty one reads as absent.
 * @param {string} elementName lowercased element name
 * @param {string} value the attribute's raw value
 * @returns {boolean} true when the attribute prints nothing
 */
const styleRendersEmpty = (elementName, value) =>
	value !== "" &&
	rendersNow() &&
	isRemovableEmptyAttribute(elementName, "style", "") &&
	minifyStyleAttribute(
		value.includes("&") ? decodeEntities(value, true) : value
	) === "";

/**
 * Whether a `<style>` element's body is CSS: the attribute is optional, and the
 * only value that keeps it CSS is `text/css`.
 * @param {HtmlPath} path the accessor
 * @param {HtmlElement} element the `<style>` element
 * @returns {boolean} true when the body may be minified as CSS
 */
const isCssStyleElement = (path, element) => {
	for (const attribute of attributeList(element)) {
		if (attribute.name !== "type") continue;
		// Read the way `_scriptType` reads its own: the value the spec matches is
		// the one the parser read, so a reference is decoded first.
		const raw = attribute.value;
		const value = asciiLowercase(
			stripAsciiWhitespace(raw.includes("&") ? decodeEntities(raw, true) : raw)
		);
		return value === "" || value === "text/css";
	}
	return true;
};

/**
 * Whether an attribute reaches the output: one this print drops is not a
 * difference between two elements, nor an attribute that keeps a run apart.
 * @param {string} elementName lowercased element name
 * @param {string} name lowercased attribute name
 * @param {string} value its raw value
 * @returns {boolean} true when it prints
 */
const attributePrints = (elementName, name, value) => {
	const markers =
		S._removeRedundantAttributes !== "none"
			? REDUNDANT_TYPE_ATTRIBUTES[elementName]
			: undefined;
	const defaults =
		S._removeRedundantAttributes === "all"
			? REDUNDANT_DEFAULT_ATTRIBUTES[elementName]
			: undefined;
	if (
		(markers !== undefined || defaults !== undefined) &&
		isRedundantAttribute(markers, defaults, elementName, name, value)
	) {
		return false;
	}
	if (name === "style" && styleRendersEmpty(elementName, value)) {
		return false;
	}
	return !isRemovableEmptyAttribute(elementName, name, value);
};

/**
 * How many of an element's attributes this print keeps.
 * @param {HtmlPath} path the accessor
 * @param {HtmlNodeRef} element the element
 * @returns {number} the count
 */
const printedAttributeCount = (path, element) => {
	const name = tagNameOf(element);
	let kept = 0;
	for (const attribute of attributeList(element)) {
		if (attributePrints(name, attribute.name, attribute.value)) kept++;
	}
	return kept;
};

/**
 * Whether any of an element's attributes reaches the output, stopping at the
 * first that does.
 * @param {HtmlPath} path the accessor
 * @param {HtmlNodeRef} element the element
 * @returns {boolean} true when one prints
 */
const printsAnAttribute = (path, element) => {
	const name = tagNameOf(element);
	for (const attribute of attributeList(element)) {
		if (attributePrints(name, attribute.name, attribute.value)) return true;
	}
	return false;
};

// What would end a `<style>` body early, or the `<noscript>` it sits in for a
// reader with scripting on: an answer spelling it is not printed.
const STYLE_CLOSE_REGEXP = /<\/(?:noscript|style)(?=[\t\n\f\r />])/i;

/**
 * A `<style>` body as the renderer answers it, or as written where it declines;
 * kept for the printer to take.
 * @param {string} css the body
 * @returns {string} what it prints
 */
const renderedSheet = (css) => {
	if (S._renderedSheets === null) S._renderedSheets = new Map();
	let printed = S._renderedSheets.get(css);
	if (printed === undefined) {
		const rendered = renderEmbeddedOrNull(css, CSS_TYPE, EMBEDDED_STYLESHEET);
		printed =
			rendered === null || STYLE_CLOSE_REGEXP.test(rendered) ? css : rendered;
		S._renderedSheets.set(css, printed);
	}
	return printed;
};

/**
 * What `renderedSheet` answers for this body, handed over once: the printer
 * takes it, so the next `<style>` with the same text is asked afresh.
 * @param {string} css the body
 * @returns {string} what it prints
 */
const takeRenderedSheet = (css) => {
	const printed = renderedSheet(css);
	/** @type {Map<string, string>} */ (S._renderedSheets).delete(css);
	return printed;
};

/**
 * What a `<style>` body's deferred answer would overturn, for `processAsync` to
 * print again with it: the element going empty.
 * @returns {((answer: string | undefined) => boolean) | undefined} the test, or undefined where no choice rests on it
 */
const sheetDecides = () => (S._removeEmptyElements ? answersEmpty : undefined);

/**
 * @param {string | undefined} answer a renderer's answer
 * @returns {boolean} true when it prints nothing
 */
const answersEmpty = (answer) => answer === "";

// An at-rule that only applies at the top of a sheet, so a second sheet carrying
// one cannot be appended to a first.
const SHEET_LEADING_AT_RULES = /^(?:charset|import|namespace)$/;

// A namespace applies to the whole sheet declaring it, so none is appended to it.
const SHEET_NAMESPACE_AT_RULE = /^namespace$/;

/**
 * Whether a sheet spells an at-keyword whose name, escapes resolved (§4.3.7) and
 * ASCII-lowercased, is one of `names`. Read wherever it stands: one inside a
 * string or a comment only declines a merge.
 * @param {string} css the sheet's text
 * @param {RegExp} names the lowercase names, anchored at both ends
 * @returns {boolean} true when the sheet spells one
 */
const spellsAtRule = (css, names) => {
	for (let at = css.indexOf("@"); at !== -1; at = css.indexOf("@", at + 1)) {
		if (!startsCssName(css, at + 1)) continue;
		let name = "";
		let i = at + 1;
		while (i < css.length) {
			const c = css.charCodeAt(i);
			if (c === CC_REVERSE_SOLIDUS) {
				// The input stream already turned every CR into LF.
				const next = css.charCodeAt(i + 1);
				if (i + 1 >= css.length || next === CC_LF || next === CC_FF) break;
				let end = i + 1;
				while (end < css.length && end < i + 7) {
					if (!isAsciiHexDigit(css.charCodeAt(end))) break;
					end++;
				}
				if (end === i + 1) {
					name += css[i + 1];
					i += 2;
					continue;
				}
				const value = Number.parseInt(css.slice(i + 1, end), 16);
				name +=
					value === 0 ||
					(value >= 0xd800 && value <= 0xdfff) ||
					value > 0x10ffff
						? "\uFFFD"
						: String.fromCodePoint(value);
				if (end < css.length && isAsciiWhitespace(css.charCodeAt(end))) end++;
				i = end;
				continue;
			}
			if (
				c >= 0x80 ||
				c === CC_HYPHEN_MINUS ||
				c === CC_LOW_LINE ||
				isAsciiAlphanumeric(c)
			) {
				name += css[i];
				i++;
				continue;
			}
			break;
		}
		if (names.test(asciiLowercase(name))) return true;
	}
	return false;
};

/**
 * A literal-text element's only child when that is one text node - the shape a
 * merge needs, since anything else means the element is empty.
 * @param {HtmlElement} element a `<style>` or `<script>`
 * @returns {HtmlNodeRef} the text node, or 0
 */
const onlyTextChild = (element) => {
	const first = S._firstChildren[element];
	return first !== 0 &&
		S._types[first] === NodeType.Text &&
		S._nextSiblings[first] === 0
		? first
		: 0;
};

/**
 * Whether two elements carry exactly the same attributes. Values compare raw:
 * two spellings of one value are rare enough not to be worth decoding for, and
 * reading them as different only declines a merge.
 * @param {HtmlPath} path the accessor
 * @param {HtmlElement} one an element
 * @param {HtmlElement} other another
 * @returns {boolean} true when the two agree on every attribute
 */
const sameAttributes = (path, one, other) => {
	// What each will spell, not what the tree holds: a `type` this print drops
	// as redundant is not a difference between them.
	const elementName = tagNameOf(one);
	let count = 0;
	for (const attribute of attributeList(one)) {
		if (!attributePrints(elementName, attribute.name, attribute.value)) {
			continue;
		}
		count++;
		const match = findAttribute(attribute.name, other);
		if (match === 0 || attrValueOf(match) !== attribute.value) {
			return false;
		}
	}
	return count === printedAttributeCount(path, other);
};

/**
 * The `<style>` that may be folded into `element`: the next sibling, when only
 * whitespace lies between them and the two agree on every attribute. Adjacency
 * is what makes the fold safe - nothing moves past anything, so the cascade is
 * the one the source wrote. Media, `title` and `blocking` all ride on the
 * attribute test, and `type` on both being CSS in the first place.
 * @param {HtmlPath} path the accessor
 * @param {HtmlElement} element a `<style>` element
 * @returns {HtmlElement} the next `<style>` of the run, or 0
 */
const mergeableStyleAfter = (path, element) => {
	for (
		let next = S._nextSiblings[element];
		next !== 0;
		next = S._nextSiblings[next]
	) {
		const type = S._types[next];
		if (type === NodeType.Text) {
			if (!isAllAsciiWhitespace(S._strings[next])) return 0;
			continue;
		}
		// A comment this print drops leaves the two adjacent, so it is not what
		// stands between them; one it keeps still is. So does an empty element.
		if (type === NodeType.Comment) {
			if (printsNothing(path, next)) continue;
			return 0;
		}
		if (
			type === NodeType.Element &&
			S._firstChildren[next] === 0 &&
			printsNothing(path, next)
		) {
			continue;
		}
		return type === NodeType.Element &&
			namespaceOf(next) === NS_HTML &&
			tagNameOf(next) === "style" &&
			onlyTextChild(next) !== 0 &&
			isCssStyleElement(path, next) &&
			sameAttributes(path, element, next)
			? next
			: 0;
	}
	return 0;
};

/**
 * Whether a CSS name starts at `at` (§4.3.9), which makes an `@` before it an
 * at-keyword; a lone `@` is a delimiter opening an ordinary rule's prelude.
 * @param {string} css the sheet's text
 * @param {number} at where the name would start
 * @returns {boolean} true when an identifier sequence starts there
 */
const startsCssName = (css, at) => {
	/**
	 * @param {number} c a code unit
	 * @returns {boolean} true for a name-start code point
	 */
	const nameStart = (c) =>
		(c | 0x20) >= 0x61 && (c | 0x20) <= 0x7a ? true : c === 0x5f || c >= 0x80;
	/**
	 * @param {number} i where a backslash would be
	 * @returns {boolean} true for a valid escape there
	 */
	const escape = (i) =>
		css.charCodeAt(i) === CC_REVERSE_SOLIDUS &&
		i + 1 < css.length &&
		css.charCodeAt(i + 1) !== CC_LF;
	const first = css.charCodeAt(at);
	if (nameStart(first) || escape(at)) return true;
	if (first !== CC_HYPHEN_MINUS) return false;
	const second = css.charCodeAt(at + 1);
	return nameStart(second) || second === CC_HYPHEN_MINUS || escape(at + 1);
};

/**
 * Where the url token a `(` opens ends (§4.3.6): an unquoted `url(` is one token
 * up to its `)`, a bad one to the first `)` its remnants reach, brackets and all.
 * @param {string} css the sheet's text
 * @param {number} at where the `(` is
 * @returns {number} the `)`'s index; 0 where no url token starts, -1 where the input ends inside one, -2 where it ends on a lone backslash
 */
const urlTokenEnd = (css, at) => {
	if (at < 3 || !/^url$/i.test(css.slice(at - 3, at))) return 0;
	const before = at > 3 ? css.charCodeAt(at - 4) : 0;
	// Part of a longer name, `image-url(` is a function like any other.
	if (
		before >= 0x80 ||
		before === CC_HYPHEN_MINUS ||
		before === CC_LOW_LINE ||
		before === CC_REVERSE_SOLIDUS ||
		(before < 0x80 && isAsciiAlphanumeric(before))
	) {
		return 0;
	}
	let i = at + 1;
	while (i < css.length && isAsciiWhitespace(css.charCodeAt(i))) i++;
	if (i >= css.length) return -1;
	const first = css.charCodeAt(i);
	if (first === CC_QUOTATION_MARK || first === CC_APOSTROPHE) return 0;
	let bad = false;
	for (; i < css.length; i++) {
		const c = css.charCodeAt(i);
		if (c === CC_RIGHT_PARENTHESIS) return i;
		if (c === CC_REVERSE_SOLIDUS) {
			if (i + 1 >= css.length) return -2;
			// An escape the remnants of a bad url read as one, and a good url only
			// where it is valid; a backslash before a newline makes the url bad.
			if (css.charCodeAt(i + 1) === CC_LF && !bad) bad = true;
			else i++;
			continue;
		}
		if (bad) continue;
		if (isAsciiWhitespace(c)) {
			while (i + 1 < css.length && isAsciiWhitespace(css.charCodeAt(i + 1))) {
				i++;
			}
			if (i + 1 >= css.length) return -1;
			if (css.charCodeAt(i + 1) !== CC_RIGHT_PARENTHESIS) bad = true;
			continue;
		}
		bad =
			c === CC_QUOTATION_MARK ||
			c === CC_APOSTROPHE ||
			c === CC_LEFT_PARENTHESIS ||
			c <= 0x08 ||
			c === 0x0b ||
			(c >= 0x0e && c <= 0x1f) ||
			c === 0x7f;
	}
	return -1;
};

/**
 * Whether a declaration starting at `at` names a custom property, past the
 * whitespace and closed comments before it.
 * @param {string} css the sheet's text
 * @param {number} at where the declaration starts
 * @returns {boolean} true where its name starts with `--`
 */
const startsCustomProperty = (css, at) => {
	let i = at;
	for (;;) {
		while (i < css.length && isAsciiWhitespace(css.charCodeAt(i))) i++;
		if (!css.startsWith("/*", i)) return css.startsWith("--", i);
		const end = css.indexOf("*/", i + 2);
		if (end === -1) return false;
		i = end + 2;
	}
};

/**
 * What a sheet needs appended to end where a rule does, as §5.4 ends it at the
 * end of input: the quote, comment end and closers it left open, then `{}` or `;`
 * for a statement it did not finish. Null where it ends on a lone backslash,
 * which would escape whatever followed.
 * @param {string} css the sheet's text
 * @param {boolean=} closesCustom whether an open custom property is closed too, as the engine closes one the sheet's lone backslash ended
 * @returns {string | null} the text to append before another sheet, empty where it already ends at a rule
 */
const sheetClosing = (css, closesCustom) => {
	/** @type {number[]} */
	const closers = [];
	// Where the declaration being read starts in each `{` block, -1 in a bracket.
	/** @type {number[]} */
	const declarations = [];
	// Whether nothing has been read since a rule ended, and whether the
	// statement being read is an at-rule, which a `;` ends.
	let ended = true;
	let atRule = false;
	let open = "";
	for (let i = 0; i < css.length && open.length === 0; i++) {
		const c = css.charCodeAt(i);
		if (isAsciiWhitespace(c)) continue;
		if (c === CC_SOLIDUS && css.charCodeAt(i + 1) === CC_ASTERISK) {
			const close = css.indexOf("*/", i + 2);
			if (close === -1) open = "*/";
			else i = close + 1;
			continue;
		}
		const top = closers.length === 0;
		if (top && ended) {
			// §5.4.1 skips a CDO or CDC where a rule may start.
			if (css.startsWith("<!--", i) || css.startsWith("-->", i)) {
				i += c === CC_LESS_THAN ? 3 : 2;
				continue;
			}
			atRule = c === CC_COMMERCIAL_AT && startsCssName(css, i + 1);
		}
		if (top) ended = false;
		if (c === CC_REVERSE_SOLIDUS) {
			if (++i >= css.length) return null;
		} else if (c === CC_QUOTATION_MARK || c === CC_APOSTROPHE) {
			// CSS treats a form feed as a newline too; HTML leaves it as written.
			// Either newline ends a bad string before the next sheet is appended.
			for (i++; i < css.length; i++) {
				const d = css.charCodeAt(i);
				if (d === CC_REVERSE_SOLIDUS) {
					if (++i >= css.length) return null;
				} else if (d === c || d === CC_LF || d === CC_FF) {
					break;
				}
			}
			if (i >= css.length) open = String.fromCharCode(c);
		} else if (c === CC_LEFT_CURLY_BRACKET) {
			closers.push(CC_RIGHT_CURLY_BRACKET);
			declarations.push(i + 1);
		} else if (c === CC_LEFT_PARENTHESIS) {
			const url = urlTokenEnd(css, i);
			if (url === -2) return null;
			if (url === -1) {
				open = ")";
			} else if (url !== 0) {
				i = url;
			} else {
				closers.push(CC_RIGHT_PARENTHESIS);
				declarations.push(-1);
			}
		} else if (c === CC_LEFT_SQUARE_BRACKET) {
			closers.push(CC_RIGHT_SQUARE_BRACKET);
			declarations.push(-1);
		} else if (!top && c === closers[closers.length - 1]) {
			// §5.4.8 ends a block only on its own closer; any other is a token in it.
			closers.pop();
			declarations.pop();
			if (closers.length === 0 && c === CC_RIGHT_CURLY_BRACKET) ended = true;
		} else if (top && atRule && c === CC_SEMICOLON) {
			ended = true;
		} else if (
			c === CC_SEMICOLON &&
			closers[closers.length - 1] === CC_RIGHT_CURLY_BRACKET
		) {
			declarations[declarations.length - 1] = i + 1;
		}
	}
	// WHY: the engine keeps a custom property's value as written, open where the
	// input ran out in it - and so does the CSS minifier. Closed to append another
	// sheet, it would read back another value, so such a sheet is not joined.
	for (let block = 0; block < closers.length; block++) {
		if (
			closesCustom !== true &&
			closers[block] === CC_RIGHT_CURLY_BRACKET &&
			(open.length !== 0 || block !== closers.length - 1) &&
			startsCustomProperty(css, declarations[block])
		) {
			return null;
		}
	}
	for (let i = closers.length - 1; i >= 0; i--) {
		open += String.fromCharCode(closers[i]);
	}
	if (closers.length !== 0) ended = closers[0] === CC_RIGHT_CURLY_BRACKET;
	return ended ? open : `${open}${atRule ? ";" : "{}"}`;
};

/**
 * How a sheet is closed before another is appended: `sheetClosing`'s text, and
 * for a sheet ending on a lone backslash, that backslash replaced as end of
 * input reads it - dropped in a string (§4.3.5), U+FFFD elsewhere (§4.3.7).
 * @param {string} css the sheet's text
 * @returns {{ drop: number, append: string } | null} how many of its last characters go, and what follows, or null where it cannot be joined
 */
const sheetJoint = (css) => {
	const closing = sheetClosing(css);
	if (closing !== null) return { drop: 0, append: closing };
	let backslashes = 0;
	while (
		backslashes < css.length &&
		css.charCodeAt(css.length - 1 - backslashes) === CC_REVERSE_SOLIDUS
	) {
		backslashes++;
	}
	if (backslashes % 2 === 0) return null;
	// The engine writes back closed what a lone backslash ended, a custom
	// property's value included, so that is closed here too.
	const cut = css.slice(0, -1);
	const inString = /** @type {string} */ (sheetClosing(cut, true));
	const first = inString.charCodeAt(0);
	if (first === CC_QUOTATION_MARK || first === CC_APOSTROPHE) {
		return { drop: 1, append: inString };
	}
	const replaced = /** @type {string} */ (sheetClosing(`${cut}\uFFFD`, true));
	return { drop: 1, append: `\uFFFD${replaced}` };
};

/**
 * The text a `<style>` run prints as one sheet, minified once: each sheet's
 * source, the one before it closed first as its own end of input closed it.
 * @param {HtmlPath} path the accessor
 * @param {HtmlElement} element the run's first `<style>`
 * @param {string} css its own text
 * @param {boolean} absorb whether to mark the rest of the run as printed here
 * @returns {string} the run's text
 */
const styleRunText = (path, element, css, absorb) => {
	let next = mergeableStyleAfter(path, element);
	if (next === 0 || spellsAtRule(css, SHEET_NAMESPACE_AT_RULE)) return css;
	let text = css;
	let previous = css;
	for (; next !== 0; next = mergeableStyleAfter(path, next)) {
		const source = S._strings[onlyTextChild(next)];
		if (spellsAtRule(source, SHEET_LEADING_AT_RULES)) break;
		// Only a sheet with another appended needs closing: the last sheet keeps
		// its own end of input, and can contain most of the document's bytes.
		const joint = sheetJoint(previous);
		if (joint === null) break;
		if (absorb) {
			if (S._absorbed === null) S._absorbed = new Set();
			S._absorbed.add(next);
		}
		if (joint.drop !== 0) text = text.slice(0, -joint.drop);
		text += joint.append + source;
		previous = source;
	}
	return text;
};

/**
 * Whether a `<style>` prints nothing because its sheet minifies to nothing -
 * with `mergeStyles`, every sheet of the run it opens, since those print here.
 * @param {HtmlPath} path the accessor
 * @param {HtmlElement} element the `<style>` element
 * @returns {boolean} true when its body prints nothing
 */
const sheetPrintsNothing = (path, element) => {
	const first = onlyTextChild(element);
	if (first === 0 || !rendersNow() || !isCssStyleElement(path, element)) {
		return false;
	}
	const css = S._strings[first];
	const text = S._mergeStyles ? styleRunText(path, element, css, false) : css;
	return text.trim() !== "" && renderedSheet(text) === "";
};

/**
 * Whether an element carries nothing at all, so `removeEmptyElements` may drop
 * it. Every guard but the name table is a rule: a void element is childless by
 * definition, a `<template>`'s children hang off a content fragment, foreign
 * content is not ours to judge, and an element spelling any attribute was
 * written for a reason - which is what keeps `<script src>`, `<iframe src>` and
 * `<div id=mount>`, each of which html-minifier-terser drops.
 *
 * What no guard can cover is CSS: `.spacer { height: 4px }` or a `::before`
 * makes an empty element visible, and this cannot see the stylesheet. That is
 * the risk the option is off by default for.
 * @param {HtmlPath} path the accessor positioned on the element
 * @param {HtmlElement} element the element
 * @returns {boolean} true when the element may be dropped
 */
// Every test is pure, so the O(1) ones come first: the walk reads the subtree,
// and the printer asks this of every element. Memoized for the same reason -
// without it a nested run costs one walk per ancestor.
const isRemovableEmptyElement = (path, element) => {
	if (isRemovedSvgMetadata(element)) return true;
	if (!S._removeEmptyElements) return false;
	const known = knownEmptyElement(path, element);
	return known === undefined ? childrenDecideEmpty(path, element) : known;
};

/**
 * What an element's own tests answer for `isRemovableEmptyElement`, from the
 * memo where it was asked before; undefined where only its children decide.
 * @param {HtmlPath} path the accessor
 * @param {HtmlElement} element the element
 * @returns {boolean | undefined} the answer, or undefined where the children decide it
 */
const knownEmptyElement = (path, element) => {
	// Asked before the memo: on component markup nearly every element answers
	// here, and its first attribute nearly always prints. One the print drops
	// is not what keeps the element.
	if (attributeCountOf(element) !== 0 && printsAnAttribute(path, element)) {
		return false;
	}
	const memo = S._emptyElements.get(element);
	if (memo !== undefined) return memo;
	if (
		templateContentOf(element) === 0 &&
		namespaceOf(element) === NS_HTML &&
		// Only a name known to render nothing empty: a void element that belongs
		// in the head, with no attributes, states nothing either.
		(EMPTY_ELEMENT_DROPPED.has(tagNameOf(element)) ||
			EMPTY_METADATA_ELEMENTS.has(tagNameOf(element)))
	) {
		return undefined;
	}
	S._emptyElements.set(element, false);
	return false;
};

/**
 * Whether an inline `<svg>`'s `<metadata>` goes whole, as a `.svg` asset's does.
 * @param {HtmlNodeRef} element the element
 * @returns {boolean} true when the print drops it with its contents
 */
const isRemovedSvgMetadata = (element) =>
	S._removeSvgMetadata &&
	!S._xmlMode &&
	namespaceOf(element) === NS_SVG &&
	tagNameOf(element) === "metadata" &&
	!S._svgIdAncestors.has(element);

/**
 * The walk's suspended elements, each pushed with the child it resumes at.
 * @type {HtmlNodeRef[]}
 */
const emptyWalk = [];

/**
 * Whether an element whose own tests pass prints nothing: every child prints
 * nothing, or it is a `<style>` whose sheet minifies away. A loop over an
 * explicit stack, so a run of nested empties goes together at any depth.
 * @param {HtmlPath} path the accessor
 * @param {HtmlElement} element an element `knownEmptyElement` left undecided
 * @returns {boolean} true when nothing inside it reaches the output
 */
const childrenDecideEmpty = (path, element) => {
	const base = emptyWalk.length;
	try {
		return walkEmptyChildren(path, element, base);
	} finally {
		// A renderer's throw mid-walk would otherwise leave its entries behind.
		emptyWalk.length = base;
	}
};

/**
 * The loop of `childrenDecideEmpty`, suspending elements on `emptyWalk`.
 * @param {HtmlPath} path the accessor
 * @param {HtmlElement} element an element `knownEmptyElement` left undecided
 * @param {number} base the length `emptyWalk` had before this walk
 * @returns {boolean} true when nothing inside it reaches the output
 */
const walkEmptyChildren = (path, element, base) => {
	let current = element;
	let child = S._firstChildren[current];
	for (;;) {
		let empty = true;
		for (; child !== 0; child = nextSibling(child)) {
			if (path.type(child) !== NodeType.Element) {
				if (printsNothing(path, child)) continue;
			} else {
				const known = knownEmptyElement(path, child);
				if (known === undefined) break;
				if (known) continue;
			}
			empty = false;
			break;
		}
		if (empty && child !== 0) {
			emptyWalk.push(current, child);
			current = child;
			child = S._firstChildren[current];
			continue;
		}
		// Each answer settles the child its parent resumes at; a false one ends
		// the parent too.
		for (;;) {
			const answer =
				empty ||
				(tagNameOf(current) === "style" && sheetPrintsNothing(path, current));
			S._emptyElements.set(current, answer);
			if (emptyWalk.length === base) return answer;
			child = /** @type {HtmlNodeRef} */ (emptyWalk.pop());
			current = /** @type {HtmlNodeRef} */ (emptyWalk.pop());
			if (answer) break;
			empty = false;
		}
		child = nextSibling(child);
	}
};

/**
 * Whether an attribute is boolean on this element, so its presence alone is the
 * value. `null` in the table means the attribute is global.
 * @param {string} tagName lowercased element name
 * @param {string} name lowercased attribute name
 * @returns {boolean} true when the value carries nothing
 */
const isBooleanAttribute = (tagName, name) => {
	const elements = BOOLEAN_ATTRIBUTES.get(name);
	if (elements === undefined) return BOOLEAN_ATTRIBUTES.has(name);
	return elements === null || elements.has(tagName);
};

/**
 * Whether an attribute is an event handler on this element, so its value is
 * JavaScript rather than text. `null` in the table means the attribute is a
 * handler on every element.
 * @param {string} tagName lowercased element name
 * @param {string} name lowercased attribute name
 * @returns {boolean} true when the value is a handler body
 */
const isEventHandlerAttribute = (tagName, name) => {
	const elements = EVENT_HANDLER_ATTRIBUTES.get(name);
	if (elements === undefined) return false;
	return elements === null || elements.has(tagName);
};

/**
 * The `data:` URL a URL attribute holds, read for the renderer, or null where
 * the attribute is no URL on this element or the URL offers nothing.
 * @param {string} tagName lowercased element name
 * @param {string} name lowercased attribute name
 * @param {string} value the attribute's decoded value
 * @returns {ReturnType<typeof readEmbeddedDataURI>} the payload and its language, or null
 */
const attributeDataUrl = (tagName, name, value) => {
	const elements = URL_ATTRIBUTES.get(name);
	if (elements === undefined || (elements !== null && !elements.has(tagName))) {
		return null;
	}
	const url = stripAsciiWhitespace(value);
	// The URL parser drops every tab and newline, so a payload holding one is
	// not the text the browser reads.
	if ((url.charCodeAt(0) | 0x20) !== 0x64 || /[\t\n\r]/.test(url)) return null;
	return readEmbeddedDataURI(url);
};

/**
 * Record the token `list` holds between `start` and `end` as span `index`.
 * @param {string} list the list
 * @param {number} index which span this is
 * @param {number} start the token's start
 * @param {number} end the token's end
 * @returns {void}
 */
const recordTokenSpan = (list, index, start, end) => {
	S._tokenSpanStarts[index] = start;
	S._tokenSpanEnds[index] = end;
	S._tokenSpanKeys[index] =
		(((end - start) & 0x3f) << 24) |
		((list.charCodeAt(start) & 0xfff) << 12) |
		(list.charCodeAt(end - 1) & 0xfff);
};

/**
 * Record every token of a collapsed, trimmed list as a span.
 * @param {string} list a single-space-separated list
 * @returns {number} how many tokens it holds
 */
const collectTokenSpans = (list) => {
	let count = 0;
	for (let at = 0; ;) {
		const space = list.indexOf(" ", at);
		const end = space === -1 ? list.length : space;
		recordTokenSpan(list, count++, at, end);
		if (space === -1) return count;
		at = space + 1;
	}
};

/**
 * Whether the `count` recorded spans of `list` name the same token twice. The
 * lists are short, so comparing packed keys pairwise beats building a set.
 * @param {string} list the list the spans were recorded over
 * @param {number} count how many spans are recorded
 * @returns {boolean} true when some token appears more than once
 */
const repeatsAToken = (list, count) => {
	for (let i = 0; i < count; i++) {
		const key = S._tokenSpanKeys[i];
		for (let j = i + 1; j < count; j++) {
			if (S._tokenSpanKeys[j] !== key) continue;
			const start = S._tokenSpanStarts[i];
			const other = S._tokenSpanStarts[j];
			const width = S._tokenSpanEnds[i] - start;
			if (S._tokenSpanEnds[j] - other !== width) continue;
			let k = 0;
			while (
				k < width &&
				list.charCodeAt(start + k) === list.charCodeAt(other + k)
			) {
				k++;
			}
			if (k >= width) return true;
		}
	}
	return false;
};

/**
 * Whether every token of a collapsed list is a word, which is what makes the
 * list the set the DOM reflects rather than another language's text.
 * @param {string} list a collapsed, trimmed token list
 * @returns {boolean} true when no token holds a foreign delimiter
 */
const tokensAreWords = (list) => {
	const length = list.length;
	for (let start = 0; start < length;) {
		let end = list.indexOf(" ", start);
		if (end === -1) end = length;
		if (!isWordSpan(list, start, end)) return false;
		start = end + 1;
	}
	return true;
};

/**
 * Collapse an ASCII-whitespace-separated token list (`class`) to single spaces,
 * and - where every token is a word, so the list is the ordered *set* the DOM
 * reflects - drop a token already in it. Order is kept unless `sort` asks.
 * @param {string} raw raw (undecoded) value
 * @param {boolean} isSet whether the DOM reflects the list as a `DOMTokenList`
 * @param {boolean} sort whether to print the tokens in order (`sortTokenLists`)
 * @returns {string} the collapsed list
 */
const normalizeTokenList = (raw, isSet, sort) => {
	// One walk answers "already collapsed?" and records the spans the repeat
	// check reads, so the common already-minified list is read once.
	const length = raw.length;
	let dirty = false;
	let count = 0;
	let tokenStart = -1;
	for (let i = 0; i < length; i++) {
		const c = raw.charCodeAt(i);
		if (c === 0x20) {
			if (tokenStart === -1) {
				dirty = true;
				break;
			}
			if (isSet) recordTokenSpan(raw, count, tokenStart, i);
			count++;
			tokenStart = -1;
		} else if (c >= 0x09 && c <= 0x0d && c !== 0x0b) {
			dirty = true;
			break;
		} else if (tokenStart === -1) {
			tokenStart = i;
		}
	}
	if (!dirty && tokenStart === -1 && length !== 0) dirty = true;
	if (!dirty && count === 0) return raw;
	const collapsed = dirty
		? stripAsciiWhitespace(raw).replace(/[\t\n\f\r ]+/g, " ")
		: raw;
	if (dirty && !collapsed.includes(" ")) return collapsed;
	if (!isSet) return collapsed;
	// Cutting the list into tokens is the allocation this runs often enough to
	// care about, and almost no list repeats one - so the checks read the spans
	// in place and only a list that folds pays for the pieces.
	if (sort) {
		return tokensAreWords(collapsed) ? sortedTokenList(collapsed) : collapsed;
	}
	if (dirty) {
		count = collectTokenSpans(collapsed);
	} else {
		recordTokenSpan(raw, count++, tokenStart, length);
	}
	if (!repeatsAToken(collapsed, count) || !tokensAreWords(collapsed)) {
		return collapsed;
	}
	return [...new Set(collapsed.split(" "))].join(" ");
};

/**
 * Compare two of `list`'s tokens where they sit, in the code unit order
 * `Array#sort` puts strings in - a prefix sorts before what extends it.
 * @param {string} list the collapsed list
 * @param {number} aStart first token's start
 * @param {number} aEnd first token's end
 * @param {number} bStart second token's start
 * @param {number} bEnd second token's end
 * @returns {number} negative, zero or positive
 */
const compareTokens = (list, aStart, aEnd, bStart, bEnd) => {
	const shared = Math.min(aEnd - aStart, bEnd - bStart);
	for (let i = 0; i < shared; i++) {
		const difference =
			list.charCodeAt(aStart + i) - list.charCodeAt(bStart + i);
		if (difference !== 0) return difference;
	}
	return aEnd - aStart - (bEnd - bStart);
};

/**
 * `collapsed`'s tokens in sorted order, with a repeat dropped. They are ordered
 * where they sit, so the pieces `split` would build are never built.
 * @param {string} collapsed a single-space-separated list
 * @returns {string} the ordered set
 */
const sortedTokenList = (collapsed) => {
	const starts = S._tokenSpanStarts;
	const ends = S._tokenSpanEnds;
	let count = 0;
	for (let at = 0; ;) {
		const space = collapsed.indexOf(" ", at);
		starts[count] = at;
		ends[count] = space === -1 ? collapsed.length : space;
		count++;
		if (space === -1) break;
		at = space + 1;
	}
	// A list carries a handful of tokens, so insertion sort beats `Array#sort`'s
	// setup and leaves equal tokens adjacent for the pass below to drop.
	for (let i = 1; i < count; i++) {
		const start = starts[i];
		const end = ends[i];
		let j = i - 1;
		while (
			j >= 0 &&
			compareTokens(collapsed, starts[j], ends[j], start, end) > 0
		) {
			starts[j + 1] = starts[j];
			ends[j + 1] = ends[j];
			j--;
		}
		starts[j + 1] = start;
		ends[j + 1] = end;
	}
	let out = "";
	for (let i = 0; i < count; i++) {
		if (
			i !== 0 &&
			compareTokens(
				collapsed,
				starts[i - 1],
				ends[i - 1],
				starts[i],
				ends[i]
			) === 0
		) {
			continue;
		}
		if (out !== "") out += " ";
		out += collapsed.slice(starts[i], ends[i]);
	}
	return out;
};

/**
 * Drop the whitespace a comma-separated list's grammar ignores: "split a string
 * on commas" strips each token's edges and nothing else. Whitespace inside a
 * token stays - it is part of the token `accept` keeps, and a separator of its
 * own in the number list `coords` parses.
 * @param {string} raw raw (undecoded) value
 * @returns {string} the normalized list
 */
const normalizeCommaList = (raw) =>
	raw
		.split(",")
		.map((item) => stripAsciiWhitespace(item))
		.join(",");

/**
 * Normalize an integer attribute: the parse rules skip leading ASCII whitespace
 * and stop at the first non-digit, so the ends and any leading zeros carry
 * nothing. A value those rules would not read as one integer is left alone -
 * only the signed rules accept a `+` or `-`, so a signed value on a
 * non-negative attribute stays as it is (it does not parse at all).
 * @param {string} raw raw (undecoded) value
 * @param {boolean} signed whether the attribute parses with the signed rules
 * @returns {string} the normalized integer
 */
const normalizeInteger = (raw, signed) => {
	const value = stripAsciiWhitespace(raw);
	if (!(signed ? /^[+-]?\d+$/ : /^\d+$/).test(value)) return raw;
	const negative = value.charCodeAt(0) === 0x2d;
	const digits = value.replace(/^[+-]/, "").replace(/^0+(?=\d)/, "");
	return negative && digits !== "0" ? `-${digits}` : digits;
};

// The `*` bucket, read on every attribute the element does not scope itself.
const ENUMERATED_GLOBAL_KEYWORDS = ENUMERATED_KEYWORDS["*"];

/**
 * The value rewrites that keep an attribute's parsed meaning: a srcset's
 * whitespace, a `style` declaration list, and the viewport `content` list.
 * @param {string} element lowercased element name
 * @param {string} name lowercased attribute name
 * @param {string} raw raw (undecoded) value
 * @param {boolean} viewport whether the element is `<meta name=viewport>`
 * @param {Record<string, Set<string>> | undefined} enumeratedOn what the element scopes itself, looked up once per element by the caller
 * @returns {string} the rewritten value, or `raw` when nothing applies
 */
const rewriteAttributeValue = (element, name, raw, viewport, enumeratedOn) => {
	// One question for the whole chain below, and most attributes on a page - a
	// `data-*`, an `id`, an `aria-*` - are done here rather than after a miss in
	// each table in turn.
	if (!REWRITABLE_ATTRIBUTES.has(name)) return raw;
	// An enumerated value matches ASCII-case-insensitively, so folding one the
	// spec names changes nothing the DOM reads.
	if (
		S._transforms.normalizeEnumeratedAttributes &&
		ENUMERATED_ATTRIBUTE_NAMES.has(name)
	) {
		const own = enumeratedOn === undefined ? undefined : enumeratedOn[name];
		const enumerated =
			own === undefined ? ENUMERATED_GLOBAL_KEYWORDS[name] : own;
		if (enumerated !== undefined) {
			// Case-insensitively, and nothing else: an enumerated attribute names a
			// keyword, so `type="time "` is not `time` - it is the value no keyword
			// matches, which puts the input in its default state.
			const lowered = asciiLowercase(raw);
			// A value the spec does not enumerate is left exactly as written:
			// `target` names a browsing context, and `type` on a custom element
			// means what it says.
			if (enumerated.has(lowered)) return lowered;
		}
	}
	if (SRCSET_ATTRIBUTES.has(name)) {
		return S._transforms.normalizeListAttributes ? normalizeSrcset(raw) : raw;
	}
	if (name === "style") return minifyStyleAttribute(raw);
	// A list `sortTokenLists` reorders is read whatever `normalizeListAttributes`
	// says: another order rewrites the separators between the tokens anyway.
	const tokenListOn =
		S._transforms.normalizeListAttributes ||
		(S._sortTokenLists && DOM_TOKEN_LIST_ATTRIBUTES.has(name))
			? TOKEN_LIST_ATTRIBUTES.get(name)
			: undefined;
	if (
		tokenListOn !== undefined &&
		(tokenListOn === null || tokenListOn.has(element))
	) {
		// Only the lists the DOM reflects as a `DOMTokenList` are sets, so only
		// they may be reordered or have a repeat folded away - `ping` is the order
		// its requests go out in and `accesskey` the order its keys are tried.
		const isSet = DOM_TOKEN_LIST_ATTRIBUTES.has(name);
		return normalizeTokenList(raw, isSet, S._sortTokenLists && isSet);
	}
	if (S._transforms.normalizeListAttributes) {
		if (viewport && name === "content") return normalizeViewport(raw);
		if (COMMA_LIST_ATTRIBUTES.has(name)) return normalizeCommaList(raw);
	}
	const urlOn = S._transforms.normalizeUrlAttributes
		? URL_ATTRIBUTES.get(name)
		: undefined;
	if (urlOn !== undefined && (urlOn === null || urlOn.has(element))) {
		return stripAsciiWhitespace(raw);
	}
	const integerOn = S._transforms.normalizeNumericAttributes
		? INTEGER_ATTRIBUTES.get(name)
		: undefined;
	if (
		integerOn !== undefined &&
		(integerOn === null || integerOn.has(element))
	) {
		return normalizeInteger(raw, SIGNED_INTEGER_ATTRIBUTES.has(name));
	}
	return raw;
};

/**
 * Whether an element is the viewport `<meta>`, whose content list is the only
 * `content` this rewrites.
 * @param {HtmlPath} path the accessor positioned on the `<meta>`
 * @returns {boolean} true for `<meta name=viewport>`
 */
const isViewportMeta = (path) => {
	for (const attribute of attributeList(path.node)) {
		if (attribute.name === "name") {
			const value = attribute.value;
			return (
				asciiLowercase(
					stripAsciiWhitespace(
						value.includes("&") ? decodeEntities(value, true) : value
					)
				) === "viewport"
			);
		}
	}
	return false;
};

/**
 * Re-serialize a srcset with its whitespace reduced to what the grammar needs.
 * The candidate list is unchanged - only the bytes between candidates go - and
 * anything the parser rejects is handed back untouched.
 * @param {string} raw raw (undecoded) attribute value
 * @returns {string} the normalized value
 */
const normalizeSrcset = (raw) => {
	let candidates;
	try {
		candidates = parseSrcset(raw);
	} catch (_err) {
		return raw;
	}
	// `parseSrcset` throws rather than return no candidate.
	let out = "";
	let previousBare = false;
	for (let i = 0; i < candidates.length; i++) {
		const url = candidates[i][0];
		const end = candidates[i][2];
		const nextStart =
			i + 1 < candidates.length ? candidates[i + 1][1] : raw.length;
		let descriptor = raw.slice(end, nextStart);
		const comma = descriptor.indexOf(",");
		if (comma !== -1) descriptor = descriptor.slice(0, comma);
		descriptor = stripAsciiWhitespace(descriptor).replace(/[\t\n\f\r ]+/g, " ");
		// A descriptor-less URL runs to the next whitespace, so without one it
		// would swallow the separating comma and the URL behind it.
		if (i !== 0) out += previousBare ? ", " : ",";
		out += descriptor === "" ? url : `${url} ${descriptor}`;
		previousBare = descriptor === "";
	}
	return out;
};

/**
 * Infra's ASCII lowercase, which is all HTML folds: `toLowerCase` also maps
 * characters the parser leaves alone (U+212A onto `k`). Returns the input
 * itself when there is nothing to fold.
 * @param {string} value source name or value
 * @returns {string} the value as the parser would match it
 */
const asciiLowercase = (value) => {
	for (let i = 0; i < value.length; i++) {
		const c = value.charCodeAt(i);
		if (c >= 0x41 && c <= 0x5a) {
			return (
				value.slice(0, i) +
				value
					.slice(i)
					.replace(/[A-Z]/g, (u) => String.fromCharCode(u.charCodeAt(0) + 0x20))
			);
		}
	}
	return value;
};

// One native scan: a per-character loop pays a compare a code unit per stop.
const UNQUOTED_ATTRIBUTE_VALUE_REGEXP = /^[^\t\n\f\r "'<=>`]+$/;

/**
 * Whether a raw attribute value keeps its meaning unquoted: §13.1.2.3 admits a
 * non-empty run with no whitespace, quote, backtick, `=`, `<` or `>`. Character
 * references decode identically either way, so `&` needs no guard.
 * @param {string} raw raw (undecoded) value, without its quotes
 * @returns {boolean} true when the unquoted form re-parses to the same value
 */
const canUnquoteAttributeValue = (raw) =>
	UNQUOTED_ATTRIBUTE_VALUE_REGEXP.test(raw);

/**
 * @returns {Map<string, number>} each attribute name's place in the print order
 */
const attributeRank = () => {
	if (S._attributeRanks !== null) return S._attributeRanks;
	const frequency = attributeFrequency();
	const names = [...frequency.keys()].sort((a, b) => {
		// Commonest names first, so the run two elements share is one run of bytes
		// a compressor pays for once. Name order breaks ties, keeping this total.
		const byFrequency =
			/** @type {number} */ (frequency.get(b)) -
			/** @type {number} */ (frequency.get(a));
		if (byFrequency !== 0) return byFrequency;
		return a < b ? -1 : 1;
	});
	/** @type {Map<string, number>} */
	const ranks = new Map();
	for (let i = 0; i < names.length; i++) ranks.set(names[i], i);
	S._attributeRanks = ranks;
	return ranks;
};

/**
 * How often each attribute name reaches the output. Counted over the runs the
 * elements own rather than the whole column, because an attribute a transform
 * drops is not one the print order should be ranked on. Read once per print,
 * through the ranks `attributeRank` keeps.
 * @returns {Map<string, number>} how often each attribute name occurs
 */
const attributeFrequency = () => {
	/** @type {Map<string, number>} */
	const frequency = new Map();
	// A removal marks a subtree's root only, and parents come before children,
	// so a node is out of the print when it or its parent is.
	const removedNodes =
		S._xmlRemovedNodes !== null && S._xmlRemovedNodes.size !== 0
			? S._xmlRemovedNodes
			: null;
	const removed =
		removedNodes !== null ? new Uint8Array(S._nodeCount + 1) : null;
	for (let node = 1; node <= S._nodeCount; node++) {
		if (
			removedNodes !== null &&
			removed !== null &&
			(removedNodes.has(node) || removed[S._parents[node]] === 1)
		) {
			removed[node] = 1;
			continue;
		}
		if (S._types[node] !== NodeType.Element) continue;
		const count = S._attrCounts[node];
		if (count === 0) continue;
		const start = S._attrStarts[node];
		// Foreign content keeps every attribute it was written with, so only an
		// HTML element is asked what it drops - the same test the printer makes.
		const namespace = namespaceOf(node);
		const html = namespace === NS_HTML;
		const elementName = tagNameOf(node);
		const markers =
			html && S._removeRedundantAttributes !== "none"
				? REDUNDANT_TYPE_ATTRIBUTES[elementName]
				: undefined;
		const defaults =
			html && S._removeRedundantAttributes === "all"
				? REDUNDANT_DEFAULT_ATTRIBUTES[elementName]
				: undefined;
		const mayDrop = markers !== undefined || defaults !== undefined;
		for (let i = start; i < start + count; i++) {
			if (
				namespace === NS_XML &&
				(S._attrNameStarts[i] === -1 ||
					(S._xmlRemovedAttributes !== null && S._xmlRemovedAttributes.has(i)))
			) {
				continue;
			}
			const name = S._attrNames[i];
			if (html) {
				// Valueless reads as the empty value here as it does there.
				const value = attrValueOf(i);
				if (
					(mayDrop &&
						isRedundantAttribute(
							markers,
							defaults,
							elementName,
							name,
							value
						)) ||
					isRemovableEmptyAttribute(elementName, name, value)
				) {
					continue;
				}
			}
			frequency.set(name, (frequency.get(name) || 0) + 1);
		}
	}
	return frequency;
};

/**
 * The element's attribute indices in the order `sortAttributes` prints them:
 * the document's commonest names first, ties by name.
 * @param {HtmlPath} path the accessor positioned on the element
 * @param {number} count its attribute count
 * @returns {number[]} the indices, in print order
 */
const sortedAttributes = (path, count) => {
	const ranks = attributeRank();
	const order = S._sortOrderScratch;
	const keys = S._sortKeyScratch;
	for (let i = 0; i < count; i++) {
		order[i] = i;
		// A name with no rank is one every element drops, so it prints nowhere -
		// but as `undefined` it would compare false both ways and stop the sort
		// short, leaving the names after it where a second pass would move them.
		const rank = ranks.get(attrNameOf(attributeAt(i, path.node)));
		keys[i] = rank === undefined ? ranks.size : rank;
	}
	// An element carries a handful of attributes, so a stable insertion sort over
	// their ranks beats `Array#sort`'s setup and the comparator it would call.
	for (let i = 1; i < count; i++) {
		const key = keys[i];
		const index = order[i];
		let j = i - 1;
		while (j >= 0 && keys[j] > key) {
			keys[j + 1] = keys[j];
			order[j + 1] = order[j];
			j--;
		}
		keys[j + 1] = key;
		order[j + 1] = index;
	}
	return order;
};

/**
 * Whether the tag rebuilt so far ends in an attribute name with no value, which
 * a next name opening with `=` would give one.
 * @param {string} out the tag rebuilt so far
 * @param {boolean} unquotedTail whether what it ends with is an unquoted value
 * @param {number} nameLength the length of `<` and the tag name
 * @returns {boolean} true when it ends in a bare attribute name
 */
const endsInBareName = (out, unquotedTail, nameLength) => {
	if (unquotedTail || out.length <= nameLength) return false;
	const last = out.charCodeAt(out.length - 1);
	return (
		last !== CC_QUOTATION_MARK && last !== CC_APOSTROPHE && last !== CC_SOLIDUS
	);
};

/**
 * Whether the source's own bytes still separate an attribute from the one this
 * print just wrote. A quoted value ends at its quote, an unquoted one only at
 * whitespace, and a bare name at whitespace or `/`.
 * @param {string} out the tag rebuilt so far
 * @param {boolean} unquotedTail whether what it ends with is an unquoted value
 * @param {string} separator the source bytes standing between the two
 * @returns {boolean} true where nothing further is needed
 */
const separates = (out, unquotedTail, separator) => {
	const last = out.charCodeAt(out.length - 1);
	if (last === CC_QUOTATION_MARK || last === CC_APOSTROPHE) return true;
	if (separator === "") return false;
	const cc = separator.charCodeAt(0);
	return isAsciiWhitespace(cc) || (!unquotedTail && cc === CC_SOLIDUS);
};

/**
 * Whether the run spells a name no HTML vocabulary would: sorting such a tag
 * reorders the statement another language wrote its delimiters into.
 * @param {HtmlPath} path the accessor positioned on the element
 * @param {number} count how many attributes the element has
 * @returns {boolean} true where one of the names is no word
 */
const holdsForeignSyntax = (path, count) => {
	for (let i = 0; i < count; i++) {
		const name = attrNameOf(attributeAt(i, path.node));
		if (!isWordSpan(name, 0, name.length)) return true;
	}
	return false;
};

/**
 * Remove the one space every attribute's text below opens with, `at` naming it,
 * so the source's own separator stands in its place.
 * @param {string} out the tag rebuilt so far
 * @param {number} at where the space sits, or -1 before the first attribute
 * @returns {string} the text without it
 */
const dropOpenedSpace = (out, at) =>
	at === -1 ? out : out.slice(0, at) + out.slice(at + 1);

/**
 * Drop a `/` written as a separator that nothing followed, `at` naming it: the
 * attribute it stood before was dropped, so it now separates nothing.
 * @param {string} out the tag rebuilt so far
 * @param {number} at where the `/` sits, or -1 where none is pending
 * @returns {string} the text without it
 */
const dropDanglingSolidus = (out, at) =>
	at !== -1 && at === out.length - 1 ? out.slice(0, at) : out;

/**
 * A `style` attribute written with its declaration list minified.
 * @param {string} minified the declaration list to write
 * @param {boolean} bare whether an empty list is written as the bare name
 * @param {string} attributeName the attribute's name
 * @param {string} rawValue the value as the source wrote it
 * @param {string | null} decoded the value its references decode to, null without any
 * @param {boolean} quoted whether the source quoted the value
 * @param {string} delimiter the source's quote, "" when unquoted
 * @returns {{ text: string, unquotedTail: boolean } | null} what to emit, the bare name for an empty list as a next pass reads it
 */
const writeStyle = (
	minified,
	bare,
	attributeName,
	rawValue,
	decoded,
	quoted,
	delimiter
) =>
	minified === "" && bare
		? { text: ` ${attributeName}`, unquotedTail: false }
		: minified !== (decoded !== null ? decoded : rawValue)
			? writeStyleList(attributeName, minified, delimiter)
			: writeAttribute(
					attributeName,
					rawValue,
					rawValue,
					decoded,
					quoted,
					delimiter
				);

/**
 * Note a `<script charset=utf-8>` dropped while the answer is still out, and
 * whether this rewrite prints it all the same.
 * @returns {boolean} true when it prints
 */
const holdsCharset = () => {
	S._charsetUndecided = true;
	return S._keepUndecidedCharset;
};

/**
 * Rewrite an opening tag from its own source spans, collapsing the whitespace
 * between its attributes to one space and dropping the quotes around any value
 * that is legal unquoted (§13.1.2.3). webpack's own late asset passes match the
 * sentinels they left behind with the quote optional, so they still see them
 * (see `INTEGRITY_SENTINEL_REGEXP`); a third-party post-processor that regexes
 * emitted HTML assuming quotes would not, which is why `removeAttributeQuotes`
 * is off by default in html-minifier.
 *
 * Falls back to the source tag when an attribute lies outside it - a repeated
 * `<html>` / `<body>` tag merges its attributes onto the element already open,
 * and those cannot be sliced from here.
 * @param {HtmlPath} path the accessor positioned on the element
 * @param {string} open the opening tag's source text
 * @returns {string} the minified opening tag
 */
const minifyOpenTag = (path, open) => {
	const tree = S;
	tree._charsetUndecided = false;
	tree._keepUndecidedCharset = true;
	const holes = tree._deferEmbeddedSource;
	const deferred = holes === undefined ? 0 : holes.length;
	const kept = rewriteOpenTag(path, open);
	tree._keepUndecidedCharset = false;
	if (!tree._charsetUndecided) return kept;
	// Held as is where the tag goes straight out, as `emitOpening` splits it;
	// inside an element printed whole, marked for `emitPiece` to split.
	const streamed = tree._printOpen[tree._printDepth - 1] === 1;
	if (!streamed && inDeferredSvg(path.node)) return kept;
	// Deferred again under the same ids, so both rewrites spell the same markers.
	if (holes !== undefined) holes.length = deferred;
	const dropped = rewriteOpenTag(path, open);
	if (streamed) {
		tree._heldTagNode = path.node;
		tree._heldTagDropped = dropped;
		tree._heldTagKept = kept;
		return dropped;
	}
	const start = sharedStart(dropped, kept);
	const end = sharedEnd(dropped, kept, start);
	const id = tree._markedCharsets.length;
	tree._markedCharsets.push(
		dropped.slice(start, dropped.length - end),
		kept.slice(start, kept.length - end)
	);
	return `${dropped.slice(0, start)}${charsetMark(id)}${dropped.slice(
		dropped.length - end
	)}`;
};

/**
 * The mark standing for the `id`th dropped and kept pair in `_markedCharsets`.
 * @param {number} id the pair's index
 * @returns {string} the mark
 */
const charsetMark = (id) => `\u0000charset${charsetMarkInfix()}${id}\u0000`;

/**
 * What a mark of `minifyOpenTag`'s carries between `charset` and its id, chosen
 * once a run so that no NUL the source carried spells it: none where the source
 * holds no NUL, else taken from the source's digest, which it cannot spell ahead.
 * @returns {string} the infix
 */
const charsetMarkInfix = () => {
	let infix = S._charsetMarkInfix;
	if (infix === undefined) {
		const input = S._input;
		infix = "";
		if (input.includes("\u0000")) {
			const printedDigest = /** @type {string} */ (
				require("../util/createHash")("xxhash64").update(input).digest("hex")
			);

			let n = 0;
			while (input.includes(`\u0000charset${printedDigest}${n}:`)) n++;
			infix = `${printedDigest}${n}:`;
		}
		S._charsetMarkInfix = infix;
	}
	return infix;
};

/**
 * Whether an element sits in an SVG subtree offered whole to a caller that
 * answers later, whose source would carry a mark out of this print.
 * @param {HtmlNodeRef} node the element
 * @returns {boolean} true when it does
 */
const inDeferredSvg = (node) => {
	if (S._deferEmbeddedSource === undefined) return false;
	for (let a = parentOf(node); a !== 0; a = parentOf(a)) {
		if (namespaceOf(a) === NS_SVG) return true;
	}
	return false;
};

/**
 * How many characters a tag's dropped and kept rewrites share at their start.
 * @param {string} dropped the rewrite without the undecided charset
 * @param {string} kept the rewrite with it
 * @returns {number} the length of their common start
 */
const sharedStart = (dropped, kept) => {
	let start = 0;
	while (dropped.charCodeAt(start) === kept.charCodeAt(start)) start++;
	return start;
};

/**
 * How many characters a tag's dropped and kept rewrites share at their end,
 * past the start they share.
 * @param {string} dropped the rewrite without the undecided charset
 * @param {string} kept the rewrite with it
 * @param {number} start the length of their common start
 * @returns {number} the length of their common end
 */
const sharedEnd = (dropped, kept, start) => {
	let end = 0;
	while (
		end < dropped.length - start &&
		dropped.charCodeAt(dropped.length - 1 - end) ===
			kept.charCodeAt(kept.length - 1 - end)
	) {
		end++;
	}
	return end;
};

/**
 * `minifyOpenTag`'s rewrite, printing a `<script charset=utf-8>` the answer
 * is still out on as `_keepUndecidedCharset` says.
 * @param {HtmlPath} path the accessor positioned on the element
 * @param {string} open the opening tag's source text
 * @returns {string} the minified opening tag
 */
const rewriteOpenTag = (path, open) => {
	const tree = S;
	const node = path.node;
	const tagStart = tree._starts[node];
	const tagEnd = tree._tagEnds[node];
	const count = tree._attrCounts[node];
	const attrStart = tree._attrStarts[node];
	// HTML parsing ASCII-lowercases names, so folding one changes nothing. Foreign
	// content keeps its source bytes: SVG admits element names no adjustment table
	// would case-correct on the way back in.
	const html = (tree._flags[node] & NS_MASK) === NS_HTML;
	// A tag another language wrote: what sits between the attributes the spec's
	// duplicate drop kept is carried over from the source rather than collapsed.
	const verbatim =
		count !== 0 &&
		tree._foreignSyntaxAttrRuns.size !== 0 &&
		tree._foreignSyntaxAttrRuns.has(attrStart);
	const nameEnd = tree._nameEnds[node] - tagStart;
	// A bare `<name>` - half of all tags - is what the rest would rebuild byte
	// for byte; decided before the name is sliced, so it allocates nothing.
	const storedName = tree._strings[node];
	// The source spelling the stored name exactly folds nothing.
	const asStored =
		html && storedName.length === nameEnd - 1 && open.startsWith(storedName, 1);
	if (count === 0 && open.length === nameEnd + 1) {
		let folds = false;
		if (html && !asStored) {
			for (let i = 1; i < nameEnd; i++) {
				const c = open.charCodeAt(i);
				if (c >= 0x41 && c <= 0x5a) {
					folds = true;
					break;
				}
			}
		}
		if (!folds) return open;
	}
	const elementName = asStored
		? storedName
		: html
			? asciiLowercase(open.slice(1, nameEnd))
			: open.slice(1, nameEnd);
	let out = `<${elementName}`;
	const viewportMeta =
		html && tree._strings[node] === "meta" && isViewportMeta(path);
	let unquotedTail = false;
	// Where the space an attribute's own text opens with sits, so a source
	// separator written in front of it replaces rather than doubles it.
	let openedSpaceAt = -1;
	let solidusAt = -1;
	// Where the last deferred value's marker ends: its answer may end unquoted,
	// which a `/` written as the next separator would fuse into.
	let deferredEnd = -1;
	// Only a foreign element's surviving `/>` reads it, so only there is a
	// deferred answer held to the shape the built-in was written in.
	const tailIsRead = !html && open.charCodeAt(open.length - 2) === 47;
	let consumedEnd = tree._nameEnds[node];
	// HTML only, which is what keeps `consumedEnd` meaningful: it is read once
	// more below, for a foreign element's `/>` alone. Per element rather than per
	// attribute, these being the printer's hottest lookups.
	const markers =
		html && tree._removeRedundantAttributes !== "none"
			? REDUNDANT_TYPE_ATTRIBUTES[elementName]
			: undefined;
	const defaults =
		html && tree._removeRedundantAttributes === "all"
			? REDUNDANT_DEFAULT_ATTRIBUTES[elementName]
			: undefined;
	const mayDrop = markers !== undefined || defaults !== undefined;
	const enumeratedOn = html ? ENUMERATED_KEYWORDS[elementName] : undefined;
	// An inline `<svg>`'s geometry, read with the grammars a `.svg` asset's is.
	const svgNumeric =
		(S._shortenSvgNumbers || S._shortenSvgPathData) &&
		(S._flags[node] & NS_MASK) === NS_SVG &&
		!verbatim
			? SVG_NUMERIC_ATTRIBUTES[tagNameOf(node)] ||
				SVG_PRESENTATION_NUMERIC_ATTRIBUTES
			: undefined;
	const order =
		tree._sortAttributes &&
		html &&
		!verbatim &&
		count > 1 &&
		!holdsForeignSyntax(path, count)
			? sortedAttributes(path, count)
			: null;
	for (let k = 0; k < count; k++) {
		const i = order === null ? k : order[k];
		const attribute = attrStart + i;
		const nameStart = tree._attrNameStarts[attribute];
		const nameEnd = tree._attrNameEnds[attribute];
		if (nameStart < tagStart || nameEnd > tagEnd) return open;
		out = dropOpenedSpace(out, openedSpaceAt);
		out = dropDanglingSolidus(out, solidusAt);
		openedSpaceAt = -1;
		solidusAt = -1;
		tree._escapeTemplateOpeners = false;
		const afterDeferred = out.length === deferredEnd;
		// A name opening with `=` would be read as the value of a bare name before
		// it, so that one gets its empty value spelled out. A deferred answer may
		// end in either a bare name or an unquoted value, and ` /` ends both.
		if (open.charCodeAt(nameStart - tagStart) === CC_EQUALS) {
			if (afterDeferred) {
				out += " /";
				openedSpaceAt = out.length;
			} else if (endsInBareName(out, unquotedTail, elementName.length + 1)) {
				out += '=""';
			}
		}
		if (verbatim) {
			let separator = open.slice(consumedEnd - tagStart, nameStart - tagStart);
			// A space of its own where the source's bytes no longer separate: what
			// this print dropped is what held the value off the template.
			if (!separates(out, unquotedTail, separator)) {
				separator = ` ${separator}`;
			}
			out += separator;
			openedSpaceAt = out.length;
		} else if (
			order === null &&
			!unquotedTail &&
			!afterDeferred &&
			nameStart - consumedEnd === 1 &&
			open.charCodeAt(consumedEnd - tagStart) === CC_SOLIDUS
		) {
			// A `/` the tokenizer read as the separator and another language as part
			// of a word, `{{/if}}` among them: it separates either way, at one byte.
			out += "/";
			solidusAt = out.length - 1;
			openedSpaceAt = out.length;
		}
		// Template identifiers are parsed as attribute names too, but their case
		// belongs to the template language. Keep their source spelling like SVG's.
		const attributeName =
			html && !verbatim
				? tree._attrNames[attribute]
				: open.slice(nameStart - tagStart, nameEnd - tagStart);
		const valueStart = tree._attrValueStarts[attribute];
		if (valueStart === -1) {
			// Valueless is the empty value, so it goes with the empty ones.
			if (
				html &&
				!verbatim &&
				isRemovableEmptyAttribute(elementName, attributeName, "")
			) {
				consumedEnd = nameEnd;
				continue;
			}
			out += ` ${attributeName}`;
			unquotedTail = false;
			consumedEnd = nameEnd;
			continue;
		}
		// `attributeValueStart` points past the opening quote, `attributeValueEnd`
		// at the closing one, so a quoted value's span is one wider on each side.
		const quote = open.charCodeAt(valueStart - 1 - tagStart);
		const quoted = quote === 34 || quote === 39;
		const sourceDelimiter = quoted ? open[valueStart - tagStart - 1] : "";
		const rawEnd = tree._attrValueEnds[attribute];
		const valueEnd = rawEnd + (quoted ? 1 : 0);
		const rawValue = open.slice(valueStart - tagStart, rawEnd - tagStart);
		// Dropped before any rewrite, and whether or not the source quoted it:
		// the value only restates the default, or carries nothing at all - a
		// `style` included whose declarations the renderer minifies to nothing.
		if (
			html &&
			!verbatim &&
			((mayDrop &&
				isRedundantAttribute(
					markers,
					defaults,
					elementName,
					attributeName,
					rawValue
				)) ||
				isRemovableEmptyAttribute(elementName, attributeName, rawValue) ||
				(attributeName === "style" &&
					styleRendersEmpty(elementName, rawValue))) &&
			!(
				tree._declaresUtf8 === undefined &&
				attributeName === "charset" &&
				elementName === "script" &&
				holdsCharset()
			)
		) {
			consumedEnd = valueEnd;
			continue;
		}
		// A whole document, so it is offered decoded and written back escaped -
		// the one attribute whose reference-carrying value is still rewritten.
		if (
			html &&
			!verbatim &&
			(tree._renderEmbeddedSource !== undefined ||
				(tree._deferEmbeddedSource !== undefined && tree._deferSrcdoc)) &&
			attributeName === "srcdoc" &&
			elementName === "iframe" &&
			rawValue !== ""
		) {
			const document = decodeEntities(rawValue, true);
			// Read now: an answer arriving after the print finds the options reset.
			const bare = tree._transforms.normalizeAttributeQuotes;
			/**
			 * @param {string} rendered the document the renderer answered
			 * @param {string} delimiter the quote the source spelled it with, if any
			 * @returns {string} the attribute - the bare name for an empty one, as a next pass reads it
			 */
			const writeDocument = (rendered, delimiter) =>
				rendered === "" && bare
					? ` ${attributeName}`
					: writeQuotedAttribute(attributeName, rendered, delimiter);
			// The whole attribute is deferred, not the document inside it: what
			// escaping it needs is decided by what it holds, which is the answer.
			if (tree._deferEmbeddedSource !== undefined && tree._deferSrcdoc) {
				// Declining leaves the attribute as written, delimiter and all: a bare
				// value has none, and quoting one would only lengthen it.
				const delimiter = sourceDelimiter;
				const asWritten = ` ${attributeName}=${delimiter}${rawValue}${delimiter}`;

				// A marker opens with no space for the opened-space drop to take, so
				// the `/` goes and the answer's own space separates.
				out = dropDanglingSolidus(out, solidusAt);
				solidusAt = -1;
				openedSpaceAt = -1;
				out += deferEmbedded(
					document,
					HTML_TYPE,
					(rendered) =>
						typeof rendered !== "string" || rendered === document
							? asWritten
							: writeDocument(rendered, delimiter),
					"srcdoc"
				);
				unquotedTail = false;
				deferredEnd = out.length;
				consumedEnd = valueEnd;
				continue;
			}

			// The synchronous renderer: `_renderEmbedded` defers where a collector
			// is set, and this attribute is the one kept off that path.
			const rendered = renderEmbeddedOrNull(document, HTML_TYPE, "srcdoc");
			if (rendered !== null && rendered !== document) {
				out += writeDocument(
					rendered,
					quoted ? open[valueStart - tagStart - 1] : ""
				);
				unquotedTail = false;
				consumedEnd = valueEnd;
				continue;
			}
		}
		const svgKind =
			svgNumeric === undefined
				? undefined
				: svgNumeric[S._attrNames[attribute]] ||
					SVG_PRESENTATION_NUMERIC_ATTRIBUTES[S._attrNames[attribute]];
		// Where nothing below can change the value: foreign content rewrites only
		// `style` and SVG geometry, and a bare value is otherwise its own shortest.
		if (
			quoted ||
			html ||
			attributeName === "style" ||
			svgKind !== undefined ||
			rawValue.includes("&")
		) {
			const hasReference = rawValue.includes("&");
			// Rewritten from the source text where it carries no reference; one that
			// does is rewritten from what it decodes to, below.
			let value = rawValue;
			if (!hasReference) {
				if (html) {
					value = rewriteAttributeValue(
						elementName,
						attributeName,
						rawValue,
						viewportMeta,
						enumeratedOn
					);
				} else if (attributeName === "style") {
					// The one foreign-content attribute HTML's rules still fit: SVG and
					// MathML `style` is a CSS declaration list, same as HTML's. Every
					// other name is adjusted or means something else there.
					value = minifyStyleAttribute(rawValue);
				} else if (
					svgKind !== undefined &&
					(svgKind === "path" ? S._shortenSvgPathData : S._shortenSvgNumbers)
				) {
					const shortened = shortenSvgNumericValue(rawValue, svgKind);
					if (shortened !== null) value = shortened;
				}
			}
			// WHY: an empty value is the bare name - the after-attribute-name state
			// reads `x` in `<p x>` and `<p x="">` as one attribute with one empty
			// value, in foreign content too - and a boolean spelled by its own name
			// is the same presence, which the spec does canonicalize. Writing either
			// as the bare name is just the `=""` going, a quoting decision, so it
			// answers to the switch naming the rest of them. The decode is guarded on
			// the reference to stay off the hot path, and tried before unquoting so
			// every reference it writes stays bare.
			const decoded = hasReference ? decodeEntities(rawValue, true) : null;
			const spellable = decoded;
			// A delimiter the source kept a reference stays one; one it wrote stays.
			const literalOpeners =
				decoded === null ? 0 : templateOpenerCount(rawValue);
			tree._escapeTemplateOpeners =
				decoded !== null && templateOpenerCount(decoded) > literalOpeners;
			// Both kinds in one value: only the source spelling keeps each as it is.
			if (tree._escapeTemplateOpeners && literalOpeners !== 0) {
				out += ` ${attributeName}=${open.slice(
					(quoted ? valueStart - 1 : valueStart) - tagStart,
					valueEnd - tagStart
				)}`;
				unquotedTail = !quoted;
				consumedEnd = valueEnd;
				continue;
			}
			// The name the presence is spelled with is what it decodes to, so
			// `checked="&#x63;..."` is the same presence as `checked="checked"`.
			const presence = spellable !== null ? spellable : rawValue;
			// The grammars read what the value decodes to, so a referenced one is
			// rewritten from that and spelled back. `style` has its own path below.
			const rewritten =
				spellable !== null && html && attributeName !== "style"
					? rewriteAttributeValue(
							elementName,
							attributeName,
							spellable,
							viewportMeta,
							enumeratedOn
						)
					: spellable !== null &&
						  svgKind !== undefined &&
						  (svgKind === "path"
								? S._shortenSvgPathData
								: S._shortenSvgNumbers)
						? shortenSvgNumericValue(spellable, svgKind) || spellable
						: spellable;
			// What the attribute ends up saying, whichever spelling it arrived in:
			// the bare name answers to that, not to the side the value was written.
			const settled = rewritten !== null ? rewritten : value;
			// A bare name ending in a quote would read as a quoted value's end, which
			// `separates` takes to part it from the next attribute.
			const lastOfName = attributeName.charCodeAt(attributeName.length - 1);
			if (
				tree._transforms.normalizeAttributeQuotes &&
				lastOfName !== CC_QUOTATION_MARK &&
				lastOfName !== CC_APOSTROPHE &&
				(settled === "" ||
					(html &&
						tree._transforms.collapseBooleanAttributes &&
						(tree._transforms.collapseBooleanAttributes === "all" ||
							(presence.length === attributeName.length &&
								asciiLowercase(presence) === attributeName)) &&
						isBooleanAttribute(elementName, attributeName)))
			) {
				out += ` ${attributeName}`;
				unquotedTail = false;
				consumedEnd = valueEnd;
				continue;
			}
			const isStyle = attributeName === "style";
			// A `style=""` carrying a character reference is a declaration list like
			// any other once decoded - `&quot;` is a quote to CSS, not an entity - so
			// it is minified from the decoded text and spelled back from there.
			const declarations =
				isStyle && spellable !== null ? minifyStyleAttribute(spellable) : null;
			// Read now: an answer arriving after the print finds the options reset.
			const bare = tree._transforms.normalizeAttributeQuotes;
			const written = isStyle
				? writeStyle(
						declarations !== null ? declarations : value,
						bare,
						attributeName,
						rawValue,
						spellable,
						quoted,
						sourceDelimiter
					)
				: writeAttribute(
						attributeName,
						value,
						rawValue,
						rewritten,
						quoted,
						sourceDelimiter
					);
			// The JavaScript an event handler holds, offered decoded - `&amp;&amp;`
			// is an operator to JavaScript rather than an entity. No built-in.
			const handler =
				!isStyle &&
				!verbatim &&
				(tree._renderEmbeddedSource !== undefined ||
					tree._deferEmbeddedSource !== undefined) &&
				isEventHandlerAttribute(elementName, attributeName)
					? hasReference
						? spellable
						: rawValue
					: null;

			if (handler !== null && stripAsciiWhitespace(handler) !== "") {
				const delimiter = sourceDelimiter;
				// A foreign `/>` reads back whether this value ends unquoted, which a
				// deferred answer is not there to decide: the source's quoting stands.
				const holdQuoted =
					tailIsRead && tree._deferEmbeddedSource !== undefined;
				// Declining leaves the attribute as an untapped run writes it, which is
				// the source spelling wherever nothing shorter was found.
				const asWritten =
					written === null || holdQuoted
						? ` ${attributeName}=${delimiter}${rawValue}${delimiter}`
						: written.text;
				const declinedTail =
					!holdQuoted && written !== null && written.unquotedTail;
				/**
				 * The answer is only written where it spells shorter than the source
				 * does: a minifier ends a statement it was handed without one, so a
				 * handler as short as `onclick="x"` comes back a byte longer.
				 * @param {string | null | undefined} rendered what the renderer answered
				 * @returns {{ text: string, unquotedTail: boolean } | null} what to emit, or null where nothing it answered is written
				 */
				const writeHandler = (rendered) => {
					if (typeof rendered !== "string") return null;

					// The answer is source text, so it is escaped for the delimiter it
					// lands in - an `&` in it opens a reference where it is not.
					const answered = holdQuoted
						? {
								text: writeQuotedAttribute(attributeName, rendered, delimiter),
								unquotedTail: false
							}
						: writeAttribute(
								attributeName,
								escapeAttribute(rendered, CC_QUOTATION_MARK, true),
								rawValue,
								rendered,
								quoted,
								sourceDelimiter
							);

					return answered !== null && answered.text.length < asWritten.length
						? answered
						: null;
				};

				if (tree._deferEmbeddedSource !== undefined) {
					// A marker opens with no space for the opened-space drop to take, so
					// the `/` goes and the answer's own space separates.
					out = dropDanglingSolidus(out, solidusAt);
					solidusAt = -1;
					openedSpaceAt = -1;
					out += deferEmbedded(
						handler,
						JAVASCRIPT_TYPE,
						(rendered) => {
							const answered = writeHandler(rendered);

							return answered === null ? asWritten : answered.text;
						},
						EVENT_HANDLER
					);
					unquotedTail = declinedTail;
					deferredEnd = out.length;
				} else {
					const answered = writeHandler(
						renderEmbeddedOrNull(handler, JAVASCRIPT_TYPE, EVENT_HANDLER)
					);

					out += answered === null ? asWritten : answered.text;
					unquotedTail =
						answered === null ? declinedTail : answered.unquotedTail;
				}
				consumedEnd = valueEnd;
				continue;
			}

			// A URL attribute's `data:` payload, offered decoded as its media type's
			// language and written back only where the rebuilt URL spells shorter.
			const dataUrl =
				html &&
				!isStyle &&
				!verbatim &&
				(tree._renderEmbeddedSource !== undefined ||
					tree._deferEmbeddedSource !== undefined)
					? attributeDataUrl(
							elementName,
							attributeName,
							hasReference ? /** @type {string} */ (spellable) : rawValue
						)
					: null;

			if (dataUrl !== null) {
				// HTML only, so no foreign `/>` reads back how this value ends.
				const asWritten =
					written === null
						? ` ${attributeName}=${sourceDelimiter}${rawValue}${sourceDelimiter}`
						: written.text;
				const declinedTail = written !== null && written.unquotedTail;
				/**
				 * @param {string | null | undefined} rendered what the renderer answered
				 * @returns {{ text: string, unquotedTail: boolean } | null} what to emit, or null where nothing it answered is written
				 */
				const writeDataUrl = (rendered) => {
					if (typeof rendered !== "string" || rendered === dataUrl.payload) {
						return null;
					}
					const url = buildDataURI(dataUrl.parsed, rendered);
					const answered = writeAttribute(
						attributeName,
						escapeAttribute(url, CC_QUOTATION_MARK, true),
						rawValue,
						url,
						quoted,
						sourceDelimiter
					);

					return answered !== null && answered.text.length < asWritten.length
						? answered
						: null;
				};

				if (tree._deferEmbeddedSource !== undefined) {
					// A marker opens with no space for the opened-space drop to take, so
					// the `/` goes and the answer's own space separates.
					out = dropDanglingSolidus(out, solidusAt);
					solidusAt = -1;
					openedSpaceAt = -1;
					out += deferEmbedded(dataUrl.payload, dataUrl.type, (rendered) => {
						const answered = writeDataUrl(rendered);

						return answered === null ? asWritten : answered.text;
					});
					unquotedTail = declinedTail;
					deferredEnd = out.length;
				} else {
					const answered = writeDataUrl(
						renderEmbeddedOrNull(dataUrl.payload, dataUrl.type)
					);

					out += answered === null ? asWritten : answered.text;
					unquotedTail =
						answered === null ? declinedTail : answered.unquotedTail;
				}
				consumedEnd = valueEnd;
				continue;
			}

			// Offered whatever the built-in made of it: a list already at its
			// shortest is one `writeAttribute` declines, not one to ask nobody about.
			if (
				isStyle &&
				!verbatim &&
				tree._deferEmbeddedSource !== undefined &&
				tree._embeddedAnswers === undefined
			) {
				// Declining leaves the attribute as written, delimiter and all - an
				// answer nothing beats is the renderer keeping what it was given.
				const delimiter = sourceDelimiter;
				const asWritten = ` ${attributeName}=${delimiter}${rawValue}${delimiter}`;
				// What stands until an answer arrives, and the tag ending it commits
				// to: the built-in's text where it beat the source, else the source.
				const standing = written !== null ? written.text : asWritten;
				const standingTail = written !== null && written.unquotedTail;

				// A marker opens with no space for the opened-space drop to take, so
				// the `/` goes and the answer's own space separates.
				out = dropDanglingSolidus(out, solidusAt);
				solidusAt = -1;
				openedSpaceAt = -1;
				// The list is deferred, not the shape around it: the tag ending is
				// read back before an answer arrives, so one changing it is declined.
				out += deferEmbedded(
					// Decoded when the source spelled it with references, since that
					// is the list itself rather than one attribute's spelling.
					spellable !== null ? spellable : rawValue,
					CSS_TYPE,
					(rendered) => {
						if (typeof rendered !== "string") return standing;

						const answered = writeStyle(
							rendered,
							bare,
							attributeName,
							rawValue,
							spellable,
							quoted,
							sourceDelimiter
						);
						// Declining ends the value quoted: this is the branch the
						// source spelled with a delimiter.
						const tail = answered !== null && answered.unquotedTail;

						if (tailIsRead && tail !== standingTail) return standing;

						return answered !== null ? answered.text : asWritten;
					},
					BLOCK_CONTENTS,
					// Written empty, it is the bare name or no attribute at all - and
					// the element holding it may go with it.
					(rendered) => rendered === ""
				);
				unquotedTail = standingTail;
				deferredEnd = out.length;
				consumedEnd = valueEnd;
				continue;
			}
			if (written !== null) {
				out += written.text;
				unquotedTail = written.unquotedTail;
				consumedEnd = valueEnd;
				continue;
			}
			// Quoting may be frozen, but a rewrite changed what the value says, so
			// the source's own spelling of it cannot stand.
			if (rewritten !== null && rewritten !== spellable) {
				out += writeQuotedAttribute(attributeName, rewritten, sourceDelimiter);
				unquotedTail = false;
				consumedEnd = valueEnd;
				continue;
			}
		}
		// A quoted value carries its quotes over; an unquoted one starts at the
		// value itself.
		out += ` ${attributeName}=${open.slice(
			(quoted ? valueStart - 1 : valueStart) - tagStart,
			valueEnd - tagStart
		)}`;
		unquotedTail = !quoted;
		consumedEnd = valueEnd;
	}
	tree._escapeTemplateOpeners = false;
	out = dropOpenedSpace(out, openedSpaceAt);
	out = dropDanglingSolidus(out, solidusAt);
	if (verbatim) {
		const tail = open.slice(consumedEnd - tagStart, -1);
		// The same fusing rule as between two attributes, over whatever the source
		// wrote before the `>`.
		return tail === "" || separates(out, unquotedTail, tail)
			? `${out}${tail}>`
			: `${out} ${tail}>`;
	}
	// WHY: a source `/>` self-closes a foreign element and survives there, but
	// only where the `/` is the flag: in `<a href=x/>` it ends an unquoted value,
	// and after one of those it needs a space or it fuses into the value. An HTML
	// element's parser ignores it, so there it goes.
	if (
		namespaceOf(path.node) !== NS_HTML &&
		tagEnd - 2 >= consumedEnd &&
		spellsSelfClosing(open)
	) {
		return `${out}${unquotedTail ? " /" : "/"}>`;
	}
	return `${out}>`;
};

// What marks an XML comment as a legal notice besides a `!` opening it: the
// annotations the CSS minifier keeps.
const XML_LEGAL_COMMENT_REGEXP = /@(?:license|preserve)/i;

/**
 * Whether a comment must survive minification: downlevel conditional comments
 * (`<!--[if ...]>` / `<![endif]-->`) drive IE branching, server-side includes
 * (`<!--#...-->`) are directives, and a `<?...?>` bogus comment is a server-side
 * template tag - all behavior-bearing. Under `"some"` an XML legal notice stays
 * too; every other comment is inert, so dropping it preserves meaning.
 * @param {string} data comment data (between `<!--` and `-->`)
 * @param {string} source the comment's source text, including its delimiters
 * @param {number} start the comment's start offset (at `<`)
 * @returns {boolean} true to keep the comment
 */
const keepComment = (data, source, start) => {
	// `<?php ... ?>` and `<%... %>` reach the tree as bogus comments (§13.2.5.42),
	// and the forms below drive IE branching or a server-side include. Every one
	// is code rather than a comment, so no level drops it.
	if (source.charCodeAt(1) === 63) return true;
	const trimmed = data.trimStart();
	// `<![` covers the downlevel-revealed forms: `<!--<![endif]-->` closers and
	// standalone `<![if ...]>` openers.
	if (
		trimmed.startsWith("[if") ||
		trimmed.startsWith("[endif") ||
		trimmed.startsWith("<![") ||
		trimmed.startsWith("#")
	) {
		return true;
	}
	const kept = S._commentsKept;
	if (typeof kept === "boolean") return kept;
	// Nothing left here carries anything a parser reads, so `"some"` keeps only an
	// XML legal notice: svgo keeps a `<!--!` banner by default, and CSS minifiers
	// a `/*!` one or an annotation, where HTML minifiers drop every comment.
	if (kept === "some") {
		return (
			S._xmlMode &&
			(data.charCodeAt(0) === 33 /* ! */ || XML_LEGAL_COMMENT_REGEXP.test(data))
		);
	}
	// A pattern or a predicate of the author's, over the comment's own text, with
	// its line and column for a caller placing it.
	if (S._commentLocs === undefined) {
		S._commentLocs = new LocConverter(S._commentInput, "html");
	}
	const loc = S._commentLocs.get(start);
	return kept(data, loc.line, loc.column) === true;
};

/**
 * One parsed HTML document and the state of the parse, walk and print reading
 * it: the node and attribute columns, the tokenizer and tree builder, the
 * per-run options and cursors. `S` is the tree being read; a run a visitor
 * starts parks it in a spare (see `swapTrees`), so the outer run finds it
 * untouched.
 */
class HtmlSyntaxTree {
	constructor() {
		// A run of adjacent `<style>` or `<script>` prints as one, so the elements
		// after the first print nothing; null until a document has a run.
		/** @type {Set<HtmlElement> | null} */
		this._absorbed = null;
		// The source open tag `_elementOpenTag` last read - its second result, passed
		// out of band so the per-element pair costs no object.
		this._elementOpenSource = "";
		// The caller's renderer for source nested in this document, set per print: the
		// only way any of it is minified, `builtinEmbeddedRenderer` being webpack's own.
		/** @type {EmbeddedSourceRenderer | undefined} */
		this._renderEmbeddedSource = undefined;
		// Where an asynchronous caller's embedded sources are recorded instead of
		// rendered, set per print; what the print decides from a body reads its source.
		/** @type {DeferredEmbeddedSource[] | undefined} */
		this._deferEmbeddedSource = undefined;
		// What a print before this one was answered, set where `processAsync` prints
		// again because an answer overturned a choice made without it.
		/** @type {((offer: Omit<DeferredEmbeddedSource, "build">) => string | undefined) | undefined} */
		this._embeddedAnswers = undefined;
		// Whether the body being rendered is written back escaped, set around a
		// foreign subtree's literal-text element: its answer arrives after the walk,
		// so the escaping rides with the deferred write rather than the printer.
		this._escapeEmbedded = false;
		/** @type {Map<HtmlNodeRef, HtmlNodeRef[]> | null} */
		this._fosteredRuns = null;
		/** bits 0-1 namespace (`NS_*`), bit 2 self-closing (void), bit 3 template content */
		this._flags = EMPTY_U8;
		// Whether a run of adjacent `<style>` elements prints as one (see
		// `HtmlProcessOptions`), off unless asked for: it removes elements, which
		// `document.styleSheets` and a `:nth-child` selector read.
		this._mergeStyles = false;
		// Print a run of adjacent bare `<script>` elements as one.
		this._mergeScripts = false;
		// How far text whitespace may be collapsed (see `HtmlProcessOptions`) - set per
		// print, like `_minifying`. "none" is off; the rest name how much of the
		// whitespace against a boundary no line box reaches goes with it.
		/** @type {"none" | "conservative" | "smart" | "all"} */
		this._collapseWhitespace = "none";
		// Whether the last parse read XML, which the printer then writes back as XML.
		this._xmlMode = false;
		// Whether that XML expanded an entity into markup, so it prints as written.
		this._xmlVerbatim = false;
		// Whole-document properties, so a substring cannot hold what the input does not,
		// and decoding introduces neither: a numeric reference to 0 yields U+FFFD, and
		// CR normalization runs on the raw slice first. An unset flag costs the old scan.
		this.inputHasCr = true;
		// The offset of the source's next `&` (its length when none is left); -1
		// until a text run asks.
		this.nextAmpersand = -1;
		// ---- HTML tree-construction parser state ----
		// What each token reads and writes: a field of this constant object is read
		// without the initialization check an access to a closed-over `let` pays.
		this._nodeCapacity = 0;
		this._nodeCount = 0;
		// One attribute is one integer id here, and an element holds a contiguous run.
		// Values are read from the source by offset and the serializer name from the
		// adjusted name, so only the name pointer is retained per attribute.
		this._attrCapacity = 0;
		this._attrCount = 0;
		this.inputHasNul = true;
		this.skipText = false;
		/** the insertion mode, a `MODE_*` */
		this.mode = 0;
		this.framesetOk = true;
		this.pendAttrStart = 0;
		// Whether §13.2.5.33 dropped a repeated name from the tag being read; a tag
		// that dropped none needs no word test, keeping it off the per-attribute path.
		this.pendAttrDropped = false;
		this.fosterParenting = false;
		this.tokenEnd = 0;
		this.swallowNextNewline = false;
		this.eofInTag = false;
		/** @type {HtmlParseOptions["parseError"]} the running `parseHtml` call's callback */
		this._parseError = undefined;
		// Whether the start tag being processed had its self-closing flag acknowledged.
		this.selfClosingAcknowledged = false;
		/** @type {boolean} whether this parse may stream its walk (owned by `grammar`) */
		this._streamEligible = false;
		/** set when `open` was spliced mid-stack, so the next sync scans it in full */
		this._openSpliced = false;
		/** set by `popOpen`: the open stack changed, so the walk has work at token end */
		this._openStackChanged = false;
		// The tree itself, valid until this tree's next parse.
		this._input = "";
		/** @type {HtmlElement} 0 = none */
		this.head = 0;
		this._firstChildren = EMPTY_I32;
		/** `NodeType` per node */
		this._types = EMPTY_U8;
		this._nextSiblings = EMPTY_I32;
		// The other node columns sit here too: a column read off this constant object
		// costs the optimizer no initialization or type check, a `let` binding both.
		this._starts = EMPTY_I32;
		this._ends = EMPTY_I32;
		/** end offset of an element's opening tag (after `>`) */
		this._tagEnds = EMPTY_I32;
		/** end offset of an element's tag name */
		this._nameEnds = EMPTY_I32;
		/**
		 * under `skip.text`, a raw-text element's body-end offset (`HtmlAstSkip`); for
		 * a `<template>` (`FLAG_HAS_TEMPLATE`) it instead holds the content-fragment ref
		 */
		this._contentEnds = EMPTY_I32;
		this._parents = EMPTY_I32;
		this._lastChildren = EMPTY_I32;
		/** first attribute id of an element's contiguous run */
		this._attrStarts = EMPTY_I32;
		/** attribute count of an element's run */
		this._attrCounts = EMPTY_I32;
		// Which attribute defaults may be dropped (see `HtmlProcessOptions`), off
		// unless asked for: whichever tier drops one, the page stops carrying an
		// attribute that `getAttribute` and every attribute selector read.
		/** @type {"none" | "smart" | "all"} */
		this._removeRedundantAttributes = "none";
		// Whether the document declares UTF-8, which makes `<script charset=utf-8>` redundant.
		/** @type {boolean | undefined} */
		this._declaresUtf8 = false;
		// The `<script charset=utf-8>` pieces printed dropped while that answer is
		// still out, each with the text it writes back where the answer is no.
		/** @type {number[] | null} */
		this._heldCharsets = null;
		/** @type {string[]} */
		this._heldCharsetTexts = [];
		// Out of band from `minifyOpenTag`: an undecided charset it met, whether it
		// prints that one, and the tag it held for `emitOpening` to split.
		this._charsetUndecided = false;
		this._keepUndecidedCharset = false;
		/** @type {HtmlNodeRef} */
		this._heldTagNode = 0;
		this._heldTagDropped = "";
		this._heldTagKept = "";
		// What marks carry between `charset` and their id, undefined until asked, and
		// the dropped and kept text of each tag marked in an element printed whole.
		/** @type {string | undefined} */
		this._charsetMarkInfix = undefined;
		/** @type {string[]} */
		this._markedCharsets = [];
		/** @type {Map<HtmlNodeRef, HtmlNodeRef> | null} */
		this._fosteredNodes = null;
		// Tables whose run has to move but cannot be replayed by re-nesting it. Their own
		// source is what produced the tree, so it is what prints.
		/** @type {Set<HtmlNodeRef> | null} */
		this._fosterVerbatim = null;
		/** @type {Set<HtmlNodeRef> | null} */
		this._fosterHolders = null;
		// ---- per-parse and per-run state ----
		// Set while a value whose character references decode to more template
		// delimiters than its source spells literally is re-spelled.
		this._escapeTemplateOpeners = false;
		// Highest id `_nodeCount` reached this parse. Streaming rewinds the allocator,
		// so `_nodeCount` no longer bounds the ids written, and the release pass has to
		// clear up to here or a recycled slot keeps its strings alive.
		this._nodeHighWater = 0;
		/** @type {string[]} tag name / text data / comment data / doctype name */
		this._strings = [];
		// The single doctype node's public/system ids (a document inserts at most one
		// doctype node - later doctype tokens are ignored - so no column is needed).
		/** @type {string | null} */
		this._doctypePublicId = null;
		/** @type {string | null} */
		this._doctypeSystemId = null;
		// Where the doctype's identifiers are written, -1 without one.
		this._doctypePublicStart = -1;
		this._doctypePublicEnd = -1;
		this._doctypeSystemStart = -1;
		this._doctypeSystemEnd = -1;
		// Elements a repeated `<html>` / `<body>` start tag merged attributes onto
		// (§13.2.6.4.4, §13.2.6.4.7). The merged names are not in the element's source
		// open tag, so the printer rebuilds that tag instead of echoing it.
		/** @type {Set<number>} */
		this._mergedAttrNodes = new Set();
		// Attribute runs whose start tag dropped a duplicate name and spells one no
		// HTML vocabulary does: the printer hands those back whole (see `isWordSpan`).
		/** @type {Set<number>} */
		this._foreignSyntaxAttrRuns = new Set();
		// A processing instruction's target; its data rides in `_strings` like a
		// comment's. A map, since a second string column per node would cost more.
		/** @type {Map<HtmlNodeRef, string>} */
		this._piTargets = new Map();
		this._attrNameStarts = EMPTY_I32;
		this._attrNameEnds = EMPTY_I32;
		this._attrValueStarts = EMPTY_I32;
		this._attrValueEnds = EMPTY_I32;
		/** bit 0: name has a `FOREIGN_ATTR_NS` serializer name (set on foreign adjust) */
		this._attrFlags = EMPTY_U8;
		/** @type {string[]} lowercased (foreign-content: adjusted) attribute name */
		this._attrNames = [];
		/** @type {(string | null)[]} value override (null = slice the source by offset) */
		this._attrValues = [];
		/** @type {LocConverter | undefined} made by the first `A.loc` of a parse */
		this._locConverter = undefined;
		this._skipComments = false;
		this._skipDoctype = false;
		/** @type {HtmlNodeRef} */
		this._doc = 0;
		this._originalMode = 0;
		/** @type {HtmlElement[]} stack of open elements (bottom .. top) */
		this._open = [];
		/** @type {HtmlNodeRef[]} active formatting elements (AFE_MARKER = marker) */
		this._afe = [];
		/** @type {HtmlElement} 0 = none */
		this._form = 0;
		/** @type {number[]} */
		this._templateModes = [];
		this._quirks = false;
		// The document mode depends on the reader (see `isDisputedDoctype`).
		this._quirksDisputed = false;
		// The scripting flag (§13.2.2): set, a `noscript` is a raw text element.
		this._scripting = false;
		// An `<iframe srcdoc>` document, which §13.2.6.4.1 never puts in quirks mode.
		this._srcdocDocument = false;
		/** @type {HtmlElement} fragment context element (0 = document parse) */
		this._fragment = 0;
		// Which of `</html>` / `</head>` / `</body>` the source spelled, per parse: the
		// tree records no end tag, and `removeImpliedTags` keeps the ones that were written.
		this._sourceShellEnds = 0;
		// A fragment whose context holds raw text: no start tag opened it, so no end
		// tag is appropriate to it, while the tokenizer takes the context's name as one.
		this._fragmentRawText = false;
		this._sawSelectedContent = false;
		/** @type {Map<string, string> | null} internal general entities the DOCTYPE declared */
		this._xmlEntities = null;
		// Normalized XML attribute values by attribute id, decoded once per parse: a
		// column as the attribute's others are, since ids are dense and handed out in order.
		/** @type {((string | undefined)[] | undefined)[]} */
		this._xmlAttributeValues = [];
		// The first `&` in the source at or past the last attribute value asked about,
		// the source's length for none, -1 before any: a parse asks in source order,
		// so it searches the source for one once.
		this._xmlNextAmpersand = -1;
		// The source range of the entity reference being tokenized, -1 outside one:
		// what the replacement text builds is reported there.
		this._xmlEntityRangeStart = -1;
		/** @type {Map<string, boolean> | null} which entities expand to markup, as far as asked */
		this._xmlMarkupEntities = null;
		this._xmlEntityRangeEnd = -1;
		/** @type {Map<string, Map<string, XmlAttributeDeclaration>> | null} attributes the DOCTYPE declared, per element */
		this._xmlAttributeDeclarations = null;
		/** @type {string[]} entities being expanded, innermost last */
		this._xmlEntityStack = [];
		this._xmlExpansionBudget = 0;
		// What an entity referenced outside any other decodes to, and the budget
		// that spent, per parse and kept only while it runs. The budget only shrinks,
		// so while what is left covers a result, decoding again would give it again.
		/** @type {Map<string, { text: string, cost: number }> | null} */
		this._xmlTextEntityMemo = null;
		/** @type {Map<string, { text: string, cost: number }> | null} */
		this._xmlAttributeEntityMemo = null;
		this._xmlEntityMemoOpen = false;
		/** @type {MutableToken} */
		this._tok = {
			type: TOKEN_EOF,
			name: "",
			data: "",
			attrs: { start: 0, count: 0 },
			selfClosing: false,
			start: 0,
			end: 0,
			publicId: null,
			systemId: null,
			publicStart: -1,
			publicEnd: -1,
			systemStart: -1,
			systemEnd: -1,
			forceQuirks: false,
			swallowNewline: false,
			pos: { start: 0, end: 0, tagEnd: 0, nameEnd: 0 }
		};
		// Reused result of `appropriatePlace` - consumed synchronously by
		// `insertAtPlace` and never retained, so one shared object avoids an
		// allocation per inserted node.
		/** @type {InsertionPlace} */
		this._sharedPlace = { parent: this._doc, beforeNode: 0 };
		/** @type {{ list: CharToken[], hasNonWs: boolean } | null} */
		this._pendingTableChars = null;
		// Sub-ranges of the instruction last scanned, read only right after a match.
		this._piScanTargetEnd = 0;
		this._piScanDataStart = 0;
		this._piScanDataEnd = 0;
		// Which rewrites this print makes. One object rather than a flag apiece: it is
		// read straight off the options, and a fixed shape keeps each read monomorphic.
		/** @type {Required<HtmlTransformOptions>} */
		this._transforms = DEFAULT_TRANSFORMS;
		// Whether this run is minifying, for the tests that run before `printer` does and
		// have to predict what it will drop.
		this._minifying = false;
		this._deferSrcdoc = true;
		// Whether an empty `class` / `id` / `style` / `dir` may go (see
		// `HtmlProcessOptions`), off unless asked for: a presence selector reads it.
		this._removeEmptyAttributes = false;
		// Whether a childless, attribute-less element may go (see
		// `HtmlProcessOptions`), off unless asked for: CSS can give one a size or a
		// `::before`, and this cannot see the stylesheet.
		this._removeEmptyElements = false;
		/**
		 * Whether each element ends up empty in the output, memoized: the answer is
		 * fixed for a parse, and the walk that finds it is the whole subtree.
		 * @type {Map<HtmlNodeRef, boolean>}
		 */
		this._emptyElements = new Map();
		// Which comments this print keeps, with a pattern already compiled to the
		// predicate it stands for - `true` every one, `false` none, `"some"` the ones
		// that carry something (see `keepComment`).
		/** @type {boolean | "some" | ((comment: string, line: number, column: number) => boolean)} */
		this._commentsKept = "some";
		// The source a predicate's comment stands in, and the converter placing one,
		// built on the first comment asked about.
		this._commentInput = "";
		/** @type {LocConverter | undefined} */
		this._commentLocs = undefined;
		// The two reorderings (see `HtmlProcessOptions`), off unless asked for: neither
		// changes what anything matches, but both change what a script reading
		// `element.attributes` or `className` back sees.
		this._sortAttributes = false;
		this._sortTokenLists = false;
		// The quote an XML attribute takes when both cost the same (see `xmlQuote`).
		/** @type {"\"" | "'"} */
		this._xmlQuote = '"';
		this._removeSvgMetadata = false;
		this._removeSvgEditorData = false;
		/** @type {Set<HtmlNodeRef>} */
		this._svgIdAncestors = new Set();
		this._removeUnusedSvgNamespaces = false;
		this._shortenSvgNumbers = false;
		// Decimal places SVG numbers round to, or -1 to keep them exact.
		this._svgPrecision = -1;
		// Decimal places a recomposed transform's angle rounds to, or -1 to keep it.
		this._svgAnglePrecision = -1;
		// Whether curves fit arcs as svgo checks them, at three points and unrounded.
		this._looseSvgArcs = false;
		this._shortenSvgTransformFunctions = false;
		// Whether a transform list may be recomposed within the precision.
		this._convertSvgTransforms = false;
		// Whether disjoint paths of any shape may merge, at a shared pixel's cost.
		this._mergeDisjointSvgPaths = false;
		this._shortenSvgColors = false;
		this._shortenSvgPathData = false;
		/** @type {Set<number> | null} */
		this._xmlColorAttributes = null;
		/** @type {Map<number, string> | null} */
		this._xmlShortenedNumbers = null;
		/** @type {Set<HtmlNodeRef> | null} */
		this._xmlRemovedNodes = null;
		/** @type {Set<number> | null} */
		this._xmlRemovedAttributes = null;
		/** @type {Map<number, string> | null} */
		this._xmlRenderedStyles = null;
		// Foster parenting puts a node before the table it was written inside, so tree
		// and source order disagree there; it is recorded where it happens. The tree
		// then holds what no arrangement of tags reaches.
		this._printFromSource = false;
		/** @type {HtmlNodeRef[] | null} this parse's fosters, flat: table, then node */
		this._fosteredLog = null;
		/** @type {Map<HtmlNodeRef, boolean> | null} */
		this._fosterMoves = null;
		// That holder and everything still open around it: the slice runs to where the
		// source stopped, so an end tag none of them was given cannot be invented here.
		/** @type {Set<HtmlNodeRef> | null} */
		this._fosterOpenTail = null;
		/** @type {number} how far the furthest verbatim span reached */
		this._fosterSpanEnd = 0;
		// WHY: how much of the `<html>` / `<head>` / `<body>` shell §13.1.2.4 lets the
		// parser imply may be left out. Every other optional tag goes unconditionally,
		// since nothing can observe that, but these six are what a consumer reading the
		// page with a regexp rather than a parser looks for. `"smart"` drops the one
		// such a reader never matches: the `<html>` start tag, omittable only with no
		// attribute at all, so the `<html lang=en>` anyone greps for keeps its tag.
		// `</html>` stays with it, since a truncation check reads a page as complete by
		// finding one.
		/** @type {"none" | "smart" | "all"} */
		this._removeImpliedTags = "smart";
		// Each `<style>` body the emptiness check rendered, by its text, until the
		// printer takes it - so asking whether a sheet prints does not render it twice.
		/** @type {Map<string, string> | null} */
		this._renderedSheets = null;
		// One list's token spans, reused: ordering a list allocates only its result.
		/** @type {number[]} */
		this._tokenSpanStarts = [];
		/** @type {number[]} */
		this._tokenSpanEnds = [];
		// A hash of each span's length and edge code units, so two tokens that cannot
		// be equal are told apart without reading either.
		/** @type {number[]} */
		this._tokenSpanKeys = [];
		// Reused by `sortedAttributes`: one element's attribute indices and their
		// ranks, so ordering a tag allocates nothing.
		/** @type {number[]} */
		this._sortOrderScratch = [];
		/** @type {number[]} */
		this._sortKeyScratch = [];
		// The print order is a property of the document, so resolving a name to its
		// rank once leaves the per-element sort comparing two integers.
		/** @type {Map<string, number> | null} */
		this._attributeRanks = null;
		// The element whose text runs to the end of the input, past where any end tag
		// could close it, and every element holding it; set per print, null for none.
		/** @type {Set<HtmlNodeRef> | null} */
		this._plaintextHolders = null;
		// Whether anything follows that element in tree order, which a print in tree
		// order would write after it, where it re-parses as its text.
		this._plaintextTrails = false;
		// What `streamTags` decided for the element just entered - passed out of band
		// so each streamed element costs no result object.
		this._streamOpen = "";
		this._streamClose = "";
		// The close that goes with a held-back start tag once it prints: an element
		// whose tag the parser no longer re-implies answers to `removeImpliedTags`.
		this._streamCloseIfOpened = "";
		// Which held-back opener `emitPiece` settled into a start tag, `-1` for none.
		this._materializedPendingSlot = -1;
		/** @type {string[]} */
		this._printCloseIfOpened = [];
		this._streamImplied = "";
		// Whether this print wrote a `</form>` in front of a nested form; reset per print.
		this._nestedFormPrinted = false;
		/** @type {CompiledVisitorMap} */
		this._walkVisitors = EMPTY_VISITORS;
		/** @type {PrintContext | undefined} */
		this._writer = undefined;
		// The node a printing walk went on below after its `enter` called
		// `skipChildren()`, and the visitors held back until it exits; 0 for none.
		this._printSkipped = 0;
		/** @type {CompiledVisitorMap} */
		this._skippedVisitors = EMPTY_VISITORS;
		// The node `A.replace` named last, which therefore does not print in
		// pieces; 0 before any, so a walk that replaces nothing checks no more.
		this._replacedNode = 0;
		// WHY: printing in pieces.
		// The printer composes a node from its children's text, so the store would
		// hold every node's until the root is taken - several times the output on a
		// document of any size. A node whose text is exactly `open + children + close`
		// instead emits its opener as it opens and its closer as it exits, with each
		// child going straight out as it finishes, so the store only ever holds the
		// subtrees that cannot. Indexed by print depth, which is the open path.
		/** @type {number} depth of the node the printing walk is on (maintained by `walkRun`) */
		this._printDepth = 0;
		/** @type {number[]} 1 while the node at that depth prints in pieces */
		this._printOpen = [];
		/** @type {string[]} the closer the node at that depth still owes */
		this._printClose = [];
		// An omitted `<html>` / `<body>` only materializes when the first thing inside it
		// is whitespace, which is known once the first piece is emitted - so its opener
		// waits in the writer's pending stack until then.
		/** @type {string[]} names of the elements whose openers are held back, innermost last */
		this._printPendingNames = [];
		/** @type {number[]} pending-stack slot of the node at that depth, -1 for none */
		this._printPendingSlot = [];
		/** set when the root's `enter` called `skipChildren()`, so only its `exit` fires */
		this._docSkipped = false;
		/** @type {boolean} whether the walk has started streaming (see `STREAM_MIN_NODES`) */
		this._streaming = false;
		/** @type {HtmlElement[]} open elements whose `enter` has already fired */
		this._entered = [];
		/** `_entered` index whose `enter` called `skipChildren()` (-1 = none) */
		this._skipFrom = -1;
		// WHY: set when a mid-stack `open.splice` removes an element the walk already
		// entered, such as a `</form>` with content still open inside it. The element
		// leaves the stack without its subtree ending, so the stack no longer describes
		// what has finished and reconciling against it would close and re-enter live
		// elements. Rare enough to stop streaming for the rest of the parse: what is
		// visited stays visited, and the remainder is walked at EOF.
		this._streamHalted = false;
		// Children-only skip: set by `A.skipChildren()` during an
		// `enter` dispatch, consumed by the walk.
		this._walkSkipped = false;
		// Set by `A.stop()` for the rest of the parse: no visitor fires after it, and a
		// walk-only parse ends there, the next parse resetting what it left.
		this._walkStopped = false;
		// The visitor lists `A.stop()` emptied in place, put back when the parse ends.
		/** @type {VisitorFn[][] | null} */
		this._walkHalted = null;
		// The walk's current position, the only thing it writes per visit: `A.parent`
		// and `A.index` are read off the link columns when asked.
		/** @type {HtmlNodeRef} */
		this._walkNode = 0;
		this._cursorParents = new Int32Array(CURSOR_SLOTS);
		this._cursorEpochs = new Int32Array(CURSOR_SLOTS);
		this._cursorIndexes = new Int32Array(CURSOR_SLOTS);
		this._cursorChildren = new Int32Array(CURSOR_SLOTS);
		this._cursorCounts = new Int32Array(CURSOR_SLOTS);
		this._cursorEpoch = 1;
	}
}

/**
 * An element's open tag as it stands in the source, before any minifying; also
 * left in `_elementOpenSource`.
 * @param {HtmlPath} path positioned on the element
 * @returns {string} its source open tag
 */
const openTagSource = (path) => {
	// A repeated `<html>` / `<body>` start tag adds its unseen attributes to the
	// open element and is itself dropped, so that element's source tag no longer
	// spells its attributes - rebuild it rather than echo a stale one.
	const node = path.node;
	const source =
		S._mergedAttrNodes.size !== 0 && S._mergedAttrNodes.has(node)
			? synthesizeOpenTag(path)
			: openTagOf(node);
	S._elementOpenSource = source;
	return source;
};

/**
 * Whether an XML element can print anything between its tags: minifying drops
 * the comments a `<a/>` then stands in for.
 * @param {HtmlPath} path positioned on the element
 * @param {boolean} minify whether minifying
 * @returns {boolean} true when a child may print
 */
const xmlPrintsChildren = (path, minify) => {
	for (let c = firstChild(path.node); c !== 0; c = nextSibling(c)) {
		if (!minify || S._types[c] !== NodeType.Comment) return true;
	}
	return false;
};

// The namespaces whose `<style>` and `style=""` hold CSS; in any other one the
// same names are data a stylesheet has nothing to do with.
const XML_STYLED_NAMESPACES = new Set([
	"http://www.w3.org/2000/svg",
	"http://www.w3.org/1999/xhtml"
]);

// Some SVG readers reject `0e39`, though it is mathematically zero. Bound the
// exponent before omitting a zero, and never round tiny nonzero values to zero.
const SVG_ZERO_NUMBER =
	/^[+-]?(?:0+(?:\.0*)?|\.0+)(?:[eE][+-]?0*(?:[0-9]|[12][0-9]|3[0-8]))?$/;

/**
 * Shorten a plain decimal without changing exponent notation, rounding it only
 * where `svgPrecision` asks.
 * @param {string} value validated SVG number
 * @returns {string} an equal numeric spelling, or the rounded one
 */
const shortenSvgNumber = (value) => {
	if (S._svgPrecision !== -1) {
		value = roundSvgDecimal(value, S._svgPrecision);
	}
	if (value.includes("e") || value.includes("E")) {
		const expanded = expandSvgExponent(value);
		return expanded.length < value.length ? expanded : value;
	}
	const negative = value.charAt(0) === "-";
	let start = negative || value.charAt(0) === "+" ? 1 : 0;
	let end = value.length;
	const dot = value.indexOf(".");
	if (dot !== -1) {
		while (end > dot + 1 && value.charAt(end - 1) === "0") end--;
		if (end === dot + 1) end = dot;
	}
	while (start < end && value.charAt(start) === "0") start++;
	return (negative ? "-" : "") + (value.slice(start, end) || "0");
};

/**
 * Write out an integer's non-negative exponent where both spellings are exact float32 integers.
 * Blink reads SVG numbers as float32, summing a fraction digit by digit, so larger values, fractions and negative exponents stay.
 * @param {string} value a number with an exponent
 * @returns {string} its plain spelling, or the value when that is not exact
 */
const expandSvgExponent = (value) => {
	const match = /^([+-]?)(\d+)(?:\.0*)?[eE]\+?(\d+)$/.exec(value);
	// A larger exponent overflows Blink's power of ten, even for a zero.
	if (match === null || Number(match[3]) > 15) return value;
	const integer = match[2] + "0".repeat(Number(match[3]));
	// Past 2 ** 24 a float32 rounds integers, so the two spellings can read apart.
	if (Number(integer) > 16777216) return value;
	return shortenSvgNumber((match[1] === "-" ? "-" : "") + integer);
};

/**
 * Append path numbers after what is printed, with the fewest separators a parser splits.
 * @param {string} output what is printed so far
 * @param {string[]} numbers the spelled numbers
 * @returns {string} the output with the numbers appended
 */
const appendSvgPathNumbers = (output, numbers) => {
	for (const number of numbers) {
		// Read the last number back from the end: a scan from the start is quadratic.
		// Digits after a dot are its fraction; an exponent's digits follow a letter or sign.
		let index = output.length;
		while (index > 0 && isAsciiDigit(output.charCodeAt(index - 1))) index--;
		const fraction = output.charAt(index - 1) === ".";
		const ends = fraction || index !== output.length;
		output +=
			!ends ||
			number.charAt(0) === "-" ||
			(number.charAt(0) === "." && fraction)
				? number
				: ` ${number}`;
	}
	return output;
};

/**
 * A repeated command, or a line after a move, is implied; a repeated move must
 * keep its letter, or it reads as a line.
 * @param {string} letter the command letter to print
 * @param {string} previous the letter printed last
 * @returns {boolean} whether the letter can be left out
 */
const impliesSvgPathCommand = (letter, previous) =>
	(letter === previous && letter !== "M" && letter !== "m") ||
	(letter === "L" && previous === "M") ||
	(letter === "l" && previous === "m");

/**
 * Whether a control point lies on the chord from the current point to an end point.
 * On the chord, between its ends, a curve traces the chord once.
 * @param {number} x0 the current point's scaled x
 * @param {number} y0 the current point's scaled y
 * @param {number[]} points scaled absolute points of the segment
 * @param {number} control where the control's x sits in them
 * @param {number} end where the end point's x sits in them
 * @returns {boolean} true when the control is on the chord
 */
const onSvgChord = (x0, y0, points, control, end) => {
	const dx = points[end] - x0;
	const dy = points[end + 1] - y0;
	const cx = points[control] - x0;
	const cy = points[control + 1] - y0;
	const dot = cx * dx + cy * dy;
	return (
		(dx !== 0 || dy !== 0) &&
		cx * dy - cy * dx === 0 &&
		dot >= 0 &&
		dot <= dx * dx + dy * dy
	);
};

/**
 * Spell a path's leading `M x y l` as `m x y`, whose later pairs are relative lines.
 * The first move is absolute either way, so the points stay exactly where they were.
 * @param {string} data path data
 * @returns {string} the data, a letter shorter where its first line needs no separator
 */
const implySvgPathLines = (data) => {
	if (data.charAt(0) !== "M") return data;
	// Each number read whole, as the path grammar reads it, never split to make a pair.
	const number = /[\t\n\r ,]*[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/y;
	number.lastIndex = 1;
	const first = number.exec(data);
	const second = first === null ? null : number.exec(data);
	const end = number.lastIndex;
	if (second === null || data.charAt(end) !== "l") return data;
	const pair = data.slice(1, end);
	const rest = data.slice(end + 1);
	// A sign always starts a number; a dot does only after a number holding one.
	// Elsewhere a space takes the letter's place, which saves nothing.
	return rest.charAt(0) === "-" ||
		rest.charAt(0) === "+" ||
		(rest.charAt(0) === "." && /\.\d*$/.test(pair))
		? `m${pair}${rest}`
		: data;
};

/**
 * Rewrite path data with every point rounded where it lands, so error never
 * accumulates; relative source segments may stay relative, between rounded points.
 * @param {string} value the `d` value
 * @param {number} places decimal places to keep
 * @returns {string | null} the rounded data, or null where it does not parse to its end
 */
const roundSvgPath = (value, places) => {
	const scale = 10 ** places;
	const text = trimSvgValue(value);
	// A number that overflows once scaled has no rounded spelling; the exact shortener keeps it.
	const numbers = text.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/g);
	for (const number of numbers || []) {
		if (!Number.isFinite(Number(number) * scale)) return null;
	}
	const argumentCounts = {
		m: 2,
		l: 2,
		h: 1,
		v: 1,
		c: 6,
		s: 4,
		q: 4,
		t: 2,
		a: 7
	};
	const flag = /[\t\n\f\r ]*,?[\t\n\f\r ]*([01])/y;
	const leadingComma = /[\t\n\f\r ]*,/y;
	let index = 0;
	/**
	 * @param {boolean} isFlag whether an arc flag, a single 0 or 1, is next
	 * @returns {number | null} the number read, or null where none is there
	 */
	const read = (isFlag) => {
		const pattern = isFlag ? flag : SVG_DATA_NUMBER_REGEXP;
		pattern.lastIndex = index;
		const found = pattern.exec(text);
		if (found === null) return null;
		index = pattern.lastIndex;
		return Number(found[1]);
	};
	/**
	 * @param {number} scaled a value times the scale
	 * @returns {string} its decimal spelling
	 */
	const format = (scaled) => shortenSvgNumber(String(scaled / scale));
	// True positions, and the rounded ones a renderer reaches from what is printed.
	let x = 0;
	let y = 0;
	let startX = 0;
	let startY = 0;
	let roundX = 0;
	let roundY = 0;
	let roundStartX = 0;
	let roundStartY = 0;
	let previous = "";
	// The kind of curve that last ended, and the control a smooth one reflects.
	let curve = "";
	let controlEndX = 0;
	let controlEndY = 0;
	// The kind of curve last printed, which a printed smooth curve reflects.
	let printed = "";
	let output = "";
	for (;;) {
		const command = /^[\t\n\f\r ]*([A-Za-z])/.exec(text.slice(index));
		if (command === null) {
			return /^[\t\n\f\r ]*$/.test(text.slice(index)) && output !== ""
				? output
				: null;
		}
		index += command[0].length;
		const letter = command[1];
		const lower = letter.toLowerCase();
		if (lower === "z" && previous !== "") {
			x = startX;
			y = startY;
			roundX = roundStartX;
			roundY = roundStartY;
			// A smooth curve after a close reflects nothing.
			curve = "";
			printed = "";
			output += "z";
			previous = "z";
			continue;
		}
		const arity =
			argumentCounts[/** @type {keyof typeof argumentCounts} */ (lower)];
		if (arity === undefined || (previous === "" && lower !== "m")) return null;
		const relative = letter === lower;
		// No comma may follow a command letter, which an error stops rendering at.
		leadingComma.lastIndex = index;
		if (leadingComma.test(text)) return null;
		for (let first = true; ; first = false) {
			/** @type {number[]} */
			const args = [];
			for (let n = 0; n < arity; n++) {
				const number = read(lower === "a" && (n === 3 || n === 4));
				if (number === null) break;
				args.push(number);
			}
			if (args.length === 0 && !first) break;
			if (args.length !== arity) return null;
			// Pairs after a move are lines.
			let kind = lower === "m" && !first ? "l" : lower;
			/** @type {string[]} */
			let absolute = [];
			/** @type {number[]} */
			const points = [];
			for (let n = 0; n < arity; n++) {
				// Arc radii, rotation and flags are no coordinates.
				if (kind === "a" && n < 5) {
					const spelled =
						n === 3 || n === 4
							? String(args[n])
							: format(Math.round(args[n] * scale));
					absolute.push(spelled);
					points.push(0);
					continue;
				}
				const horizontal =
					kind === "h" ||
					(kind !== "v" && (kind === "a" ? n === 5 : n % 2 === 0));
				const point = Math.round(
					(relative ? (horizontal ? x : y) + args[n] : args[n]) * scale
				);
				points.push(point);
				absolute.push(format(point));
			}
			const endX = lower === "v" ? roundX : points[arity === 1 ? 0 : arity - 2];
			const endY = lower === "h" ? roundY : points[arity - 1];
			// An arc ending where it starts is not drawn, so rounding must not close one.
			if (
				kind === "a" &&
				endX === roundX &&
				endY === roundY &&
				(relative
					? args[5] !== 0 || args[6] !== 0
					: args[5] !== x || args[6] !== y)
			) {
				return null;
			}
			// A smooth curve's first control is worked out, reflected as a renderer
			// does from the rounded points, so the chord and axis checks see it.
			const smooth = kind === "s" || kind === "t";
			let reflect = false;
			if (smooth) {
				reflect = curve === (kind === "s" ? "c" : "q");
				const controlX = reflect ? 2 * roundX - controlEndX : roundX;
				const controlY = reflect ? 2 * roundY - controlEndY : roundY;
				points.unshift(controlX, controlY);
				absolute.unshift(format(controlX), format(controlY));
				kind = kind === "s" ? "c" : "q";
			}
			if (kind === "c" || kind === "q") {
				controlEndX = points[points.length - 4];
				controlEndY = points[points.length - 3];
			}
			curve = kind === "c" || kind === "q" ? kind : "";
			// What draws a straight line is a line: a zero-radius arc and a curve
			// whose controls sit on its chord.
			const end = points.length - 2;
			if (
				(kind === "a" &&
					(Math.round(args[0] * scale) === 0 ||
						Math.round(args[1] * scale) === 0)) ||
				(kind === "c" &&
					onSvgChord(roundX, roundY, points, 0, 4) &&
					onSvgChord(roundX, roundY, points, 2, 4)) ||
				(kind === "q" && onSvgChord(roundX, roundY, points, 0, 2))
			) {
				absolute = absolute.slice(end);
				points.splice(0, end);
				kind = "l";
			}
			// A line along one axis is shorter as H or V. An absolute one is left to
			// the shortener's gate: the renderer's current point is a float32 sum.
			if (
				kind === "l" &&
				relative &&
				(points[1] === roundY || points[0] === roundX)
			) {
				const along = points[1] === roundY ? 0 : 1;
				kind = along === 0 ? "h" : "v";
				absolute = [absolute[along]];
				points.splice(0, points.length, points[along]);
			}
			// A smooth curve stays smooth where the printed curve before it lends
			// the same first control a renderer reflects, or none to reflect.
			if (
				smooth &&
				(kind === "c" || kind === "q") &&
				(reflect ? printed === kind : printed !== kind)
			) {
				absolute = absolute.slice(2);
				points.splice(0, 2);
				kind = kind === "c" ? "s" : "t";
			}
			/**
			 * @param {string} printed what is printed so far
			 * @param {string[]} numbers the segment's numbers
			 * @returns {string} the output with them, arc flags packed with what follows
			 */
			const append = (printed, numbers) =>
				kind === "a"
					? appendSvgPathNumbers(
							`${appendSvgPathNumbers(printed, numbers.slice(0, 4))}${numbers[4]}${numbers[5]}`,
							numbers.slice(6)
						)
					: appendSvgPathNumbers(printed, numbers);
			let spelled = kind.toUpperCase();
			let written = append(
				impliesSvgPathCommand(spelled, previous) ? output : output + spelled,
				absolute
			);
			// A relative source stays relative, between rounded points, unless absolute
			// saves four; an absolute one is left to the shortener's float32 gate, since
			// sums a renderer did not do before can move edges visibly.
			if (relative) {
				/** @type {string[]} */
				const offsets = [];
				for (let n = 0; n < absolute.length; n++) {
					offsets.push(
						kind === "a" && n < 5
							? absolute[n]
							: format(
									points[n] -
										(kind === "h" ||
										(kind !== "v" && (kind === "a" ? n === 5 : n % 2 === 0))
											? roundX
											: roundY)
								)
					);
				}
				const relativeWritten = append(
					impliesSvgPathCommand(kind, previous) ? output : output + kind,
					offsets
				);
				if (relativeWritten.length < written.length + 4) {
					spelled = kind;
					written = relativeWritten;
				}
			}
			if (!impliesSvgPathCommand(spelled, previous)) previous = spelled;
			output = written;
			printed =
				kind === "c" || kind === "s"
					? "c"
					: kind === "q" || kind === "t"
						? "q"
						: "";
			// Where the segment ends, truly and as printed.
			if (lower !== "v") {
				x = relative
					? x + args[arity === 1 ? 0 : arity - 2]
					: args[arity === 1 ? 0 : arity - 2];
				roundX = endX;
			}
			if (lower !== "h") {
				y = relative ? y + args[arity - 1] : args[arity - 1];
				roundY = endY;
			}
			if (kind === "m") {
				startX = x;
				startY = y;
				roundStartX = roundX;
				roundStartY = roundY;
			}
		}
	}
};

/**
 * Round a decimal to a number of places, half away from zero, on its digits.
 * A number too far from them to reach is left as written.
 * @param {string} value the number as written
 * @param {number} places decimal places to keep
 * @returns {string} the rounded number without exponent
 */
const roundSvgDecimal = (value, places) => {
	// Only numbers the SVG grammar reads reach here.
	const match = /** @type {RegExpExecArray} */ (
		/^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(value)
	);
	const exponent = match[4] === undefined ? 0 : Number(match[4]);
	if (Math.abs(exponent) > 30) return value;
	let digits = (match[2] || "") + (match[3] || "");
	let point = (match[2] || "").length + exponent;
	if (point < 0) {
		digits = "0".repeat(-point) + digits;
		point = 0;
	}
	if (point > digits.length) digits += "0".repeat(point - digits.length);
	const keep = point + places;
	let kept = digits.slice(0, keep).padEnd(keep, "0");
	if (digits.charCodeAt(keep) >= 53) {
		let carry = kept.length - 1;
		while (carry >= 0 && kept.charAt(carry) === "9") carry--;
		kept =
			carry < 0
				? `1${"0".repeat(kept.length)}`
				: `${kept.slice(0, carry)}${String.fromCharCode(
						kept.charCodeAt(carry) + 1
					)}${"0".repeat(kept.length - carry - 1)}`;
		if (carry < 0) point++;
	}
	const whole = kept.slice(0, point).replace(/^0+(?=\d)/, "") || "0";
	const fraction = kept.slice(point);
	const text = fraction === "" ? whole : `${whole}.${fraction}`;
	return /[1-9]/.test(text) ? `${match[1] === "-" ? "-" : ""}${text}` : "0";
};

/**
 * Trim SVG grammar whitespace without accepting other Unicode spaces.
 * @param {string} value an attribute value or argument list
 * @returns {string} the trimmed value
 */
const trimSvgValue = (value) => {
	let start = 0;
	let end = value.length;
	while (isXmlWhitespace(value.charCodeAt(start))) start++;
	while (end > start && isXmlWhitespace(value.charCodeAt(end - 1))) end--;
	return value.slice(start, end);
};

/**
 * Shorten known SVG geometry values only after validating their whole grammar.
 * @param {string} value decoded attribute value
 * @param {string} kind the generated attribute grammar
 * @param {string=} counts allowed transform argument counts
 * @returns {string | null} a shorter or original value, or null for unsupported syntax
 */
const shortenSvgNumericValue = (value, kind, counts) => {
	if (kind === "transform") {
		// A coefficient scales every coordinate, so it keeps two more places.
		const precision = S._svgPrecision;
		if (precision !== -1) S._svgPrecision = precision + 2;
		try {
			return shortenSvgTransform(value);
		} finally {
			S._svgPrecision = precision;
		}
	}
	if (kind === "path") return shortenSvgPath(value);
	const text = trimSvgValue(value);
	const number = /[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/y;
	const scalar =
		kind === "length" ||
		kind === "number" ||
		kind === "percentage" ||
		kind === "integer";
	let position = 0;
	let count = 0;
	let output = "";
	do {
		number.lastIndex = position;
		const match = number.exec(text);
		if (
			match === null ||
			((kind === "integer" || kind === "integerPair") &&
				!/^[+-]?\d+$/.test(match[0]))
		) {
			return null;
		}
		output += (count++ === 0 ? "" : " ") + shortenSvgNumber(match[0]);
		position = number.lastIndex;
		if (scalar) {
			const unit = text.slice(position);
			if (
				kind === "length"
					? !SVG_LENGTH_UNITS.has(unit)
					: unit !== "" && (kind !== "percentage" || unit !== "%")
			) {
				return null;
			}
			// A user unit is a CSS pixel, and an attribute reads a bare length in them.
			output += unit === "px" ? "" : unit;
			break;
		}
		if (kind === "lengths") {
			const unitStart = position;
			while (
				(text.charAt(position) >= "a" && text.charAt(position) <= "z") ||
				text.charAt(position) === "%"
			) {
				position++;
			}
			const unit = text.slice(unitStart, position);
			if (!SVG_LENGTH_UNITS.has(unit)) return null;
			output += unit === "px" ? "" : unit;
		}
		if (position === text.length) break;
		const numberEnd = position;
		while (isXmlWhitespace(text.charCodeAt(position))) position++;
		if (text.charAt(position) === ",") {
			position++;
			while (isXmlWhitespace(text.charCodeAt(position))) position++;
		}
		// A sign starts the next transform argument, as does a dot after a number
		// that holds one; a sign starts a point pair's y only: Gecko splits pairs
		// at commas or spaces.
		if (
			(position === numberEnd &&
				(kind === "arguments"
					? text.charAt(position) !== "-" &&
						text.charAt(position) !== "+" &&
						(text.charAt(position) !== "." || !/[.eE]/.test(match[0]))
					: kind !== "points" ||
						count % 2 === 0 ||
						text.charAt(position) !== "-")) ||
			position === text.length
		) {
			return null;
		}
	} while (position < text.length);
	if (
		!scalar &&
		(counts !== undefined
			? !counts.split(" ").includes(String(count))
			: kind === "viewBox"
				? count !== 4
				: kind === "pair" || kind === "integerPair"
					? count > 2
					: kind !== "numbers" && kind !== "lengths" && count % 2 !== 0)
	) {
		return null;
	}
	return kind === "arguments" || output.length < value.length ? output : value;
};

/**
 * Shorten transform spelling and redundant arguments without folding functions.
 * A set precision arrives two places finer, for coefficients, than for coordinates.
 * @param {string} value decoded SVG transform list
 * @returns {string | null} its compact spelling, or null for unsupported syntax
 */
const shortenSvgTransform = (value) => {
	const text = trimSvgValue(value);
	const functionName = /([a-zA-Z]+)[\t\n\r ]*\(/y;
	let position = 0;
	let output = "";
	let identity = "";
	do {
		functionName.lastIndex = position;
		const match = functionName.exec(text);
		if (match === null || SVG_TRANSFORM_ARGUMENTS[match[1]] === undefined) {
			return null;
		}
		let name = match[1];
		const close = text.indexOf(")", functionName.lastIndex);
		if (close === -1) return null;
		let argumentsText = shortenSvgNumericValue(
			text.slice(functionName.lastIndex, close),
			"arguments",
			SVG_TRANSFORM_ARGUMENTS[match[1]]
		);
		if (argumentsText === null) return null;
		let argumentsList = argumentsText.split(" ");
		if (S._svgPrecision !== -1 && position === 0) {
			// The first offsets and centers are coordinates; later ones scale with the list.
			const first = name === "matrix" ? 4 : name === "rotate" ? 1 : 0;
			const end =
				name === "matrix" || name === "rotate" || name === "translate"
					? argumentsList.length
					: 0;
			for (let index = first; index < end; index++) {
				argumentsList[index] = shortenSvgNumber(
					roundSvgDecimal(argumentsList[index], S._svgPrecision - 2)
				);
			}
			argumentsText = argumentsList.join(" ");
		}
		if (
			S._shortenSvgTransformFunctions &&
			name === "matrix" &&
			SVG_ZERO_NUMBER.test(argumentsList[1]) &&
			SVG_ZERO_NUMBER.test(argumentsList[2])
		) {
			if (argumentsList[0] === "1" && argumentsList[3] === "1") {
				name = "translate";
				argumentsList = argumentsList.slice(4);
			} else if (
				SVG_ZERO_NUMBER.test(argumentsList[4]) &&
				SVG_ZERO_NUMBER.test(argumentsList[5])
			) {
				name = "scale";
				argumentsList = [argumentsList[0], argumentsList[3]];
			}
			argumentsText = argumentsList.join(" ");
		}
		if (
			(name === "translate" &&
				argumentsList.length === 2 &&
				SVG_ZERO_NUMBER.test(argumentsList[1])) ||
			(name === "scale" &&
				argumentsList.length === 2 &&
				argumentsList[0] === argumentsList[1]) ||
			(name === "rotate" &&
				argumentsList.length === 3 &&
				SVG_ZERO_NUMBER.test(argumentsList[1]) &&
				SVG_ZERO_NUMBER.test(argumentsList[2]))
		) {
			argumentsText = argumentsList[0];
		}
		const transform = `${name}(${argumentsText})`;
		if (
			S._shortenSvgTransformFunctions &&
			(name === "scale"
				? argumentsText === "1"
				: name === "rotate"
					? SVG_ZERO_NUMBER.test(argumentsList[0])
					: name !== "matrix" && SVG_ZERO_NUMBER.test(argumentsText))
		) {
			// Keep one identity when all functions are identities: presence can matter.
			// No angle turns about any center, since cos 0 and sin 0 are exact.
			const shortest = name === "rotate" ? "rotate(0)" : transform;
			if (identity === "" || shortest.length < identity.length) {
				identity = shortest;
			}
		} else {
			output += (output === "" ? "" : " ") + transform;
		}
		position = close + 1;
		if (position === text.length) break;
		while (isXmlWhitespace(text.charCodeAt(position))) position++;
		if (text.charAt(position) === ",") {
			position++;
			while (isXmlWhitespace(text.charCodeAt(position))) position++;
		}
		if (position === text.length) return null;
	} while (position < text.length);
	if (output === "") output = identity;
	if (S._shortenSvgTransformFunctions) {
		let previous;
		/**
		 * @param {string} match an exact identity function
		 * @returns {string} an empty replacement, retaining a fallback identity
		 */
		const omitIdentity = (match) => {
			const transform = match.trim();
			if (identity === "" || transform.length < identity.length) {
				identity = transform;
			}
			return "";
		};
		do {
			previous = output;
			output = output.replace(
				/^(translate|scale)\(([^()]*)\) \1\(([^()]*)\)/,
				/**
				 * @param {string} original two same-name calls
				 * @param {string} name the function, `translate` or `scale`
				 * @param {string} left the first call's arguments
				 * @param {string} right the second call's arguments
				 * @returns {string} the one call they make, or the original
				 */
				(original, name, left, right) => {
					const a = left.split(" ");
					const b = right.split(" ");
					/** @type {string[]} */
					const result = [];
					for (let axis = 0; axis < 2; axis++) {
						const x = exactSvgPathCoordinate(
							a[axis] === undefined ? (name === "scale" ? a[0] : "0") : a[axis]
						);
						const y = exactSvgPathCoordinate(
							b[axis] === undefined ? (name === "scale" ? b[0] : "0") : b[axis]
						);
						if (
							x === null ||
							y === null ||
							(name === "scale" &&
								(!Number.isInteger(Math.log2(Math.abs(x))) ||
									!Number.isInteger(Math.log2(Math.abs(y)))))
						) {
							return original;
						}
						const value = name === "scale" ? x * y : x + y;
						if (Math.abs(value) > 1000000) {
							return original;
						}
						result.push(shortenSvgNumber(String(value)));
					}
					const argumentsText = (
						name === "scale" ? result[0] === result[1] : result[1] === "0"
					)
						? result[0]
						: result.join(" ");
					const folded = `${name}(${argumentsText})`;
					return folded;
				}
			);
			// SVG defines `rotate(a x y)` as this very list, so the rewrite does no arithmetic.
			output = output.replace(
				/(^| )translate\(([^ ()]+)(?: ([^ ()]+))?\) rotate\(([^ ()]+)\) translate\(([^ ()]+)(?: ([^ ()]+))?\)(?= |$)/g,
				/**
				 * @param {string} original a translation, a rotation and a translation back
				 * @param {string} lead the separator before the list
				 * @param {string} x the center's x
				 * @param {string | undefined} y the center's y, or undefined for 0
				 * @param {string} angle the rotation's angle
				 * @param {string} backX the x translated back
				 * @param {string | undefined} backY the y translated back, or undefined for 0
				 * @returns {string} the rotation about that center, or the original
				 */
				(original, lead, x, y, angle, backX, backY) =>
					Number(backX) === -Number(x) && Number(backY || 0) === -Number(y || 0)
						? `${lead}rotate(${angle} ${x} ${y || 0})`
						: original
			);
			output = output
				.replace(/(?:^| )(?:scale\(1\)|translate\(0\))(?= |$)/g, omitIdentity)
				.trim();
		} while (output !== previous);
		if (output === "") output = identity;
	}
	if (S._convertSvgTransforms) {
		const converted = convertSvgTransform(output);
		if (converted !== null && converted.length < output.length) {
			output = converted;
		}
	}
	return output.length < value.length ? output : value;
};

/**
 * Multiply two SVG transform matrices, the second applied first.
 * @param {number[]} m the outer matrix `a b c d e f`
 * @param {number[]} n the inner matrix
 * @returns {number[]} their product
 */
const multiplySvgMatrices = (m, n) => [
	m[0] * n[0] + m[2] * n[1],
	m[1] * n[0] + m[3] * n[1],
	m[0] * n[2] + m[2] * n[3],
	m[1] * n[2] + m[3] * n[3],
	m[0] * n[4] + m[2] * n[5] + m[4],
	m[1] * n[4] + m[3] * n[5] + m[5]
];

/**
 * The matrix of one SVG transform function.
 * @param {string} name the function
 * @param {number[]} values its arguments
 * @returns {number[]} its matrix `a b c d e f`
 */
const svgTransformMatrix = (name, values) => {
	const radians = (values[0] * Math.PI) / 180;
	switch (name) {
		case "matrix":
			return values;
		case "translate":
			return [1, 0, 0, 1, values[0], values.length > 1 ? values[1] : 0];
		case "scale":
			return [values[0], 0, 0, values.length > 1 ? values[1] : values[0], 0, 0];
		case "rotate": {
			const rotation = [
				Math.cos(radians),
				Math.sin(radians),
				-Math.sin(radians),
				Math.cos(radians),
				0,
				0
			];
			if (values.length === 1) return rotation;
			return multiplySvgMatrices(
				multiplySvgMatrices([1, 0, 0, 1, values[1], values[2]], rotation),
				[1, 0, 0, 1, -values[1], -values[2]]
			);
		}
		case "skewX":
			return [1, 0, Math.tan(radians), 1, 0, 0];
		default:
			return [1, Math.tan(radians), 0, 1, 0, 0];
	}
};

/**
 * Compose a transform list the shortener accepts into one matrix.
 * @param {string} list the transform list
 * @returns {number[] | null} its matrix `a b c d e f`, or null where an argument does not read
 */
const composeSvgTransform = (list) => {
	const call = /([a-zA-Z]+)[\t\n\r ]*\(([^()]*)\)/g;
	let composed = [1, 0, 0, 1, 0, 0];
	let match;
	while ((match = call.exec(list)) !== null) {
		// The shortener packs signs, so arguments are read as numbers, not split.
		const values = (
			match[2].match(/[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/g) || []
		).map(Number);
		if (values.some((one) => !Number.isFinite(one))) return null;
		composed = multiplySvgMatrices(
			composed,
			svgTransformMatrix(match[1], values)
		);
	}
	return composed;
};

/**
 * Recompose a shortened transform list as the shortest list within the precision.
 * A candidate stays only when its own matrix matches the list's to that precision.
 * @param {string} value a compact transform list, its functions separated by spaces
 * @returns {string | null} a shorter spelling, or null when none fits
 */
const convertSvgTransform = (value) => {
	// The shortener raised the precision by two for coefficients; coordinates use it as set.
	const places = S._svgPrecision === -1 ? 3 : S._svgPrecision - 2;
	const compose = composeSvgTransform;
	const composed = compose(value);
	if (composed === null || composed.some((one) => !(Math.abs(one) < 1e15))) {
		return null;
	}
	// The rotation rounded to its own places, as asked, and only it: the rest is checked.
	const turn = Math.atan2(composed[1], composed[0]);
	const shift =
		S._svgAnglePrecision === -1
			? 0
			: (Number(((turn * 180) / Math.PI).toFixed(S._svgAnglePrecision)) *
					Math.PI) /
					180 -
				turn;
	const matrix = [
		Math.cos(shift) * composed[0] - Math.sin(shift) * composed[1],
		Math.sin(shift) * composed[0] + Math.cos(shift) * composed[1],
		Math.cos(shift) * composed[2] - Math.sin(shift) * composed[3],
		Math.sin(shift) * composed[2] + Math.cos(shift) * composed[3],
		composed[4],
		composed[5]
	];
	const [a, b, c, d, e, f] = matrix;
	// Coefficients keep two more places, but none past what the source's matrices spell.
	let spelled = 0;
	for (const call of value.match(/matrix\([^()]*\)/g) || []) {
		for (const number of call.match(/\.\d+/g) || []) {
			spelled = Math.max(spelled, number.length - 1);
		}
	}
	const factors = spelled === 0 ? places + 2 : Math.min(places + 2, spelled);
	/**
	 * @param {number} one a coordinate, factor or angle
	 * @param {number} digits decimal places
	 * @returns {string} its rounded spelling
	 */
	const round = (one, digits) =>
		shortenSvgNumber(
			roundSvgDecimal(String(Number(one.toFixed(digits))), digits)
		);
	/**
	 * @param {number} factor a scale factor
	 * @returns {string[]} its spellings, coarser ones too; the check decides
	 */
	const spellings = (factor) => [
		...new Set([
			round(factor, factors),
			round(factor, places),
			factor < 0 ? "-1" : "1"
		])
	];
	/** @type {Set<string>} */
	const candidates = new Set([
		`matrix(${[a, b, c, d].map((one) => round(one, factors)).join(" ")} ${round(e, places)} ${round(f, places)})`
	]);
	const translation =
		round(e, places) === "0" && round(f, places) === "0"
			? ""
			: `translate(${round(e, places)}${round(f, places) === "0" ? "" : ` ${round(f, places)}`})`;
	const columnAngle = (Math.atan2(b, a) * 180) / Math.PI;
	const rowAngle = (Math.atan2(-c, d) * 180) / Math.PI;
	// The angles either column lies at, none, and the right angle nearest each.
	const angles = new Set(["0"]);
	/**
	 * @param {number} angle an angle in degrees
	 * @returns {string[]} its spellings to two places coarser; the check decides
	 */
	const degrees = (angle) => [
		...new Set(
			[places, places - 1, places - 2]
				.filter((digits) => digits >= 0)
				.map((digits) => round(angle, digits))
		)
	];
	for (const angle of [columnAngle, rowAngle]) {
		for (const spelling of degrees(angle)) angles.add(spelling);
		angles.add(String(Math.round(angle / 90) * 90));
	}
	for (const spelledAngle of angles) {
		const angle = Number(spelledAngle);
		const cosine = Math.cos((angle * Math.PI) / 180);
		const sine = Math.sin((angle * Math.PI) / 180);
		// What remains once the rotation is taken back: `n0 n2 / n1 n3`.
		const n0 = cosine * a + sine * b;
		const n1 = cosine * b - sine * a;
		const n2 = cosine * c + sine * d;
		const n3 = cosine * d - sine * c;
		/** @type {string[]} */
		const tails = [];
		for (const [
			skew,
			shear,
			x,
			y
		] of /** @type {[string, number, number, number][]} */ ([
			["", 0, n0, n3],
			[
				"skewX",
				n3 === 0 ? Number.NaN : (Math.atan(n2 / n3) * 180) / Math.PI,
				n0,
				n3
			],
			[
				"skewY",
				n0 === 0 ? Number.NaN : (Math.atan(n1 / n0) * 180) / Math.PI,
				n0,
				n3
			]
		])) {
			if (!Number.isFinite(shear)) continue;
			for (const sheared of skew === "" ? [""] : degrees(shear)) {
				const lead = skew === "" ? "" : `${skew}(${sheared})`;
				for (const sx of spellings(x)) {
					for (const sy of spellings(y)) {
						const scaled =
							sx === sy
								? sx === "1"
									? ""
									: `scale(${sx})`
								: `scale(${sx} ${sy})`;
						tails.push(`${lead}${scaled}`);
					}
				}
			}
		}
		for (const tail of tails) {
			if (spelledAngle === "0") {
				candidates.add(`${translation}${tail}` || "scale(1)");
				continue;
			}
			candidates.add(`${translation}rotate(${spelledAngle})${tail}`);
			const determinant = 2 - 2 * cosine;
			if (determinant > 1e-9 && translation !== "") {
				const x = ((1 - cosine) * e - sine * f) / determinant;
				const y = (sine * e + (1 - cosine) * f) / determinant;
				candidates.add(
					`rotate(${spelledAngle} ${round(x, places)} ${round(y, places)})${tail}`
				);
			}
		}
	}
	const coordinates = 10 ** -places;
	// Half a unit of what the source spells, as rounding it would, and never past a coordinate unit.
	const coefficients = Math.min(10 ** -factors / 2, coordinates);
	/** @type {string | null} */
	let best = null;
	for (const candidate of candidates) {
		if (best !== null && candidate.length >= best.length) continue;
		const recomposed = compose(candidate);
		if (
			recomposed !== null &&
			recomposed.every((one, index) =>
				index < 4
					? Math.abs(one - matrix[index]) <= coefficients
					: Math.abs(one - matrix[index]) <= 2 * coordinates
			)
		) {
			best = candidate;
		}
	}
	return best;
};

/**
 * Preserve ID-bearing subtrees without guessing which references can reach them.
 * @returns {void}
 */
const collectSvgIdAncestors = () => {
	for (let node = 1; node <= S._nodeCount; node++) {
		if (S._types[node] !== NodeType.Element) continue;
		const start = S._attrStarts[node];
		const end = start + S._attrCounts[node];
		for (let attribute = start; attribute < end; attribute++) {
			const name = S._attrNames[attribute];
			if (
				(name !== "id" && name !== "xml:id") ||
				xmlAttributeValue(attribute) === "" ||
				(S._xmlRemovedAttributes !== null &&
					S._xmlRemovedAttributes.has(attribute))
			) {
				continue;
			}
			// Each ancestor is marked once even when many descendants have IDs.
			for (
				let ancestor = node;
				ancestor !== 0 && !S._svgIdAncestors.has(ancestor);
				ancestor = S._parents[ancestor]
			) {
				S._svgIdAncestors.add(ancestor);
			}
			break;
		}
	}
};

// The CSS parser loads on first use, not at module load - `HtmlGenerator`
// defers it the same way, and most documents carry no SVG styling or URLs.
/** @type {typeof import("../css/syntax-parser") | undefined} */
let loadedCssParser;

/**
 * @returns {typeof import("../css/syntax-parser")} the CSS parser, through the CSS syntax facade
 */
const cssParser = () =>
	loadedCssParser || (loadedCssParser = require("../css/syntax").parser);

/**
 * Whether CSS depends on attribute spellings, mentions a property or imports unread styles.
 * @param {string} source a stylesheet or declaration list
 * @param {string=} property the geometry property, or omitted to check attribute selectors
 * @returns {boolean} whether the stylesheet can depend on the spelling
 */
const hasSvgStyleProperty = (source, property) => {
	const { TokenType, readToken, unescapeIdentifier } = cssParser();

	const token = {
		type: 0,
		start: 0,
		end: 0,
		isId: false,
		contentStart: 0,
		contentEnd: 0,
		unitStart: 0
	};
	let position = 0;
	while (readToken(source, position, token) !== undefined) {
		position = token.end;
		if (property === undefined && token.type === TokenType.LeftSquareBracket) {
			return true;
		}
		if (
			(token.type === TokenType.AtKeyword &&
				asciiLowercase(
					unescapeIdentifier(source.slice(token.start + 1, token.end))
				) === "import") ||
			(token.type === TokenType.Function &&
				asciiLowercase(
					unescapeIdentifier(source.slice(token.start, token.end - 1))
				) === "attr")
		) {
			return true;
		}
		if (
			token.type === TokenType.Ident &&
			asciiLowercase(
				unescapeIdentifier(source.slice(token.start, token.end))
			) === property
		) {
			return true;
		}
	}
	return false;
};

/**
 * Keep attribute spellings compatible with selectors, animation targets and unread styles.
 * @param {string=} property the geometry property, or omitted to check attribute selectors
 * @returns {boolean} whether a document may depend on the spelling
 */
const hasSvgGeometryDependency = (property) => {
	// Only an element's own attributes: a tag the input ran out in leaves its
	// attributes in the columns, but no element holds them.
	const removedNodes = S._xmlRemovedNodes;
	const removedAttributes = S._xmlRemovedAttributes;
	for (let node = 1; node <= S._nodeCount; node++) {
		if (
			S._types[node] !== NodeType.Element ||
			(removedNodes !== null && removedNodes.has(node))
		) {
			continue;
		}
		const start = S._attrStarts[node];
		const end = start + S._attrCounts[node];
		for (let attribute = start; attribute < end; attribute++) {
			// What an earlier pass removed, an inlined stylesheet among it, is gone.
			if (removedAttributes !== null && removedAttributes.has(attribute)) {
				continue;
			}
			const name = S._attrNames[attribute];
			if (name === "attributeName") {
				const value = xmlAttributeValue(attribute);
				if (
					value === property ||
					(property === "transform" && value.endsWith("Transform"))
				) {
					return true;
				}
			} else if (
				name === "rel" &&
				asciiLowercase(xmlAttributeValue(attribute))
					.split(/[\t\n\f\r ]+/)
					.includes("stylesheet")
			) {
				return true;
			} else if (
				name === "style" &&
				hasSvgStyleProperty(xmlAttributeValue(attribute), property)
			) {
				return true;
			}
		}
	}
	for (let node = 1; node <= S._nodeCount; node++) {
		if (removedNodes !== null && removedNodes.has(node)) continue;
		if (
			S._types[node] === NodeType.ProcessingInstruction &&
			S._piTargets.get(node) === "xml-stylesheet"
		) {
			return true;
		}
		if (S._types[node] !== NodeType.Element) continue;
		const name = tagNameOf(node);
		const localName = name.slice(name.indexOf(":") + 1);
		if (
			property === "transform" &&
			(localName === "animateTransform" || localName === "animateMotion")
		) {
			return true;
		}
		if (localName !== "style") continue;
		let source = "";
		for (
			let child = S._firstChildren[node];
			child !== 0;
			child = S._nextSiblings[child]
		) {
			if (S._types[child] === NodeType.Text) source += S._strings[child];
		}
		if (hasSvgStyleProperty(source, property)) return true;
	}
	return false;
};

/**
 * Read only bounded eighths, whose sums and differences remain exact in float32.
 * @param {string} value normalized coordinate spelling, or empty when unknown
 * @returns {number | null} its exact coordinate, or null outside the supported range
 */
const exactSvgPathCoordinate = (value) =>
	value !== "-0" &&
	/^[-+]?(?:\d+|\d*\.(?:125|25|375|5|625|75|875))$/.test(value) &&
	Math.abs(Number(value)) <= 1000000
		? Number(value)
		: null;

/**
 * Resolve a control only within the exact coordinate domain.
 * @param {string} value its spelling
 * @param {string} origin its axis origin
 * @param {boolean} absolute whether it is already absolute
 * @returns {string} the absolute spelling, or empty when unknown
 */
const absoluteSvgCoordinate = (value, origin, absolute) => {
	if (absolute) return value;
	const offset = exactSvgPathCoordinate(value);
	const start = exactSvgPathCoordinate(origin);
	return offset !== null &&
		start !== null &&
		Math.abs(start + offset) <= 1000000
		? String(start + offset)
		: "";
};

/**
 * Check reflected controls only where all intermediate values are exact floats.
 * @param {string} current the endpoint
 * @param {string} control the previous control
 * @param {string} next the next control
 * @param {boolean} absolute whether next is absolute
 * @returns {boolean} whether the reflection is exact
 */
const matchesSvgReflectedControl = (current, control, next, absolute) => {
	const endpoint = exactSvgPathCoordinate(current);
	const previous = exactSvgPathCoordinate(control);
	const target = exactSvgPathCoordinate(next);
	return (
		endpoint !== null &&
		previous !== null &&
		target !== null &&
		(absolute ? 2 * endpoint - previous : endpoint - previous) === target
	);
};

/**
 * Retain an implicit quadratic control only within the exact coordinate domain.
 * @param {string} current the endpoint
 * @param {string} control the previous control
 * @returns {string} its reflected spelling, or empty when unknown
 */
const reflectedSvgControl = (current, control) => {
	const endpoint = exactSvgPathCoordinate(current);
	const previous = exactSvgPathCoordinate(control);
	return endpoint !== null &&
		previous !== null &&
		Math.abs(2 * endpoint - previous) <= 1000000
		? String(2 * endpoint - previous)
		: "";
};

// Blink's float32 tenth, which each decimal digit it reads is scaled by.
const SVG_FLOAT_TENTH = Math.fround(0.1);
// What `readSvgDecimal` last read: its exact digits at a decimal scale, or NaN
// digits outside safe integers, and the float32 Blink and Gecko each parse it to.
let svgDecimalMantissa = 0;
let svgDecimalScale = 0;
let svgBlinkFloat = 0;
let svgGeckoFloat = 0;
const svgFloatBits = new Float32Array(1);
const svgFloatWords = new Uint32Array(svgFloatBits.buffer);
// The current point, the subpath start, then the last cubic control: Blink x, y
// and Gecko x, y floats; and the exact x digits, x scale, y digits and y scale.
const svgPathOrigins = new Float32Array(12);
const svgPathDecimals = new Float64Array(8);
// Each argument of the segment being read: its digits, scale, Blink and Gecko floats.
const svgPathArguments = new Float64Array(28);
// The rebase under way: its spellings, and each one's exact digits and scale.
/** @type {string[]} */
const svgRebasedArguments = [];
const svgRebasedDecimals = new Float64Array(14);

/**
 * Read a shortened SVG number's exact digits and the float32 each engine parses it to.
 * Blink and WebKit sum float32 digits; Gecko rounds correctly, so a value its direct and double rounding could split reads as NaN.
 * @param {string} value a shortened SVG number
 * @returns {boolean} whether its digits fit a safe integer, which exponent notation never does
 */
const readSvgDecimal = (value) => {
	const sign = value.charCodeAt(0) === 45 ? -1 : 1;
	const start = sign === -1 || value.charCodeAt(0) === 43 ? 1 : 0;
	let mantissa = 0;
	let integer = 0;
	let decimal = 0;
	let fraction = 1;
	let dot = -1;
	for (let i = start; i < value.length; i++) {
		const code = value.charCodeAt(i);
		if (code === 46 && dot === -1) {
			dot = i;
			integer = mantissa;
			continue;
		}
		const digit = code - 48;
		if (digit < 0 || digit > 9) {
			svgBlinkFloat = svgGeckoFloat = svgDecimalMantissa = Number.NaN;
			return false;
		}
		mantissa = mantissa * 10 + digit;
		if (dot !== -1) {
			fraction = Math.fround(fraction * SVG_FLOAT_TENTH);
			decimal = Math.fround(decimal + Math.fround(digit * fraction));
		}
	}
	if (dot === -1) {
		dot = value.length;
		integer = mantissa;
	}
	svgDecimalScale = value.length - dot - (dot < value.length ? 1 : 0);
	if (!Number.isSafeInteger(mantissa) || svgDecimalScale > 22) {
		svgBlinkFloat = svgGeckoFloat = svgDecimalMantissa = Number.NaN;
		return false;
	}
	// Blink sums integer digits right to left in float32, exactly below 2^24.
	if (integer >= 16777216) {
		integer = 0;
		let multiplier = 1;
		for (let i = dot - 1; i >= start; i--) {
			integer = Math.fround(
				integer + Math.fround(multiplier * (value.charCodeAt(i) - 48))
			);
			multiplier = Math.fround(multiplier * 10);
		}
	}
	svgDecimalMantissa = sign * mantissa;
	svgBlinkFloat = sign * Math.fround(integer + decimal);
	svgGeckoFloat = svgGeckoFloatOf(svgDecimalMantissa, svgDecimalScale);
	return true;
};

/**
 * Round exact decimal digits to float32 as Gecko does.
 * @param {number} mantissa a safe integer
 * @param {number} scale its decimal scale, at most 22
 * @returns {number} the float32, or NaN where direct and double rounding could disagree
 */
const svgGeckoFloatOf = (mantissa, scale) => {
	let power = 1;
	for (let i = 0; i < scale; i++) power *= 10;
	// An exact quotient of two exact doubles is the correctly rounded decimal.
	const number = mantissa / power;
	const rounded = Math.fround(number);
	if (rounded === number) return rounded;
	svgFloatBits[0] = rounded;
	svgFloatWords[0] += number > rounded === rounded > 0 ? 1 : -1;
	const middle = (rounded + svgFloatBits[0]) / 2;
	return Math.abs(number - middle) <= Math.abs(number) * Number.EPSILON
		? Number.NaN
		: rounded;
};

/**
 * Keep what `readSvgDecimal` reads of a segment's argument for its rebase and endpoint.
 * @param {number} index the argument's position in its segment
 * @param {string} value its shortened spelling
 * @returns {void}
 */
const readSvgPathArgument = (index, value) => {
	readSvgDecimal(value);
	svgPathArguments[index * 4] = svgDecimalMantissa;
	svgPathArguments[index * 4 + 1] = svgDecimalScale;
	svgPathArguments[index * 4 + 2] = svgBlinkFloat;
	svgPathArguments[index * 4 + 3] = svgGeckoFloat;
};

/**
 * Add two exact decimals at the larger of their scales.
 * @param {number} leftMantissa the first one's digits
 * @param {number} leftScale its decimal scale
 * @param {number} rightMantissa the second one's digits
 * @param {number} rightScale its decimal scale
 * @returns {number} the sum's digits at the larger scale, or NaN outside safe integers
 */
const sumSvgDecimals = (leftMantissa, leftScale, rightMantissa, rightScale) => {
	let left = leftMantissa;
	let right = rightMantissa;
	for (let scale = leftScale; scale < rightScale; scale++) left *= 10;
	for (let scale = rightScale; scale < leftScale; scale++) right *= 10;
	const sum = left + right;
	return Number.isSafeInteger(left) &&
		Number.isSafeInteger(right) &&
		Number.isSafeInteger(sum)
		? sum
		: Number.NaN;
};

/**
 * Count the characters `formatSvgDecimal` spells exact decimal digits with.
 * @param {number} mantissa a safe integer
 * @param {number} scale its decimal scale
 * @returns {number} the spelling's length
 */
const svgDecimalLength = (mantissa, scale) => {
	let magnitude = Math.abs(mantissa);
	while (scale > 0 && magnitude % 10 === 0) {
		magnitude /= 10;
		scale--;
	}
	let digits = 1;
	while (magnitude >= 10) {
		magnitude = Math.floor(magnitude / 10);
		digits++;
	}
	return (
		(mantissa < 0 ? 1 : 0) +
		(scale === 0 ? digits : (digits > scale ? digits - scale : 0) + 1 + scale)
	);
};

/**
 * Spell exact decimal digits as the shortest plain SVG number.
 * @param {number} mantissa a safe integer
 * @param {number} scale its decimal scale
 * @returns {string} the shortened spelling
 */
const formatSvgDecimal = (mantissa, scale) => {
	while (scale > 0 && mantissa % 10 === 0) {
		mantissa /= 10;
		scale--;
	}
	if (scale === 0) return String(mantissa);
	const digits = String(Math.abs(mantissa));
	const split = digits.length - scale;
	const body =
		split > 0
			? `${digits.slice(0, split)}.${digits.slice(split)}`
			: `.${"0".repeat(-split)}${digits}`;
	return mantissa < 0 ? `-${body}` : body;
};

/**
 * Move one axis of the tracked current point by a segment's endpoint.
 * @param {number} axis 0 for x, 1 for y
 * @param {number} index the endpoint coordinate's argument position
 * @param {boolean} absolute whether it is absolute
 * @returns {void}
 */
const advanceSvgPathOrigin = (axis, index, absolute) => {
	const mantissa = svgPathArguments[index * 4];
	const scale = svgPathArguments[index * 4 + 1];
	svgPathDecimals[axis * 2] = absolute
		? mantissa
		: sumSvgDecimals(
				svgPathDecimals[axis * 2],
				svgPathDecimals[axis * 2 + 1],
				mantissa,
				scale
			);
	svgPathDecimals[axis * 2 + 1] = absolute
		? scale
		: Math.max(svgPathDecimals[axis * 2 + 1], scale);
	svgPathOrigins[axis] = absolute
		? svgPathArguments[index * 4 + 2]
		: svgPathOrigins[axis] + svgPathArguments[index * 4 + 2];
	svgPathOrigins[axis + 2] = absolute
		? svgPathArguments[index * 4 + 3]
		: svgPathOrigins[axis + 2] + svgPathArguments[index * 4 + 3];
};

/**
 * Whether WebKit's quadratic-to-cubic steps stay exact in float32 around a value.
 * @param {number} value a float32 coordinate
 * @returns {boolean} whether it is a multiple of 1/8 no larger than 2^17
 */
const isExactSvgQuadraticValue = (value) =>
	Number.isInteger(value * 8) && Math.abs(value) <= 131072;

/**
 * Whether a tracked quadratic control is known and a small eighth.
 * @param {string} value its absolute spelling, or empty when unknown
 * @returns {boolean} whether WebKit reflects it exactly
 */
const isExactSvgQuadraticControl = (value) => {
	const control = exactSvgPathCoordinate(value);
	return control !== null && isExactSvgQuadraticValue(control);
};

/**
 * Whether a cubic's first control is the point every engine reflects for an `S`.
 * WebKit and Gecko take twice the current point less the last control; Blink adds their difference, rounding between.
 * @param {boolean} afterCubic whether a cubic segment came just before
 * @param {boolean} absolute whether the control is absolute
 * @returns {boolean} whether `S` reads the same control in both float models
 */
const reflectsSvgPathControl = (afterCubic, absolute) => {
	for (let model = 0; model < 2; model++) {
		for (let axis = 0; axis < 2; axis++) {
			const origin = svgPathOrigins[model * 2 + axis];
			const previous = svgPathOrigins[8 + model * 2 + axis];
			const value = svgPathArguments[axis * 4 + 2 + model];
			const control = absolute ? value : Math.fround(origin + value);
			if (
				afterCubic
					? control !== Math.fround(2 * origin - previous) ||
						control !== Math.fround(origin + Math.fround(origin - previous))
					: control !== origin
			) {
				return false;
			}
		}
	}
	return true;
};

/**
 * Keep a cubic's second control, which the next `S` reflects, in both float models.
 * @param {number} index the control's argument position
 * @param {boolean} absolute whether it is absolute
 * @returns {void}
 */
const advanceSvgPathControl = (index, absolute) => {
	for (let model = 0; model < 2; model++) {
		for (let axis = 0; axis < 2; axis++) {
			const value = svgPathArguments[(index + axis) * 4 + 2 + model];
			svgPathOrigins[8 + model * 2 + axis] = absolute
				? value
				: svgPathOrigins[model * 2 + axis] + value;
		}
	}
};

/**
 * Rebase decimals where both engines' floats give every point the source gives.
 * Engines accumulate relative points in float32, so exact decimals alone can drift.
 * @param {string} command an uppercase path command
 * @param {string[]} argumentsList its shortened arguments
 * @param {boolean} absolute whether authored arguments are absolute
 * @param {number} first the argument position the list starts at
 * @param {boolean} exactControl whether the control a smooth quadratic reflects is a small eighth
 * @returns {string[] | null} rebased arguments, or null where a reading would change
 */
const rebaseSvgPathDecimals = (
	command,
	argumentsList,
	absolute,
	first,
	exactControl
) => {
	// WebKit turns quadratics into cubics with different float steps per case,
	// which agree only while every value stays exact.
	const quadratic = command === "Q" || command === "T";
	if (
		quadratic &&
		!(
			(command === "Q" || exactControl) &&
			isExactSvgQuadraticValue(svgPathOrigins[0]) &&
			isExactSvgQuadraticValue(svgPathOrigins[1])
		)
	) {
		return null;
	}
	const rebased = svgRebasedArguments;
	rebased.length = 0;
	const start = command === "A" ? 5 : 0;
	let authored = 0;
	let written = 0;
	let zero = false;
	for (let i = 0; i < argumentsList.length; i++) {
		authored += argumentsList[i].length;
		if (i < start) {
			rebased.push(argumentsList[i]);
			written += argumentsList[i].length;
			continue;
		}
		const axis =
			command === "V" || (command !== "H" && (i - start) % 2 !== 0) ? 1 : 0;
		const reading = (first + i) * 4;
		const originScale = svgPathDecimals[axis * 2 + 1];
		const scale = Math.max(svgPathArguments[reading + 1], originScale);
		const mantissa = sumSvgDecimals(
			svgPathArguments[reading],
			svgPathArguments[reading + 1],
			absolute ? -svgPathDecimals[axis * 2] : svgPathDecimals[axis * 2],
			originScale
		);
		if (Number.isNaN(mantissa) || scale > 22) return null;
		svgRebasedDecimals[i * 2] = mantissa;
		svgRebasedDecimals[i * 2 + 1] = scale;
		zero = zero || mantissa === 0;
		written += svgDecimalLength(mantissa, scale);
	}
	// Separators move at most one character per argument, so skip what the caller rejects.
	if (
		!(zero && command === "L") &&
		written > authored + argumentsList.length + (absolute ? 2 : -4)
	) {
		return null;
	}
	for (let i = start; i < argumentsList.length; i++) {
		const axis =
			command === "V" || (command !== "H" && (i - start) % 2 !== 0) ? 1 : 0;
		const reading = (first + i) * 4;
		rebased.push(
			formatSvgDecimal(svgRebasedDecimals[i * 2], svgRebasedDecimals[i * 2 + 1])
		);
		const geckoOrigin = svgPathOrigins[axis + 2];
		const gecko = svgPathArguments[reading + 3];
		const geckoValue = svgGeckoFloatOf(
			svgRebasedDecimals[i * 2],
			svgRebasedDecimals[i * 2 + 1]
		);
		if (
			quadratic &&
			!(isExactSvgQuadraticValue(gecko) && isExactSvgQuadraticValue(geckoValue))
		) {
			return null;
		}
		if (
			(absolute ? gecko : Math.fround(geckoOrigin + gecko)) !==
			(absolute ? Math.fround(geckoOrigin + geckoValue) : geckoValue)
		) {
			return null;
		}
		readSvgDecimal(rebased[i]);
		const blinkOrigin = svgPathOrigins[axis];
		const blink = svgPathArguments[reading + 2];
		if (
			(absolute ? blink : Math.fround(blinkOrigin + blink)) !==
			(absolute ? Math.fround(blinkOrigin + svgBlinkFloat) : svgBlinkFloat)
		) {
			return null;
		}
	}
	// A zero-length arc is a line in WebKit only while its relative offsets are zero,
	// and Chromium orients its markers differently once rebased.
	if (command === "A") {
		for (let model = 2; model < 4; model++) {
			let coincident = true;
			for (let axis = 0; axis < 2; axis++) {
				const origin = svgPathOrigins[axis + (model - 2) * 2];
				const offset = svgPathArguments[(first + 5 + axis) * 4 + model];
				const point = absolute ? offset : Math.fround(origin + offset);
				coincident = coincident && point === origin;
			}
			if (coincident) return null;
		}
	}
	return rebased;
};

/**
 * Compact SVG path spelling without rounding or changing its segments.
 * @param {string} value decoded SVG path data
 * @param {boolean=} strict take a relative or absolute spelling only where it is shorter
 * @param {boolean=} retry retry strictly where relative runs outgrow the value, else keep them
 * @returns {string | null} its compact spelling, or null for unsupported syntax
 */
const shortenSvgPath = (value, strict = false, retry = true) => {
	if (S._svgPrecision !== -1) {
		const precision = S._svgPrecision;
		const rounded = roundSvgPath(value, precision);
		// The exact shortener spells the rounded points, relative only where every
		// engine's float32 sums land on them; data rounding cannot keep stays exact.
		S._svgPrecision = -1;
		try {
			// Rounded data is already packed: its runs are kept, measured against the source.
			const exact =
				rounded === null
					? shortenSvgPath(value)
					: shortenSvgPath(rounded, false, false);
			const result = exact === null ? rounded : exact;
			// Runs kept for compression can outgrow the source; then it is only shortened.
			if (result !== null && result.length > value.length) {
				const plain = shortenSvgPath(value);
				if (plain !== null && plain.length < result.length) return plain;
			}
			return result;
		} finally {
			S._svgPrecision = precision;
		}
	}
	const text = trimSvgValue(value);
	const number = /[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/y;
	let position = 0;
	let command = "";
	let count = 0;
	let arity = 0;
	let output = "";
	let implicitCommand = "";
	let previousToken = "";
	let afterFlag = false;
	let absolute = false;
	let currentX = "0";
	let currentY = "0";
	let subpathX = "";
	let subpathY = "";
	svgPathOrigins.fill(0);
	svgPathDecimals.fill(0);
	let previousCurve = "";
	let firstControlX = "";
	let controlX = "";
	let controlY = "";
	// Hold a segment's endpoint x until its y completes the pair.
	let pendingX = "";
	let segmentPrefix = "";
	let segmentImplicitCommand = "";
	let segmentPreviousToken = "";
	/** @type {string[]} */
	const segmentArguments = [];
	/**
	 * Write one argument, separated from the one before only where they would merge.
	 * @param {string} token a shortened number or arc flag
	 * @returns {void}
	 */
	const writeToken = (token) => {
		const separator =
			previousToken !== "" &&
			!afterFlag &&
			token.charAt(0) !== "-" &&
			token.charAt(0) !== "+" &&
			!(token.charAt(0) === "." && /[.eE]/.test(previousToken));
		output += (separator ? " " : "") + token;
		previousToken = token;
	};
	/**
	 * Write a command letter unless a bare argument already continues it.
	 * @param {string} letter the segment's command
	 * @returns {void}
	 */
	const writeCommand = (letter) => {
		if (letter !== implicitCommand) {
			output += letter;
			previousToken = "";
			afterFlag = false;
		}
		implicitCommand = letter === "M" ? "L" : letter === "m" ? "l" : letter;
	};
	while (position < text.length) {
		const letter = text.charAt(position);
		// SVG commands are ASCII; Unicode case folding also maps long s to "S".
		const upper =
			letter >= "a" && letter <= "z" ? letter.toUpperCase() : letter;
		if (SVG_PATH_ARGUMENTS[upper] !== undefined) {
			if (
				(command !== "" &&
					arity !== 0 &&
					(count === 0 || count % arity !== 0)) ||
				(command === "" && upper !== "M")
			) {
				return null;
			}
			segmentPrefix = output;
			segmentImplicitCommand = implicitCommand;
			segmentPreviousToken = previousToken;
			segmentArguments.length = 0;
			command = letter === "l" ? letter : upper;
			absolute = letter === upper;
			arity = Number(SVG_PATH_ARGUMENTS[upper]);
			count = 0;
			if (arity === 0) {
				currentX = subpathX;
				currentY = subpathY;
				svgPathOrigins.copyWithin(0, 4, 8);
				svgPathDecimals.copyWithin(0, 4, 8);
				previousCurve = "";
			}
			// Lines and explicit curves wait until their first coordinate pair is known.
			if (upper !== "L" && upper !== "C" && upper !== "Q") {
				if (arity === 0) implicitCommand = "";
				writeCommand(arity === 0 ? "z" : letter);
			}
			position++;
			while (isXmlWhitespace(text.charCodeAt(position))) position++;
			continue;
		}
		if (command === "" || arity === 0) return null;
		let token;
		const argument = count % arity;
		if (
			argument === 0 &&
			count !== 0 &&
			command !== "M" &&
			command !== "L" &&
			command !== "l" &&
			command !== "C" &&
			command !== "Q"
		) {
			writeCommand(absolute ? command : command.toLowerCase());
		}
		if (command === "A" && (argument === 3 || argument === 4)) {
			if (letter !== "0" && letter !== "1") return null;
			token = letter;
			position++;
		} else {
			number.lastIndex = position;
			const match = number.exec(text);
			if (
				match === null ||
				(command === "A" && argument < 2 && match[0].charAt(0) === "-")
			) {
				return null;
			}
			token = shortenSvgNumber(match[0]);
			position = number.lastIndex;
		}
		segmentArguments.push(token);
		if (S._shortenSvgPathData) readSvgPathArgument(argument, token);
		if (arity > 1 && argument === arity - 2) pendingX = token;
		const lineCommand =
			command === "M" && count >= 2 ? (absolute ? "L" : "l") : command;
		if (command === "C" || command === "Q") {
			if (argument === 0) {
				firstControlX = token;
			} else if (argument === 1) {
				// Reflecting an existing control can overflow even when its digits match.
				const shorthand =
					(previousCurve !== command ||
						(matchesSvgReflectedControl(
							currentX,
							controlX,
							firstControlX,
							absolute
						) &&
							matchesSvgReflectedControl(
								currentY,
								controlY,
								token,
								absolute
							))) &&
					(previousCurve === command ||
						(absolute
							? firstControlX === currentX && token === currentY
							: SVG_ZERO_NUMBER.test(firstControlX) &&
								SVG_ZERO_NUMBER.test(token)));
				const smooth =
					shorthand ||
					(command === "C" &&
						S._shortenSvgPathData &&
						reflectsSvgPathControl(previousCurve === "C", absolute));
				const letter = smooth ? (command === "C" ? "S" : "T") : command;
				writeCommand(absolute ? letter : letter.toLowerCase());
				if (!smooth) {
					writeToken(firstControlX);
					writeToken(token);
				}
			} else {
				writeToken(token);
			}
		} else if (lineCommand !== "l" && lineCommand !== "L") {
			writeToken(token);
		} else if (argument === 1) {
			if (
				lineCommand === "l"
					? SVG_ZERO_NUMBER.test(pendingX)
					: pendingX === currentX
			) {
				// A zero offset on one axis is exactly the other axis's own command.
				writeCommand(lineCommand === "l" ? "v" : "V");
				writeToken(token);
			} else if (
				lineCommand === "l" ? SVG_ZERO_NUMBER.test(token) : token === currentY
			) {
				writeCommand(lineCommand === "l" ? "h" : "H");
				writeToken(pendingX);
			} else {
				writeCommand(lineCommand);
				writeToken(pendingX);
				writeToken(token);
			}
		}
		if (argument === arity - 1) {
			if (S._shortenSvgPathData) {
				const writtenCommand =
					command === "M" && count === 1
						? absolute
							? "M"
							: "m"
						: implicitCommand;
				const upperCommand = writtenCommand.toUpperCase();
				const argumentsList =
					(command === "C" && upperCommand === "S") ||
					(command === "Q" && upperCommand === "T")
						? segmentArguments.slice(2)
						: (lineCommand === "L" || lineCommand === "l") &&
							  upperCommand === "H"
							? [pendingX]
							: (lineCommand === "L" || lineCommand === "l") &&
								  upperCommand === "V"
								? [token]
								: segmentArguments;
				const rebased = rebaseSvgPathDecimals(
					upperCommand,
					argumentsList,
					absolute,
					argumentsList.length === segmentArguments.length
						? 0
						: argumentsList.length === 1
							? upperCommand === "V"
								? 1
								: 0
							: 2,
					previousCurve !== "Q" ||
						(isExactSvgQuadraticControl(controlX) &&
							isExactSvgQuadraticControl(controlY))
				);
				if (rebased !== null) {
					const original = output;
					const lastToken = previousToken;
					output = segmentPrefix;
					implicitCommand = segmentImplicitCommand;
					previousToken = segmentPreviousToken;
					const axis = absolute && upperCommand === "L" && rebased.indexOf("0");
					if (axis === 0 || axis === 1) {
						rebased.splice(axis, 1);
						// The gate proved the unchanged axis exact, so its absolute command is too.
						const kept = argumentsList[1 - axis];
						const shorter = kept.length + 2 < rebased[0].length;
						if (shorter) rebased[0] = kept;
						writeCommand(
							axis === 0 ? (shorter ? "V" : "v") : shorter ? "H" : "h"
						);
					} else {
						writeCommand(
							absolute ? writtenCommand.toLowerCase() : upperCommand
						);
					}
					for (let i = 0; i < rebased.length; i++) {
						writeToken(rebased[i]);
						afterFlag = upperCommand === "A" && (i === 3 || i === 4);
					}
					// Inside a relative run a relative spelling may cost two more characters,
					// which compress away; a small switch back to absolute repeats more.
					if (
						(absolute &&
							output.length >
								original.length +
									(segmentPrefix === "" || strict
										? -1
										: segmentImplicitCommand >= "a"
											? 2
											: 0)) ||
						(!absolute && output.length > original.length - (strict ? 1 : 4))
					) {
						output = original;
						implicitCommand =
							writtenCommand === "M"
								? "L"
								: writtenCommand === "m"
									? "l"
									: writtenCommand;
						previousToken = lastToken;
					}
				}
			}
			const controlIndex =
				command === "C" ? 2 : command === "Q" || command === "S" ? 0 : -1;
			controlX =
				command === "T"
					? previousCurve === "Q"
						? reflectedSvgControl(currentX, controlX)
						: currentX
					: controlIndex === -1
						? ""
						: absoluteSvgCoordinate(
								segmentArguments[controlIndex],
								currentX,
								absolute
							);
			controlY =
				command === "T"
					? previousCurve === "Q"
						? reflectedSvgControl(currentY, controlY)
						: currentY
					: controlIndex === -1
						? ""
						: absoluteSvgCoordinate(
								segmentArguments[controlIndex + 1],
								currentY,
								absolute
							);
			previousCurve =
				command === "C" || command === "S"
					? "C"
					: command === "Q" || command === "T"
						? "Q"
						: "";
			if (S._shortenSvgPathData) {
				if (command === "C" || command === "S") {
					advanceSvgPathControl(command === "C" ? 2 : 0, absolute);
				}
				if (command !== "V") {
					advanceSvgPathOrigin(0, command === "H" ? 0 : arity - 2, absolute);
				}
				if (command !== "H") advanceSvgPathOrigin(1, arity - 1, absolute);
				if (command === "M" && count === 1) {
					svgPathOrigins.copyWithin(4, 0, 4);
					svgPathDecimals.copyWithin(4, 0, 4);
				}
			}
			// Accumulate only bounded eighths; every other relative endpoint stays unknown.
			if (!absolute) {
				if (command !== "V") {
					const origin = exactSvgPathCoordinate(currentX);
					const offset = exactSvgPathCoordinate(
						command === "H" ? token : pendingX
					);
					currentX =
						origin !== null &&
						offset !== null &&
						Math.abs(origin + offset) <= 1000000
							? shortenSvgNumber(String(origin + offset))
							: "";
				}
				if (command !== "H") {
					const origin = exactSvgPathCoordinate(currentY);
					const offset = exactSvgPathCoordinate(token);
					currentY =
						origin !== null &&
						offset !== null &&
						Math.abs(origin + offset) <= 1000000
							? shortenSvgNumber(String(origin + offset))
							: "";
				}
			} else if (command === "H") {
				currentX = token;
			} else if (command === "V") {
				currentY = token;
			} else {
				currentX = pendingX;
				currentY = token;
			}
			if (command === "M" && count === 1) {
				subpathX = currentX;
				subpathY = currentY;
			}
		}
		afterFlag = command === "A" && (argument === 3 || argument === 4);
		count++;
		if (count % arity === 0) {
			segmentPrefix = output;
			segmentImplicitCommand = implicitCommand;
			segmentPreviousToken = previousToken;
			segmentArguments.length = 0;
		}
		while (isXmlWhitespace(text.charCodeAt(position))) position++;
		if (text.charAt(position) === ",") {
			position++;
			while (isXmlWhitespace(text.charCodeAt(position))) position++;
			if (
				position === text.length ||
				SVG_PATH_ARGUMENTS[text.charAt(position).toUpperCase()] !== undefined
			) {
				return null;
			}
		}
	}
	if (command === "" || (arity !== 0 && (count === 0 || count % arity !== 0))) {
		return null;
	}
	if (output.length <= value.length || !retry) return output;
	// Relative runs that grew past the original can still hold shorter segments.
	const shortest = strict
		? value
		: /** @type {string} */ (shortenSvgPath(value, true));
	return shortest.length < value.length ? shortest : value;
};

/**
 * Whether a presentation value is an opaque SVG 1.1 color literal.
 * @param {string} value decoded color value
 * @returns {boolean} whether the CSS renderer can shorten it without parsing paint servers
 */
const isSvgColor = (value) => {
	const text = trimSvgValue(value);
	if (/^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(text)) return true;
	if (/^[a-z]+$/i.test(text)) {
		const { LATER_COLOR_NAMES, getColorNameToRgb } = require("../css/data");

		const name = text.toLowerCase();
		return getColorNameToRgb().has(name) && !LATER_COLOR_NAMES.has(name);
	}
	if (!/^rgb\(/i.test(text) || !text.endsWith(")")) return false;
	const channels = text.slice(4, -1).split(",");
	if (channels.length !== 3) return false;
	const percent = trimSvgValue(channels[0]).endsWith("%");
	return channels.every((channel) => {
		const number = trimSvgValue(channel);
		return (
			/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)%?$/.test(number) &&
			number.endsWith("%") === percent
		);
	});
};

/**
 * Offer one SVG color declaration to the same CSS renderer as inline styles.
 * @param {string} name presentation attribute name
 * @param {string} value decoded source color
 * @param {string} original the already quoted XML attribute
 * @returns {string} the shorter attribute or a deferred marker
 */
const xmlColorAttribute = (name, value, original) => {
	const quote = S._xmlQuote;
	/**
	 * @param {string | undefined} rendered the rendered declaration
	 * @returns {string} the shorter XML attribute
	 */
	const build = (rendered) => {
		if (typeof rendered !== "string" || !rendered.startsWith(`${name}:`)) {
			return original;
		}
		let color = trimSvgValue(rendered.slice(name.length + 1));
		if (!isSvgColor(color)) return original;
		// Hex digits ignore case, and one case compresses better.
		if (color.charCodeAt(0) === 35) color = color.toLowerCase();
		const attribute = ` ${name}=${quote}${escapeXmlAttribute(
			color,
			quote
		)}${quote}`;
		return attribute.length <= original.length ? attribute : original;
	};
	const source = `${name}:${value}`;
	return S._deferEmbeddedSource !== undefined
		? deferEmbedded(source, CSS_TYPE, build, BLOCK_CONTENTS)
		: build(
				renderEmbeddedOrNull(source, CSS_TYPE, BLOCK_CONTENTS) || undefined
			);
};

/**
 * Find a stylesheet or a link to one inside an element, which applies wherever it sits.
 * @param {HtmlNodeRef} node the element
 * @returns {boolean} whether a descendant is a style or links a stylesheet
 */
const holdsXmlStylesheetLink = (node) => {
	const pending = [S._firstChildren[node]];
	while (pending.length !== 0) {
		for (
			let child = /** @type {number} */ (pending.pop());
			child !== 0;
			child = S._nextSiblings[child]
		) {
			if (S._types[child] !== NodeType.Element) continue;
			if (svgLocalName(child) === "style") return true;
			const start = S._attrStarts[child];
			for (let i = start; i < start + S._attrCounts[child]; i++) {
				if (
					S._attrNames[i] === "rel" &&
					/(?:^|[\t\n\f\r ])stylesheet(?:$|[\t\n\f\r ])/i.test(
						xmlAttributeValue(i)
					)
				) {
					return true;
				}
			}
			pending.push(S._firstChildren[child]);
		}
	}
	return false;
};

/**
 * Unlink every removed node from its parent's children.
 * @returns {void}
 */
const spliceRemovedXmlNodes = () => {
	const removed = /** @type {Set<HtmlNodeRef>} */ (S._xmlRemovedNodes);
	for (let node = 1; node <= S._nodeCount; node++) {
		if (S._types[node] !== NodeType.Element || removed.has(node)) continue;
		let previous = 0;
		for (let child = S._firstChildren[node]; child !== 0;) {
			const next = S._nextSiblings[child];
			if (removed.has(child)) {
				if (previous === 0) S._firstChildren[node] = next;
				else S._nextSiblings[previous] = next;
				if (S._lastChildren[node] === child) {
					S._lastChildren[node] = previous;
				}
			} else {
				previous = child;
			}
			child = next;
		}
	}
};

/**
 * Resolve a prefix through the `xmlns` declarations in scope at an element.
 * @param {HtmlNodeRef} node the element
 * @param {string} prefix the prefix
 * @returns {string} its namespace, or "" when none is declared
 */
const xmlPrefixNamespace = (node, prefix) => {
	const declaration = `xmlns:${prefix}`;
	for (
		let current = node;
		S._types[current] === NodeType.Element;
		current = S._parents[current]
	) {
		const start = S._attrStarts[current];
		for (let i = start; i < start + S._attrCounts[current]; i++) {
			if (S._attrNames[i] === declaration) return xmlAttributeValue(i);
		}
	}
	return "";
};

/**
 * Whether an element sits inside one with a given local name.
 * @param {HtmlNodeRef} node the element
 * @param {string} name the ancestor's local name
 * @returns {boolean} true when an ancestor has that name
 */
const hasSvgAncestor = (node, name) => {
	for (
		let ancestor = S._parents[node];
		S._types[ancestor] === NodeType.Element;
		ancestor = S._parents[ancestor]
	) {
		if (svgLocalName(ancestor) === name) return true;
	}
	return false;
};

/**
 * Whether an element is a link inside a switch, which Blink renders as a switch itself.
 * @param {HtmlNodeRef} node the element
 * @returns {boolean} true when its children must keep their order and count
 */
const isSvgSwitchLink = (node) =>
	svgLocalName(node) === "a" && hasSvgAncestor(node, "switch");

/**
 * Whether an element holds a descendant with a given local name.
 * @param {HtmlNodeRef} node the element
 * @param {string} name the local name
 * @returns {boolean} true when a descendant has it
 */
const svgSubtreeHas = (node, name) => {
	const pending = [S._firstChildren[node]];
	while (pending.length !== 0) {
		for (
			let child = /** @type {number} */ (pending.pop());
			child !== 0;
			child = S._nextSiblings[child]
		) {
			if (S._types[child] !== NodeType.Element) continue;
			if (svgLocalName(child) === name) return true;
			pending.push(S._firstChildren[child]);
		}
	}
	return false;
};

/**
 * Drop transform attributes whose lists compose to the identity, as if never written.
 * A transform stays above a foreign object, whose fixed boxes it would contain, and
 * on a gradient or pattern with a template, which would lend its own instead.
 * @param {HtmlNodeRef} node the element
 * @param {string} localName its local name
 * @param {Map<string, number>} attributes its attributes, updated in place
 * @returns {void}
 */
const dropIdentitySvgTransforms = (node, localName, attributes) => {
	const name =
		localName === "pattern"
			? "patternTransform"
			: localName === "linearGradient" || localName === "radialGradient"
				? "gradientTransform"
				: "transform";
	const index = attributes.get(name);
	if (index === undefined) return;
	if (name === "transform") {
		if (
			!SVG_TRANSFORM_FOLD_TARGETS.has(localName) ||
			svgSubtreeHas(node, "foreignObject")
		) {
			return;
		}
	} else {
		for (const attribute of attributes.keys()) {
			if (attribute === "href" || attribute.endsWith(":href")) return;
		}
	}
	const value = svgAttributeValue(index);
	const short =
		trimSvgValue(value) === ""
			? ""
			: shortenSvgNumericValue(value, "transform");
	if (
		short === "" ||
		(short !== null &&
			/^(?:translate\(0\)|scale\(1\)|rotate\(0\)|skew[XY]\(0\))$/.test(short))
	) {
		/** @type {Set<number>} */ (S._xmlRemovedAttributes).add(index);
		attributes.delete(name);
	}
};

/**
 * Repeat cleanup passes until a round removes and rewrites nothing, at most eight times.
 * @param {() => void} round one round of the passes
 * @returns {void}
 */
const settleSvgCleanup = (round) => {
	const removedNodes = /** @type {Set<HtmlNodeRef>} */ (S._xmlRemovedNodes);
	const removedAttributes = /** @type {Set<number>} */ (
		S._xmlRemovedAttributes
	);
	for (let count = 0; count < 8; count++) {
		const before = `${removedNodes.size} ${removedAttributes.size} ${S._attrCount}`;
		round();
		if (
			`${removedNodes.size} ${removedAttributes.size} ${S._attrCount}` ===
			before
		) {
			return;
		}
	}
};

/**
 * Mark an element and everything inside it removed.
 * @param {HtmlNodeRef} node the element
 * @returns {void}
 */
const removeXmlSubtree = (node) => {
	const removed = /** @type {Set<HtmlNodeRef>} */ (S._xmlRemovedNodes);
	const pending = [node];
	while (pending.length !== 0) {
		const current = /** @type {number} */ (pending.pop());
		removed.add(current);
		if (S._types[current] !== NodeType.Element) continue;
		for (
			let child = S._firstChildren[current];
			child !== 0;
			child = S._nextSiblings[child]
		) {
			pending.push(child);
		}
	}
};

/**
 * Spell a CSS escape's code point, U+FFFD standing for zero, a surrogate or one past U+10FFFF.
 * @param {number} code the code point
 * @returns {string} its character
 */
const cssCodePoint = (code) =>
	code === 0 || (code >= 0xd800 && code <= 0xdfff) || code > 0x10ffff
		? "\uFFFD"
		: String.fromCodePoint(code);

/**
 * Trim the whitespace CSS reads as such, which U+00A0 and other spaces are not.
 * @param {string} text the text
 * @returns {string} the text without leading and trailing CSS whitespace
 */
const trimCss = (text) => text.replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, "");

/**
 * Split CSS text at a delimiter outside strings, parentheses and brackets.
 * @param {string} text the text
 * @param {string} delimiter the one-character delimiter
 * @returns {string[] | null} the parts, or null where a string or group never closes
 */
const splitSvgCss = (text, delimiter) => {
	/** @type {string[]} */
	const parts = [];
	let depth = 0;
	let quote = "";
	let start = 0;
	for (let index = 0; index < text.length; index++) {
		const char = text.charAt(index);
		if (quote !== "") {
			if (char === quote) quote = "";
		} else if (char === '"' || char === "'") {
			quote = char;
		} else if (char === "{" || char === "}") {
			return null;
		} else if (char === "(" || char === "[") {
			depth++;
		} else if (char === ")" || char === "]") {
			depth--;
			if (depth < 0) return null;
		} else if (char === delimiter && depth === 0) {
			parts.push(text.slice(start, index));
			start = index + 1;
		}
	}
	if (quote !== "" || depth !== 0) return null;
	parts.push(text.slice(start));
	return parts;
};

/**
 * Replace CSS comments outside strings with a space, as CSS reads them.
 * @param {string} text the CSS
 * @returns {string | null} the text without comments, or null where one never closes
 */
const stripSvgCssComments = (text) => {
	if (!text.includes("/*")) return text;
	let output = "";
	let quote = "";
	for (let index = 0; index < text.length; index++) {
		const char = text.charAt(index);
		if (quote !== "") {
			if (char === quote) quote = "";
		} else if (char === '"' || char === "'") {
			quote = char;
		} else if (char === "/" && text.charAt(index + 1) === "*") {
			const end = text.indexOf("*/", index + 2);
			if (end === -1) return null;
			output += " ";
			index = end + 1;
			continue;
		}
		output += char;
	}
	return output;
};

/**
 * Read a declaration list into names and values, `!important` kept on the value.
 * @param {string} text the declarations, without braces
 * @returns {[string, string][] | null} the declarations in order, or null where one does not parse
 */
const svgCssDeclarations = (text) => {
	const parts = splitSvgCss(text, ";");
	if (parts === null) return null;
	/** @type {[string, string][]} */
	const declarations = [];
	for (const part of parts) {
		if (/^[\t\n\f\r ]*$/.test(part)) continue;
		const colon = part.indexOf(":");
		if (colon === -1) return null;
		const name = trimCss(part.slice(0, colon));
		const value = trimCss(part.slice(colon + 1)).replace(
			/[\t\n\f\r ]*![\t\n\f\r ]*important$/i,
			"!important"
		);
		if (!/^-?-?[a-zA-Z][a-zA-Z0-9-]*$/.test(name) || value === "") return null;
		declarations.push([
			name.startsWith("--") ? name : asciiLowercase(name),
			value
		]);
	}
	return declarations;
};

/** @typedef {{ tag: string, ids: string[], classes: string[], attributes: [string, string | null][], pseudo: string[], not: SvgCssCompound[], child: boolean }} SvgCssCompound */

/**
 * Read a selector into compounds of the kinds the inliner matches: type or `*`,
 * classes, IDs, attribute presence or equality, tree-structural pseudo-classes and
 * `:not()` of one compound, joined by descendant or `>`.
 * @param {string} text one selector of a list
 * @returns {{ compounds: SvgCssCompound[], specificity: number, memo: Map<number, boolean> } | null} left to right, each compound's `child` for its link to the one before; null for anything else
 */
const svgCssSelector = (text) => {
	/** @type {SvgCssCompound[]} */
	const compounds = [];
	let ids = 0;
	let classes = 0;
	let types = 0;
	const simple =
		"[.#][a-zA-Z_-][\\w-]*|\\[[\\t\\n\\f\\r ]*[a-zA-Z_][\\w-]*[\\t\\n\\f\\r ]*(?:=[\\t\\n\\f\\r ]*(?:\"[^\"]*\"|'[^']*'|[a-zA-Z_-][\\w-]*)[\\t\\n\\f\\r ]*)?\\]|:(?:first-child|last-child|only-child|root)(?![\\w-])";
	const compoundPattern = new RegExp(
		`[\\t\\n\\f\\r ]*(>)?[\\t\\n\\f\\r ]*([a-zA-Z_][\\w-]*|\\*)?((?:${simple}|:not\\((?:[^()"']|"[^"]*"|'[^']*')*\\))*)`,
		"y"
	);
	const simplePattern =
		/([.#])([\w-]+)|\[[\t\n\f\r ]*([\w-]+)[\t\n\f\r ]*(?:=[\t\n\f\r ]*(?:"([^"]*)"|'([^']*)'|([\w-]+))[\t\n\f\r ]*)?\]|:(first-child|last-child|only-child|root)|:not\(((?:[^()"']|"[^"]*"|'[^']*')*)\)/g;
	const trimmed = trimCss(text);
	let position = 0;
	while (position < trimmed.length) {
		compoundPattern.lastIndex = position;
		const match = compoundPattern.exec(trimmed);
		if (
			match === null ||
			(match[2] === undefined && match[3] === "") ||
			(match[1] !== undefined && compounds.length === 0)
		) {
			return null;
		}
		/** @type {SvgCssCompound} */
		const compound = {
			tag: match[2] || "*",
			ids: [],
			classes: [],
			attributes: [],
			pseudo: [],
			not: [],
			child: match[1] !== undefined
		};
		if (match[2] !== undefined && match[2] !== "*") types++;
		simplePattern.lastIndex = 0;
		let part;
		while ((part = simplePattern.exec(match[3])) !== null) {
			if (part[1] === "#") {
				compound.ids.push(part[2]);
				ids++;
			} else if (part[1] === ".") {
				compound.classes.push(part[2]);
				classes++;
			} else if (part[7] !== undefined) {
				compound.pseudo.push(part[7]);
				classes++;
			} else if (part[8] !== undefined) {
				const inner = svgCssSelector(part[8]);
				if (inner === null || inner.compounds.length !== 1) return null;
				compound.not.push(inner.compounds[0]);
				ids += inner.specificity >> 16;
				classes += (inner.specificity >> 8) & 255;
				types += inner.specificity & 255;
			} else {
				const value =
					part[4] !== undefined
						? part[4]
						: part[5] !== undefined
							? part[5]
							: part[6];
				compound.attributes.push([part[3], value === undefined ? null : value]);
				classes++;
			}
		}
		compounds.push(compound);
		position = compoundPattern.lastIndex;
	}
	return compounds.length === 0
		? null
		: {
				compounds,
				specificity: ids * 65536 + classes * 256 + types,
				memo: /** @type {Map<number, boolean>} */ (new Map())
			};
};

/**
 * Whether an element matches a selector from one of its compounds leftwards.
 * @param {HtmlNodeRef} node the element
 * @param {SvgCssCompound[]} compounds the selector, left to right
 * @param {number} index the compound the element must match
 * @param {Map<number, boolean>} memo what this selector's compounds gave per element,
 * so a descendant chain that fails tries each element once per compound
 * @returns {boolean} true when it and its ancestors match through the first compound
 */
const svgCssMatches = (node, compounds, index, memo) => {
	const compound = compounds[index];
	if (compound.tag !== "*" && compound.tag !== svgLocalName(node)) {
		return false;
	}
	const attributes = svgAttributes(node);
	const id = attributes.get("id");
	const classAttribute = attributes.get("class");
	const classes =
		classAttribute === undefined
			? []
			: xmlAttributeValue(classAttribute).split(/[\t\n\f\r ]+/);
	if (
		compound.ids.some(
			(name) => id === undefined || xmlAttributeValue(id) !== name
		) ||
		compound.classes.some((name) => !classes.includes(name)) ||
		compound.attributes.some(([name, value]) => {
			const attribute = attributes.get(name);
			return (
				attribute === undefined ||
				(value !== null && xmlAttributeValue(attribute) !== value)
			);
		})
	) {
		return false;
	}
	for (const pseudo of compound.pseudo) {
		if (pseudo === "root") {
			if (S._types[S._parents[node]] !== NodeType.Document) return false;
			continue;
		}
		let before = false;
		let after = false;
		for (
			let sibling = S._firstChildren[S._parents[node]];
			sibling !== 0;
			sibling = S._nextSiblings[sibling]
		) {
			if (sibling === node) {
				before = after;
				after = false;
			} else if (
				S._types[sibling] === NodeType.Element &&
				// What another switch removed is gone from the tree the rules match.
				!(S._xmlRemovedNodes !== null && S._xmlRemovedNodes.has(sibling))
			) {
				after = true;
			}
		}
		if (
			(pseudo !== "last-child" && before) ||
			(pseudo !== "first-child" && after)
		) {
			return false;
		}
	}
	for (const inner of compound.not) {
		if (svgCssMatches(node, [inner], 0, memo)) return false;
	}
	if (index === 0) return true;
	const key = node * compounds.length + index;
	const known = memo.get(key);
	if (known !== undefined) return known;
	let matches = false;
	for (
		let parent = S._parents[node];
		S._types[parent] === NodeType.Element;
		parent = S._parents[parent]
	) {
		if (svgCssMatches(parent, compounds, index - 1, memo)) {
			matches = true;
			break;
		}
		if (compound.child) break;
	}
	memo.set(key, matches);
	return matches;
};

/**
 * Move every rule of the document's stylesheets into the style attributes of the
 * elements it matches, then drop the stylesheets and the classes they named.
 * Rules come first in cascade order and an element's own declarations after, so
 * importance and order resolve within one attribute as the cascade did.
 * @param {string[]} pseudoClasses pseudo-classes, lowercase and without the colon, to inline as if always held
 * @returns {void}
 */
const inlineSvgStyles = (pseudoClasses) => {
	// WHY: anything else a rule could reach declines the whole document: other
	// selectors, at-rules, escapes, scripts, external sheets, animated classes or
	// styles, and a result that grows.
	const removedNodes = /** @type {Set<HtmlNodeRef>} */ (S._xmlRemovedNodes);
	/** @type {HtmlNodeRef[]} */
	const sheets = [];
	let css = "";
	let used = false;
	for (let node = 1; node <= S._nodeCount; node++) {
		if (removedNodes.has(node)) continue;
		const type = S._types[node];
		if (
			type === NodeType.Doctype ||
			(type === NodeType.ProcessingInstruction &&
				S._piTargets.get(node) === "xml-stylesheet")
		) {
			return;
		}
		if (type !== NodeType.Element) continue;
		const localName = svgLocalName(node);
		const attributes = svgAttributes(node);
		const rel = attributes.get("rel");
		if (
			localName === "script" ||
			localName === "handler" ||
			// Only a stylesheet link brings rules in; a help link, say, stays inert.
			(localName === "link" &&
				(rel === undefined ||
					/(?:^|[\t\n\f\r ])stylesheet(?:$|[\t\n\f\r ])/i.test(
						xmlAttributeValue(rel)
					)))
		) {
			return;
		}
		for (const [name, index] of attributes) {
			if (
				asciiLowercase(name).startsWith("on") ||
				(name === "attributeName" &&
					/^[\t\n\f\r ]*(?:class|style)[\t\n\f\r ]*$/.test(
						xmlAttributeValue(index)
					))
			) {
				return;
			}
		}
		if (localName === "use") used = true;
		if (localName !== "style") continue;
		const typeAttribute = attributes.get("type");
		if (
			typeAttribute !== undefined &&
			!/^[\t\n\f\r ]*(?:text\/css)?[\t\n\f\r ]*$/i.test(
				xmlAttributeValue(typeAttribute)
			)
		) {
			// Not CSS, so not a stylesheet either.
			continue;
		}
		for (const name of attributes.keys()) {
			if (
				name !== "type" &&
				name !== "id" &&
				name !== "xmlns" &&
				!name.startsWith("xmlns:") &&
				name !== "xml:space"
			) {
				return;
			}
		}
		if (!xmlElementIsStyled(node, true)) return;
		let sheet = "";
		for (
			let child = S._firstChildren[node];
			child !== 0;
			child = S._nextSiblings[child]
		) {
			const childType = S._types[child];
			if (childType === NodeType.Text) sheet += dataOf(child);
			else if (childType !== NodeType.Comment) return;
		}
		// CSS reads each sheet alone, so no rule or comment may start in one and end in the next.
		if (
			stripSvgCssComments(sheet) === null ||
			/[{}]/.test(sheet.replace(/\{[^{}]*\}/g, "")) ||
			/[^\t\n\r ]/.test(sheet.slice(sheet.lastIndexOf("}") + 1))
		) {
			return;
		}
		css += `${sheet}\n`;
		sheets.push(node);
	}
	if (sheets.length === 0) return;
	// A comment between selector tokens is no whitespace, so it is no combinator.
	if (css.replace(/\{[^{}]*\}/g, "").includes("/*")) return;
	const stripped = stripSvgCssComments(css);
	if (stripped === null) return;
	css = stripped;
	// At-rules, escapes and markup-comment tokens are left for a CSS reader.
	if (
		/[@\\<{}]/.test(css.replace(/\{[^{}]*\}/g, "")) ||
		/[@\\<]|--!?>/.test(css)
	) {
		return;
	}
	/** @type {{ selectors: { compounds: SvgCssCompound[], specificity: number, memo: Map<number, boolean> }[], declarations: [string, string][] }[]} */
	const rules = [];
	/** @type {Set<string>} */
	const named = new Set();
	const blocks = /([^{}]*)\{([^{}]*)\}/g;
	// The sheets as they would print minified, which inlining must not outgrow.
	let printed = sheets.length * "<style></style>".length;
	let block;
	while ((block = blocks.exec(css)) !== null) {
		const selectorList = splitSvgCss(block[1], ",");
		const declarations = svgCssDeclarations(block[2]);
		if (selectorList === null || declarations === null) return;
		printed += selectorList.map((part) => part.trim()).join(",").length + 1;
		for (const [name, value] of declarations) {
			printed += name.length + value.length + 2;
		}
		/** @type {{ compounds: SvgCssCompound[], specificity: number, memo: Map<number, boolean> }[]} */
		const selectors = [];
		for (const text of selectorList) {
			// A pseudo-class asked to always hold matches as if absent, yet still ranks.
			let held = 0;
			const selector = svgCssSelector(
				pseudoClasses.length === 0
					? text
					: text.replace(
							/:([a-zA-Z-]+)(?![\w(-])/g,
							/**
							 * @param {string} match the pseudo-class
							 * @param {string} name its name
							 * @returns {string} nothing for one asked to hold, else itself
							 */
							(match, name) => {
								if (!pseudoClasses.includes(asciiLowercase(name))) return match;
								held++;
								return "";
							}
						)
			);
			if (selector !== null) selector.specificity += held * 256;
			// Blink matches a use clone where it sits in the shadow tree, so only
			// what an element carries itself matches it alike there.
			if (
				selector === null ||
				(used &&
					(selector.compounds.length !== 1 ||
						selector.compounds[0].pseudo.length !== 0 ||
						selector.compounds[0].not.some(
							(inner) => inner.pseudo.length !== 0
						)))
			) {
				return;
			}
			for (const compound of selector.compounds) {
				for (const name of compound.classes) named.add(name);
			}
			selectors.push(selector);
		}
		rules.push({ selectors, declarations });
	}
	/** @type {Map<HtmlNodeRef, { declarations: [string, string][], style: [string, string][] }>} */
	const writes = new Map();
	let growth = -printed;
	for (let node = 1; node <= S._nodeCount; node++) {
		if (S._types[node] !== NodeType.Element || removedNodes.has(node)) {
			continue;
		}
		/** @type {[number, number, [string, string][]][]} */
		const matched = [];
		for (let order = 0; order < rules.length; order++) {
			let specificity = -1;
			for (const selector of rules[order].selectors) {
				if (
					selector.specificity > specificity &&
					svgCssMatches(
						node,
						selector.compounds,
						selector.compounds.length - 1,
						selector.memo
					)
				) {
					specificity = selector.specificity;
				}
			}
			if (specificity !== -1 && rules[order].declarations.length !== 0) {
				matched.push([specificity, order, rules[order].declarations]);
			}
		}
		const attributes = svgAttributes(node);
		const classAttribute = attributes.get("class");
		if (matched.length === 0 && classAttribute === undefined) continue;
		const styleAttribute = attributes.get("style");
		const style =
			styleAttribute === undefined
				? []
				: svgCssDeclarations(xmlAttributeValue(styleAttribute));
		if (style === null) return;
		matched.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
		/** @type {[string, string][]} */
		const declarations = [];
		for (const [, , list] of matched) declarations.push(...list);
		for (const [name, value] of declarations) {
			growth += name.length + value.length + 2;
		}
		if (styleAttribute === undefined && declarations.length !== 0) growth += 8;
		if (classAttribute !== undefined) {
			for (const token of xmlAttributeValue(classAttribute).split(
				/[\t\n\f\r ]+/
			)) {
				if (named.has(token)) growth -= token.length + 1;
			}
		}
		writes.set(node, { declarations, style });
	}
	if (growth > 0) return;
	for (const [node, { declarations, style }] of writes) {
		/** @type {Map<string, string>} */
		const values = new Map();
		for (const [name, index] of svgAttributes(node)) {
			if (name === "class") {
				const kept = xmlAttributeValue(index)
					.split(/[\t\n\f\r ]+/)
					.filter((token) => token !== "" && !named.has(token));
				if (kept.length !== 0) values.set(name, kept.join(" "));
			} else if (name !== "style") {
				values.set(name, svgAttributeValue(index));
			}
		}
		const merged = [...declarations, ...style];
		if (merged.length !== 0) {
			values.set(
				"style",
				merged.map(([name, value]) => `${name}:${value}`).join(";")
			);
		}
		writeSvgAttributes(node, values);
	}
	for (const sheet of sheets) removeXmlSubtree(sheet);
};

/**
 * Read an `element:attribute:value` removal pattern, as svgo's `removeAttrs` does:
 * each part is a case-insensitive regular expression matched whole, `*` any.
 * @param {string} pattern the pattern; a lone attribute or `element:attribute` matches any value
 * @returns {RegExp[]} the element, attribute and value expressions
 */
const svgAttributePattern = (pattern) => {
	const parts = pattern.split(":");
	if (parts.length === 1) parts.unshift(".*");
	// A value can hold colons of its own, as a URL does.
	parts.splice(
		2,
		parts.length,
		parts.length > 2 ? parts.slice(2).join(":") : ".*"
	);
	return parts.map(
		(part) => new RegExp(`^(?:${part === "*" ? ".*" : part})$`, "i")
	);
};

/**
 * Say an `xlink:title`, which browsers do not all read, as the `title` child they all do.
 * Titles that go anyway take the attribute along, and an element with a `title` keeps it.
 * @param {HtmlNodeRef} node the element
 * @param {number} attribute its `xlink:title`
 * @param {boolean} untitled whether titles are removed
 * @returns {boolean} whether the attribute went
 */
const spellSvgXlinkTitle = (node, attribute, untitled) => {
	const removed = /** @type {Set<number>} */ (S._xmlRemovedAttributes);
	if (untitled) {
		removed.add(attribute);
		return true;
	}
	const text = xmlAttributeValue(attribute);
	if (text.trim() === "") return false;
	for (let child = S._firstChildren[node]; child !== 0;) {
		if (
			S._types[child] === NodeType.Element &&
			svgLocalName(child) === "title"
		) {
			return false;
		}
		child = S._nextSiblings[child];
	}
	const tag = tagNameOf(node);
	const content = makeTextNode(text, 0, 0);
	const element = mkEl(
		`${tag.slice(0, tag.indexOf(":") + 1)}title`,
		NS_SVG,
		{ start: S._attrCount + 1, count: 0 },
		null
	);
	appendChild(element, content);
	S._parents[element] = node;
	S._nextSiblings[element] = S._firstChildren[node];
	if (S._lastChildren[node] === 0) S._lastChildren[node] = element;
	S._firstChildren[node] = element;
	removed.add(attribute);
	return true;
};

/**
 * Remove what the opt-in SVG switches name: scripts, titles, descriptions,
 * raster images, a bare DOCTYPE, `xlink:href` spellings and root dimensions.
 * @param {HtmlProcessOptions} options the switches
 * @param {HtmlNodeRef} document the document node
 * @returns {void}
 */
const removeOptionalSvgContent = (options, document) => {
	// The first pass to remove anything, so the later ones keep these sets.
	const removedNodes = (S._xmlRemovedNodes = new Set());
	const removedAttributes = (S._xmlRemovedAttributes = new Set());
	const attributePatterns =
		options.removeSvgAttributes === undefined
			? []
			: options.removeSvgAttributes.map(svgAttributePattern);
	const removedElements = options.removeSvgElements || {};
	const removedIds = new Set(removedElements.id);
	const removedClasses = new Set(removedElements.class);
	if (
		options.removeXmlDoctype === true &&
		// An undeclared entity is well-formed only while a DTD could declare it.
		!/&(?!(?:lt|gt|amp|quot|apos);|#)/.test(S._input)
	) {
		let previous = 0;
		for (let node = S._firstChildren[document]; node !== 0;) {
			const next = S._nextSiblings[node];
			if (
				S._types[node] === NodeType.Doctype &&
				!S._input.slice(S._starts[node], S._ends[node]).includes("[")
			) {
				// The root element follows, so a DOCTYPE is never the last child.
				removedNodes.add(node);
				if (previous === 0) S._firstChildren[document] = next;
				else S._nextSiblings[previous] = next;
			} else {
				previous = node;
			}
			node = next;
		}
	}
	for (let node = 1; node <= S._nodeCount; node++) {
		if (
			S._types[node] !== NodeType.Element ||
			removedNodes.has(node) ||
			!xmlElementIsStyled(node)
		) {
			continue;
		}
		const name = svgLocalName(node);
		const svg = xmlElementIsStyled(node, true);
		if (
			(options.removeSvgScripts === true && name === "script") ||
			(svg &&
				((options.removeSvgTitles === true && name === "title") ||
					(options.removeSvgDescriptions === true && name === "desc")) &&
				!holdsXmlStylesheetLink(node))
		) {
			removeXmlSubtree(node);
			continue;
		}
		const attributes = svgAttributes(node);
		const id = attributes.get("id");
		const classes = attributes.get("class");
		if (
			(id !== undefined && removedIds.has(xmlAttributeValue(id))) ||
			(classes !== undefined &&
				removedClasses.size !== 0 &&
				xmlAttributeValue(classes)
					.split(/[\t\n\r ]+/)
					.some((token) => removedClasses.has(token)))
		) {
			removeXmlSubtree(node);
			continue;
		}
		if (attributePatterns.length !== 0) {
			const tagName = tagNameOf(node);
			for (const [attribute, index] of attributes) {
				const value = xmlAttributeValue(index);
				for (const [element, name, written] of attributePatterns) {
					if (
						element.test(tagName) &&
						name.test(attribute) &&
						written.test(value)
					) {
						removedAttributes.add(index);
						attributes.delete(attribute);
						break;
					}
				}
			}
		}
		if (options.removeSvgScripts === true) {
			for (const [attribute, index] of attributes) {
				const colon = attribute.indexOf(":");
				// Handlers and URLs are unprefixed; only XLink spells a link with one.
				if (
					colon !== -1 &&
					(attribute.slice(colon + 1) !== "href" ||
						xmlPrefixNamespace(node, attribute.slice(0, colon)) !==
							"http://www.w3.org/1999/xlink")
				) {
					continue;
				}
				const local = asciiLowercase(attribute.slice(colon + 1));
				// URL parsing drops tabs and newlines, and leading spaces and controls.
				const url = xmlAttributeValue(index)
					.replace(/[\t\n\r]/g, "")
					.replace(/^[\0- ]+/, "");
				if (
					local.startsWith("on") ||
					local === "srcdoc" ||
					((local === "href" ||
						local === "src" ||
						local === "action" ||
						local === "formaction" ||
						local === "data") &&
						(/^(?:java|vb)script:/i.test(url) ||
							// An SVG image's data URL draws a picture; a link's opens a document.
							((name === "a" || !svg) &&
								/^data:(?:text\/html|application\/xhtml\+xml|image\/svg\+xml)[;,]/i.test(
									url
								))))
				) {
					removedAttributes.add(index);
					attributes.delete(attribute);
				}
			}
		}
		if (!svg) continue;
		// XLink by namespace, whichever prefix spells it.
		/** @type {Map<string, number>} */
		const xlink = new Map();
		for (const [attribute, index] of attributes) {
			const colon = attribute.indexOf(":");
			if (
				colon !== -1 &&
				xmlPrefixNamespace(node, attribute.slice(0, colon)) ===
					"http://www.w3.org/1999/xlink"
			) {
				xlink.set(attribute.slice(colon + 1), index);
			}
		}
		const href = xlink.get("href");
		if (
			options.removeSvgRasterImages === true &&
			name === "image" &&
			// A data URL's media type, or else the path's extension, says what it is.
			/^(?:data:image\/(?:jpe?g|png|gif)[;,]|(?!data:)[^?#]*\.(?:jpe?g|png|gif)(?:[?#]|$))/i.test(
				trimSvgValue(
					xmlAttributeValue(
						/** @type {number} */ (
							attributes.get("href") || (href === undefined ? 0 : href)
						)
					)
				)
			)
		) {
			removeXmlSubtree(node);
			continue;
		}
		if (options.removeSvgXlink === true) {
			if (href !== undefined && !attributes.has("href")) {
				S._attrNames[href] = "href";
			}
			const title = xlink.get("title");
			if (
				title !== undefined &&
				spellSvgXlinkTitle(node, title, options.removeSvgTitles === true)
			) {
				attributes.delete(S._attrNames[title]);
			}
			const type = xlink.get("type");
			if (type !== undefined && xmlAttributeValue(type) === "simple") {
				removedAttributes.add(type);
			}
			// Browsers never read `xlink:show`; `target` says the same to them.
			const show = xlink.get("show");
			const target =
				show === undefined
					? undefined
					: { new: "_blank", replace: "_self" }[xmlAttributeValue(show)];
			if (
				show !== undefined &&
				target !== undefined &&
				name === "a" &&
				!attributes.has("target")
			) {
				S._attrNames[show] = "target";
				writeSvgAttribute(show, target);
			}
		}
		if (S._types[S._parents[node]] !== NodeType.Document || name !== "svg") {
			continue;
		}
		const width = attributes.get("width");
		const height = attributes.get("height");
		const viewBox = attributes.get("viewBox");
		const size = (/** @type {number | undefined} */ index) =>
			index === undefined
				? null
				: /^(?:[0-9]+|[0-9]*\.[0-9]+)(?:px)?$/.exec(
						trimSvgValue(xmlAttributeValue(index))
					);
		const w = size(width);
		const h = size(height);
		if (
			options.removeSvgViewBox === true &&
			viewBox !== undefined &&
			w !== null &&
			h !== null
		) {
			const box = trimSvgValue(xmlAttributeValue(viewBox)).split(/[\t\n\r ,]+/);
			if (
				box.length === 4 &&
				Number(box[0]) === 0 &&
				Number(box[1]) === 0 &&
				Number(box[2]) === Number.parseFloat(w[0]) &&
				Number(box[3]) === Number.parseFloat(h[0])
			) {
				removedAttributes.add(viewBox);
				attributes.delete("viewBox");
			}
		}
		if (options.removeSvgDimensions === true) {
			if (attributes.has("viewBox")) {
				for (const index of [width, height]) {
					if (index !== undefined) removedAttributes.add(index);
				}
			} else if (w !== null && h !== null) {
				// The size becomes the viewBox, which scales the drawing to its box.
				/** @type {Map<string, string>} */
				const values = new Map();
				for (const [attribute, index] of attributes) {
					values.set(
						attribute === "width" ? "viewBox" : attribute,
						attribute === "width"
							? `0 0 ${Number.parseFloat(w[0])} ${Number.parseFloat(h[0])}`
							: xmlAttributeValue(index)
					);
				}
				values.delete("height");
				writeSvgAttributes(node, values);
			}
		}
	}
};

/**
 * Read the element ID a local URL fragment names, which URL parsing percent-decodes.
 * @param {string} fragment the text after `#`
 * @returns {string | null} the ID, or null where a CSS escape leaves it unclear
 */
const svgFragmentId = (fragment) => {
	if (fragment.includes("\\")) return null;
	try {
		return decodeURIComponent(fragment);
	} catch (_err) {
		return fragment;
	}
};

/**
 * Name the nth shortened ID: a letter, then letters and digits.
 * @param {number} index position in the renaming order
 * @returns {string} the name
 */
const shortSvgId = (index) => {
	const first = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
	const rest = `${first}0123456789`;
	let name = first.charAt(index % first.length);
	for (
		let n = Math.floor(index / first.length);
		n > 0;
		n = Math.floor(n / rest.length)
	) {
		n -= 1;
		name += rest.charAt(n % rest.length);
	}
	return name;
};

/**
 * Drop IDs nothing in the document references and rename the rest to the shortest names.
 * References outside the document, such as a sprite's `file.svg#icon`, stop resolving.
 * @returns {void}
 */
const cleanupSvgIds = () => {
	const removedNodes = /** @type {Set<HtmlNodeRef>} */ (S._xmlRemovedNodes);
	const removedAttributes = /** @type {Set<number>} */ (
		S._xmlRemovedAttributes
	);
	/** @type {Map<string, number>} */
	const ids = new Map();
	/** @type {Map<string, number>} */
	const used = new Map();
	/** @type {[number, string][]} */
	const references = [];
	const url = /url\(\s*(["']?)#([^"'()\s]+)\1\s*\)/gi;
	/**
	 * @param {string} name attribute name
	 * @param {string} value attribute value
	 * @param {(id: string) => string} rename what an ID becomes
	 * @returns {string} the value with each local reference renamed
	 */
	const rewrite = (name, value, rename) => {
		if (name === "href" || name === "xlink:href") {
			const match = /^([\t\n\r ]*)#(.+?)([\t\n\r ]*)$/.exec(value);
			return match === null
				? value
				: `${match[1]}#${rename(match[2])}${match[3]}`;
		}
		if (XML_ID_LIST_ATTRIBUTES.has(name)) {
			return value.replace(/[^\t\n\r ]+/g, rename);
		}
		// A syncbase, event or repeat value names its element before the dot;
		// an offset, `wallclock()` or `accessKey()` names none.
		if (name === "begin" || name === "end") {
			return value.replace(
				/(^|;)([\t\n\r ]*)([^\t\n\r ;.()0-9+-][^\t\n\r ;.()]*)\./g,
				/**
				 * @param {string} match the whole reference
				 * @param {string} separator the `;` before it, if any
				 * @param {string} space the whitespace before it
				 * @param {string} id the element it names
				 * @returns {string} the reference to the renamed element
				 */
				(match, separator, space, id) => `${separator}${space}${rename(id)}.`
			);
		}
		return value.replace(
			url,
			/**
			 * @param {string} match the whole reference
			 * @param {string} quote the quote around the fragment, if any
			 * @param {string} id the fragment
			 * @returns {string} the reference to the renamed fragment
			 */
			(match, quote, id) => `url(${quote}#${rename(id)}${quote})`
		);
	};
	/** @type {number[]} */
	const others = [];
	for (let node = 1; node <= S._nodeCount; node++) {
		if (S._types[node] !== NodeType.Element) continue;
		let removed = false;
		for (let current = node; current !== 0; current = S._parents[current]) {
			if (removedNodes.has(current)) removed = true;
		}
		if (removed) continue;
		for (const [name, index] of svgAttributes(node)) {
			if (name === "xml:id") return;
			if (name === "id") {
				// A reference resolves to the first element with the ID.
				if (ids.has(xmlAttributeValue(index))) removedAttributes.add(index);
				else ids.set(xmlAttributeValue(index), index);
				continue;
			}
			// An escape can hide a dot in a timing ID, and an animated value can
			// name a fragment anywhere in its list.
			if (
				((name === "begin" || name === "end") &&
					xmlAttributeValue(index).includes("\\")) ||
				((name === "from" ||
					name === "to" ||
					name === "by" ||
					name === "values") &&
					xmlAttributeValue(index).includes("#"))
			) {
				return;
			}
			let referencing = false;
			let unclear = false;
			const colon = name.indexOf(":");
			const kind =
				colon !== -1 &&
				name.slice(colon + 1) === "href" &&
				xmlPrefixNamespace(node, name.slice(0, colon)) ===
					"http://www.w3.org/1999/xlink"
					? "xlink:href"
					: name;
			rewrite(kind, xmlAttributeValue(index), (fragment) => {
				const id = XML_ID_LIST_ATTRIBUTES.has(name)
					? fragment
					: svgFragmentId(fragment);
				if (id === null) unclear = true;
				else used.set(id, (used.get(id) || 0) + 1);
				referencing = true;
				return fragment;
			});
			// A CSS escape can spell `url` or the fragment some other way.
			if (unclear || /\\[\s\S]*#|#[\s\S]*\\/.test(xmlAttributeValue(index))) {
				return;
			}
			if (referencing) references.push([index, kind]);
			else if (xmlAttributeValue(index).includes("#")) others.push(index);
		}
	}
	// A local fragment spelled any other way, such as under another XLink prefix,
	// stops it; one after a document's URL names that document's element.
	const local = /(?:^|url\(\s*["']?)[\t\n\r ]*#([^\s"'()#;,]+)/gi;
	for (const index of others) {
		const value = xmlAttributeValue(index);
		local.lastIndex = 0;
		let match;
		while ((match = local.exec(value)) !== null) {
			const id = svgFragmentId(match[1]);
			if (id === null || ids.has(id)) return;
		}
	}
	/** @type {Map<string, string>} */
	const names = new Map();
	/** @type {Set<string>} */
	const shortest = new Set();
	for (const [id, index] of ids) {
		if (used.has(id)) shortest.add(shortSvgId(shortest.size));
		else removedAttributes.add(index);
	}
	// An ID already among the shortest names keeps it, so a second pass changes nothing.
	for (const id of ids.keys()) {
		if (used.has(id) && shortest.has(id)) names.set(id, id);
	}
	let next = 0;
	// A name a missing ID is referenced by would make that reference resolve.
	const taken = (/** @type {string} */ name) =>
		[...names.values()].includes(name) || (used.has(name) && !ids.has(name));
	for (const id of ids.keys()) {
		if (!used.has(id) || names.has(id)) continue;
		while (taken(shortSvgId(next))) next++;
		names.set(id, shortSvgId(next++));
	}
	for (const [id, index] of ids) {
		const name = names.get(id);
		if (name !== undefined) writeSvgAttribute(index, name);
	}
	for (const [index, kind] of references) {
		const value = xmlAttributeValue(index);
		const list = XML_ID_LIST_ATTRIBUTES.has(kind);
		const rewritten = rewrite(kind, value, (fragment) => {
			const name = names.get(
				list ? fragment : /** @type {string} */ (svgFragmentId(fragment))
			);
			return name === undefined ? fragment : name;
		});
		if (rewritten === value) continue;
		writeSvgAttribute(index, rewritten);
		if (S._xmlRenderedStyles !== null && S._xmlRenderedStyles.has(index)) {
			S._xmlRenderedStyles.set(index, minifyStyleAttribute(rewritten));
		}
	}
	S._svgIdAncestors.clear();
	collectSvgIdAncestors();
};

// Unprefixed SVG attributes whose empty value says something an absent one does not:
// a link to the document itself, an unknown language, a conditional test that fails, or
// an anonymous CORS fetch.
const SVG_EMPTY_MEANINGFUL_ATTRIBUTES = new Set([
	"xmlns",
	"href",
	"target",
	"download",
	"lang",
	"requiredExtensions",
	"requiredFeatures",
	"systemLanguage",
	"crossorigin"
]);

// One number of SVG path or point data, read where the last left off.
const SVG_DATA_NUMBER_REGEXP =
	/[\t\n\f\r ]*,?[\t\n\f\r ]*([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/y;

/**
 * Count the coordinate pairs a point list renders before its first error.
 * @param {string} points the `points` value
 * @returns {number} how many points it draws through
 */
const svgPointCount = (points) => {
	SVG_DATA_NUMBER_REGEXP.lastIndex = 0;
	let numbers = 0;
	while (SVG_DATA_NUMBER_REGEXP.exec(points) !== null) numbers++;
	return Math.floor(numbers / 2);
};

/**
 * Whether path data reaches its first error, or its end, without a drawn segment.
 * Arcs count as drawn once begun, since compact flags read as one number.
 * @param {string} data the `d` value
 * @returns {boolean} true when only moves come before the data stops
 */
const svgPathDrawsNothing = (data) => {
	const counts = { l: 2, t: 2, h: 1, v: 1, c: 6, s: 4, q: 4 };
	let index = 0;
	/**
	 * @param {number} count how many numbers to read
	 * @returns {boolean} whether all of them were there
	 */
	const read = (count) => {
		for (let n = 0; n < count; n++) {
			SVG_DATA_NUMBER_REGEXP.lastIndex = index;
			if (SVG_DATA_NUMBER_REGEXP.exec(data) === null) return false;
			index = SVG_DATA_NUMBER_REGEXP.lastIndex;
		}
		return true;
	};
	for (let first = true; ; first = false) {
		const command = /^[\t\n\f\r ]*([A-Za-z])/.exec(data.slice(index));
		if (command === null) return true;
		index += command[0].length;
		const letter = command[1].toLowerCase();
		if (letter === "m") {
			if (!read(2)) return true;
			// More pairs after a move are lines.
			if (read(2)) return false;
			continue;
		}
		// Data must begin with a move; anything else drawn ends it.
		if (first) return true;
		if (letter === "z" || letter === "a") return false;
		const count = counts[/** @type {keyof typeof counts} */ (letter)];
		return count === undefined || !read(count);
	}
};

/**
 * Find a descendant that sets a property itself, by attribute or style, or a use whose content might.
 * @param {HtmlNodeRef} node the ancestor
 * @param {string} name the property
 * @returns {boolean} whether one does
 */
const svgSubtreeSets = (node, name) => {
	const pending = [S._firstChildren[node]];
	while (pending.length !== 0) {
		for (
			let child = /** @type {number} */ (pending.pop());
			child !== 0;
			child = S._nextSiblings[child]
		) {
			if (S._types[child] !== NodeType.Element) continue;
			const attributes = svgAttributes(child);
			const style = attributes.get("style");
			if (
				svgLocalName(child) === "use" ||
				attributes.has(name) ||
				(style !== undefined &&
					asciiLowercase(xmlAttributeValue(style)).includes(name))
			) {
				return true;
			}
			pending.push(S._firstChildren[child]);
		}
	}
	return false;
};

/**
 * Whether an element a use names draws nothing: removed, an empty container, or a
 * path with no drawn segment and no markers of its own.
 * @param {HtmlNodeRef} node the element
 * @returns {boolean} true when nothing renders from it
 */
const svgDrawsNothing = (node) => {
	const removedNodes = /** @type {Set<HtmlNodeRef>} */ (S._xmlRemovedNodes);
	if (removedNodes.has(node)) return true;
	const name = svgLocalName(node);
	const attributes = svgAttributes(node);
	const style = attributes.get("style");
	// A filter can paint its region however empty what it filters is.
	if (
		attributes.has("filter") ||
		(style !== undefined && /filter/i.test(xmlAttributeValue(style)))
	) {
		return false;
	}
	if (name === "path") {
		const data = attributes.get("d");
		for (const attribute of attributes.keys()) {
			if (attribute === "style" || attribute.startsWith("marker")) return false;
		}
		return data === undefined || svgPathDrawsNothing(xmlAttributeValue(data));
	}
	if (!SVG_EMPTY_DRAWING_CONTAINERS.has(name)) {
		return false;
	}
	for (
		let child = S._firstChildren[node];
		child !== 0;
		child = S._nextSiblings[child]
	) {
		const type = S._types[child];
		if (
			!removedNodes.has(child) &&
			(type === NodeType.Element ||
				(type === NodeType.Text && !/^[\t\n\r ]*$/.test(dataOf(child))))
		) {
			return false;
		}
	}
	return true;
};

/**
 * Read the value an element takes for an inherited presentation property, as written.
 * @param {HtmlNodeRef} node the element
 * @param {string} name the property
 * @returns {string | null} its value, `""` for the initial one, or null where a style hides it
 */
const svgInheritedValue = (node, name) => {
	for (
		let current = node;
		S._types[current] === NodeType.Element;
		current = S._parents[current]
	) {
		const attributes = svgAttributes(current);
		const style = attributes.get("style");
		let value;
		if (style !== undefined) {
			const declarations = svgPresentationStyle(xmlAttributeValue(style));
			if (declarations === null) {
				const text = asciiLowercase(xmlAttributeValue(style));
				// `all` resets the property too, and an escape or comment can hide either.
				if (
					text.includes(name.split("-")[0]) ||
					/(?:^|[;\s])all\s*:/.test(text) ||
					/[\\]|\/\*/.test(text)
				) {
					return null;
				}
			} else {
				value = declarations.get(name);
			}
		}
		const own = attributes.get(name);
		if (value === undefined && own !== undefined) {
			value = trimSvgValue(xmlAttributeValue(own));
		}
		// An empty value is invalid, so the element inherits as if it were absent.
		if (value === undefined || value === "") continue;
		const keyword = asciiLowercase(value);
		// An inherited property that rolls back past the author origin inherits.
		if (
			keyword === "inherit" ||
			keyword === "unset" ||
			keyword === "revert" ||
			keyword === "revert-layer"
		) {
			continue;
		}
		return keyword === "initial" ? "" : value;
	}
	return "";
};

/**
 * Whether a shape paints neither fill nor stroke where it sits.
 * @param {HtmlNodeRef} node the shape
 * @param {boolean} hit whether a pointer on it can matter, which a transparent paint still takes
 * @returns {boolean} true when both are none or, unless hit, fully transparent, or the stroke has no width
 */
const svgPaintsNothing = (node, hit) => {
	/**
	 * @param {string | null} value a written number
	 * @returns {boolean} whether it is zero
	 */
	const zero = (value) =>
		value !== null && /^[+-]?(?:0+\.?0*|\.0+)(?:%|px)?$/.test(value);
	const stroke = svgInheritedValue(node, "stroke");
	return (
		(svgInheritedValue(node, "fill") === "none" ||
			(!hit && zero(svgInheritedValue(node, "fill-opacity")))) &&
		(stroke === "" ||
			stroke === "none" ||
			(!hit && zero(svgInheritedValue(node, "stroke-opacity"))) ||
			zero(svgInheritedValue(node, "stroke-width")))
	);
};

/**
 * Collect what an animation can change: each target with its descendants, which
 * inherit from it, and each animation's ancestors, which hold it.
 * @returns {Set<HtmlNodeRef> | null} those elements, or null where a target is unclear
 */
const svgAnimatedNodes = () => {
	const removedNodes = /** @type {Set<HtmlNodeRef>} */ (S._xmlRemovedNodes);
	/** @type {Set<HtmlNodeRef>} */
	const animated = new Set();
	/** @type {HtmlNodeRef[]} */
	const targets = [];
	/** @type {Map<string, HtmlNodeRef> | undefined} */
	let ids;
	for (let node = 1; node <= S._nodeCount; node++) {
		if (S._types[node] !== NodeType.Element || removedNodes.has(node)) {
			continue;
		}
		const name = svgLocalName(node);
		if (!name.startsWith("animate") && name !== "set") continue;
		for (
			let ancestor = node;
			S._types[ancestor] === NodeType.Element;
			ancestor = S._parents[ancestor]
		) {
			animated.add(ancestor);
		}
		let target = S._parents[node];
		for (const [attribute, index] of svgAttributes(node)) {
			if (attribute !== "href" && !attribute.endsWith(":href")) continue;
			const reference = trimSvgValue(xmlAttributeValue(index));
			if (reference.charAt(0) !== "#" || reference.includes("\\")) {
				return null;
			}
			if (ids === undefined) {
				ids = new Map();
				for (let other = 1; other <= S._nodeCount; other++) {
					const id =
						S._types[other] === NodeType.Element
							? svgAttributes(other).get("id")
							: undefined;
					if (id !== undefined && !ids.has(xmlAttributeValue(id))) {
						ids.set(xmlAttributeValue(id), other);
					}
				}
			}
			const found = ids.get(
				/** @type {string} */ (svgFragmentId(reference.slice(1)))
			);
			if (found === undefined) return null;
			target = found;
		}
		targets.push(target);
	}
	// Nodes are numbered in document order, so a subtree is one run of them.
	for (const target of targets) {
		for (let node = target; node <= S._nodeCount; node++) {
			let ancestor = node;
			while (ancestor > target) ancestor = S._parents[ancestor];
			if (ancestor !== target) break;
			animated.add(node);
		}
	}
	return animated;
};

/**
 * Remove SVG-namespace elements no SVG specification defines, with their content, which
 * renders nothing either; a switch child stays, since the switch weighs it.
 * @returns {void}
 */
const removeUnknownSvgElements = () => {
	const removedNodes = /** @type {Set<HtmlNodeRef>} */ (S._xmlRemovedNodes);
	let removedAny = false;
	for (let node = 1; node <= S._nodeCount; node++) {
		if (
			S._types[node] === NodeType.Element &&
			!removedNodes.has(node) &&
			S._types[S._parents[node]] === NodeType.Element &&
			svgElementIsUnknown(node) &&
			!hasSvgAncestor(node, "switch")
		) {
			removeXmlSubtree(node);
			removedAny = true;
		}
	}
	if (removedAny) spliceRemovedXmlNodes();
};

/**
 * Trim every attribute value and collapse each run of whitespace in it to one space.
 * @returns {void}
 */
const collapseSvgAttributeWhitespace = () => {
	const removedNodes = /** @type {Set<HtmlNodeRef>} */ (S._xmlRemovedNodes);
	for (let node = 1; node <= S._nodeCount; node++) {
		if (S._types[node] !== NodeType.Element || removedNodes.has(node)) {
			continue;
		}
		const start = S._attrStarts[node];
		for (let index = start; index < start + S._attrCounts[node]; index++) {
			const value = xmlAttributeValue(index);
			const collapsed = value.replace(/[\t\n\r ]+/g, " ").trim();
			if (collapsed !== value) writeSvgAttribute(index, collapsed);
		}
	}
};

/**
 * Say an SVG element's `xml:lang` as `lang` in place of the `lang` it overrides, or drop it.
 * @param {boolean} unsafe whether to drop `xml:lang` outright, losing the language it names
 * @returns {void}
 */
const removeDeprecatedSvgAttributes = (unsafe) => {
	const removedNodes = /** @type {Set<HtmlNodeRef>} */ (S._xmlRemovedNodes);
	for (let node = 1; node <= S._nodeCount; node++) {
		if (
			S._types[node] !== NodeType.Element ||
			removedNodes.has(node) ||
			!xmlElementIsStyled(node, true)
		) {
			continue;
		}
		const attributes = svgAttributes(node);
		const language = attributes.get("xml:lang");
		if (language === undefined) continue;
		/** @type {Map<string, string>} */
		const values = new Map();
		for (const [name, index] of attributes) {
			// `xml:lang` wins over `lang`, so its language takes the place of both.
			if (name === "xml:lang") {
				if (!unsafe) values.set("lang", xmlAttributeValue(language));
			} else if (name !== "lang" || unsafe) {
				values.set(name, svgAttributeValue(index));
			}
		}
		writeSvgAttributes(node, values);
	}
};

/**
 * Remove the unprefixed attributes no SVG, ARIA or animation specification defines from
 * the elements SVG does; data, ARIA and event handler attributes stay.
 * @param {boolean} unsafe whether `role` goes too, as svgo's default drops it, though assistive technology reads it
 * @returns {void}
 */
const removeUnknownSvgAttributes = (unsafe) => {
	const removedNodes = /** @type {Set<HtmlNodeRef>} */ (S._xmlRemovedNodes);
	const removedAttributes = /** @type {Set<number>} */ (
		S._xmlRemovedAttributes
	);
	for (let node = 1; node <= S._nodeCount; node++) {
		if (
			S._types[node] !== NodeType.Element ||
			removedNodes.has(node) ||
			!xmlElementIsStyled(node, true) ||
			!SVG_ELEMENTS.has(svgLocalName(node))
		) {
			continue;
		}
		for (const [name, index] of svgAttributes(node)) {
			if (
				!name.includes(":") &&
				name !== "xmlns" &&
				!/^(?:aria-|data-|on)/.test(name) &&
				(!SVG_ATTRIBUTES.has(name) || (unsafe && name === "role"))
			) {
				removedAttributes.add(index);
			}
		}
	}
};

/**
 * Remove SVG content that renders nothing and that nothing references.
 * Opacity and zero sizes still count toward boxes, so filters, masks and clips decline them.
 * @returns {void}
 */
const removeHiddenSvgElements = () => {
	const removedNodes = /** @type {Set<HtmlNodeRef>} */ (S._xmlRemovedNodes);
	const animated = svgAnimatedNodes();
	if (animated === null) return;
	let removedAny = false;
	/** @type {Map<string, HtmlNodeRef> | undefined} */
	let targets;
	for (let node = 1; node <= S._nodeCount; node++) {
		if (
			S._types[node] !== NodeType.Element ||
			removedNodes.has(node) ||
			S._svgIdAncestors.has(node) ||
			animated.has(node) ||
			S._types[S._parents[node]] !== NodeType.Element ||
			!xmlElementIsStyled(node, true)
		) {
			continue;
		}
		const name = svgLocalName(node);
		if (!SVG_HIDDEN_ELEMENT_TARGETS.has(name)) continue;
		const attributes = svgAttributes(node);
		const style = attributes.get("style");
		// A style can set geometry, such as a path's `d`, or override what hides it.
		const declarations =
			style === undefined
				? /** @type {Map<string, string>} */ (new Map())
				: svgPresentationStyle(xmlAttributeValue(style));
		if (declarations === null) continue;
		// A switch still picks a hidden child, a link in one acts as one, and
		// hidden text still takes up its advance.
		// A tref without a reference holds no characters, so it advances nothing.
		const bareReference =
			name === "tref" &&
			![...attributes.keys()].some(
				(attribute) => attribute === "href" || attribute.endsWith(":href")
			);
		if (
			hasSvgAncestor(node, "switch") ||
			(hasSvgAncestor(node, "text") && !bareReference)
		) {
			continue;
		}
		let boxed = false;
		let clipped = false;
		let pointed = false;
		// Its own filter can paint a region however empty its geometry.
		for (
			let ancestor = node;
			S._types[ancestor] === NodeType.Element;
			ancestor = S._parents[ancestor]
		) {
			const own = svgAttributes(ancestor);
			const style = own.get("style");
			// A use can filter, mask or clip an ancestor with an ID elsewhere.
			if (
				own.has("id") ||
				own.has("filter") ||
				own.has("mask") ||
				own.has("clip-path") ||
				(style !== undefined &&
					/filter|mask|clip/i.test(xmlAttributeValue(style)))
			) {
				boxed = true;
			}
			if (svgLocalName(ancestor) === "clipPath") clipped = true;
			if (
				own.has("pointer-events") ||
				(style !== undefined && /pointer/i.test(xmlAttributeValue(style)))
			) {
				pointed = true;
			}
		}
		/** @type {number | undefined} */
		let link;
		for (const [attribute, index] of attributes) {
			const colon = attribute.indexOf(":");
			if (
				colon === -1
					? attribute === "href"
					: attribute.slice(colon + 1) === "href" &&
						link === undefined &&
						xmlPrefixNamespace(node, attribute.slice(0, colon)) ===
							"http://www.w3.org/1999/xlink"
			) {
				link = index;
			}
		}
		let target = 0;
		if (name === "use" && link !== undefined) {
			const reference = trimSvgValue(xmlAttributeValue(link));
			if (targets === undefined) {
				targets = new Map();
				for (let other = 1; other <= S._nodeCount; other++) {
					const id =
						S._types[other] === NodeType.Element
							? svgAttributes(other).get("id")
							: undefined;
					if (id !== undefined && !targets.has(xmlAttributeValue(id))) {
						targets.set(xmlAttributeValue(id), other);
					}
				}
			}
			if (reference.charAt(0) === "#") {
				target = targets.get(reference.slice(1)) || 0;
			}
		}
		/**
		 * @param {string} attribute the attribute name
		 * @returns {string | undefined} its trimmed value
		 */
		const value = (attribute) => {
			const declared = declarations.get(attribute);
			if (declared !== undefined) return trimSvgValue(declared);
			const index = attributes.get(attribute);
			return index === undefined
				? undefined
				: trimSvgValue(xmlAttributeValue(index));
		};
		/**
		 * @param {string} attribute the attribute name
		 * @returns {boolean} whether it is written as a zero length
		 */
		const zero = (attribute) => {
			const written = value(attribute);
			return (
				written !== undefined && /^[+-]?(?:0+\.?0*|\.0+)(?:px)?$/.test(written)
			);
		};
		const visibility = value("visibility");
		const data = value("d") || "";
		let marked = false;
		for (
			let current = node;
			S._types[current] === NodeType.Element && !marked;
			current = S._parents[current]
		) {
			for (const [attribute, index] of svgAttributes(current)) {
				if (
					((attribute === "marker" || attribute.startsWith("marker-")) &&
						trimSvgValue(xmlAttributeValue(index)) !== "none") ||
					(attribute === "style" &&
						asciiLowercase(xmlAttributeValue(index)).includes("marker"))
				) {
					marked = true;
				}
			}
		}
		if (
			(name === "tref" && link === undefined) ||
			value("display") === "none" ||
			(!boxed &&
				((!clipped && /^(?:0+\.?0*|\.0+)$/.test(value("opacity") || "")) ||
					(name === "rect" && (zero("width") || zero("height"))) ||
					(name === "circle" && zero("r")) ||
					(name === "ellipse" && (zero("rx") || zero("ry"))) ||
					(name === "image" && (zero("width") || zero("height"))) ||
					// No vertex either without data, so no marker.
					(name === "path" &&
						(/^[\t\n\f\r ]*$/.test(data) ||
							(!marked && svgPathDrawsNothing(data)))) ||
					(!marked &&
						name === "polyline" &&
						svgPointCount(value("points") || "") < 2) ||
					(name === "polygon" && svgPointCount(value("points") || "") === 0) ||
					// Nothing painted is nothing to hit either, unless pointer events say so.
					(!clipped &&
						!marked &&
						!pointed &&
						SVG_GEOMETRY_ELEMENTS.has(name) &&
						S._firstChildren[node] === 0 &&
						// A link or an event-begun animation hears a pointer on a
						// transparent paint, which `visiblePainted` still hit-tests.
						svgPaintsNothing(
							node,
							animated.size !== 0 || hasSvgAncestor(node, "a")
						)) ||
					// A use of what draws nothing draws nothing either.
					(target !== 0 &&
						!marked &&
						!animated.has(target) &&
						svgDrawsNothing(target)) ||
					// A use's content can make itself visible again.
					(name !== "use" &&
						(visibility === "hidden" || visibility === "collapse") &&
						!svgSubtreeSets(node, "visibility"))))
		) {
			removeXmlSubtree(node);
			removedAny = true;
		}
	}
	if (!removedAny) return;
	/** @type {Set<string>} */
	const prefixes = new Set();
	for (const node of removedNodes) {
		if (S._types[node] !== NodeType.Element) continue;
		for (const name of [tagNameOf(node), ...svgAttributes(node).keys()]) {
			if (name.includes(":") && !name.startsWith("xml")) {
				prefixes.add(name.slice(0, name.indexOf(":")));
			}
		}
	}
	pruneRemovedSvgPrefixes(prefixes);
	spliceRemovedXmlNodes();
};

/**
 * Apply optional SVG cleanup and merge newly adjacent text.
 * @returns {void}
 */
const removeXmlData = () => {
	// `:empty` and unread stylesheets can tell whitespace-only text from none.
	let collapseWhitespace =
		S._collapseWhitespace !== "none" && !hasSvgGeometryDependency("empty");
	// The unread part of a DTD can supply defaults, including namespace bindings.
	for (let node = 1; node <= S._nodeCount; node++) {
		if (
			S._types[node] !== NodeType.Doctype ||
			(S._xmlRemovedNodes !== null && S._xmlRemovedNodes.has(node))
		) {
			continue;
		}
		const declarations = S._input.slice(S._starts[node], S._ends[node]);
		if (declarations.includes("<!ELEMENT")) {
			S._removeEmptyElements = false;
			S._removeSvgMetadata = false;
			S._removeSvgEditorData = false;
		}
		if (S._doctypeSystemId !== null || declarations.includes("%")) {
			S._removeSvgMetadata = false;
			S._removeSvgEditorData = false;
			S._removeEmptyAttributes = false;
			S._removeUnusedSvgNamespaces = false;
			collapseWhitespace = false;
			S._shortenSvgNumbers = false;
			S._shortenSvgColors = false;
			S._shortenSvgPathData = false;
			S._removeEmptyElements = false;
			break;
		}
	}
	// Kept from the opt-in removals, which run first so the rest sees them.
	if (S._xmlRemovedNodes === null) S._xmlRemovedNodes = new Set();
	if (S._xmlRemovedAttributes === null) S._xmlRemovedAttributes = new Set();
	const removedNodes = S._xmlRemovedNodes;
	const removedAttributes = S._xmlRemovedAttributes;
	/** @type {Map<HtmlNodeRef, Map<string, number>>} */
	const scopes = new Map();
	/** @type {Set<HtmlNodeRef>} */
	const svgContexts = new Set();
	/** @type {Set<HtmlNodeRef>} */
	const whitespaceContainers = new Set();
	/** @type {HtmlNodeRef[]} */
	const emptyContainers = [];
	/** @type {Map<string, number>} */
	const emptyScope = new Map();
	// XML allocates parents before children; inherit each scope without walking
	// ancestors, and copy it only where a namespace declaration changes it.
	for (let node = 1; node <= S._nodeCount; node++) {
		if (S._types[node] !== NodeType.Element) continue;
		const parent = S._parents[node];
		if (removedNodes.has(parent)) {
			removedNodes.add(node);
			continue;
		}
		const inherited = scopes.get(parent) || emptyScope;
		let scope = inherited;
		const start = S._attrStarts[node];
		const count = S._attrCounts[node];
		for (let i = start; i < start + count; i++) {
			const name = S._attrNames[i];
			if (name !== "xmlns" && !name.startsWith("xmlns:")) continue;
			if (scope === inherited) scope = new Map(inherited);
			scope.set(name === "xmlns" ? "" : name.slice(6), i);
		}
		scopes.set(node, scope);
		const name = tagNameOf(node);
		const colon = name.indexOf(":");
		const binding = scope.get(colon === -1 ? "" : name.slice(0, colon));
		const namespace = binding === undefined ? "" : xmlAttributeValue(binding);
		const svg = namespace === "http://www.w3.org/2000/svg";
		if (
			svg &&
			S._removeEmptyElements &&
			S._types[parent] === NodeType.Element &&
			SVG_EMPTY_CONTAINERS.has(name.slice(colon + 1))
		) {
			const parentName = tagNameOf(parent);
			const parentColon = parentName.indexOf(":");
			const parentBinding = inherited.get(
				parentColon === -1 ? "" : parentName.slice(0, parentColon)
			);
			if (
				SVG_WHITESPACE_CONTAINERS.has(parentName.slice(parentColon + 1)) &&
				parentBinding !== undefined &&
				xmlAttributeValue(parentBinding) === "http://www.w3.org/2000/svg" &&
				!isSvgSwitchLink(parent)
			) {
				emptyContainers.push(node);
			}
		}
		const withinSvg = svg || svgContexts.has(parent);
		if (withinSvg) svgContexts.add(node);
		if (
			collapseWhitespace &&
			svg &&
			SVG_WHITESPACE_CONTAINERS.has(name.slice(colon + 1)) &&
			(!svgContexts.has(parent) || whitespaceContainers.has(parent))
		) {
			whitespaceContainers.add(node);
		}
		if (
			S._types[parent] === NodeType.Element &&
			!S._svgIdAncestors.has(node) &&
			((S._removeSvgMetadata &&
				svg &&
				name.slice(colon + 1) === "metadata" &&
				!holdsXmlStylesheetLink(node)) ||
				(S._removeSvgEditorData &&
					withinSvg &&
					SVG_EDITOR_NAMESPACES.has(namespace || "") &&
					!holdsXmlStylesheetLink(node)))
		) {
			removedNodes.add(node);
			continue;
		}
		if (!withinSvg) continue;
		const numeric =
			svg && (S._shortenSvgNumbers || S._shortenSvgPathData)
				? SVG_NUMERIC_ATTRIBUTES[name.slice(colon + 1)] ||
					SVG_PRESENTATION_NUMERIC_ATTRIBUTES
				: undefined;
		for (let i = start; i < start + count; i++) {
			const name = S._attrNames[i];
			// DTD declarations can constrain the spelling, not only presence.
			if (S._xmlAttributeDeclarations !== null) {
				const declarations = S._xmlAttributeDeclarations.get(tagNameOf(node));
				if (declarations !== undefined && declarations.has(name)) continue;
			}
			const colon = name.indexOf(":");
			const binding =
				colon === -1 ? undefined : scope.get(name.slice(0, colon));
			if (
				S._removeSvgEditorData &&
				binding !== undefined &&
				!name.startsWith("xmlns:") &&
				SVG_EDITOR_NAMESPACES.has(xmlAttributeValue(binding))
			) {
				removedAttributes.add(i);
			}
			let value = xmlAttributeValue(i);
			if (
				name === "style" &&
				S._attrNameStarts[i] !== -1 &&
				XML_STYLED_NAMESPACES.has(namespace) &&
				rendersNow() &&
				value.trim() !== ""
			) {
				value = minifyStyleAttribute(value);
				if (S._xmlRenderedStyles === null) S._xmlRenderedStyles = new Map();
				S._xmlRenderedStyles.set(i, value);
			}
			if (
				svg &&
				S._shortenSvgColors &&
				SVG_COLOR_ATTRIBUTES.has(name) &&
				isSvgColor(value)
			) {
				if (S._xmlColorAttributes === null) S._xmlColorAttributes = new Set();
				S._xmlColorAttributes.add(i);
			}
			const kind =
				numeric === undefined
					? undefined
					: numeric[name] || SVG_PRESENTATION_NUMERIC_ATTRIBUTES[name];
			if (
				kind !== undefined &&
				(kind === "path" ? S._shortenSvgPathData : S._shortenSvgNumbers)
			) {
				const shortened = shortenSvgNumericValue(value, kind);
				if (shortened !== null && shortened !== value) {
					if (S._xmlShortenedNumbers === null) {
						S._xmlShortenedNumbers = new Map();
					}
					S._xmlShortenedNumbers.set(i, shortened);
				}
			}
			if (
				svg &&
				(name === "class" || name === "style" || name === "id") &&
				(name !== "id" || value === "") &&
				isRemovableEmptyAttribute("svg", name, value, true)
			) {
				removedAttributes.add(i);
			} else if (
				svg &&
				S._removeEmptyAttributes &&
				value === "" &&
				colon === -1 &&
				!SVG_EMPTY_MEANINGFUL_ATTRIBUTES.has(name) &&
				!/^(?:aria-|data-|on)/.test(name) &&
				!/^(?:animate|set$|discard$)/.test(svgLocalName(node))
			) {
				// An empty value is invalid or no value at all, as an absent one reads.
				removedAttributes.add(i);
			}
		}
	}
	/**
	 * Unlink removed children and merge newly adjacent text before namespace analysis.
	 * @returns {void}
	 */
	const removeChildren = () => {
		for (let node = 1; node <= S._nodeCount; node++) {
			if (S._types[node] !== NodeType.Element || removedNodes.has(node)) {
				continue;
			}
			let previous = 0;
			let child = S._firstChildren[node];
			while (child !== 0) {
				const next = S._nextSiblings[child];
				const type = S._types[child];
				const removed =
					removedNodes.has(child) ||
					// `xml:space` lays out text content only; whitespace directly in a
					// container never renders, so it goes under `preserve` too.
					(type === NodeType.Text &&
						whitespaceContainers.has(node) &&
						/^[\t\n\r ]*$/.test(dataOf(child))) ||
					(type === NodeType.Comment &&
						!keepComment(
							dataOf(child),
							S._input.slice(S._starts[child], S._ends[child]),
							S._starts[child]
						));
				if (
					!removed &&
					type === NodeType.Text &&
					previous !== 0 &&
					S._types[previous] === NodeType.Text
				) {
					S._strings[previous] += S._strings[child];
					S._ends[previous] = S._ends[child];
				} else if (!removed) {
					previous = child;
					child = next;
					continue;
				}
				removedNodes.add(child);
				if (previous === 0) S._firstChildren[node] = next;
				else S._nextSiblings[previous] = next;
				child = next;
			}
			S._lastChildren[node] = previous;
		}
	};
	removeChildren();
	for (let index = emptyContainers.length - 1; index >= 0; index--) {
		const node = emptyContainers[index];
		let child = S._firstChildren[node];
		while (child !== 0 && removedNodes.has(child)) {
			child = S._nextSiblings[child];
		}
		if (child !== 0) continue;
		const start = S._attrStarts[node];
		let attribute = start;
		const declarations =
			S._xmlAttributeDeclarations === null
				? undefined
				: S._xmlAttributeDeclarations.get(tagNameOf(node));
		while (attribute < start + S._attrCounts[node]) {
			const name = S._attrNames[attribute];
			if (
				!removedAttributes.has(attribute) &&
				((declarations !== undefined && declarations.has(name)) ||
					(name !== "xmlns" && !name.startsWith("xmlns:")))
			) {
				break;
			}
			attribute++;
		}
		if (attribute === start + S._attrCounts[node]) removedNodes.add(node);
	}
	if (emptyContainers.length !== 0) removeChildren();
	if (S._removeUnusedSvgNamespaces) {
		/** @type {Set<number>} */
		const used = new Set();
		/**
		 * Keep the declaration supplying a prefix in this scope.
		 * @param {Map<string, number>} scope active namespace declarations
		 * @param {string} prefix referenced prefix
		 * @returns {void}
		 */
		const use = (scope, prefix) => {
			const binding = scope.get(prefix);
			if (binding !== undefined) used.add(binding);
		};
		/**
		 * Preserve prefixes that application data could read as qualified names.
		 * @param {Map<string, number>} scope active namespace declarations
		 * @param {string} value decoded content
		 * @returns {void}
		 */
		const useValue = (scope, value) => {
			const prefixes =
				/([A-Za-z_\u0080-\uFFFF][A-Za-z0-9_.\u0080-\uFFFF-]*)(:)?/g;
			let match;
			while ((match = prefixes.exec(value)) !== null) {
				if (match[2] !== undefined) use(scope, match[1]);
			}
		};
		for (let node = 1; node <= S._nodeCount; node++) {
			const parent = S._parents[node];
			if (removedNodes.has(node) || removedNodes.has(parent)) continue;
			const scope = scopes.get(node) || scopes.get(parent);
			if (scope === undefined) continue;
			if (S._types[node] !== NodeType.Element) {
				const data = dataOf(node);
				const css = S._types[node] === NodeType.Text && isXmlStylesheet(node);
				useValue(
					scope,
					css && rendersNow() && data.trim() !== "" ? renderedSheet(data) : data
				);
				continue;
			}
			const name = tagNameOf(node);
			const colon = name.indexOf(":");
			if (colon !== -1) use(scope, name.slice(0, colon));
			const start = S._attrStarts[node];
			for (let i = start; i < start + S._attrCounts[node]; i++) {
				const name = S._attrNames[i];
				if (
					removedAttributes.has(i) ||
					name === "xmlns" ||
					name.startsWith("xmlns:")
				) {
					continue;
				}
				const colon = name.indexOf(":");
				if (colon !== -1) use(scope, name.slice(0, colon));
				useValue(
					scope,
					S._xmlRenderedStyles !== null && S._xmlRenderedStyles.has(i)
						? /** @type {string} */ (S._xmlRenderedStyles.get(i))
						: xmlAttributeValue(i)
				);
			}
		}
		for (let node = 1; node <= S._nodeCount; node++) {
			if (!svgContexts.has(node) || removedNodes.has(node)) continue;
			const declarations =
				S._xmlAttributeDeclarations === null
					? undefined
					: S._xmlAttributeDeclarations.get(tagNameOf(node));
			const start = S._attrStarts[node];
			for (let i = start; i < start + S._attrCounts[node]; i++) {
				if (
					S._attrNames[i].startsWith("xmlns:") &&
					!used.has(i) &&
					(declarations === undefined || !declarations.has(S._attrNames[i]))
				) {
					removedAttributes.add(i);
				}
			}
		}
	}
};

/**
 * Whether an element holds nothing but whitespace and comments.
 * @param {HtmlNodeRef} node the element
 * @returns {boolean} true when no element, character data or meaningful text is inside
 */
const isEmptyXmlElement = (node) => {
	for (
		let child = S._firstChildren[node];
		child !== 0;
		child = S._nextSiblings[child]
	) {
		const type = S._types[child];
		if (
			type !== NodeType.Comment &&
			(type !== NodeType.Text || !/^[\t\n\r ]*$/.test(dataOf(child)))
		) {
			return false;
		}
	}
	return true;
};

/**
 * Index symbol IDs for structural rewrites, declining documents with observable dependencies.
 * @param {boolean} definitions include resource definitions within defs
 * @param {boolean} symbols include symbol definitions outside defs
 * @param {boolean=} tolerant accept animations and repeated IDs, for the passes that
 * keep what an animation can change and drop a repeat no reference resolves to
 * @returns {Map<HtmlNodeRef, string> | null} symbol IDs, or null when structure must stay
 */
const svgStructureSymbols = (definitions, symbols, tolerant = false) => {
	/** @type {Map<HtmlNodeRef, string>} */
	const keys = new Map();
	/** @type {Set<string>} */
	const ids = new Set();
	// WHY: `xml:space` lays out text, so it declines only a document with text where
	// it renders; whitespace in a container or a shape renders nothing either way.
	let preserved = false;
	let textual = false;
	for (let node = 1; node <= S._nodeCount; node++) {
		if (S._xmlRemovedNodes !== null && S._xmlRemovedNodes.has(node)) continue;
		const type = S._types[node];
		if (
			type === NodeType.Doctype ||
			(type === NodeType.ProcessingInstruction &&
				S._piTargets.get(node) === "xml-stylesheet")
		) {
			return null;
		}
		if (type === NodeType.Text && !textual) {
			const parent = S._parents[node];
			textual =
				S._types[parent] === NodeType.Element &&
				!(
					xmlElementIsStyled(parent, true) &&
					(SVG_WHITESPACE_CONTAINERS.has(svgLocalName(parent)) ||
						SVG_GEOMETRY_ELEMENTS.has(svgLocalName(parent)))
				);
		}
		if (type !== NodeType.Element) continue;
		const name = tagNameOf(node);
		const localName = name.slice(name.indexOf(":") + 1);
		if (
			(localName === "style" && !isEmptyXmlElement(node)) ||
			localName === "script" ||
			localName === "link" ||
			localName === "handler" ||
			(!tolerant && (localName.startsWith("animate") || localName === "set")) ||
			localName === "discard"
		) {
			return null;
		}
		let key = "";
		const start = S._attrStarts[node];
		for (let i = start; i < start + S._attrCounts[node]; i++) {
			if (S._xmlRemovedAttributes !== null && S._xmlRemovedAttributes.has(i)) {
				continue;
			}
			const name = S._attrNames[i];
			if (
				asciiLowercase(name).startsWith("on") ||
				name === "xml:base" ||
				(name === "pointer-events" &&
					(xmlAttributeValue(i) === "bounding-box" ||
						!svgContextFreePresentation(name, xmlAttributeValue(i)))) ||
				(name === "style" &&
					hasSvgStyleProperty(xmlAttributeValue(i), "pointer-events"))
			) {
				return null;
			}
			if (name === "xml:space" && xmlAttributeValue(i) !== "default") {
				preserved = true;
			}
			if (name !== "id" && name !== "xml:id") continue;
			const value = xmlAttributeValue(i);
			if (value === "") continue;
			if (ids.has(value)) {
				if (tolerant) continue;
				return null;
			}
			ids.add(value);
			if (key === "" || name === "id") key = value;
		}
		if (
			((symbols && localName === "symbol") ||
				(definitions &&
					SVG_DEFINITION_ELEMENTS.has(localName) &&
					svgLocalName(S._parents[node]) === "defs")) &&
			key !== "" &&
			xmlElementIsStyled(node, true)
		) {
			keys.set(node, definitions ? `${localName} ${key}` : key);
		}
	}
	return preserved && textual ? null : keys;
};

/**
 * Return an element's case-sensitive XML local name.
 * @param {HtmlNodeRef} node the element
 * @returns {string} its local name
 */
const svgLocalName = (node) => {
	const name = tagNameOf(node);
	return name.slice(name.indexOf(":") + 1);
};

/**
 * Whether an element is in the SVG namespace but no SVG specification defines it,
 * so neither it nor its content renders.
 * @param {HtmlNodeRef} node the element
 * @returns {boolean} true for an unknown SVG element
 */
const svgElementIsUnknown = (node) =>
	xmlElementIsStyled(node, true) && !SVG_ELEMENTS.has(svgLocalName(node));

/**
 * Replace an attribute and its already-decoded XML cache together.
 * @param {number} attribute attribute index
 * @param {string} value decoded replacement value
 * @returns {void}
 */
const writeSvgAttribute = (attribute, value) => {
	S._attrValues[attribute] = value;
	setXmlAttributeValue(attribute, value);
};

/**
 * Read the attributes structural cleanup can safely reason about.
 * @param {HtmlNodeRef} node the element
 * @returns {Map<string, number>} live attribute indices by name
 */
const svgAttributes = (node) => {
	/** @type {Map<string, number>} */
	const attributes = new Map();
	const start = S._attrStarts[node];
	for (let i = start; i < start + S._attrCounts[node]; i++) {
		if (S._xmlRemovedAttributes === null || !S._xmlRemovedAttributes.has(i)) {
			attributes.set(S._attrNames[i], i);
		}
	}
	return attributes;
};

/**
 * Read a number's final spelling before structural comparison.
 * @param {number} attribute the attribute index
 * @returns {string} the value the XML printer will use
 */
const svgAttributeValue = (attribute) =>
	S._xmlShortenedNumbers !== null && S._xmlShortenedNumbers.has(attribute)
		? /** @type {string} */ (S._xmlShortenedNumbers.get(attribute))
		: xmlAttributeValue(attribute);

/**
 * Replace a structural rewrite's attribute list with decoded final values.
 * @param {HtmlNodeRef} node the element
 * @param {Map<string, string>} values attribute names and decoded values
 * @returns {void}
 */
const writeSvgAttributes = (node, values) => {
	const start = S._attrCount + 1;
	for (const [name, value] of values) {
		const index = makeAttr(name, value, 0, 0, -1, -1);
		writeSvgAttribute(index, value);
		if (
			S._shortenSvgColors &&
			SVG_COLOR_ATTRIBUTES.has(name) &&
			isSvgColor(value)
		) {
			if (S._xmlColorAttributes === null) S._xmlColorAttributes = new Set();
			S._xmlColorAttributes.add(index);
		}
	}
	S._attrStarts[node] = start;
	S._attrCounts[node] = values.size;
};

/**
 * Validate one presentation declaration as its attribute would read it.
 * @param {string} name the property
 * @param {string} value its value, trimmed
 * @returns {string | null} the value to write, shortened where numbers are, or null
 */
const svgPresentationValue = (name, value) => {
	// A lone paint server reads the same from either place; a fallback or escape stays.
	if (
		(name === "fill" || name === "stroke") &&
		/^url\((?:"[^"\\\n]*"|'[^'\\\n]*'|[^"'()\\\t\n\f\r ]*)\)$/i.test(value)
	) {
		return value;
	}
	if (
		!SVG_INHERITED_CLEANUP_ATTRIBUTES.has(name) ||
		!/^[^:;!{}]+$/.test(value)
	) {
		return null;
	}
	const kind = SVG_PRESENTATION_NUMERIC_ATTRIBUTES[name];
	if (SVG_COLOR_ATTRIBUTES.has(name)) {
		if (
			!isSvgColor(value) &&
			!(name !== "color" && /^(?:none|currentColor)$/.test(value))
		) {
			return null;
		}
	} else if (kind !== undefined) {
		const compact = shortenSvgNumericValue(value, kind);
		const number = Number.parseFloat(value);
		if (
			compact === null ||
			!Number.isFinite(number) ||
			/[eE][+-]?\d/.test(value) ||
			((name === "stroke-width" || name === "font-size") && number < 0) ||
			(name === "stroke-miterlimit" && number < 1) ||
			((name === "letter-spacing" || name === "word-spacing") &&
				value.endsWith("%")) ||
			// CSS reads a bare number only for the stroke lengths; an attribute reads
			// one everywhere, so the move would turn an ignored declaration on.
			(kind === "length" &&
				name !== "stroke-width" &&
				name !== "stroke-dashoffset" &&
				number !== 0 &&
				/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(value))
		) {
			return null;
		}
		if (S._shortenSvgNumbers) return compact;
	} else if (!svgContextFreePresentation(name, value)) {
		return null;
	}
	return value;
};

/**
 * Read a complete list of independent presentation declarations without CSS recovery.
 * @param {string} style the authored declaration list
 * @returns {Map<string, string> | null} validated last declarations, or null
 */
const svgPresentationStyle = (style) => {
	const parts = style.trim().replace(/;\s*$/, "").split(";");
	/** @type {Map<string, string>} */
	const values = new Map();
	/** @type {Set<string>} */
	const important = new Set();
	for (const part of parts) {
		const match =
			/^\s*([a-z-]+)\s*:\s*([^:;!{}]+?)\s*(!\s*important\s*)?$/i.exec(part);
		if (match === null) return null;
		const name = match[1];
		const value = svgPresentationValue(name, match[2]);
		if (value === null) return null;
		// Without stylesheets or animations importance only ranks a block's own values.
		if (match[3] !== undefined) important.add(name);
		else if (important.has(name)) continue;
		values.set(name, value);
	}
	return values;
};

/**
 * Split a style into the presentation declarations an attribute can carry and the rest.
 * A declaration moves only when no other one in the style touches its property family,
 * since the attribute ranks below what stays; ones CSS drops for lack of a colon go.
 * @param {string} style the authored declaration list
 * @returns {{ moved: Map<string, string>, rest: string, length: number } | null} the split and the compacted style's length, or null where nothing moves
 */
const splitSvgPresentationStyle = (style) => {
	const text = stripSvgCssComments(style);
	const parts = text === null ? null : splitSvgCss(text, ";");
	if (parts === null) return null;
	/** @type {[string, string][]} */
	const declarations = [];
	let dropped = false;
	for (const part of parts) {
		const colon = part.indexOf(":");
		if (colon === -1) {
			if (!/^[\t\n\f\r ]*$/.test(part)) dropped = true;
			continue;
		}
		// A name's escapes read as the characters they stand for.
		const name = trimCss(part.slice(0, colon)).replace(
			/\\(?:([0-9a-fA-F]{1,6})[\t\n\f\r ]?|([^\n\r\f0-9a-fA-F]))/g,
			/**
			 * @param {string} match the escape
			 * @param {string | undefined} hex its hexadecimal code point
			 * @param {string} char the character it escapes, where no code point is given
			 * @returns {string} what it stands for
			 */
			(match, hex, char) =>
				hex === undefined ? char : cssCodePoint(Number.parseInt(hex, 16))
		);
		if (!/^-?-?[a-zA-Z][a-zA-Z0-9-]*$/.test(name)) return null;
		declarations.push([name, trimCss(part.slice(colon + 1))]);
	}
	// `all` resets every property, a moved one too, from the style that outranks it.
	if (declarations.some(([name]) => asciiLowercase(name) === "all")) {
		return null;
	}
	/** @type {Map<string, string>} */
	const moved = new Map();
	/** @type {string[]} */
	const rest = [];
	for (const [name, value] of declarations) {
		const family = asciiLowercase(name).split("-")[0];
		const written =
			declarations.filter(
				([other]) => asciiLowercase(other).split("-")[0] === family
			).length === 1
				? svgPresentationValue(
						name,
						value.replace(/[\t\n\f\r ]*![\t\n\f\r ]*important$/i, "")
					)
				: null;
		if (written === null) rest.push(`${name}:${value}`);
		else moved.set(name, written);
	}
	const length = parts
		.map(trimCss)
		.filter((part) => part !== "")
		.join(";").length;
	return moved.size === 0 && !dropped
		? null
		: { moved, rest: rest.join(";"), length };
};

/**
 * Reuse unidentified leaf paths while preserving the types of ID-bearing targets.
 * A new use context must not change contextual paint.
 * @returns {void}
 */
const reuseSvgPaths = () => {
	/** @type {Map<string, string>} */
	const definitions = new Map();
	if (S._xmlRemovedAttributes === null) S._xmlRemovedAttributes = new Set();
	for (let node = 1; node <= S._nodeCount; node++) {
		if (
			S._types[node] !== NodeType.Element ||
			svgLocalName(node) !== "path" ||
			S._firstChildren[node] !== 0 ||
			(S._xmlRemovedNodes !== null && S._xmlRemovedNodes.has(node)) ||
			!xmlElementIsStyled(node, true)
		) {
			continue;
		}
		const attributes = svgAttributes(node);
		if (
			[...attributes.keys()].some(
				(name) =>
					name !== "id" &&
					name !== "d" &&
					name !== "pathLength" &&
					name !== "xmlns" &&
					!name.startsWith("xmlns:") &&
					!SVG_INHERITED_CLEANUP_ATTRIBUTES.has(name) &&
					!SVG_COLOR_ATTRIBUTES.has(name) &&
					SVG_PRESENTATION_NUMERIC_ATTRIBUTES[name] === undefined
			)
		) {
			continue;
		}
		if (
			["fill", "stroke"].some((name) => {
				const attribute = attributes.get(name);
				return (
					attribute === undefined ||
					!svgContextFreePresentation(name, svgAttributeValue(attribute))
				);
			})
		) {
			continue;
		}
		if (
			[...attributes].some(([name, index]) => {
				const value = svgAttributeValue(index);
				const kind =
					name === "pathLength"
						? "number"
						: SVG_PRESENTATION_NUMERIC_ATTRIBUTES[name];
				return (
					/^(?:inherit|unset|revert(?:-layer)?)$|var\(/i.test(
						trimSvgValue(value)
					) ||
					(kind !== undefined && shortenSvgNumericValue(value, kind) === null)
				);
			})
		) {
			continue;
		}
		const data = attributes.get("d");
		if (
			data === undefined ||
			shortenSvgPath(xmlAttributeValue(data)) === null
		) {
			continue;
		}
		const key = [...attributes]
			.filter(([name]) => name !== "id")
			.map(
				([name, index]) =>
					`${name.length}:${name}${
						svgAttributeValue(index).length
					}:${svgAttributeValue(index)}`
			)
			.sort()
			.join(";");
		const reference = definitions.get(key);
		if (
			reference !== undefined &&
			!attributes.has("id") &&
			svgAttributeValue(data).length > reference.length + 3
		) {
			const name = tagNameOf(node);
			S._strings[node] = `${name.slice(0, name.indexOf(":") + 1)}use`;
			for (const [name, index] of attributes) {
				if (
					name !== "id" &&
					name !== "d" &&
					name !== "xmlns" &&
					!name.startsWith("xmlns:")
				) {
					S._xmlRemovedAttributes.add(index);
				}
			}
			S._attrNames[data] = "href";
			writeSvgAttribute(data, `#${reference}`);
			if (S._xmlShortenedNumbers !== null) {
				S._xmlShortenedNumbers.delete(data);
			}
		} else {
			const id = attributes.get("id");
			if (
				id !== undefined &&
				!definitions.has(key) &&
				/^[A-Za-z_][A-Za-z0-9_.-]*$/.test(xmlAttributeValue(id))
			) {
				definitions.set(key, xmlAttributeValue(id));
			}
		}
	}
};

/**
 * Read a path any disjoint neighbor with the same attributes may merge with.
 * Anti-aliasing can blend a pixel both share differently once merged, so this is opt-in.
 * @param {HtmlNodeRef} node the candidate
 * @returns {{ attribute: number, data: string, key: string, boxes: number[][] } | null} a candidate
 */
const svgMergeableShape = (node) => {
	if (
		S._types[node] !== NodeType.Element ||
		svgLocalName(node) !== "path" ||
		S._firstChildren[node] !== 0 ||
		!xmlElementIsStyled(node, true) ||
		S._svgIdAncestors.has(node)
	) {
		return null;
	}
	const attributes = svgAttributes(node);
	const attribute = attributes.get("d");
	if (attribute === undefined) return null;
	let strokeWidth = "1";
	let miterLimit = "4";
	let stroked = false;
	for (const [name, index] of attributes) {
		const value = svgAttributeValue(index);
		// Bounding-box units, dash phases and markers see each path alone, and a
		// non-scaling stroke's width is in viewport units the boxes cannot know.
		if (
			name === "style" ||
			name === "vector-effect" ||
			name === "pathLength" ||
			name === "clip-path" ||
			name === "mask" ||
			name === "filter" ||
			name.startsWith("marker") ||
			name.startsWith("stroke-dash") ||
			name.includes(":") ||
			value.includes("url(")
		) {
			return null;
		}
		if (name === "stroke") stroked = value.trim() !== "none";
		else if (name === "stroke-width") strokeWidth = value;
		else if (name === "stroke-miterlimit") miterLimit = value;
	}
	// An inherited stroke is the same for every sibling, so the widest case holds.
	if (!attributes.has("stroke")) stroked = true;
	const data = svgAttributeValue(attribute);
	/** @type {(number[] | null)[]} */
	const subpaths = [];
	const bounds = svgPathBounds(data, subpaths);
	const pad = stroked
		? (Number(strokeWidth) / 2) * Math.max(Number(miterLimit), Math.SQRT2)
		: 0;
	if (bounds === null || !(pad >= 0)) return null;
	let butt = !stroked;
	if (!butt) {
		butt = true;
		for (
			let element = node;
			S._types[element] === NodeType.Element;
			element = S._parents[element]
		) {
			const own = svgAttributes(element);
			const cap = own.get("stroke-linecap");
			if (
				own.has("style") ||
				(cap !== undefined && svgAttributeValue(cap).trim() !== "butt")
			) {
				butt = false;
				break;
			}
		}
	}
	// A later path's first move is relative to the earlier one's end once joined.
	let joined = data;
	const move = /^[\t\n\r ]*m/.exec(data);
	if (move !== null) {
		const number = /[\t\n\r ,]*[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/y;
		// The bounds parsed, so the move holds its pair.
		number.lastIndex = move[0].length;
		number.exec(data);
		number.exec(data);
		const pair = number.lastIndex;
		const rest = data.slice(pair);
		// Pairs after the move were relative lines, and stay so after `l`.
		joined = `M${data.slice(move[0].length, pair)}${
			/^[\t\n\r ,]*[+.\d-]/.test(rest) ? "l" : ""
		}${rest}`;
	}
	const key = `shape:${[...attributes]
		.filter(([name]) => name !== "d")
		.map(([name, index]) => `${name}=${svgAttributeValue(index)}`)
		.sort()
		.join(";")}`;
	return {
		attribute,
		data: joined,
		key,
		boxes: subpaths
			.filter((box) => box !== null || !butt)
			.map((box) => {
				// A lone point paints a cap unless caps are butt.
				const [left, top, right, bottom] = box === null ? bounds : box;
				return [left - pad, top - pad, right + pad, bottom + pad];
			})
	};
};

/**
 * Read a marker-free, explicitly painted straight path for disjoint merging.
 * @param {HtmlNodeRef} node the candidate
 * @returns {{ attribute: number, data: string, key: string, boxes: number[][] } | null} a candidate
 */
const svgMergeableLine = (node) => {
	if (
		S._types[node] !== NodeType.Element ||
		svgLocalName(node) !== "path" ||
		S._firstChildren[node] !== 0 ||
		!xmlElementIsStyled(node, true)
	) {
		return null;
	}
	const attributes = svgAttributes(node);
	for (const name of attributes.keys()) {
		if (
			name !== "d" &&
			name !== "fill" &&
			name !== "stroke" &&
			name !== "stroke-width" &&
			name !== "stroke-dasharray" &&
			name !== "shape-rendering" &&
			name !== "marker-start" &&
			name !== "marker-mid" &&
			name !== "marker-end"
		) {
			return null;
		}
	}
	for (const name of [
		"fill",
		"stroke-dasharray",
		"marker-start",
		"marker-mid",
		"marker-end"
	]) {
		const attribute = attributes.get(name);
		if (attribute === undefined || xmlAttributeValue(attribute) !== "none") {
			return null;
		}
	}
	const rendering = attributes.get("shape-rendering");
	if (
		rendering === undefined ||
		xmlAttributeValue(rendering) !== "crispEdges"
	) {
		return null;
	}
	const stroke = attributes.get("stroke");
	const width = attributes.get("stroke-width");
	const attribute = attributes.get("d");
	if (
		stroke === undefined ||
		width === undefined ||
		attribute === undefined ||
		!isSvgColor(xmlAttributeValue(stroke))
	) {
		return null;
	}
	const weight = exactSvgPathCoordinate(
		shortenSvgNumber(xmlAttributeValue(width))
	);
	if (weight === null || weight <= 0) return null;
	const data = xmlAttributeValue(attribute);
	const match =
		/^M[\t\n\r ]*([-+.\d]+)[,\t\n\r ]+([-+.\d]+)[\t\n\r ]*L[\t\n\r ]*([-+.\d]+)[,\t\n\r ]+([-+.\d]+)[\t\n\r ]*$/.exec(
			data
		);
	if (match === null) return null;
	const coordinates = match
		.slice(1)
		.map((value) => exactSvgPathCoordinate(shortenSvgNumber(value)));
	if (coordinates.includes(null)) return null;
	const [x, y, endX, endY] = /** @type {number[]} */ (coordinates);
	if (x !== endX && y !== endY) return null;
	const key = [...attributes]
		.filter(([name]) => name !== "d")
		.map(([name, index]) => `${name}=${svgAttributeValue(index)}`)
		.sort()
		.join(";");
	return {
		attribute,
		data,
		key,
		boxes: [
			[
				Math.min(x, endX) - 2 * weight,
				Math.min(y, endY) - 2 * weight,
				Math.max(x, endX) + 2 * weight,
				Math.max(y, endY) + 2 * weight
			]
		]
	};
};

/**
 * Refuse inherited compositing and externally referenced contexts before merging.
 * @param {HtmlNodeRef} node the paths' parent
 * @returns {boolean} whether ancestors can change compositing
 */
const svgMergeHasCompositing = (node) => {
	for (
		let parent = node;
		S._types[parent] === NodeType.Element;
		parent = S._parents[parent]
	) {
		for (const name of svgAttributes(parent).keys()) {
			if (
				name !== "xmlns" &&
				!name.startsWith("xmlns:") &&
				name !== "width" &&
				name !== "height" &&
				name !== "viewBox" &&
				name !== "preserveAspectRatio" &&
				name !== "stroke-linecap" &&
				name !== "stroke-linejoin" &&
				name !== "shape-rendering"
			) {
				return true;
			}
		}
	}
	return false;
};

/**
 * Join adjacent relative horizontal or vertical lines running the same way, as
 * long as every point on the way is a bounded eighth that float32 holds exactly.
 * @param {string} data compact path data
 * @returns {string} the data with each such run as one line, or unchanged
 */
const joinSvgPathRuns = (data) => {
	const number =
		/[\t\n\f\r ]*,?[\t\n\f\r ]*([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/y;
	const flag = /[\t\n\f\r ]*,?[\t\n\f\r ]*([01])/y;
	/** @type {[string, string[]][]} */
	const segments = [];
	/**
	 * @param {number | null} origin the coordinate a relative value starts from
	 * @param {string} value the written value
	 * @param {boolean} relative whether it is an offset
	 * @returns {number | null} the exact coordinate it reaches, or null when unknown
	 */
	const reach = (origin, value, relative) => {
		const exact = exactSvgPathCoordinate(value);
		if (exact === null || (relative && origin === null)) return null;
		const point = relative ? /** @type {number} */ (origin) + exact : exact;
		return Math.abs(point) <= 1000000 ? point : null;
	};
	/** @type {number | null} */
	let x = 0;
	/** @type {number | null} */
	let y = 0;
	/** @type {number | null} */
	let startX = 0;
	/** @type {number | null} */
	let startY = 0;
	// The x or y the last segment started from, while it is a joinable line.
	/** @type {number | null} */
	let lineOrigin = null;
	let joined = false;
	let position = 0;
	// The shortener's output: each letter starts a segment, with no space before it.
	while (position < data.length) {
		let letter = data.charAt(position++);
		let upper = letter.toUpperCase();
		const arity = Number(SVG_PATH_ARGUMENTS[upper]);
		if (arity === 0) {
			segments.push([letter, []]);
			x = startX;
			y = startY;
			lineOrigin = null;
			continue;
		}
		do {
			/** @type {string[]} */
			const values = [];
			for (let index = 0; index < arity; index++) {
				const pattern =
					upper === "A" && (index === 3 || index === 4) ? flag : number;
				pattern.lastIndex = position;
				values.push(/** @type {RegExpExecArray} */ (pattern.exec(data))[1]);
				position = pattern.lastIndex;
			}
			const relative = letter !== upper;
			const previous = segments[segments.length - 1];
			if (
				(letter === "h" || letter === "v") &&
				previous !== undefined &&
				previous[0] === letter &&
				lineOrigin !== null
			) {
				const first = Number(previous[1][0]);
				const second = Number(values[0]);
				const end = reach(letter === "h" ? x : y, values[0], true);
				const sum = exactSvgPathCoordinate(String(first + second));
				if (
					end !== null &&
					sum !== null &&
					first * second > 0 &&
					reach(lineOrigin, String(first + second), true) === end
				) {
					previous[1][0] = String(first + second);
					if (letter === "h") x = end;
					else y = end;
					joined = true;
					while (isXmlWhitespace(data.charCodeAt(position))) position++;
					continue;
				}
			}
			lineOrigin = letter === "h" ? x : letter === "v" ? y : null;
			segments.push([letter, values]);
			if (upper === "H") {
				x = reach(x, values[0], relative);
			} else if (upper === "V") {
				y = reach(y, values[0], relative);
			} else {
				x = reach(x, values[arity - 2], relative);
				y = reach(y, values[arity - 1], relative);
			}
			// Only the first pair moves; the pairs after it are lines.
			if (upper === "M") {
				startX = x;
				startY = y;
				letter = relative ? "l" : "L";
				upper = "L";
			}
			while (isXmlWhitespace(data.charCodeAt(position))) position++;
		} while (position < data.length && !/[a-zA-Z]/.test(data.charAt(position)));
	}
	return joined
		? segments.map(([letter, values]) => letter + values.join(" ")).join("")
		: data;
};

/**
 * Join same-way line runs in every path no marker can mark, where a vertex
 * that goes leaves the drawing, its dashes and its length alike.
 * @returns {void}
 */
const joinSvgDocumentPathRuns = () => {
	const removedNodes = /** @type {Set<HtmlNodeRef>} */ (S._xmlRemovedNodes);
	/** @type {number[]} */
	const data = [];
	for (let node = 1; node <= S._nodeCount; node++) {
		if (S._types[node] !== NodeType.Element || removedNodes.has(node)) {
			continue;
		}
		if (svgLocalName(node) === "marker") return;
		const attributes = svgAttributes(node);
		for (const [name, index] of attributes) {
			if (
				name.startsWith("marker") ||
				// An escape can spell either name some other way.
				(name === "style" &&
					/marker|\bd\s*:|\\/i.test(xmlAttributeValue(index)))
			) {
				return;
			}
		}
		const d = attributes.get("d");
		if (
			d !== undefined &&
			svgLocalName(node) === "path" &&
			xmlElementIsStyled(node, true)
		) {
			data.push(d);
		}
	}
	for (const index of data) {
		const shortened = shortenSvgPath(svgAttributeValue(index));
		if (shortened === null) continue;
		const joined = joinSvgPathRuns(shortened);
		if (joined === shortened) continue;
		// A joined number is never longer than the two it replaces.
		const compact = /** @type {string} */ (shortenSvgPath(joined));
		writeSvgAttribute(index, compact);
		// The printer reads a path's spelling from here once one is there.
		if (S._xmlShortenedNumbers !== null) {
			S._xmlShortenedNumbers.set(index, compact);
		}
	}
};

/**
 * Bound a merge candidate's boxes, keeping each comparison and merge cheap: one box for
 * straight lines, which cannot interleave, and for more than 64 subpaths.
 * @param {number[][]} boxes the subpath boxes
 * @returns {number[][]} them, or the one box around them
 */
const boundSvgBoxes = (boxes) => {
	if (S._mergeDisjointSvgPaths && boxes.length <= 64) return boxes;
	const union = [Infinity, Infinity, -Infinity, -Infinity];
	for (const box of boxes) {
		if (box[0] < union[0]) union[0] = box[0];
		if (box[1] < union[1]) union[1] = box[1];
		if (box[2] > union[2]) union[2] = box[2];
		if (box[3] > union[3]) union[3] = box[3];
	}
	return [union];
};

/**
 * Merge only disjoint straight paths with explicit paint, dash and marker values.
 * @returns {void}
 */
const mergeSvgPaths = () => {
	if (S._xmlRemovedNodes === null) S._xmlRemovedNodes = new Set();
	for (let node = 1; node <= S._nodeCount; node++) {
		if (
			S._types[node] !== NodeType.Element ||
			S._xmlRemovedNodes.has(node) ||
			!xmlElementIsStyled(node, true) ||
			svgMergeHasCompositing(node)
		) {
			continue;
		}
		let previous = 0;
		/** @type {ReturnType<typeof svgMergeableLine>} */
		let candidate = null;
		for (let child = S._firstChildren[node]; child !== 0;) {
			const next = S._nextSiblings[child];
			const current =
				(S._mergeDisjointSvgPaths ? svgMergeableShape(child) : null) ||
				svgMergeableLine(child);
			if (current !== null) current.boxes = boundSvgBoxes(current.boxes);
			if (
				candidate !== null &&
				current !== null &&
				candidate.key === current.key &&
				candidate.boxes.every((one) =>
					current.boxes.every(
						(other) =>
							one[2] < other[0] ||
							other[2] < one[0] ||
							one[3] < other[1] ||
							other[3] < one[1]
					)
				)
			) {
				const data = candidate.data + current.data;
				writeSvgAttribute(candidate.attribute, data);
				if (S._xmlShortenedNumbers === null) {
					S._xmlShortenedNumbers = new Map();
				}
				S._xmlShortenedNumbers.set(
					candidate.attribute,
					(S._shortenSvgPathData && shortenSvgPath(data)) || data
				);
				candidate.data = data;
				for (const box of current.boxes) candidate.boxes.push(box);
				candidate.boxes = boundSvgBoxes(candidate.boxes);
				S._xmlRemovedNodes.add(child);
				S._nextSiblings[previous] = next;
				if (S._lastChildren[node] === child) {
					S._lastChildren[node] = previous;
				}
			} else {
				candidate = current;
				previous = child;
			}
			child = next;
		}
	}
};

/**
 * Decline unnamed definitions containing IDs, text or unknown application data.
 * @param {HtmlNodeRef} node the definition
 * @returns {boolean} whether the entire subtree is unused graphics
 */
const isUnusedSvgDefinition = (node) => {
	if (S._svgIdAncestors.has(node)) return false;
	const pending = [node];
	while (pending.length !== 0) {
		const current = /** @type {number} */ (pending.pop());
		const type = S._types[current];
		if (type === NodeType.Element) {
			if (
				[...svgAttributes(current).keys()].some(
					(name) =>
						name !== "xmlns" &&
						!SVG_COLOR_ATTRIBUTES.has(name) &&
						!SVG_INHERITED_CLEANUP_ATTRIBUTES.has(name) &&
						SVG_PRESENTATION_NUMERIC_ATTRIBUTES[name] === undefined &&
						(SVG_NUMERIC_ATTRIBUTES[svgLocalName(current)] === undefined ||
							SVG_NUMERIC_ATTRIBUTES[svgLocalName(current)][name] === undefined)
				) ||
				tagNameOf(current).includes(":") ||
				!SVG_UNUSED_DEFINITION_CONTENT.has(svgLocalName(current)) ||
				!xmlElementIsStyled(current, true)
			) {
				return false;
			}
			for (
				let child = S._firstChildren[current];
				child !== 0;
				child = S._nextSiblings[child]
			) {
				pending.push(child);
			}
		} else if (
			type !== NodeType.Text ||
			!/^[\t\n\r ]*$/.test(dataOf(current))
		) {
			return false;
		}
	}
	return true;
};

/**
 * Unwrap a group whose attributes have all been removed or moved to its child.
 * @param {HtmlNodeRef} node the group
 * @returns {void}
 */
const unwrapSvgGroup = (node) => {
	const removed = /** @type {Set<HtmlNodeRef>} */ (S._xmlRemovedNodes);
	const parent = S._parents[node];
	// Only an attribute-free group has no compositing, coordinate or namespace effect.
	let previous = 0;
	for (
		let sibling = S._firstChildren[parent];
		sibling !== node;
		sibling = S._nextSiblings[sibling]
	) {
		previous = sibling;
	}
	const next = S._nextSiblings[node];
	const first = S._firstChildren[node];
	const last = S._lastChildren[node];
	if (previous === 0) S._firstChildren[parent] = first || next;
	else S._nextSiblings[previous] = first || next;
	if (last !== 0) S._nextSiblings[last] = next;
	if (S._lastChildren[parent] === node) {
		S._lastChildren[parent] = last || previous;
	}
	for (
		let child = first;
		child !== next && child !== 0;
		child = S._nextSiblings[child]
	) {
		S._parents[child] = parent;
	}
	removed.add(node);
};

/**
 * Drop containers that structural rewrites made empty, when empty cleanup is enabled.
 * @returns {void}
 */
const dropEmptySvgContainers = () => {
	const removed = /** @type {Set<HtmlNodeRef>} */ (S._xmlRemovedNodes);
	for (let node = S._nodeCount; node > 0; node--) {
		if (
			S._types[node] !== NodeType.Element ||
			removed.has(node) ||
			S._firstChildren[node] !== 0 ||
			!SVG_EMPTY_CONTAINERS.has(svgLocalName(node)) ||
			!xmlElementIsStyled(node, true) ||
			!SVG_WHITESPACE_CONTAINERS.has(svgLocalName(S._parents[node])) ||
			!xmlElementIsStyled(S._parents[node], true) ||
			isSvgSwitchLink(S._parents[node])
		) {
			continue;
		}
		if (
			[...svgAttributes(node).keys()].some(
				(name) => name !== "xmlns" && !name.startsWith("xmlns:")
			)
		) {
			continue;
		}
		unwrapSvgGroup(node);
	}
};

/**
 * Exclude inherited values whose meaning depends on a font, color or cascade context.
 * @param {string} name presentation attribute name
 * @param {string} value decoded attribute spelling
 * @param {boolean=} moving whether removing an ancestor rather than a duplicate
 * @returns {boolean} whether the value is context-free
 */
const svgContextFreePresentation = (name, value, moving = false) => {
	// Moving hit-testing properties to a group can make its bounding box a new target.
	if (moving && (name === "pointer-events" || name === "visibility")) {
		return false;
	}
	if (SVG_COLOR_ATTRIBUTES.has(name)) {
		return (
			(!moving || name !== "color") &&
			(isSvgColor(value) ||
				((name === "fill" || name === "stroke") && value === "none"))
		);
	}
	const kind = SVG_STRUCTURAL_PRESENTATION_VALUES[name];
	return (
		kind !== undefined &&
		(kind === "number"
			? /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value) &&
				Number.isFinite(Number(value)) &&
				(name !== "stroke-width" || Number(value) >= 0) &&
				(name !== "stroke-miterlimit" || Number(value) >= 1)
			: kind.split(" ").includes(value))
	);
};

/**
 * Whether Blink parses every number of a value, which it reads as float32 with at most 38 exponent digits of ten.
 * One number it refuses drops the whole transform list, so joining lists must not pull in such a number.
 * @param {string} value decoded SVG value
 * @returns {boolean} whether each number has a bounded exponent and a finite float32 value
 */
const svgNumbersParse = (value) => {
	const number = /(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?(\d+))?/g;
	let match;
	while ((match = number.exec(value)) !== null) {
		if (
			(match[1] !== undefined && Number(match[1]) > 38) ||
			!(Number(match[0]) < 3.4e38)
		) {
			return false;
		}
	}
	return true;
};

/**
 * Bound the points an SVG path can reach, from its endpoints and control points.
 * An arc counts the circle its radii and chord allow around its start, so the bound is never too small.
 * @param {string} data the path data
 * @param {(number[] | null)[]=} boxes receives each subpath's bounds, or null for one that never leaves its start
 * @returns {number[] | null} `minX minY maxX maxY`, or null when the data does not parse
 */
const svgPathBounds = (data, boxes) => {
	const number = /[\t\n\r ,]*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)/y;
	const flag = /[\t\n\r ,]*([01])/y;
	const command = /[\t\n\r ]*([MmLlHhVvCcSsQqTtAaZz])/y;
	const bounds = [Infinity, Infinity, -Infinity, -Infinity];
	/**
	 * @param {number} x a reached x
	 * @param {number} y a reached y
	 * @returns {void}
	 */
	const reach = (x, y) => {
		bounds[0] = Math.min(bounds[0], x);
		bounds[1] = Math.min(bounds[1], y);
		bounds[2] = Math.max(bounds[2], x);
		bounds[3] = Math.max(bounds[3], y);
		subpath[0] = Math.min(subpath[0], x);
		subpath[1] = Math.min(subpath[1], y);
		subpath[2] = Math.max(subpath[2], x);
		subpath[3] = Math.max(subpath[3], y);
	};
	let subpath = [Infinity, Infinity, -Infinity, -Infinity];
	/**
	 * Hand the subpath read so far to `boxes`, a single point as null.
	 * @returns {void}
	 */
	const flush = () => {
		if (boxes !== undefined && subpath[0] !== Infinity) {
			boxes.push(
				subpath[0] === subpath[2] && subpath[1] === subpath[3] ? null : subpath
			);
		}
		subpath = [Infinity, Infinity, -Infinity, -Infinity];
	};
	let position = 0;
	let x = 0;
	let y = 0;
	let startX = 0;
	let startY = 0;
	// The last control point a smooth curve reflects; the point itself when none.
	let controlX = 0;
	let controlY = 0;
	let letter = "";
	/**
	 * @returns {number | null} the next number, or null where none is
	 */
	const read = () => {
		number.lastIndex = position;
		const match = number.exec(data);
		if (match === null) return null;
		position = number.lastIndex;
		return Number(match[1]);
	};
	for (;;) {
		command.lastIndex = position;
		const match = command.exec(data);
		if (match !== null) {
			letter = match[1];
			position = command.lastIndex;
		} else if (/^[\t\n\r ]*$/.test(data.slice(position))) {
			break;
		} else if (letter === "" || letter === "z" || letter === "Z") {
			return null;
		}
		const relative = letter === letter.toLowerCase();
		const upper = letter.toUpperCase();
		const baseX = relative ? x : 0;
		const baseY = relative ? y : 0;
		if (upper === "Z") {
			x = startX;
			y = startY;
			controlX = x;
			controlY = y;
			continue;
		}
		/** @type {number[]} */
		const values = [];
		const count =
			upper === "H" || upper === "V"
				? 1
				: upper === "M" || upper === "L" || upper === "T"
					? 2
					: upper === "S" || upper === "Q"
						? 4
						: upper === "C"
							? 6
							: 7;
		for (let index = 0; index < count; index++) {
			if (upper === "A" && (index === 3 || index === 4)) {
				flag.lastIndex = position;
				const bit = flag.exec(data);
				if (bit === null) return null;
				position = flag.lastIndex;
				values.push(Number(bit[1]));
				continue;
			}
			const value = read();
			if (value === null || !Number.isFinite(value)) return null;
			values.push(value);
		}
		let nextX = x;
		let nextY = y;
		if (upper === "H") {
			nextX = baseX + values[0];
		} else if (upper === "V") {
			nextY = baseY + values[0];
		} else {
			nextX = baseX + values[count - 2];
			nextY = baseY + values[count - 1];
		}
		let nextControlX = nextX;
		let nextControlY = nextY;
		if (upper === "C" || upper === "Q") {
			for (let index = 0; index < count - 2; index += 2) {
				reach(baseX + values[index], baseY + values[index + 1]);
			}
			nextControlX = baseX + values[count - 4];
			nextControlY = baseY + values[count - 3];
		} else if (upper === "S" || upper === "T") {
			// A reflected control point, then, for `S`, the second one written.
			const reflectedX = 2 * x - controlX;
			const reflectedY = 2 * y - controlY;
			reach(reflectedX, reflectedY);
			if (upper === "S") {
				reach(baseX + values[0], baseY + values[1]);
				nextControlX = baseX + values[0];
				nextControlY = baseY + values[1];
			} else {
				nextControlX = reflectedX;
				nextControlY = reflectedY;
			}
		} else if (upper === "A") {
			// Radii too small to reach the end grow until they do, so bound the grown ellipse.
			const turn = (values[2] * Math.PI) / 180;
			const halfX =
				(Math.cos(turn) * (x - nextX) + Math.sin(turn) * (y - nextY)) / 2;
			const halfY =
				(Math.cos(turn) * (y - nextY) - Math.sin(turn) * (x - nextX)) / 2;
			const rx = Math.abs(values[0]);
			const ry = Math.abs(values[1]);
			const growth =
				rx > 0 && ry > 0
					? Math.sqrt(Math.max(1, (halfX / rx) ** 2 + (halfY / ry) ** 2))
					: 1;
			const radius = Math.max(
				2 * growth * Math.max(rx, ry),
				Math.hypot(nextX - x, nextY - y)
			);
			reach(x - radius, y - radius);
			reach(x + radius, y + radius);
		}
		// A move reaches only its target; the point it leaves is not drawn.
		if (upper === "M") flush();
		else reach(x, y);
		reach(nextX, nextY);
		x = nextX;
		y = nextY;
		controlX = nextControlX;
		controlY = nextControlY;
		if (upper === "M") {
			startX = x;
			startY = y;
			// Pairs after a move are lines.
			letter = relative ? "l" : "L";
		}
	}
	flush();
	return bounds[0] === Infinity ? null : bounds;
};

/**
 * Read path data as absolute segments: `M`, `L`, `C`, `Q`, `A` and `Z` with their arguments.
 * `H` and `V` become lines and a smooth curve takes its reflected control explicitly.
 * @param {string} data the path data
 * @param {boolean=} float whether to sum relative points in float32, as Blink does
 * @returns {(string | number)[][] | null} the segments, or null where the data does not parse
 */
const parseSvgPathSegments = (data, float = false) => {
	// A sum, in float32 where a renderer would sum there.
	/** @type {(a: number, b: number) => number} */
	const sum = float
		? (a, b) => Math.fround(Math.fround(a) + Math.fround(b))
		: (a, b) => a + b;
	// One comma at most between arguments, and none right after a command letter.
	const number =
		/[\t\n\f\r ]*,?[\t\n\f\r ]*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)/y;
	const first = /[\t\n\f\r ]*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)/y;
	const flag = /[\t\n\f\r ]*,?[\t\n\f\r ]*([01])/y;
	const command = /[\t\n\f\r ]*([MmLlHhVvCcSsQqTtAaZz])/y;
	/** @type {(string | number)[][]} */
	const segments = [];
	let position = 0;
	let letter = "";
	let x = 0;
	let y = 0;
	let startX = 0;
	let startY = 0;
	let controlX = 0;
	let controlY = 0;
	let previous = "";
	for (;;) {
		command.lastIndex = position;
		const match = command.exec(data);
		if (match !== null) {
			letter = match[1];
			position = command.lastIndex;
		} else if (/^[\t\n\f\r ]*$/.test(data.slice(position))) {
			break;
		} else if (letter === "" || letter === "z" || letter === "Z") {
			return null;
		}
		const upper = letter.toUpperCase();
		const relative = letter !== upper;
		if (upper === "Z") {
			segments.push(["Z"]);
			x = startX;
			y = startY;
			previous = "Z";
			continue;
		}
		const count =
			upper === "H" || upper === "V"
				? 1
				: upper === "M" || upper === "L" || upper === "T"
					? 2
					: upper === "S" || upper === "Q"
						? 4
						: upper === "C"
							? 6
							: 7;
		/** @type {number[]} */
		const values = [];
		for (let index = 0; index < count; index++) {
			const pattern =
				upper === "A" && (index === 3 || index === 4)
					? flag
					: index === 0 && match !== null
						? first
						: number;
			pattern.lastIndex = position;
			const found = pattern.exec(data);
			if (found === null) return null;
			position = pattern.lastIndex;
			values.push(Number(found[1]));
		}
		if (values.some((one) => !Number.isFinite(one))) return null;
		const fromX = x;
		const fromY = y;
		/**
		 * @param {number} index an x argument's index
		 * @returns {number[]} the absolute point it starts
		 */
		const point = (index) =>
			relative
				? [sum(fromX, values[index]), sum(fromY, values[index + 1])]
				: [sum(0, values[index]), sum(0, values[index + 1])];
		const reflects = previous === "C" || previous === "Q";
		if (upper === "M" || upper === "L" || upper === "T") {
			const [px, py] = point(0);
			if (upper === "T") {
				const cx = previous === "Q" ? sum(2 * x, -controlX) : x;
				const cy = previous === "Q" ? sum(2 * y, -controlY) : y;
				segments.push(["Q", cx, cy, px, py]);
				controlX = cx;
				controlY = cy;
			} else {
				segments.push([upper, px, py]);
			}
			if (upper === "M") {
				startX = px;
				startY = py;
				// Pairs after a move are lines.
				letter = relative ? "l" : "L";
			}
			x = px;
			y = py;
		} else if (upper === "H" || upper === "V") {
			const px = upper === "H" ? sum(relative ? x : 0, values[0]) : x;
			const py = upper === "V" ? sum(relative ? y : 0, values[0]) : y;
			segments.push(["L", px, py]);
			x = px;
			y = py;
		} else if (upper === "C" || upper === "S") {
			const [c1x, c1y] =
				upper === "C"
					? point(0)
					: previous === "C" && reflects
						? [sum(2 * x, -controlX), sum(2 * y, -controlY)]
						: [x, y];
			const [c2x, c2y] = point(upper === "C" ? 2 : 0);
			const [px, py] = point(upper === "C" ? 4 : 2);
			segments.push(["C", c1x, c1y, c2x, c2y, px, py]);
			controlX = c2x;
			controlY = c2y;
			x = px;
			y = py;
		} else if (upper === "Q") {
			const [cx, cy] = point(0);
			const [px, py] = point(2);
			segments.push(["Q", cx, cy, px, py]);
			controlX = cx;
			controlY = cy;
			x = px;
			y = py;
		} else {
			const [px, py] = point(5);
			segments.push([
				"A",
				values[0],
				values[1],
				values[2],
				values[3],
				values[4],
				px,
				py
			]);
			x = px;
			y = py;
		}
		previous =
			upper === "S" ? "C" : upper === "T" ? "Q" : upper === "M" ? "M" : upper;
	}
	return segments.length === 0 || segments[0][0] !== "M" ? null : segments;
};

/**
 * Map absolute path segments through a matrix; an arc's ellipse maps to the one its axes span.
 * @param {(string | number)[][]} segments the absolute segments
 * @param {number[]} matrix `a b c d e f`
 * @returns {(string | number)[][]} the mapped segments
 */
const transformSvgPathSegments = (segments, matrix) => {
	const [a, b, c, d, e, f] = matrix;
	const determinant = a * d - b * c;
	/**
	 * @param {number} px an x
	 * @param {number} py its y
	 * @returns {number[]} the mapped point
	 */
	const map = (px, py) => [a * px + c * py + e, b * px + d * py + f];
	/** @type {(string | number)[][]} */
	const mapped = [];
	let x = 0;
	let y = 0;
	let startX = 0;
	let startY = 0;
	for (const segment of segments) {
		const letter = /** @type {string} */ (segment[0]);
		const values = /** @type {number[]} */ (segment.slice(1));
		const fromX = x;
		const fromY = y;
		if (letter === "Z") {
			x = startX;
			y = startY;
		} else {
			x = values[values.length - 2];
			y = values[values.length - 1];
			if (letter === "M") {
				startX = x;
				startY = y;
			}
		}
		if (letter === "A") {
			const [, , rotation, large, sweep, px, py] = values;
			const [mx, my] = map(px, py);
			const turn = (rotation * Math.PI) / 180;
			// Radii too small to reach the end grow until they do; zero ones draw a line.
			const halfX =
				(Math.cos(turn) * (fromX - px) + Math.sin(turn) * (fromY - py)) / 2;
			const halfY =
				(Math.cos(turn) * (fromY - py) - Math.sin(turn) * (fromX - px)) / 2;
			const growth = Math.sqrt(
				Math.max(1, (halfX / values[0]) ** 2 + (halfY / values[1]) ** 2)
			);
			const rx = Math.abs(values[0]) * growth;
			const ry = Math.abs(values[1]) * growth;
			if (!(rx > 0 && ry > 0)) {
				mapped.push(["L", mx, my]);
				continue;
			}
			// The ellipse's axes map to the columns p r, q s; their singular values are the radii.
			const p = rx * (a * Math.cos(turn) + c * Math.sin(turn));
			const r = rx * (b * Math.cos(turn) + d * Math.sin(turn));
			const q = ry * (c * Math.cos(turn) - a * Math.sin(turn));
			const t = ry * (d * Math.cos(turn) - b * Math.sin(turn));
			const even = Math.hypot((p + t) / 2, (r - q) / 2);
			const odd = Math.hypot((p - t) / 2, (r + q) / 2);
			const radiusX = even + odd;
			const radiusY = Math.abs(even - odd);
			const angle =
				((Math.atan2(r - q, p + t) + Math.atan2(r + q, p - t)) * 90) / Math.PI;
			mapped.push([
				"A",
				radiusX,
				radiusY,
				Math.abs(radiusX - radiusY) < 1e-9 ? 0 : angle,
				large,
				determinant < 0 ? 1 - sweep : sweep,
				mx,
				my
			]);
			continue;
		}
		/** @type {(string | number)[]} */
		const next = [letter];
		for (let index = 0; index < values.length; index += 2) {
			next.push(...map(values[index], values[index + 1]));
		}
		mapped.push(next);
	}
	return mapped;
};

/**
 * Write absolute path segments, each absolute or relative, whichever is shorter.
 * Points round where they land, so error never accumulates; with places -1, none round and all stay absolute.
 * @param {(string | number)[][]} segments the absolute segments
 * @param {number} places decimal places, or -1 for exact
 * @returns {string} path data
 */
const writeSvgPathSegments = (segments, places) => {
	/**
	 * @param {number} value a number
	 * @returns {number} it rounded to the places
	 */
	const round = (value) =>
		places === -1 ? value : Number(value.toFixed(places)) || 0;
	/**
	 * @param {number[]} numbers arguments
	 * @returns {string} them shortened, separated only where a sign or second dot does not
	 */
	const pack = (numbers) => {
		let packed = "";
		for (const number of numbers) {
			const spelling = shortenSvgNumber(String(number));
			packed +=
				packed === "" ||
				spelling[0] === "-" ||
				(spelling[0] === "." && /\.\d*$/.test(packed))
					? spelling
					: ` ${spelling}`;
		}
		return packed;
	};
	// Rounded points can each be half a unit off, so a reflection one unit off is kept.
	const unit = places === -1 ? 0 : 1.000001 * 10 ** -places;
	let output = "";
	let x = 0;
	let y = 0;
	let startX = 0;
	let startY = 0;
	let previous = "";
	let controlX = 0;
	let controlY = 0;
	for (const segment of segments) {
		const letter = /** @type {string} */ (segment[0]);
		if (letter === "Z") {
			previous = "Z";
			output += "z";
			x = startX;
			y = startY;
			continue;
		}
		const first = letter === "A" ? 5 : 0;
		const values = /** @type {number[]} */ (segment.slice(1)).map(
			(value, index) =>
				letter === "A" && index > 1 && index < 5 ? value : round(value)
		);
		let spelled = letter;
		let points = values;
		const impliedX = previous === letter ? 2 * x - controlX : x;
		const impliedY = previous === letter ? 2 * y - controlY : y;
		previous = letter;
		controlX = values[values.length - 4];
		controlY = values[values.length - 3];
		// A control that reflects the previous one is implied by a smooth curve.
		if (
			(letter === "C" || letter === "Q") &&
			// A quadratic's reflection compounds through `T` runs, so it must match as written;
			// a cubic's second control is spelled out, so a unit off stays a unit off.
			Math.abs(values[0] - impliedX) <= (letter === "Q" ? unit / 2 : unit) &&
			Math.abs(values[1] - impliedY) <= (letter === "Q" ? unit / 2 : unit)
		) {
			spelled = letter === "C" ? "S" : "T";
			points = values.slice(2);
			// A quadratic's next reflection starts from the control its output implies.
			if (letter === "Q") {
				controlX = impliedX;
				controlY = impliedY;
			}
		}
		const endX = values[values.length - 2];
		const endY = values[values.length - 1];
		if (letter === "L" && (endX === x || endY === y)) {
			spelled = endY === y ? "H" : "V";
			points = [endY === y ? endX : endY];
		}
		const absolute = `${spelled}${pack(points)}`;
		const fromX = x;
		const fromY = y;
		const relative =
			places === -1
				? null
				: `${spelled.toLowerCase()}${pack(
						points.map((value, index) =>
							index < first
								? value
								: round(
										value -
											(spelled === "V" ||
											(spelled !== "H" && (index - first) % 2 !== 0)
												? fromY
												: fromX)
									)
						)
					)}`;
		output +=
			relative !== null && relative.length <= absolute.length
				? relative
				: absolute;
		x = endX;
		y = endY;
		if (letter === "M") {
			startX = x;
			startY = y;
		}
	}
	return output;
};

/**
 * Whether an element is still in the document, neither it nor an ancestor removed.
 * @param {HtmlNodeRef} node the element
 * @returns {boolean} true while it is kept
 */
const svgNodeIsKept = (node) => {
	// Path data shortening ran removeXmlData first, so the set exists.
	const removed = /** @type {Set<HtmlNodeRef>} */ (S._xmlRemovedNodes);
	for (
		let current = node;
		S._types[current] === NodeType.Element;
		current = S._parents[current]
	) {
		if (removed.has(current)) return false;
	}
	return true;
};

/**
 * Whether an element or an ancestor has an ID, which a `use` can clone it under with other paint.
 * @param {HtmlNodeRef} node the element
 * @returns {boolean} true when one has a nonempty ID
 */
const svgHasNamedAncestor = (node) => {
	for (
		let current = node;
		S._types[current] === NodeType.Element;
		current = S._parents[current]
	) {
		const attributes = svgAttributes(current);
		for (const name of ["id", "xml:id"]) {
			const index = attributes.get(name);
			if (index !== undefined && svgAttributeValue(index) !== "") return true;
		}
	}
	return false;
};

/**
 * Whether the document keeps a `marker` element, whose vertices a path's segments place.
 * @returns {boolean} true when one is kept
 */
const svgHasMarkers = () => {
	for (let node = 1; node <= S._nodeCount; node++) {
		if (
			S._types[node] === NodeType.Element &&
			svgLocalName(node) === "marker" &&
			svgNodeIsKept(node)
		) {
			return true;
		}
	}
	return false;
};

/**
 * Whether no filter, mask or clip on an element or its ancestors can size itself to the
 * element's bounding box, nor a style that may set one.
 * @param {HtmlNodeRef} node the element
 * @returns {boolean} true when nothing on the way up measures the box
 */
const svgBoxIsUnmeasured = (node) => {
	for (
		let current = node;
		S._types[current] === NodeType.Element;
		current = S._parents[current]
	) {
		for (const name of svgAttributes(current).keys()) {
			if (
				name === "style" ||
				name === "filter" ||
				name === "mask" ||
				name === "clip-path"
			) {
				return false;
			}
		}
	}
	return true;
};

/**
 * Drop what a path's subpaths draw twice: a line back to the start before `z`, a move nothing
 * draws from and, unpainted by a stroke, zero-length segments, `z` and a last line back to the start.
 * @param {(string | number)[][]} segments the absolute segments
 * @param {boolean} fillOnly whether only the fill renders, which closes each subpath itself
 * @param {boolean} unmeasured whether nothing reads the path's bounding box, so a lone line, which fills nothing, may go
 * @returns {(string | number)[][]} the segments left
 */
const closeSvgPathSegments = (segments, fillOnly, unmeasured) => {
	/** @type {(string | number)[][]} */
	const kept = [];
	let x = 0;
	let y = 0;
	let startX = 0;
	let startY = 0;
	let subpath = 0;
	let pending = false;
	/**
	 * @returns {boolean} whether the last kept segment is a line ending at the subpath start
	 */
	const returns = () => {
		const last = kept[kept.length - 1];
		return (
			kept.length - 1 > subpath &&
			last[0] === "L" &&
			(last[1] === startX && last[2] === startY
				? true
				: fillOnly && unmeasured && kept.length - 2 === subpath)
		);
	};
	for (let index = 0; index < segments.length; index++) {
		const segment = segments[index];
		const letter = segment[0];
		if (letter === "M") {
			pending = false;
			if (fillOnly) while (returns()) kept.pop();
			// A move nothing draws from renders nothing, even with a stroke's caps.
			if (
				kept.length - 1 === subpath &&
				kept.length > 0 &&
				kept[subpath][0] === "M"
			) {
				kept.pop();
			}
			subpath = kept.length;
			kept.push(segment);
			x = startX = /** @type {number} */ (segment[1]);
			y = startY = /** @type {number} */ (segment[2]);
			continue;
		}
		if (letter === "Z") {
			if (!fillOnly) {
				if (returns()) kept.pop();
				kept.push(segment);
			} else {
				// What follows starts a subpath at the start, which a move then says.
				pending = true;
			}
			x = startX;
			y = startY;
			continue;
		}
		if (pending) {
			pending = false;
			while (returns()) kept.pop();
			subpath = kept.length;
			kept.push(["M", startX, startY]);
		}
		const endX = /** @type {number} */ (segment[segment.length - 2]);
		const endY = /** @type {number} */ (segment[segment.length - 1]);
		const fromX = x;
		const fromY = y;
		if (
			fillOnly &&
			segment.every(
				(value, at) =>
					at === 0 ||
					(letter === "A" && at < 6) ||
					value ===
						((letter === "A" ? at - 6 : at - 1) % 2 === 0 ? fromX : fromY)
			)
		) {
			continue;
		}
		kept.push(segment);
		x = endX;
		y = endY;
	}
	if (fillOnly) while (returns()) kept.pop();
	return kept;
};

/**
 * Rewrite a path's `d` as already shortened data, its other attributes kept in order.
 * @param {HtmlNodeRef} node the path
 * @param {Map<string, number>} attributes its attributes, by name
 * @param {string} shortened the shortened data
 * @returns {void}
 */
const replaceSvgPathData = (node, attributes, shortened) => {
	/** @type {Map<string, string>} */
	const values = new Map();
	for (const [name, index] of attributes) {
		values.set(name, name === "d" ? shortened : svgAttributeValue(index));
	}
	writeSvgPathAttributes(node, values);
};

/**
 * Write a path's attributes, its `d` already shortened.
 * @param {HtmlNodeRef} node the path
 * @param {Map<string, string>} values the attribute values, by name, `d` among them
 * @returns {void}
 */
const writeSvgPathAttributes = (node, values) => {
	if (S._xmlShortenedNumbers === null) S._xmlShortenedNumbers = new Map();
	writeSvgAttributes(node, values);
	const written = svgAttributes(node).get("d");
	if (written !== undefined) {
		S._xmlShortenedNumbers.set(
			written,
			/** @type {string} */ (values.get("d"))
		);
	}
};

/**
 * Whether a renderer summing relative points in float32 reaches other points than exact sums.
 * Absolute rewrites of such data would move them.
 * @param {string} data the path data
 * @returns {boolean} true when any point differs
 */
const svgPathDrifts = (data) => {
	const exact = /** @type {(string | number)[][]} */ (
		parseSvgPathSegments(data)
	);
	const summed = /** @type {(string | number)[][]} */ (
		parseSvgPathSegments(data, true)
	);
	return exact.some((segment, index) =>
		segment.some(
			(value, at) =>
				at > 0 &&
				Math.fround(/** @type {number} */ (value)) !== summed[index][at]
		)
	);
};

/**
 * Drop the closing segments each path draws twice, where no marker, stroke dash or reference
 * measures the segments.
 * @returns {void}
 */
const closeSvgPaths = () => {
	if (svgHasMarkers()) return;
	for (let node = 1; node <= S._nodeCount; node++) {
		if (
			S._types[node] !== NodeType.Element ||
			svgLocalName(node) !== "path" ||
			!xmlElementIsStyled(node, true) ||
			S._svgIdAncestors.has(node) ||
			!svgNodeIsKept(node) ||
			svgHasNamedAncestor(node)
		) {
			continue;
		}
		const attributes = svgAttributes(node);
		const d = attributes.get("d");
		if (
			d === undefined ||
			[...attributes.keys()].some(
				(name) => name.startsWith("marker") || name === "pathLength"
			)
		) {
			continue;
		}
		const stroke = svgInheritedValue(node, "stroke");
		const pointer = svgInheritedValue(node, "pointer-events");
		const fill = svgInheritedValue(node, "fill");
		if (stroke === null || pointer === null || fill === null) continue;
		// A box paint measures the path, which a dropped move can shrink.
		if (/url\(/i.test(stroke + fill)) continue;
		const fillOnly =
			(stroke === "" || asciiLowercase(stroke.trim()) === "none") &&
			/^(?:|auto|visiblepainted|visiblefill|painted|fill|none)$/.test(
				asciiLowercase(pointer.trim())
			);
		const value = svgAttributeValue(d);
		const segments = parseSvgPathSegments(value);
		if (segments === null) continue;
		// Written absolute, the points must be the ones the renderer summed.
		if (S._svgPrecision === -1 && svgPathDrifts(value)) continue;
		const closed = closeSvgPathSegments(
			segments,
			fillOnly,
			svgBoxIsUnmeasured(node)
		);
		if (
			closed.length === segments.length &&
			closed.every((segment, index) => segment === segments[index])
		) {
			continue;
		}
		const data = writeSvgPathSegments(closed, S._svgPrecision);
		const shortened = shortenSvgPath(data);
		const original = shortenSvgPath(value);
		if (
			shortened === null ||
			(original !== null && shortened.length >= original.length)
		) {
			continue;
		}
		replaceSvgPathData(node, attributes, shortened);
	}
};

// A cubic's squared distance to a point, or to another cubic, is a polynomial of degree
// six at most; Markov's inequality bounds its second derivative by 3600 times its peak,
// so between these steps it can exceed its sampled peak by a factor of 1 / SVG_CUBIC_SLACK.
const SVG_CUBIC_STEPS = 128;
const SVG_CUBIC_SLACK = 1 - 450 / SVG_CUBIC_STEPS ** 2;

/**
 * Points on a cubic curve at `SVG_CUBIC_STEPS` even steps of its parameter, ends left out.
 * @param {number} fromX the curve's start x
 * @param {number} fromY its start y
 * @param {number[]} curve the controls and end, `x1 y1 x2 y2 x3 y3`
 * @returns {number[]} the points' x and y in turn
 */
const svgCubicSamples = (fromX, fromY, curve) => {
	const [x1, y1, x2, y2, x3, y3] = curve;
	/** @type {number[]} */
	const points = [];
	for (let step = 1; step < SVG_CUBIC_STEPS; step++) {
		const t = step / SVG_CUBIC_STEPS;
		const u = 1 - t;
		points.push(
			u * u * u * fromX +
				3 * u * u * t * x1 +
				3 * u * t * t * x2 +
				t * t * t * x3,
			u * u * u * fromY +
				3 * u * u * t * y1 +
				3 * u * t * t * y2 +
				t * t * t * y3
		);
	}
	return points;
};

/**
 * A cubic curve as the quadratic it stays within an error of, as written at some places, or as it is.
 * The quadratic's control is where both of the cubic's controls point, met halfway.
 * @param {number} fromX the curve's start x
 * @param {number} fromY its start y
 * @param {(string | number)[]} segment the absolute cubic segment
 * @param {number} error how far the quadratic may stray
 * @param {(value: number) => number} round how the writer rounds a coordinate
 * @returns {(string | number)[]} a quadratic segment, or the cubic one
 */
const quadraticSvgCurve = (fromX, fromY, segment, error, round) => {
	const curve = /** @type {number[]} */ (segment.slice(1));
	const [x1, y1, x2, y2, x3, y3] = curve;
	const qx = (3 * x1 - fromX + 3 * x2 - x3) / 4;
	const qy = (3 * y1 - fromY + 3 * y2 - y3) / 4;
	// Checked as written: every point of the printed quadratic against the cubic.
	// A loose fit checks the unrounded quadratic at three points, as svgo does.
	const [sx, sy, cx, cy, ex, ey] = [fromX, fromY, qx, qy, x3, y3].map(
		S._looseSvgArcs ? Number : round
	);
	const samples = svgCubicSamples(fromX, fromY, curve);
	// The squared gap between the curves peaks below its samples over the slack.
	const limit = S._looseSvgArcs ? error : error * Math.sqrt(SVG_CUBIC_SLACK);
	for (
		let step = S._looseSvgArcs ? SVG_CUBIC_STEPS / 4 : 1;
		step < SVG_CUBIC_STEPS;
		step += S._looseSvgArcs ? SVG_CUBIC_STEPS / 4 : 1
	) {
		const t = step / SVG_CUBIC_STEPS;
		const u = 1 - t;
		const px = u * u * sx + 2 * u * t * cx + t * t * ex;
		const py = u * u * sy + 2 * u * t * cy + t * t * ey;
		if (
			Math.hypot(px - samples[2 * step - 2], py - samples[2 * step - 1]) > limit
		) {
			return segment;
		}
	}
	return ["Q", qx, qy, x3, y3];
};

/**
 * The center of the circle of a radius through two points, on the side an arc's flags pick.
 * A radius too short to span them grows to half their distance.
 * @param {number} fromX the first point's x
 * @param {number} fromY its y
 * @param {number} toX the second point's x
 * @param {number} toY its y
 * @param {number} radius the radius
 * @param {(string | number)[]} segment the arc segment, its flags at 4 and 5
 * @returns {number[]} the center's x and y, and the radius used
 */
const svgArcCenter = (fromX, fromY, toX, toY, radius, segment) => {
	const half = Math.hypot(toX - fromX, toY - fromY) / 2;
	const r = Math.max(radius, half);
	const along = Math.sqrt(Math.max(0, r * r - half * half));
	const ux = (toX - fromX) / (2 * half);
	const uy = (toY - fromY) / (2 * half);
	const side = (segment[4] === 1) === (segment[5] === 1) ? -1 : 1;
	return [
		(fromX + toX) / 2 - side * along * uy,
		(fromY + toY) / 2 + side * along * ux,
		r
	];
};

/**
 * Whether points lie within a tolerance of a circle and run along it the way a sweep turns.
 * Cubic samples at `SVG_CUBIC_STEPS` are held to less, so the curves between them stay within it.
 * @param {number} cx the center's x
 * @param {number} cy its y
 * @param {number} r the radius
 * @param {number} tolerance how far a point may lie off the circle
 * @param {number} sweep 1 for increasing angles, 0 for decreasing
 * @param {number[]} points x and y in turn, in the order the path visits them
 * @returns {boolean} true when every point does
 */
const svgPointsRunOnCircle = (cx, cy, r, tolerance, sweep, points) => {
	// WHY: an error e at a sample bounds the polynomial d^2 - r^2 by e (2r + e); over the
	// curve that grows by 1 / SVG_CUBIC_SLACK at most, and |e| (2r - |e|) stays under it.
	const limit = S._looseSvgArcs
		? tolerance
		: (SVG_CUBIC_SLACK * tolerance * (2 * r - tolerance)) / (2 * r + tolerance);
	let previous = Number.NaN;
	for (let index = 0; index < points.length; index += 2) {
		const dx = points[index] - cx;
		const dy = points[index + 1] - cy;
		if (Math.abs(Math.hypot(dx, dy) - r) > limit) return false;
		const angle = Math.atan2(dy, dx);
		if (!Number.isNaN(previous)) {
			let step = angle - previous;
			if (step > Math.PI) step -= 2 * Math.PI;
			if (step < -Math.PI) step += 2 * Math.PI;
			if ((sweep === 1 ? step : -step) < -1e-9) return false;
		}
		previous = angle;
	}
	return true;
};

/**
 * The shortest-spelled radius a small circular arc may take, its ends fixed, while its middle
 * and, for a stroke of some width, its edges at the ends move within a budget.
 * A coarser radius counts only where none coarser still fits it, so another pass keeps it.
 * @param {number} radius the arc's radius, at least half its chord
 * @param {number} chord the distance between its ends
 * @param {number} budget how far the arc may move
 * @param {number} width the stroke's width, 0 for none
 * @returns {number} the radius to write
 */
const coarseSvgArcRadius = (radius, chord, budget, width) => {
	const half = chord / 2;
	/**
	 * @param {number} from a radius
	 * @returns {number | undefined} the coarsest radius within the budget of it, if any is shorter
	 */
	const coarser = (from) => {
		const spelled = String(from).replace(/^0\./, ".").length;
		// The arcs share their ends and their side, so they part most at the middle.
		const sagitta = from - Math.sqrt(from * from - half * half);
		const turn = Math.asin(Math.min(1, half / from));
		for (let digits = 0; digits < 6; digits++) {
			const candidate = Number(from.toFixed(digits));
			if (
				!(candidate >= half) ||
				String(candidate).replace(/^0\./, ".").length >= spelled
			) {
				continue;
			}
			const moved =
				Math.abs(
					candidate - Math.sqrt(candidate * candidate - half * half) - sagitta
				) +
				width * Math.abs(Math.asin(Math.min(1, half / candidate)) - turn);
			if (moved <= budget) return candidate;
		}
		return undefined;
	};
	const coarse = coarser(radius);
	return coarse === undefined || coarser(coarse) !== undefined
		? radius
		: coarse;
};

/**
 * Replace cubic curves that stay within a precision of one circle by arcs of it, joining
 * neighbors on the same circle while their sweep stays under a turn.
 * Every arc is checked as written, its ends rounded, and stays the curves it replaced if none fits.
 * @param {(string | number)[][]} segments the absolute segments
 * @param {number} places decimal places the fit may be off by, two and a half units of
 * @param {boolean} fillOnly whether no stroke paints the path, so a flat arc may draw a line
 * @param {number} strokeWidth the stroke's width where known, else -1, so a lone flat arc may draw a line too
 * @returns {{ segments: (string | number)[][], changed: boolean }} the segments and whether any changed
 */
const fitSvgPathArcs = (segments, places, fillOnly, strokeWidth) => {
	const error = 2.5 * 10 ** -places;
	/**
	 * @param {number} value a coordinate
	 * @returns {number} it as the writer rounds it
	 */
	const round = (value) => Number(value.toFixed(places)) || 0;
	/** @type {(string | number)[][]} */
	const fitted = [];
	let changed = false;
	let x = 0;
	let y = 0;
	let startX = 0;
	let startY = 0;
	/** @type {{ cx: number, cy: number, r: number, sweep: number, angle: number, fromX: number, fromY: number, samples: number[], tolerance: number, segment: (string | number)[], index: number, sources: (string | number)[][] } | null} */
	let arc = null;
	/**
	 * Spell the open arc's radius as coarsely as its samples allow between its written ends,
	 * or put back what it replaced.
	 * @returns {void}
	 */
	const settle = () => {
		if (arc === null) return;
		const { segment, samples, tolerance, sweep, sources } = arc;
		const sourceX = arc.fromX;
		const sourceY = arc.fromY;
		// A loose fit measures against the source's ends, before rounding moves them.
		const at = S._looseSvgArcs ? Number : round;
		const fromX = at(arc.fromX);
		const fromY = at(arc.fromY);
		const toX = at(/** @type {number} */ (segment[6]));
		const toY = at(/** @type {number} */ (segment[7]));
		let kept = false;
		for (let digits = 0; digits <= places + 2 && !kept; digits++) {
			const radius = Number(arc.r.toFixed(digits));
			if (!(radius > 0) || Math.abs(radius - arc.r) > arc.r / 2) continue;
			const [cx, cy, r] = svgArcCenter(fromX, fromY, toX, toY, radius, segment);
			if (
				svgPointsRunOnCircle(cx, cy, r, tolerance, sweep, [
					fromX,
					fromY,
					...samples,
					toX,
					toY
				]) &&
				// The source ends, which rounding moved off the written ones.
				svgPointsRunOnCircle(cx, cy, r, tolerance, sweep, [sourceX, sourceY]) &&
				svgPointsRunOnCircle(cx, cy, r, tolerance, sweep, [
					/** @type {number} */ (segment[6]),
					/** @type {number} */ (segment[7])
				])
			) {
				segment[1] = segment[2] = radius;
				kept = true;
			}
		}
		// Else a loose fit writes the circle's radius at the precision unchecked, as svgo does.
		if (!kept && S._looseSvgArcs && Number(arc.r.toFixed(places)) > 0) {
			segment[1] = segment[2] = Number(arc.r.toFixed(places));
			kept = true;
		}
		if (kept) {
			changed = true;
			// A fill-only arc no rounder than its chord draws as the line a second pass would write.
			const chord = Math.hypot(toX - fromX, toY - fromY);
			if (
				fillOnly &&
				chord > 0 &&
				[fromX, fromY, ...samples, toX, toY].every(
					(value, index, points) =>
						index % 2 === 1 ||
						Math.abs(
							(toX - fromX) * (points[index + 1] - fromY) -
								(toY - fromY) * (value - fromX)
						) /
							chord <=
							error * SVG_CUBIC_SLACK
				)
			) {
				fitted[arc.index] = ["L", segment[6], segment[7]];
			}
		} else {
			fitted.splice(arc.index, 1, ...sources);
		}
		arc = null;
	};
	for (let index = 0; index < segments.length; index++) {
		const segment = segments[index];
		const letter = segment[0];
		const fromX = x;
		const fromY = y;
		if (letter === "Z") {
			x = startX;
			y = startY;
		} else {
			x = /** @type {number} */ (segment[segment.length - 2]);
			y = /** @type {number} */ (segment[segment.length - 1]);
			if (letter === "M") {
				startX = x;
				startY = y;
			}
		}
		if (
			letter === "A" &&
			segment[1] === segment[2] &&
			/** @type {number} */ (segment[1]) > 0
		) {
			settle();
			const [cx, cy, r] = svgArcCenter(
				fromX,
				fromY,
				x,
				y,
				/** @type {number} */ (segment[1]),
				segment
			);
			const start = Math.atan2(fromY - cy, fromX - cx);
			let turn = Math.atan2(y - cy, x - cx) - start;
			if (segment[5] === 1 && turn < 0) turn += 2 * Math.PI;
			if (segment[5] === 0 && turn > 0) turn -= 2 * Math.PI;
			/** @type {number[]} */
			const samples = [];
			const chord = Math.hypot(x - fromX, y - fromY);
			// WHY: a stroke's edges and caps turn with the arc, by at most half its turn at
			// the ends, so they move by up to the width times that; an arc alone in its
			// subpath has no join for the turn to reshape, and may flatten within the rest.
			const next = segments[index + 1];
			const lone =
				strokeWidth >= 0 &&
				fitted.length > 0 &&
				fitted[fitted.length - 1][0] === "M" &&
				(next === undefined || next[0] === "M");
			const budget = fillOnly
				? error
				: lone
					? error - (strokeWidth * Math.abs(turn)) / 2
					: -1;
			let flat = budget >= 0 && chord > 0;
			for (let step = 1; step < 16; step++) {
				const px = cx + r * Math.cos(start + (step / 16) * turn);
				const py = cy + r * Math.sin(start + (step / 16) * turn);
				samples.push(px, py);
				flat =
					flat &&
					Math.abs((x - fromX) * (py - fromY) - (y - fromY) * (px - fromX)) /
						chord <=
						budget;
			}
			if (flat) {
				changed = true;
				fitted.push(["L", x, y]);
				continue;
			}
			const radius =
				segment[4] === 0 && (fillOnly || lone) && chord > 0 && r === segment[1]
					? coarseSvgArcRadius(
							r,
							chord,
							Math.min(error, 0.005 * r),
							fillOnly ? 0 : strokeWidth
						)
					: segment[1];
			if (segment[3] === 0 && radius === segment[1]) {
				fitted.push(segment);
			} else {
				changed = true;
				fitted.push(["A", radius, radius, 0, segment[4], segment[5], x, y]);
			}
			continue;
		}
		if (letter !== "C") {
			settle();
			fitted.push(segment);
			continue;
		}
		const curve = /** @type {number[]} */ (segment.slice(1));
		const [x1, y1, x2, y2, x3, y3] = curve;
		const dense = svgCubicSamples(fromX, fromY, curve);
		// The middle sample, at half the parameter.
		const mx = dense[SVG_CUBIC_STEPS - 2];
		const my = dense[SVG_CUBIC_STEPS - 1];
		// A loose fit keeps svgo's quarter points alone.
		const samples = S._looseSvgArcs
			? [
					dense[SVG_CUBIC_STEPS / 2 - 2],
					dense[SVG_CUBIC_STEPS / 2 - 1],
					mx,
					my,
					dense[(SVG_CUBIC_STEPS * 3) / 2 - 2],
					dense[(SVG_CUBIC_STEPS * 3) / 2 - 1]
				]
			: dense;
		// The circle through the ends and the middle, where their chords' bisectors cross.
		const ax = mx - fromX;
		const ay = my - fromY;
		const bx = x3 - fromX;
		const by = y3 - fromY;
		const twice = 2 * (ax * by - ay * bx);
		const turn = twice > 0 ? 1 : -1;
		const sweep = turn > 0 ? 1 : 0;
		// The control polygon turns one way, so the curve is convex and cannot weave.
		const convex =
			Math.abs(twice) > 1e-12 &&
			((x1 - fromX) * (y2 - y1) - (y1 - fromY) * (x2 - x1)) * turn >= 0 &&
			((x2 - x1) * (y3 - y2) - (y2 - y1) * (x3 - x2)) * turn >= 0;
		const a2 = ax * ax + ay * ay;
		const b2 = bx * bx + by * by;
		const cx = convex ? fromX + (by * a2 - ay * b2) / twice : 0;
		const cy = convex ? fromY + (ax * b2 - bx * a2) / twice : 0;
		const r = Math.hypot(fromX - cx, fromY - cy);
		const tolerance = Math.min(error, 0.005 * r);
		const run = [fromX, fromY, ...samples, x3, y3];
		if (
			!convex ||
			!(r < 1e15) ||
			!svgPointsRunOnCircle(cx, cy, r, tolerance, sweep, run)
		) {
			settle();
			const quadratic = quadraticSvgCurve(fromX, fromY, segment, error, round);
			changed = changed || quadratic !== segment;
			fitted.push(quadratic);
			continue;
		}
		/**
		 * @param {number} ux one radius's x
		 * @param {number} uy its y
		 * @param {number} vx another radius's x
		 * @param {number} vy its y
		 * @returns {number} the angle between them, under a half turn
		 */
		const between = (ux, uy, vx, vy) =>
			Math.abs(Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy));
		// Each half turns less than a half turn, so the middle splits the sweep.
		const angle =
			between(fromX - cx, fromY - cy, mx - cx, my - cy) +
			between(mx - cx, my - cy, x3 - cx, y3 - cy);
		if (
			arc !== null &&
			arc.sweep === sweep &&
			arc.angle + angle < 2 * Math.PI - 0.01
		) {
			// The whole joined run, in order, must stay on one circle the way it turns.
			const joined = [arc.fromX, arc.fromY, ...arc.samples, ...run];
			// A short arc pins its circle loosely, so the new curve's circle may fit both instead.
			const center = svgPointsRunOnCircle(
				arc.cx,
				arc.cy,
				arc.r,
				arc.tolerance,
				sweep,
				joined
			)
				? arc
				: svgPointsRunOnCircle(cx, cy, r, tolerance, sweep, joined)
					? { cx, cy, r, tolerance }
					: null;
			if (center !== null) {
				arc.cx = center.cx;
				arc.cy = center.cy;
				arc.r = center.r;
				arc.tolerance = center.tolerance;
				arc.angle += angle;
				arc.samples.push(fromX, fromY, ...samples);
				arc.sources.push(segment);
				arc.segment[4] = arc.angle > Math.PI ? 1 : 0;
				arc.segment[6] = x3;
				arc.segment[7] = y3;
				continue;
			}
		}
		settle();
		/** @type {(string | number)[]} */
		const written = ["A", r, r, 0, angle > Math.PI ? 1 : 0, sweep, x3, y3];
		arc = {
			cx,
			cy,
			r,
			sweep,
			angle,
			fromX,
			fromY,
			samples,
			tolerance,
			segment: written,
			index: fitted.length,
			sources: [segment]
		};
		fitted.push(written);
	}
	settle();
	return { segments: fitted, changed };
};

/**
 * Whether a marker can reach a path's vertices through it or an ancestor.
 * @param {HtmlNodeRef} node the path
 * @returns {boolean} true when a marker property or a style that may set one is on the way
 */
const svgMarkerReaches = (node) => {
	for (
		let current = node;
		S._types[current] === NodeType.Element;
		current = S._parents[current]
	) {
		for (const [name, index] of svgAttributes(current)) {
			if (
				name.startsWith("marker") ||
				(name === "style" && /marker|\\/i.test(svgAttributeValue(index)))
			) {
				return true;
			}
		}
	}
	return false;
};

/**
 * Write each path's cubic curves that fit a circle within the precision as arcs, where shorter.
 * Off where a `marker` element exists, since joined arcs leave out the vertices between them.
 * @returns {void}
 */
const convertSvgCurvesToArcs = () => {
	if (svgHasMarkers()) return;
	const places = S._svgPrecision === -1 ? 3 : S._svgPrecision;
	for (let node = 1; node <= S._nodeCount; node++) {
		if (
			S._types[node] !== NodeType.Element ||
			svgLocalName(node) !== "path" ||
			!xmlElementIsStyled(node, true) ||
			!svgNodeIsKept(node) ||
			svgMarkerReaches(node)
		) {
			continue;
		}
		const attributes = svgAttributes(node);
		const d = attributes.get("d");
		if (d === undefined) continue;
		// The source spelling, before rounding moved its points.
		const value = xmlAttributeValue(d);
		const segments = parseSvgPathSegments(value);
		if (
			segments === null ||
			!segments.some((one) => one[0] === "C" || one[0] === "A")
		) {
			continue;
		}
		const stroke = svgInheritedValue(node, "stroke");
		const width = svgInheritedValue(node, "stroke-width");
		const written = width === null ? "" : width.trim().replace(/px$/, "");
		// A non-scaling stroke's width is in other units than the path, and a box paint
		// or effect can measure the bulge a flat arc loses.
		const strokeWidth =
			width === null ||
			stroke === null ||
			!svgPlainPaint(stroke) ||
			attributes.has("vector-effect") ||
			!svgBoxIsUnmeasured(node)
				? -1
				: written === ""
					? 1
					: /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(written)
						? Number(written)
						: -1;
		const fitted = fitSvgPathArcs(
			segments,
			places,
			stroke !== null && (stroke.trim() === "" || stroke.trim() === "none"),
			strokeWidth
		);
		if (!fitted.changed || !svgBakedPathKeepsArcs(fitted.segments, places)) {
			continue;
		}
		const precision = S._svgPrecision;
		S._svgPrecision = places;
		/** @type {string | null} */
		let shortened;
		/** @type {string | null} */
		let original;
		try {
			shortened = shortenSvgPath(writeSvgPathSegments(fitted.segments, places));
			original = shortenSvgPath(value);
		} finally {
			S._svgPrecision = precision;
		}
		if (
			shortened === null ||
			(original !== null && shortened.length >= original.length)
		) {
			continue;
		}
		replaceSvgPathData(node, attributes, shortened);
	}
};

/**
 * Whether a paint is a plain color, `none` or initial, which no user space lays out.
 * @param {string} value the inherited paint, `""` for the initial one
 * @returns {boolean} true when it is
 */
const svgPlainPaint = (value) => {
	const text = value.trim();
	return (
		text === "" ||
		/^(?:none|currentcolor|transparent)$/i.test(text) ||
		isSvgColor(text)
	);
};

/**
 * Whether baked segments write as the same drawing: every point finite, and every arc
 * keeping a nonzero radius and an end apart from its start once rounded.
 * @param {(string | number)[][]} segments the mapped absolute segments
 * @param {number} places decimal places they are written at
 * @returns {boolean} true when they do
 */
const svgBakedPathKeepsArcs = (segments, places) => {
	/**
	 * @param {string | number} value a number
	 * @returns {number} it rounded as the writer rounds it
	 */
	const round = (value) =>
		Number(/** @type {number} */ (value).toFixed(places));
	let x = 0;
	let y = 0;
	let startX = 0;
	let startY = 0;
	for (const segment of segments) {
		if (
			segment.some(
				(value, index) =>
					index > 0 && !Number.isFinite(/** @type {number} */ (value))
			)
		) {
			return false;
		}
		if (segment[0] === "Z") {
			x = startX;
			y = startY;
			continue;
		}
		const endX = round(segment[segment.length - 2]);
		const endY = round(segment[segment.length - 1]);
		if (
			segment[0] === "A" &&
			(round(segment[1]) === 0 ||
				round(segment[2]) === 0 ||
				(endX === x && endY === y))
		) {
			return false;
		}
		x = endX;
		y = endY;
		if (segment[0] === "M") {
			startX = x;
			startY = y;
		}
	}
	return true;
};

/**
 * Bake each plain path's `transform` into its points, scaling a stroke the transform scaled.
 * Rounded to the precision, so it is lossy; a marker, clip, mask, filter or `url()` paint keeps the transform.
 * @returns {void}
 */
const applySvgPathTransforms = () => {
	const places = S._svgPrecision === -1 ? 3 : S._svgPrecision;
	if (svgHasMarkers()) return;
	for (let node = 1; node <= S._nodeCount; node++) {
		if (
			S._types[node] !== NodeType.Element ||
			svgLocalName(node) !== "path" ||
			S._firstChildren[node] !== 0 ||
			!xmlElementIsStyled(node, true) ||
			!svgNodeIsKept(node) ||
			svgHasNamedAncestor(node)
		) {
			continue;
		}
		const attributes = svgAttributes(node);
		const transform = attributes.get("transform");
		const d = attributes.get("d");
		if (
			transform === undefined ||
			d === undefined ||
			[...attributes].some(
				([name, index]) =>
					name === "style" ||
					name === "clip-path" ||
					name === "mask" ||
					name === "filter" ||
					name === "transform-origin" ||
					name === "transform-box" ||
					name === "pathLength" ||
					// Only a plain value is known not to lean on the parent's.
					(name === "vector-effect" &&
						!/^(?:none|non-scaling-stroke)$/.test(
							svgAttributeValue(index).trim()
						)) ||
					name.startsWith("marker") ||
					name.includes(":") ||
					svgAttributeValue(index).includes("url(")
			) ||
			shortenSvgTransform(svgAttributeValue(transform)) === null
		) {
			continue;
		}
		const fill = svgInheritedValue(node, "fill");
		const stroke = svgInheritedValue(node, "stroke");
		// A paint server lays out in the path's user space, which the transform sets;
		// a value spelled otherwise, an escape or a variable, may be one.
		if (
			fill === null ||
			stroke === null ||
			!svgPlainPaint(fill) ||
			!svgPlainPaint(stroke)
		) {
			continue;
		}
		const matrix = composeSvgTransform(svgAttributeValue(transform));
		// The source spelling, before rounding moved its points.
		const segments = parseSvgPathSegments(xmlAttributeValue(d));
		if (
			matrix === null ||
			segments === null ||
			// A singular transform draws nothing, which baked points would.
			!(Math.abs(matrix[0] * matrix[3] - matrix[1] * matrix[2]) > 1e-12)
		) {
			continue;
		}
		const mapped = transformSvgPathSegments(segments, matrix);
		if (!svgBakedPathKeepsArcs(mapped, places)) continue;
		const [a, b, c, dd] = matrix;
		const scale = Math.sqrt(Math.abs(a * dd - b * c));
		const uniform =
			Math.abs(Math.hypot(a, b) - Math.hypot(c, dd)) < 1e-9 &&
			Math.abs(a * c + b * dd) < 1e-9;
		/** @type {Map<string, string>} */
		const values = new Map();
		for (const [name, index] of attributes) {
			if (name !== "transform") values.set(name, svgAttributeValue(index));
		}
		const effect = attributes.get("vector-effect");
		const nonScaling =
			effect !== undefined &&
			svgAttributeValue(effect).trim() === "non-scaling-stroke";
		if (stroke !== "" && stroke.trim() !== "none" && !nonScaling) {
			if (!uniform) continue;
			// A stroke the transform widened is widened in the attributes instead.
			let scaled = true;
			for (const [name, initial] of [
				["stroke-width", "1"],
				["stroke-dasharray", ""],
				["stroke-dashoffset", ""]
			]) {
				const inherited = svgInheritedValue(node, name);
				if (inherited === null) {
					scaled = false;
					break;
				}
				const written = inherited === "" ? initial : inherited.trim();
				if (written === "" || written === "none") continue;
				const numbers = written.split(/[\t\n\r ,]+/);
				if (
					numbers.some(
						(one) =>
							!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?(?:px)?$/.test(
								one
							)
					)
				) {
					scaled = false;
					break;
				}
				const widened = numbers.map(
					(one) => Number(one.replace(/px$/, "")) * scale
				);
				// An overflowed width has no attribute spelling.
				if (!widened.every(Number.isFinite)) {
					scaled = false;
					break;
				}
				values.set(
					name,
					widened
						.map((one) =>
							shortenSvgNumber(
								roundSvgDecimal(String(Number(one.toFixed(places))), places)
							)
						)
						.join(" ")
				);
			}
			if (!scaled) continue;
		}
		const data = writeSvgPathSegments(mapped, places);
		const precision = S._svgPrecision;
		S._svgPrecision = places;
		// Written at these places, rounding keeps every point, and the arc check above
		// keeps each arc's ends apart, so the data always shortens.
		const shortened = /** @type {string} */ (shortenSvgPath(data));
		S._svgPrecision = precision;
		values.set("d", shortened);
		writeSvgPathAttributes(node, values);
	}
};

/**
 * Remove unnamed paths whose bounds, stroke included, lie wholly outside the root `viewBox`.
 * A path under a transform, filter, marker or style keeps its place, since its painted area is unknown.
 * @returns {void}
 */
const removeOffCanvasSvgPaths = () => {
	// The optional removals ran first, so the set exists.
	const removedNodes = /** @type {Set<HtmlNodeRef>} */ (S._xmlRemovedNodes);
	let root = 0;
	for (let node = 1; node <= S._nodeCount; node++) {
		if (
			S._types[node] === NodeType.Element &&
			S._types[S._parents[node]] === NodeType.Document
		) {
			root = node;
			break;
		}
	}
	if (root === 0 || svgLocalName(root) !== "svg") return;
	const rootAttributes = svgAttributes(root);
	const viewBox = rootAttributes.get("viewBox");
	const box =
		viewBox === undefined
			? null
			: shortenSvgNumericValue(svgAttributeValue(viewBox), "viewBox");
	if (
		box === null ||
		rootAttributes.has("overflow") ||
		rootAttributes.has("style") ||
		rootAttributes.has("transform") ||
		rootAttributes.has("filter")
	) {
		return;
	}
	const [left, top, width, height] = box.split(" ").map(Number);
	if (!(width > 0 && height > 0)) return;
	let removed = false;
	for (let node = 1; node <= S._nodeCount; node++) {
		if (
			S._types[node] !== NodeType.Element ||
			removedNodes.has(node) ||
			svgLocalName(node) !== "path" ||
			!xmlElementIsStyled(node, true) ||
			S._svgIdAncestors.has(node)
		) {
			continue;
		}
		const attributes = svgAttributes(node);
		const d = attributes.get("d");
		if (d === undefined || attributes.has("style")) continue;
		let stroke = "none";
		let strokeWidth = "1";
		let miterLimit = "4";
		let seen = 0;
		let plain = true;
		for (let element = node; element !== root; element = S._parents[element]) {
			if (
				S._types[element] !== NodeType.Element ||
				(element !== node && svgLocalName(element) !== "g")
			) {
				plain = false;
				break;
			}
			const own = element === node ? attributes : svgAttributes(element);
			for (const [name, index] of own) {
				if (
					name === "transform" ||
					name === "filter" ||
					name === "style" ||
					name.startsWith("marker")
				) {
					plain = false;
				}
				const value = svgAttributeValue(index);
				if (name === "stroke" && (seen & 1) === 0) {
					stroke = value;
					seen |= 1;
				} else if (name === "stroke-width" && (seen & 2) === 0) {
					strokeWidth = value;
					seen |= 2;
				} else if (name === "stroke-miterlimit" && (seen & 4) === 0) {
					miterLimit = value;
					seen |= 4;
				}
			}
			if (!plain) break;
		}
		if (!plain || rootAttributes.has("stroke-width")) continue;
		const bounds = svgPathBounds(svgAttributeValue(d));
		if (bounds === null) continue;
		// A miter reaches its limit times half the width; a square cap stays within that.
		const pad =
			stroke.trim() === "none"
				? 0
				: (Number(strokeWidth) / 2) * Math.max(Number(miterLimit), Math.SQRT2);
		if (!(pad >= 0)) continue;
		if (
			bounds[2] + pad < left ||
			bounds[0] - pad > left + width ||
			bounds[3] + pad < top ||
			bounds[1] - pad > top + height
		) {
			removedNodes.add(node);
			removed = true;
		}
	}
	if (removed) spliceRemovedXmlNodes();
};

/**
 * Hoist identical context-free values shared by every graphics child of an unnamed group.
 * @returns {void}
 */
const hoistSvgGroupAttributes = () => {
	for (let node = S._nodeCount; node > 0; node--) {
		if (
			S._types[node] !== NodeType.Element ||
			(S._xmlRemovedNodes !== null && S._xmlRemovedNodes.has(node)) ||
			svgLocalName(node) !== "g" ||
			S._svgIdAncestors.has(node) ||
			!xmlElementIsStyled(node, true)
		) {
			continue;
		}
		const attributes = svgAttributes(node);
		// A style outranks the attributes written here; other group attributes inherit nothing.
		if (
			[...attributes].some(
				([name, index]) =>
					name === "style" ||
					(SVG_INHERITED_CLEANUP_ATTRIBUTES.has(name) &&
						!svgContextFreePresentation(name, svgAttributeValue(index), true))
			)
		) {
			continue;
		}
		/** @type {Map<string, number>[]} */
		const children = [];
		/** @type {HtmlNodeRef[]} */
		const childNodes = [];
		let transformable = true;
		for (
			let child = S._firstChildren[node];
			child !== 0;
			child = S._nextSiblings[child]
		) {
			if (
				S._types[child] !== NodeType.Element ||
				!xmlElementIsStyled(child, true) ||
				// An unknown element draws nothing, so what it inherits shows nowhere.
				(!SVG_GROUP_ATTRIBUTE_TARGETS.has(svgLocalName(child)) &&
					!svgElementIsUnknown(child))
			) {
				children.length = 0;
				break;
			}
			const childAttributes = svgAttributes(child);
			if (childAttributes.has("style")) {
				children.length = 0;
				break;
			}
			if (
				!SVG_TRANSFORM_FOLD_TARGETS.has(svgLocalName(child)) ||
				childAttributes.has("transform-origin") ||
				childAttributes.has("transform-box")
			) {
				transformable = false;
			}
			children.push(childAttributes);
			childNodes.push(child);
		}
		if (children.length < 2) continue;
		const values = new Map(
			[...attributes].map(([name, index]) => [name, svgAttributeValue(index)])
		);
		let changed = false;
		for (const [name, index] of children[0]) {
			const value = svgAttributeValue(index);
			if (
				!SVG_INHERITED_CLEANUP_ATTRIBUTES.has(name) ||
				// Every child sets the color, so only the group's own reads would see it:
				// a `drop-shadow()` filter's default color and its text decorations.
				(name === "color"
					? !isSvgColor(value) ||
						attributes.has("filter") ||
						attributes.has("text-decoration")
					: !svgContextFreePresentation(name, value, true)) ||
				// A filter's `FillPaint` and `StrokePaint` read the group's own paint.
				(attributes.has("filter") && (name === "fill" || name === "stroke")) ||
				children.some((child) => {
					const attribute = child.get(name);
					return (
						attribute === undefined || svgAttributeValue(attribute) !== value
					);
				})
			) {
				continue;
			}
			values.set(name, value);
			for (const child of children) {
				/** @type {Set<number>} */ (S._xmlRemovedAttributes).add(
					/** @type {number} */ (child.get(name))
				);
			}
			changed = true;
		}
		const shared = children[0].get("transform");
		const transform = attributes.get("transform");
		// Clips, masks and filters on the group would live in the moved user space.
		if (
			transformable &&
			shared !== undefined &&
			[...attributes.keys()].every(
				(name) =>
					name === "transform" ||
					name === "opacity" ||
					SVG_INHERITED_CLEANUP_ATTRIBUTES.has(name)
			) &&
			children.every((child) => {
				const own = child.get("transform");
				return (
					own !== undefined &&
					svgAttributeValue(own) === svgAttributeValue(shared)
				);
			}) &&
			shortenSvgTransform(svgAttributeValue(shared)) !== null &&
			svgNumbersParse(svgAttributeValue(shared)) &&
			(transform === undefined ||
				(shortenSvgTransform(svgAttributeValue(transform)) !== null &&
					svgNumbersParse(svgAttributeValue(transform)))) &&
			// A descendant's `transform: inherit` reads the transform this would move.
			childNodes.every((child) => !svgSubtreeReads(child, "transform"))
		) {
			const joined =
				transform === undefined
					? svgAttributeValue(shared)
					: `${svgAttributeValue(transform)} ${svgAttributeValue(shared)}`;
			values.set(
				"transform",
				(S._shortenSvgTransformFunctions &&
					shortenSvgNumericValue(joined, "transform")) ||
					joined
			);
			for (const child of children) {
				/** @type {Set<number>} */ (S._xmlRemovedAttributes).add(
					/** @type {number} */ (child.get("transform"))
				);
			}
			changed = true;
		}
		if (changed) writeSvgAttributes(node, values);
	}
};

/**
 * Move inherited presentation attributes to a group's sole graphics child.
 * @returns {void}
 */
const moveSvgGroupAttributes = () => {
	const removedNodes = /** @type {Set<HtmlNodeRef>} */ (S._xmlRemovedNodes);
	const removedAttributes = /** @type {Set<number>} */ (
		S._xmlRemovedAttributes
	);
	for (let node = S._nodeCount; node > 0; node--) {
		if (
			S._types[node] !== NodeType.Element ||
			removedNodes.has(node) ||
			svgLocalName(node) !== "g" ||
			S._svgIdAncestors.has(node) ||
			!xmlElementIsStyled(node, true)
		) {
			continue;
		}
		if (
			!SVG_WHITESPACE_CONTAINERS.has(svgLocalName(S._parents[node])) ||
			// A clip path ignores the group, but not the child it would become.
			svgLocalName(S._parents[node]) === "clipPath" ||
			!xmlElementIsStyled(S._parents[node], true) ||
			isSvgSwitchLink(S._parents[node])
		) {
			continue;
		}
		const child = S._firstChildren[node];
		if (
			child === 0 ||
			S._nextSiblings[child] !== 0 ||
			S._types[child] !== NodeType.Element ||
			!xmlElementIsStyled(child, true) ||
			!SVG_GROUP_ATTRIBUTE_TARGETS.has(svgLocalName(child))
		) {
			continue;
		}
		const attributes = svgAttributes(node);
		if (
			[...attributes].some(
				([name, index]) =>
					!SVG_INHERITED_CLEANUP_ATTRIBUTES.has(name) ||
					!svgContextFreePresentation(name, svgAttributeValue(index), true)
			)
		) {
			continue;
		}
		const children = svgAttributes(child);
		if (
			[...attributes.keys()].some(
				(name) =>
					children.has(name) &&
					!svgContextFreePresentation(
						name,
						svgAttributeValue(/** @type {number} */ (children.get(name)))
					)
			)
		) {
			continue;
		}
		if (
			children.has("style") ||
			[...children].some(
				([name, index]) =>
					SVG_INHERITED_CLEANUP_ATTRIBUTES.has(name) &&
					/(?:^|[^a-z-])(?:inherit|unset|revert|var)(?:$|[^a-z-])/.test(
						svgAttributeValue(index)
					)
			)
		) {
			continue;
		}
		for (const [name, index] of attributes) {
			if (!children.has(name)) children.set(name, index);
		}
		const start = S._attrCount + 1;
		for (const [name, original] of children) {
			const value = svgAttributeValue(original);
			const index = makeAttr(name, value, 0, 0, -1, -1);
			writeSvgAttribute(index, value);
			if (
				S._xmlColorAttributes !== null &&
				S._xmlColorAttributes.has(original)
			) {
				S._xmlColorAttributes.add(index);
			}
		}
		S._attrStarts[child] = start;
		S._attrCounts[child] = children.size;
		for (const index of attributes.values()) removedAttributes.add(index);
		unwrapSvgGroup(node);
	}
};

/**
 * Recognize a defs wrapper whose children do not render outside that wrapper.
 * @param {HtmlNodeRef} node the wrapper
 * @returns {boolean} whether all children are definitions or insignificant content
 */
const hasOnlySvgDefinitions = (node) => {
	let hasDefinition = false;
	for (
		let child = S._firstChildren[node];
		child !== 0;
		child = S._nextSiblings[child]
	) {
		const type = S._types[child];
		if (type === NodeType.Comment) continue;
		if (type === NodeType.Text && /^[\t\n\r ]*$/.test(dataOf(child))) continue;
		if (type !== NodeType.Element || !xmlElementIsStyled(child, true)) {
			return false;
		}
		const name = svgLocalName(child);
		if (
			name !== "defs" &&
			name !== "filter" &&
			!SVG_DEFINITION_ELEMENTS.has(name)
		) {
			return false;
		}
		hasDefinition = true;
	}
	return hasDefinition;
};

/**
 * Drop the declarations of prefixes that only removed content used.
 * Namespace pruning runs before the passes that remove more, so they call this after.
 * @param {Set<string>} prefixes prefixes the removed content wrote
 * @returns {void}
 */
const pruneRemovedSvgPrefixes = (prefixes) => {
	const removedNodes = /** @type {Set<HtmlNodeRef>} */ (S._xmlRemovedNodes);
	const removedAttributes = /** @type {Set<number>} */ (
		S._xmlRemovedAttributes
	);
	if (!S._removeUnusedSvgNamespaces || prefixes.size === 0) return;
	/** @type {number[]} */
	const declarations = [];
	for (let node = 1; node <= S._nodeCount && prefixes.size !== 0; node++) {
		let removed = false;
		for (let current = node; current !== 0; current = S._parents[current]) {
			if (removedNodes.has(current)) removed = true;
		}
		if (removed) continue;
		if (S._types[node] !== NodeType.Element) {
			for (const prefix of prefixes) {
				if (dataOf(node).includes(`${prefix}:`)) prefixes.delete(prefix);
			}
			continue;
		}
		for (const prefix of prefixes) {
			if (tagNameOf(node).startsWith(`${prefix}:`)) prefixes.delete(prefix);
		}
		for (const [name, index] of svgAttributes(node)) {
			if (name.startsWith("xmlns:")) {
				declarations.push(index);
				continue;
			}
			for (const prefix of prefixes) {
				if (
					name.startsWith(`${prefix}:`) ||
					xmlAttributeValue(index).includes(`${prefix}:`)
				) {
					prefixes.delete(prefix);
				}
			}
		}
	}
	for (const index of declarations) {
		if (prefixes.has(S._attrNames[index].slice(6))) {
			removedAttributes.add(index);
		}
	}
};

/**
 * Read the color a gradient's sole stop paints, declining opacity and context.
 * @param {HtmlNodeRef} stop the stop element
 * @returns {string | null} its stop color, or null when not a plain color
 */
const svgSolidStopColor = (stop) => {
	let color = "#000";
	let opacity = "1";
	for (const [name, index] of svgAttributes(stop)) {
		const value = trimSvgValue(xmlAttributeValue(index));
		if (name === "stop-color") color = value;
		else if (name === "stop-opacity") opacity = value;
		else if (name !== "offset" && name !== "style") return null;
	}
	const style = svgAttributes(stop).get("style");
	if (style !== undefined) {
		for (const part of xmlAttributeValue(style)
			.replace(/;\s*$/, "")
			.split(";")) {
			const match = /^\s*(stop-color|stop-opacity)\s*:\s*([^:;!]+?)\s*$/.exec(
				part
			);
			if (match === null) return null;
			if (match[1] === "stop-color") color = match[2];
			else opacity = match[2];
		}
	}
	return opacity === "1" && isSvgColor(color) ? color : null;
};

/**
 * Paint with the color of each gradient whose single stop makes it solid.
 * Objects without area paint no fill, so only strokes need user-space units.
 * @returns {void}
 */
const convertSvgOneStopGradients = () => {
	const removedNodes = /** @type {Set<HtmlNodeRef>} */ (S._xmlRemovedNodes);
	/** @type {Map<string, { node: HtmlNodeRef, color: string, stroke: boolean | undefined, source: string }>} */
	const gradients = new Map();
	for (let node = 1; node <= S._nodeCount; node++) {
		const name = S._types[node] === NodeType.Element ? svgLocalName(node) : "";
		if (
			(name !== "linearGradient" && name !== "radialGradient") ||
			removedNodes.has(node) ||
			!xmlElementIsStyled(node, true)
		) {
			continue;
		}
		const attributes = svgAttributes(node);
		const id = attributes.get("id");
		if (id === undefined || attributes.has("xml:id")) continue;
		const href = attributes.get("href") || attributes.get("xlink:href");
		if (attributes.has("href") && attributes.has("xlink:href")) continue;
		let stop = 0;
		let other = false;
		for (
			let child = S._firstChildren[node];
			child !== 0;
			child = S._nextSiblings[child]
		) {
			const type = S._types[child];
			if (type === NodeType.Comment) continue;
			if (type === NodeType.Text && /^[\t\n\r ]*$/.test(dataOf(child))) {
				continue;
			}
			if (
				stop !== 0 ||
				type !== NodeType.Element ||
				tagNameOf(child) !== "stop" ||
				S._firstChildren[child] !== 0 ||
				!xmlElementIsStyled(child, true)
			) {
				other = true;
				break;
			}
			stop = child;
		}
		// A singular transform paints nothing; an inheriting gradient takes its source's.
		if (
			other ||
			(stop === 0) === (href === undefined) ||
			attributes.has("gradientTransform")
		) {
			continue;
		}
		const color = stop === 0 ? "" : svgSolidStopColor(stop);
		if (color === null) continue;
		const units = attributes.get("gradientUnits");
		gradients.set(xmlAttributeValue(id), {
			node,
			color,
			stroke:
				units === undefined
					? undefined
					: trimSvgValue(xmlAttributeValue(units)) === "userSpaceOnUse",
			source: href === undefined ? "" : xmlAttributeValue(href)
		});
	}
	// A stopless gradient inherits the stops and units of the one it names.
	for (const [id, gradient] of gradients) {
		if (gradient.source === "") continue;
		const source = gradients.get(gradient.source.slice(1));
		if (
			gradient.source.charAt(0) !== "#" ||
			source === undefined ||
			source.source !== ""
		) {
			gradients.delete(id);
			continue;
		}
		gradient.color = source.color;
		if (gradient.stroke === undefined) gradient.stroke = source.stroke;
	}
	if (gradients.size === 0) return;
	/**
	 * @param {string} name attribute name
	 * @param {string} value attribute value
	 * @returns {string} the value with every convertible reference painted
	 */
	const rewrite = (name, value) => {
		if (name === "fill" || name === "stroke") {
			const match = /^\s*url\(\s*(["']?)#([^\s"'()]+)\1\s*\)\s*$/.exec(value);
			const id = match === null ? null : svgFragmentId(match[2]);
			const gradient = id === null ? undefined : gradients.get(id);
			return gradient !== undefined && (name === "fill" || gradient.stroke)
				? gradient.color
				: value;
		}
		if (name !== "style") return value;
		return value.replace(
			/(^|;)(\s*(fill|stroke)\s*:\s*)url\(\s*(["']?)#([^\s"'()]+)\4\s*\)(?=\s*(?:;|$))/g,
			/**
			 * @param {string} match the whole declaration
			 * @param {string} before the separator before it
			 * @param {string} property the property and its colon
			 * @param {string} kind `fill` or `stroke`
			 * @param {string} quote the quote around the fragment, if any
			 * @param {string} fragment the fragment
			 * @returns {string} the declaration, painted where its gradient is solid
			 */
			(match, before, property, kind, quote, fragment) => {
				const id = svgFragmentId(fragment);
				const gradient = id === null ? undefined : gradients.get(id);
				return gradient !== undefined && (kind === "fill" || gradient.stroke)
					? `${before}${property}${gradient.color}`
					: match;
			}
		);
	};
	/**
	 * Chromium rasterizes filtered solid paint unlike the same gradient paint.
	 * @param {HtmlNodeRef} node the painted element
	 * @returns {boolean} whether it or an ancestor applies a filter
	 */
	const filtered = (node) => {
		for (let current = node; current !== 0; current = S._parents[current]) {
			if (S._types[current] !== NodeType.Element) continue;
			const attributes = svgAttributes(current);
			const style = attributes.get("style");
			if (
				attributes.has("filter") ||
				(style !== undefined &&
					asciiLowercase(xmlAttributeValue(style)).includes("filter"))
			) {
				return true;
			}
		}
		return false;
	};
	const reference = /#([^\s"'()#;,]+)/g;
	/** @type {Map<HtmlNodeRef, [string, string]>} */
	const inheriting = new Map();
	for (const [id, gradient] of gradients) {
		if (gradient.source !== "") {
			inheriting.set(gradient.node, [id, gradient.source.slice(1)]);
		}
	}
	for (let pass = 0; pass < 2; pass++) {
		for (let node = 1; node <= S._nodeCount; node++) {
			if (S._types[node] !== NodeType.Element) continue;
			const start = S._attrStarts[node];
			for (let i = start; i < start + S._attrCounts[node]; i++) {
				const value = xmlAttributeValue(i);
				if (!value.includes("#")) continue;
				const name = S._attrNames[i];
				if (
					pass === 0 &&
					(name === "href" || name === "xlink:href") &&
					inheriting.has(node)
				) {
					continue;
				}
				const rewritten = filtered(node) ? value : rewrite(name, value);
				if (pass === 0) {
					// Any other spelling of a reference keeps its gradient.
					reference.lastIndex = 0;
					let match;
					while ((match = reference.exec(rewritten)) !== null) {
						const id = svgFragmentId(match[1]);
						if (id === null) return;
						gradients.delete(id);
					}
				} else if (rewritten !== value) {
					writeSvgAttribute(i, rewritten);
					if (S._attrNames[i] !== "style") {
						if (S._shortenSvgColors) {
							if (S._xmlColorAttributes === null) {
								S._xmlColorAttributes = new Set();
							}
							S._xmlColorAttributes.add(i);
						}
					} else if (
						S._xmlRenderedStyles !== null &&
						S._xmlRenderedStyles.has(i)
					) {
						S._xmlRenderedStyles.set(i, minifyStyleAttribute(rewritten));
					}
				}
			}
		}
		if (pass === 0) {
			// A kept gradient still reads the stops of the one it names.
			for (const [id, source] of inheriting.values()) {
				if (!gradients.has(id)) gradients.delete(source);
			}
		}
	}
	/** @type {Set<string>} */
	const prefixes = new Set();
	for (const gradient of gradients.values()) {
		removedNodes.add(gradient.node);
		for (const name of svgAttributes(gradient.node).keys()) {
			if (name.includes(":") && !name.startsWith("xml")) {
				prefixes.add(name.slice(0, name.indexOf(":")));
			}
		}
	}
	pruneRemovedSvgPrefixes(prefixes);
};

/**
 * Drop stroke details from a leaf shape no stroke reaches, and fill details under `fill="none"`.
 * Without an ID on the way up, no use can lend it paint; `stroke` stays for path reuse
 * and stroke widths still size markers, which circles, ellipses and rectangles never take.
 * @param {HtmlNodeRef} node the shape
 * @param {Map<string, number>} attributes its live attributes, updated in place
 * @returns {void}
 */
const dropUnpaintedSvgDetails = (node, attributes) => {
	if (
		!SVG_GROUP_ATTRIBUTE_TARGETS.has(svgLocalName(node)) ||
		S._firstChildren[node] !== 0
	) {
		return;
	}
	let stroked = false;
	let strokedAbove = false;
	let pointerEvents = false;
	for (let current = node; current !== 0; current = S._parents[current]) {
		if (S._types[current] !== NodeType.Element) continue;
		const own = current === node ? attributes : svgAttributes(current);
		const stroke = own.get("stroke");
		const style = own.get("style");
		if (
			own.has("id") ||
			own.has("xml:id") ||
			(style !== undefined && /stroke|pointer/i.test(xmlAttributeValue(style)))
		) {
			return;
		}
		if (
			stroke !== undefined &&
			trimSvgValue(xmlAttributeValue(stroke)) !== "none"
		) {
			stroked = true;
			if (current !== node) strokedAbove = true;
		}
		if (own.has("pointer-events")) pointerEvents = true;
	}
	const width = attributes.get("stroke-width");
	const localName = svgLocalName(node);
	const unmarked =
		localName === "circle" || localName === "ellipse" || localName === "rect";
	if (
		stroked &&
		!pointerEvents &&
		width !== undefined &&
		unmarked &&
		/^(?:0+(?:\.0*)?|\.0+)(?:px|%)?$/.test(
			trimSvgValue(xmlAttributeValue(width))
		)
	) {
		// A zero width paints and hit-tests no stroke, and these shapes take no markers.
		/** @type {Map<string, string>} */
		const values = new Map();
		for (const [name, index] of attributes) {
			if (name === "stroke" || name.startsWith("stroke-")) {
				/** @type {Set<number>} */ (S._xmlRemovedAttributes).add(index);
			} else {
				values.set(name, svgAttributeValue(index));
			}
		}
		if (strokedAbove) {
			values.set("stroke", "none");
			writeSvgAttributes(node, values);
		}
		attributes.clear();
		for (const [name, index] of svgAttributes(node)) {
			attributes.set(name, index);
		}
		stroked = false;
	}
	const fill = attributes.get("fill");
	const unfilled =
		fill !== undefined &&
		!pointerEvents &&
		trimSvgValue(xmlAttributeValue(fill)) === "none";
	for (const [name, index] of attributes) {
		if (
			// Hit-testing a stroke reads its caps, joins and dashes, painted or not.
			(!stroked &&
				!pointerEvents &&
				(unmarked || name !== "stroke-width") &&
				name.startsWith("stroke-")) ||
			(unfilled && (name === "fill-rule" || name === "fill-opacity"))
		) {
			/** @type {Set<number>} */ (S._xmlRemovedAttributes).add(index);
			attributes.delete(name);
		}
	}
};

/**
 * Recheck every shape once moved group paint can leave its own details unpainted.
 * @returns {void}
 */
const dropUnpaintedSvgShapeDetails = () => {
	const removedNodes = /** @type {Set<HtmlNodeRef>} */ (S._xmlRemovedNodes);
	for (let node = 1; node <= S._nodeCount; node++) {
		if (
			S._types[node] === NodeType.Element &&
			!removedNodes.has(node) &&
			xmlElementIsStyled(node, true)
		) {
			dropUnpaintedSvgDetails(node, svgAttributes(node));
		}
	}
};

/**
 * Drop inherited presentation values that restate the initial value no ancestor overrides.
 * Without an ID on the way up, no use can lend the element another value.
 * @returns {void}
 */
const dropInitialSvgValues = () => {
	const removedNodes = /** @type {Set<HtmlNodeRef>} */ (S._xmlRemovedNodes);
	const removedAttributes = /** @type {Set<number>} */ (
		S._xmlRemovedAttributes
	);
	for (let node = 1; node <= S._nodeCount; node++) {
		if (
			S._types[node] !== NodeType.Element ||
			removedNodes.has(node) ||
			!xmlElementIsStyled(node, true)
		) {
			continue;
		}
		const attributes = svgAttributes(node);
		/** @type {[string, number][]} */
		const initial = [];
		for (const [name, index] of attributes) {
			const values = SVG_INHERITED_INITIAL_VALUES[name];
			if (
				values !== undefined &&
				` ${values} `.includes(` ${trimSvgValue(svgAttributeValue(index))} `)
			) {
				initial.push([name, index]);
			}
		}
		if (initial.length === 0) continue;
		let lent = false;
		for (
			let current = node;
			S._types[current] === NodeType.Element && !lent;
			current = S._parents[current]
		) {
			const own = svgAttributes(current);
			const style = own.get("style");
			// The family's shorthand, such as `font` or `marker`, sets it too.
			lent =
				own.has("id") ||
				own.has("xml:id") ||
				(style !== undefined &&
					initial.some(([name]) =>
						asciiLowercase(xmlAttributeValue(style)).includes(
							name.split("-")[0]
						)
					)) ||
				(current !== node &&
					initial.some(
						([name]) => own.has(name) || own.has(name.split("-")[0])
					));
		}
		if (lent) continue;
		for (const [, index] of initial) removedAttributes.add(index);
	}
};

/**
 * Find a descendant that could read a non-inherited value through `inherit`.
 * @param {HtmlNodeRef} node the ancestor
 * @param {string} name the presentation attribute
 * @returns {boolean} whether a descendant writes `inherit` or may style that property
 */
const svgSubtreeReads = (node, name) => {
	const pending = [S._firstChildren[node]];
	while (pending.length !== 0) {
		for (
			let child = /** @type {number} */ (pending.pop());
			child !== 0;
			child = S._nextSiblings[child]
		) {
			if (S._types[child] !== NodeType.Element) continue;
			const attributes = svgAttributes(child);
			const value = attributes.get(name);
			const style = attributes.get("style");
			const text =
				style === undefined ? "" : asciiLowercase(xmlAttributeValue(style));
			// `all` sets every property, and an escape can spell any name.
			if (
				(value !== undefined &&
					/inherit|unset|revert/i.test(xmlAttributeValue(value))) ||
				text.includes(name) ||
				text.includes("all") ||
				text.includes("\\")
			) {
				return true;
			}
			pending.push(S._firstChildren[child]);
		}
	}
	return false;
};

/**
 * Move a group's transform onto its only child, before the child's own.
 * The child's user space, where its clip, mask and filter live, stays the same.
 * @param {HtmlNodeRef} node the group, whose only attribute is the transform
 * @param {number} transform the group's transform attribute
 * @returns {void}
 */
const foldSvgGroupTransform = (node, transform) => {
	const removedNodes = /** @type {Set<HtmlNodeRef>} */ (S._xmlRemovedNodes);
	let child = 0;
	for (
		let current = S._firstChildren[node];
		current !== 0;
		current = S._nextSiblings[current]
	) {
		const type = S._types[current];
		if (type === NodeType.Comment || removedNodes.has(current)) continue;
		if (type === NodeType.Text && /^[\t\n\r ]*$/.test(dataOf(current))) {
			continue;
		}
		if (child !== 0 || type !== NodeType.Element) return;
		child = current;
	}
	if (
		child === 0 ||
		!SVG_TRANSFORM_FOLD_TARGETS.has(svgLocalName(child)) ||
		!xmlElementIsStyled(child, true)
	) {
		return;
	}
	const attributes = svgAttributes(child);
	const style = attributes.get("style");
	// An origin or box would apply to the group's part of the transform too.
	if (
		attributes.has("transform-origin") ||
		attributes.has("transform-box") ||
		(style !== undefined &&
			asciiLowercase(xmlAttributeValue(style)).includes("transform"))
	) {
		return;
	}
	const own = attributes.get("transform");
	// A number Blink refuses would drop the joined list, the other half included.
	if (
		!svgNumbersParse(svgAttributeValue(transform)) ||
		(own !== undefined && !svgNumbersParse(svgAttributeValue(own)))
	) {
		return;
	}
	const joined =
		own === undefined
			? svgAttributeValue(transform)
			: `${svgAttributeValue(transform)} ${svgAttributeValue(own)}`;
	// Shortened as one list, as the next pass would, so adjacent functions merge.
	const value =
		(S._shortenSvgTransformFunctions &&
			shortenSvgNumericValue(joined, "transform")) ||
		joined;
	/** @type {Map<string, string>} */
	const values = new Map();
	for (const [name, index] of attributes) {
		values.set(name, name === "transform" ? value : svgAttributeValue(index));
	}
	if (own === undefined) values.set("transform", value);
	writeSvgAttributes(child, values);
	/** @type {Set<number>} */ (S._xmlRemovedAttributes).add(transform);
};

/**
 * Remove unobservable wrappers and exactly redundant presentation spelling.
 * @param {boolean=} keepGroups defer group removal until shared values have been hoisted
 * @returns {void}
 */
const cleanupSvgStructure = (keepGroups = false) => {
	if (S._xmlRemovedNodes === null) S._xmlRemovedNodes = new Set();
	if (S._xmlRemovedAttributes === null) S._xmlRemovedAttributes = new Set();
	/** @type {boolean | undefined} */
	let hasFilter;
	/** @type {Set<string>} */
	const unwrapped = new Set();
	for (let node = 1; node <= S._nodeCount; node++) {
		if (
			S._types[node] !== NodeType.Element ||
			S._xmlRemovedNodes.has(node) ||
			!xmlElementIsStyled(node, true)
		) {
			continue;
		}
		const parent = S._parents[node];
		const parentName = tagNameOf(parent);
		const name = tagNameOf(node);
		const localName = name.slice(name.indexOf(":") + 1);
		const parentLocalName = parentName.slice(parentName.indexOf(":") + 1);
		const background = svgAttributes(node).get("enable-background");
		const backgroundStyle = svgAttributes(node).get("style");
		if (
			(background !== undefined ||
				(backgroundStyle !== undefined &&
					/enable-background/i.test(xmlAttributeValue(backgroundStyle)))) &&
			hasFilter === undefined
		) {
			hasFilter = false;
			for (let other = 1; other <= S._nodeCount; other++) {
				if (
					S._types[other] === NodeType.Element &&
					svgLocalName(other) === "filter"
				) {
					hasFilter = true;
					break;
				}
			}
		}
		if (
			backgroundStyle !== undefined &&
			hasFilter === false &&
			/enable-background/i.test(xmlAttributeValue(backgroundStyle))
		) {
			const declarations = xmlAttributeValue(backgroundStyle)
				.split(";")
				.filter(
					(declaration) =>
						!/^[\t\n\r ]*enable-background[\t\n\r ]*:[^!]*$/i.test(declaration)
				)
				.join(";")
				.replace(/^[\t\n\r ;]+|[\t\n\r ;]+$/g, "");
			if (declarations === "") {
				S._xmlRemovedAttributes.add(backgroundStyle);
			} else {
				writeSvgAttribute(backgroundStyle, declarations);
				if (S._xmlRenderedStyles !== null) {
					S._xmlRenderedStyles.set(
						backgroundStyle,
						minifyStyleAttribute(declarations)
					);
				}
			}
		}
		if (background !== undefined) {
			const attributes = svgAttributes(node);
			const width = attributes.get("width");
			const height = attributes.get("height");
			const match = /^new\s+0\s+0\s+(\S+)\s+(\S+)$/.exec(
				trimSvgValue(xmlAttributeValue(background))
			);
			const viewBox = attributes.get("viewBox");
			// The size, or on an `svg` without one the `viewBox` it came from.
			const whole =
				match !== null &&
				(width !== undefined && height !== undefined
					? match[1] === trimSvgValue(xmlAttributeValue(width)) &&
						match[2] === trimSvgValue(xmlAttributeValue(height))
					: localName === "svg" &&
						width === undefined &&
						height === undefined &&
						viewBox !== undefined &&
						trimSvgValue(xmlAttributeValue(viewBox))
							.split(/[\t\n\r ,]+/)
							.map(Number)
							.join(" ") === `0 0 ${Number(match[1])} ${Number(match[2])}`);
			// Only filters' BackgroundImage reads it, and no browser implements that.
			if (!hasFilter || (whole && localName === "svg")) {
				S._xmlRemovedAttributes.add(background);
			} else if (whole && (localName === "mask" || localName === "pattern")) {
				writeSvgAttribute(background, "new");
			}
		}
		if (
			S._types[parent] !== NodeType.Document &&
			(!SVG_WHITESPACE_CONTAINERS.has(parentLocalName) ||
				!xmlElementIsStyled(parent, true) ||
				isSvgSwitchLink(parent))
		) {
			continue;
		}
		// A paint server, mask, marker or symbol without an ID never renders.
		if (
			(parentLocalName === "defs" || SVG_DEFINITION_ELEMENTS.has(localName)) &&
			isUnusedSvgDefinition(node)
		) {
			S._xmlRemovedNodes.add(node);
			continue;
		}
		let attributes = svgAttributes(node);
		const style = attributes.get("style");
		if (style !== undefined) {
			let declarations = svgPresentationStyle(xmlAttributeValue(style));
			let rest = "";
			let length = xmlAttributeValue(style).length;
			if (declarations === null) {
				const split = splitSvgPresentationStyle(xmlAttributeValue(style));
				if (split !== null) {
					declarations = split.moved;
					rest = split.rest;
					length = split.length;
				}
			}
			let saving = 9 + length - (rest === "" ? 0 : rest.length + 9);
			if (declarations !== null) {
				for (const [name, value] of declarations) {
					saving -= name.length + value.length + 4;
					const existing = attributes.get(name);
					if (existing !== undefined) {
						saving += name.length + svgAttributeValue(existing).length + 4;
					}
				}
			}
			if (declarations !== null && saving > 0) {
				const values = new Map(
					[...attributes]
						.filter(([name]) => name !== "style")
						.map(([name, index]) => [name, svgAttributeValue(index)])
				);
				for (const [name, value] of declarations) values.set(name, value);
				if (rest !== "") values.set("style", rest);
				writeSvgAttributes(node, values);
				attributes = svgAttributes(node);
			}
		}
		// A use clone inherits from the use, so only inherited values need no IDs.
		for (const name of (SVG_SHAPE_ZERO_ATTRIBUTES[localName] || "").split(
			" "
		)) {
			const attribute = attributes.get(name);
			if (
				attribute !== undefined &&
				svgAttributeValue(attribute).charAt(0) !== "-" &&
				SVG_ZERO_NUMBER.test(svgAttributeValue(attribute))
			) {
				S._xmlRemovedAttributes.add(attribute);
				attributes.delete(name);
			}
		}
		if (localName === "rect" && !attributes.has("style")) {
			const rx = attributes.get("rx");
			const ry = attributes.get("ry");
			if (rx !== undefined && ry !== undefined) {
				const x = shortenSvgNumericValue(svgAttributeValue(rx), "number");
				const y = shortenSvgNumericValue(svgAttributeValue(ry), "number");
				if (
					x !== null &&
					x === y &&
					/^(?:[0-9]+|[0-9]*\.[0-9]+)$/.test(x) &&
					Number(x) > 0 &&
					Number(x) <= 1000000
				) {
					// An omitted ry takes rx before each axis clamps to its own size.
					S._xmlRemovedAttributes.add(ry);
					attributes.delete("ry");
				}
			}
		}
		for (const [name, attribute] of attributes) {
			const value = svgAttributeValue(attribute);
			if (
				SVG_LOCAL_DEFAULTS[name] === value ||
				(name === "preserveAspectRatio" &&
					value === "xMidYMid meet" &&
					SVG_ASPECT_RATIO_ELEMENTS.has(localName)) ||
				// Browsers render every SVG version alike.
				(name === "version" && localName === "svg") ||
				// SVG 2 dropped `viewTarget`, which no browser read.
				(name === "viewTarget" && localName === "view") ||
				// An inherited property inherits without saying so.
				(SVG_INHERITED_CLEANUP_ATTRIBUTES.has(name) &&
					asciiLowercase(trimSvgValue(value)) === "inherit") ||
				(localName === "g" &&
					SVG_GROUP_INERT_ATTRIBUTES.has(name) &&
					!svgSubtreeReads(node, name))
			) {
				S._xmlRemovedAttributes.add(attribute);
				attributes.delete(name);
			} else if (
				!S._svgIdAncestors.has(node) &&
				SVG_INHERITED_CLEANUP_ATTRIBUTES.has(name) &&
				svgContextFreePresentation(name, value) &&
				(parentLocalName === "g" ||
					parentLocalName === "svg" ||
					parentLocalName === "symbol")
			) {
				const inherited = svgAttributes(parent).get(name);
				if (
					inherited !== undefined &&
					value === svgAttributeValue(inherited) &&
					!svgAttributes(parent).has("style")
				) {
					S._xmlRemovedAttributes.add(attribute);
					attributes.delete(name);
				}
			}
		}
		dropUnpaintedSvgDetails(node, attributes);
		if (S._shortenSvgTransformFunctions) {
			dropIdentitySvgTransforms(node, localName, attributes);
		}
		if (
			(localName === "text" || localName === "tspan") &&
			attributes.size === 0 &&
			S._firstChildren[node] === 0
		) {
			S._xmlRemovedNodes.add(node);
		}
		if (
			!keepGroups &&
			localName === "defs" &&
			attributes.size === 0 &&
			hasOnlySvgDefinitions(node)
		) {
			unwrapSvgGroup(node);
			continue;
		}
		// A clip path ignores the groups and links inside it, but not their children.
		if (parentLocalName === "clipPath") continue;
		const transform = attributes.get("transform");
		if (
			!keepGroups &&
			localName === "g" &&
			transform !== undefined &&
			attributes.size === 1 &&
			!S._svgIdAncestors.has(node)
		) {
			foldSvgGroupTransform(node, transform);
			attributes = svgAttributes(node);
		}
		// A link without an address is a group too, unless links nest, which hides
		// the inner one, or a switch above makes it one.
		if (
			keepGroups ||
			(localName !== "g" && localName !== "a") ||
			attributes.size !== 0 ||
			(localName === "a" &&
				(hasSvgAncestor(node, "a") ||
					hasSvgAncestor(node, "switch") ||
					svgSubtreeHas(node, "a")))
		) {
			continue;
		}
		if (name !== localName) unwrapped.add(name.slice(0, name.indexOf(":")));
		unwrapSvgGroup(node);
	}
	pruneRemovedSvgPrefixes(unwrapped);
	spliceRemovedXmlNodes();
};

/**
 * Sort runs of symbol definitions without changing IDs, drawing order or references.
 * @param {Map<HtmlNodeRef, string>} keys symbol IDs
 * @returns {void}
 */
const sortSvgSymbols = (keys) => {
	if (keys.size < 2) return;
	for (let node = 1; node <= S._nodeCount; node++) {
		if (S._xmlRemovedNodes !== null && S._xmlRemovedNodes.has(node)) continue;
		if (S._types[node] !== NodeType.Element) continue;
		const name = tagNameOf(node);
		const localName = name.slice(name.indexOf(":") + 1);
		if (
			(localName !== "svg" && localName !== "defs") ||
			!xmlElementIsStyled(node, true)
		) {
			continue;
		}
		/** @type {HtmlNodeRef[]} */
		const children = [];
		for (
			let child = S._firstChildren[node];
			child !== 0;
			child = S._nextSiblings[child]
		) {
			children.push(child);
		}
		let changed = false;
		let position = 0;
		while (position < children.length) {
			/** @type {number[]} */
			const slots = [];
			/** @type {HtmlNodeRef[]} */
			const definitions = [];
			while (position < children.length) {
				const child = children[position];
				if (keys.has(child)) {
					slots.push(position);
					definitions.push(child);
				} else if (
					!(
						S._types[child] === NodeType.Text &&
						/^[\t\n\r ]*$/.test(dataOf(child))
					) &&
					!(
						S._types[child] === NodeType.Comment &&
						!keepComment(
							dataOf(child),
							S._input.slice(S._starts[child], S._ends[child]),
							S._starts[child]
						)
					)
				) {
					break;
				}
				position++;
			}
			definitions.sort((left, right) => {
				const leftId = /** @type {string} */ (keys.get(left));
				const rightId = /** @type {string} */ (keys.get(right));
				return leftId < rightId ? -1 : 1;
			});
			for (let i = 0; i < definitions.length; i++) {
				if (children[slots[i]] !== definitions[i]) changed = true;
				children[slots[i]] = definitions[i];
			}
			position++;
		}
		if (!changed) continue;
		S._firstChildren[node] = children[0];
		S._lastChildren[node] = children[children.length - 1];
		for (let i = 0; i < children.length; i++) {
			S._nextSiblings[children[i]] =
				i + 1 < children.length ? children[i + 1] : 0;
		}
	}
};

/**
 * Write a square-cornered rectangle as the path its outline runs, from its top left clockwise,
 * where shorter. Only exact eighths, whose sums every engine reads exactly, are added.
 * @param {HtmlNodeRef} node the rectangle
 * @param {string} prefix its tag's namespace prefix, with the colon
 * @returns {void}
 */
const convertSvgRect = (node, prefix) => {
	const attributes = svgAttributes(node);
	/** @type {Record<string, string>} */
	const values = { x: "0", y: "0" };
	for (const [name, index] of attributes) {
		if (name === "rx" || name === "ry" || name === "style" || name === "d") {
			return;
		}
		if (name !== "x" && name !== "y" && name !== "width" && name !== "height") {
			continue;
		}
		const value = shortenSvgNumericValue(svgAttributeValue(index), "number");
		if (
			value === null ||
			!/^-?(?:\d+|\d*\.(?:125|25|375|5|625|75|875))$/.test(value) ||
			Math.abs(Number(value)) > 1000000
		) {
			return;
		}
		values[name] = value;
	}
	const width = Number(values.width);
	const height = Number(values.height);
	if (!(width > 0 && height > 0)) return;
	const x = Number(values.x);
	const y = Number(values.y);
	const path = /** @type {string} */ (
		shortenSvgPath(
			`M${values.x} ${values.y}H${x + width}V${y + height}H${values.x}z`
		)
	);
	let previous = 4;
	for (const name of ["x", "y", "width", "height"]) {
		const index = attributes.get(name);
		if (index !== undefined) {
			previous += name.length + svgAttributeValue(index).length + 4;
		}
	}
	if (path.length + 9 >= previous) return;
	S._strings[node] = `${prefix}path`;
	/** @type {Map<string, string>} */
	const written = new Map([["d", path]]);
	for (const [name, index] of attributes) {
		if (name !== "x" && name !== "y" && name !== "width" && name !== "height") {
			written.set(name, svgAttributeValue(index));
		}
	}
	writeSvgPathAttributes(node, written);
};

/**
 * Convert leaf line, point-list and square-cornered rectangle shapes without changing
 * coordinates or vertices.
 * @returns {void}
 */
const convertSvgShapes = () => {
	// A path takes markers, which a rectangle never shows.
	const markers = svgHasMarkers();
	for (let node = 1; node <= S._nodeCount; node++) {
		if (
			S._types[node] !== NodeType.Element ||
			(S._xmlRemovedNodes !== null && S._xmlRemovedNodes.has(node)) ||
			S._firstChildren[node] !== 0
		) {
			continue;
		}
		const name = tagNameOf(node);
		const colon = name.indexOf(":");
		const localName = name.slice(colon + 1);
		if (
			(localName !== "ellipse" &&
				localName !== "line" &&
				localName !== "polyline" &&
				localName !== "polygon" &&
				(localName !== "rect" || markers)) ||
			!xmlElementIsStyled(node, true)
		) {
			continue;
		}
		const start = S._attrStarts[node];
		const end = start + S._attrCounts[node];
		if (localName === "ellipse") {
			// Live attributes, so a radius an earlier removal took stays gone.
			const radii = svgAttributes(node);
			const rx = radii.get("rx") || 0;
			const ry = radii.get("ry") || 0;
			if (
				rx === 0 ||
				ry === 0 ||
				findAttr(start, end - start, "r") !== 0 ||
				findAttr(start, end - start, "style") !== 0
			) {
				continue;
			}
			// An `auto` radius takes the other one (SVG 2), so the ellipse is a circle of it.
			const autoX = /^auto$/i.test(xmlAttributeValue(rx).trim());
			const autoY = /^auto$/i.test(xmlAttributeValue(ry).trim());
			const kept = autoX ? ry : rx;
			const x = shortenSvgNumericValue(xmlAttributeValue(kept), "length");
			const y =
				autoX || autoY
					? x
					: shortenSvgNumericValue(xmlAttributeValue(ry), "length");
			if (
				x === null ||
				x !== y ||
				!/^(?:[0-9]+|[0-9]*\.[0-9]+)(?:px)?$/.test(x) ||
				Number.parseFloat(x) <= 0 ||
				Number.parseFloat(x) > 1000000
			) {
				continue;
			}
			S._strings[node] = `${name.slice(0, colon + 1)}circle`;
			S._attrNames[kept] = "r";
			if (S._xmlRemovedAttributes === null) {
				S._xmlRemovedAttributes = new Set();
			}
			S._xmlRemovedAttributes.add(kept === rx ? ry : rx);
			continue;
		}
		if (localName === "rect") {
			convertSvgRect(node, name.slice(0, colon + 1));
			continue;
		}
		/** @type {number[]} */
		const attributes = [];
		const coordinates = localName === "line" ? ["0", "0", "0", "0"] : [];
		let supported = true;
		for (let i = start; i < end; i++) {
			// A coordinate cleanup already dropped as zero is the zero it omits.
			if (S._xmlRemovedAttributes !== null && S._xmlRemovedAttributes.has(i)) {
				continue;
			}
			const attribute = S._attrNames[i];
			if (attribute === "d" || attribute === "style") {
				supported = false;
				break;
			}
			const coordinate = /^[xy][12]$/.test(attribute)
				? (attribute.charAt(1) === "2" ? 2 : 0) +
					(attribute.charAt(0) === "y" ? 1 : 0)
				: -1;
			if (localName === "line" ? coordinate === -1 : attribute !== "points") {
				continue;
			}
			const value = xmlAttributeValue(i);
			const compact = shortenSvgNumericValue(
				value,
				localName === "line" ? "number" : "points"
			);
			if (compact === null) {
				supported = false;
				break;
			}
			const numbers = compact.trim().split(/[,\t\n\r ]+/);
			// Line and path bounds can round differently; lines accept exact eighths.
			if (
				numbers.some((number) => {
					const magnitude = Math.abs(Number(number));
					return (
						/[eE%a-z]/i.test(number) ||
						magnitude > 1000000 ||
						(magnitude < 0.000001 && !SVG_ZERO_NUMBER.test(number)) ||
						(localName === "line" &&
							!/^-?(?:\d+|\d*\.(?:125|25|375|5|625|75|875))$/.test(
								shortenSvgNumber(number)
							))
					);
				})
			) {
				supported = false;
				break;
			}
			attributes.push(i);
			if (localName === "line") coordinates[coordinate] = compact;
			else for (const number of numbers) coordinates.push(number);
		}
		if (!supported || attributes.length === 0 || coordinates.length < 4) {
			continue;
		}
		const path =
			localName === "line"
				? `M${coordinates[0]} ${coordinates[1]}L${coordinates[2]} ${coordinates[3]}`
				: `M${coordinates.join(" ")}${localName === "polygon" ? "z" : ""}`;
		const compact = /** @type {string} */ (shortenSvgPath(path));
		let previousLength = localName.length;
		for (const attribute of attributes) {
			previousLength +=
				S._attrNames[attribute].length +
				xmlAttributeValue(attribute).length +
				4;
		}
		if (compact.length + 9 >= previousLength) continue;
		S._strings[node] = `${name.slice(0, colon + 1)}path`;
		if (S._xmlShortenedNumbers === null) S._xmlShortenedNumbers = new Map();
		if (S._xmlRemovedAttributes === null) S._xmlRemovedAttributes = new Set();
		S._attrNames[attributes[0]] = "d";
		S._attrValues[attributes[0]] = compact;
		S._xmlShortenedNumbers.set(attributes[0], compact);
		for (let index = 1; index < attributes.length; index++) {
			S._xmlRemovedAttributes.add(attributes[index]);
		}
	}
};

/**
 * Whether an XML element is in a namespace that styles with CSS, read off the
 * `xmlns` declarations in scope for its prefix (Namespaces in XML §6.2).
 * @param {HtmlElement} node the element
 * @param {boolean=} svgOnly restrict the check to SVG elements
 * @returns {boolean} true for an SVG or XHTML element
 */
const xmlElementIsStyled = (node, svgOnly = false) => {
	const name = tagNameOf(node);
	const colon = name.indexOf(":");
	const declaration = colon === -1 ? "xmlns" : `xmlns:${name.slice(0, colon)}`;
	for (let n = node; n !== 0; n = S._parents[n]) {
		if (S._types[n] !== NodeType.Element) break;
		const start = S._attrStarts[n];
		for (let i = start; i < start + S._attrCounts[n]; i++) {
			if (S._attrNames[i] === declaration) {
				return svgOnly
					? xmlAttributeValue(i) === "http://www.w3.org/2000/svg"
					: XML_STYLED_NAMESPACES.has(xmlAttributeValue(i));
			}
		}
	}
	return false;
};

/**
 * Whether a text node is the whole CSS body of an SVG or XHTML style element.
 * @param {HtmlNodeRef} node the text node, inside an element
 * @returns {boolean} true when the text is a stylesheet to render
 */
const isXmlStylesheet = (node) => {
	if (
		S._renderEmbeddedSource === undefined &&
		S._deferEmbeddedSource === undefined &&
		S._embeddedAnswers === undefined
	) {
		return false;
	}
	const parent = S._parents[node];
	const name = tagNameOf(parent);
	if (name !== "style" && !name.endsWith(":style")) return false;
	const start = S._attrStarts[parent];
	for (let i = start; i < start + S._attrCounts[parent]; i++) {
		if (S._attrNames[i] !== "type") continue;
		const type = asciiLowercase(stripAsciiWhitespace(xmlAttributeValue(i)));
		if (type !== "" && type !== "text/css") return false;
	}
	return (
		S._firstChildren[parent] === node &&
		S._nextSiblings[node] === 0 &&
		xmlElementIsStyled(parent)
	);
};

/**
 * XML character data in its shortest well-formed spelling: as it stands where
 * nothing in it is markup, else a CDATA section, else escaped.
 * @param {string} text decoded text
 * @returns {string} the text as XML content
 */
const xmlCharacterData = (text) => {
	if (!text.includes("<") && !text.includes("&")) {
		return text.replace(/]]>/g, "]]&gt;").replace(/\r/g, "&#13;");
	}
	return text.includes("]]>") || text.includes("\r")
		? escapeXmlText(text)
		: `<![CDATA[${text}]]>`;
};

/**
 * Offer a `style` attribute of an SVG or XHTML element to the caller's renderer,
 * as the declaration list it is.
 * @param {string} value the decoded value
 * @param {boolean} dropEmpty whether an empty result omits the attribute
 * @param {string=} prepared an already rendered value
 * @returns {string | null} the attribute, its marker, or null when nothing renders it
 */
const xmlStyleAttribute = (value, dropEmpty, prepared) => {
	/**
	 * @param {string} css what to write
	 * @returns {string} it quoted
	 */
	const quote = (css) => {
		const delimiter = css.includes('"') && !css.includes("'") ? "'" : '"';
		return dropEmpty && stripAsciiWhitespace(css) === ""
			? ""
			: ` style=${delimiter}${escapeXmlAttribute(css, delimiter)}${delimiter}`;
	};
	if (prepared !== undefined) return quote(prepared);
	if (S._deferEmbeddedSource !== undefined) {
		return deferEmbedded(
			value,
			CSS_TYPE,
			(rendered) => quote(typeof rendered === "string" ? rendered : value),
			BLOCK_CONTENTS,
			S._removeUnusedSvgNamespaces
				? (rendered) => typeof rendered === "string" && rendered !== value
				: dropEmpty
					? (rendered) =>
							typeof rendered === "string" &&
							stripAsciiWhitespace(rendered) === ""
					: undefined
		);
	}
	const rendered = renderEmbeddedOrNull(value, CSS_TYPE, BLOCK_CONTENTS);
	return rendered === null ? null : quote(rendered);
};

/**
 * An attribute in its shortest quoting, the quote picked by the value it holds.
 * @param {string} name the attribute's name
 * @param {string} decoded its decoded value
 * @returns {string} the attribute with its leading space
 */
const quotedXmlAttribute = (name, decoded) => {
	let quote = S._xmlQuote;
	if (decoded.includes('"') || decoded.includes("'")) {
		const doubles = decoded.split('"').length;
		const singles = decoded.split("'").length;
		quote = doubles === singles ? S._xmlQuote : doubles > singles ? "'" : '"';
	}
	return ` ${name}=${quote}${escapeXmlAttribute(decoded, quote)}${quote}`;
};

/**
 * Offer an event handler attribute of an SVG or XHTML element to the caller's
 * renderer, as the function body it is, written back only where shorter.
 * @param {string} name the attribute's name
 * @param {string} value the decoded value
 * @returns {string | null} the attribute, its marker, or null when nothing renders it shorter
 */
const xmlEventHandlerAttribute = (name, value) => {
	const written = quotedXmlAttribute(name, value);
	/**
	 * @param {string | null | undefined} rendered what the renderer answered
	 * @returns {string | null} the answer as the attribute, where shorter
	 */
	const answer = (rendered) => {
		if (typeof rendered !== "string") return null;
		const attribute = quotedXmlAttribute(name, rendered);
		return attribute.length < written.length ? attribute : null;
	};
	if (S._deferEmbeddedSource !== undefined) {
		return deferEmbedded(
			value,
			JAVASCRIPT_TYPE,
			(rendered) => answer(rendered) || written,
			EVENT_HANDLER
		);
	}
	return answer(renderEmbeddedOrNull(value, JAVASCRIPT_TYPE, EVENT_HANDLER));
};

/**
 * An XML element's start tag: as written, or when minifying rebuilt with one
 * space between attributes and each value in its shortest well-formed spelling.
 * @param {HtmlPath} path positioned on the element
 * @param {boolean} minify whether minifying
 * @returns {string} the start tag, ending in `>` even for an empty element
 */
const xmlOpenTag = (path, minify) => {
	const node = path.node;
	if (!minify) {
		const source = openTagOf(path.node);
		// In `<a b=c/>` the `/` ends the unquoted value and closes nothing.
		return (S._flags[node] & FLAG_SELF_CLOSING) !== 0
			? `${source.slice(0, -2)}>`
			: source;
	}
	let out = `<${tagNameOf(node)}`;
	const start = S._attrStarts[node];
	const count = S._attrCounts[node];
	const order =
		S._sortAttributes && count > 1 ? sortedAttributes(path, count) : null;
	const rendering =
		S._renderEmbeddedSource !== undefined ||
		S._deferEmbeddedSource !== undefined;
	for (let index = 0; index < count; index++) {
		const i = start + (order === null ? index : order[index]);
		// A default the DTD supplies is the DTD's to keep supplying.
		if (S._attrNameStarts[i] === -1) continue;
		if (S._xmlRemovedAttributes !== null && S._xmlRemovedAttributes.has(i)) {
			continue;
		}
		let decoded =
			S._xmlShortenedNumbers !== null && S._xmlShortenedNumbers.has(i)
				? /** @type {string} */ (S._xmlShortenedNumbers.get(i))
				: xmlAttributeValue(i);
		// A DTD declaration can constrain the spelling, not only the geometry.
		const declared =
			S._xmlAttributeDeclarations === null
				? undefined
				: S._xmlAttributeDeclarations.get(tagNameOf(node));
		if (
			S._shortenSvgPathData &&
			S._attrNames[i] === "d" &&
			svgLocalName(node) === "path" &&
			xmlElementIsStyled(node, true) &&
			(declared === undefined || !declared.has("d"))
		) {
			decoded = implySvgPathLines(decoded);
		}
		if (
			rendering &&
			S._attrNames[i] === "style" &&
			decoded.trim() !== "" &&
			xmlElementIsStyled(node)
		) {
			const declarations =
				S._xmlAttributeDeclarations === null
					? undefined
					: S._xmlAttributeDeclarations.get(tagNameOf(node));
			if (declarations === undefined || !declarations.has("style")) {
				const styled = xmlStyleAttribute(
					decoded,
					S._removeEmptyAttributes && xmlElementIsStyled(node, true),
					S._xmlRenderedStyles === null
						? undefined
						: S._xmlRenderedStyles.get(i)
				);
				if (styled !== null) {
					out += styled;
					continue;
				}
			}
		}
		// Handlers every element takes, and SVG's animation events.
		const name = S._attrNames[i];
		if (
			rendering &&
			name.startsWith("on") &&
			(EVENT_HANDLER_ATTRIBUTES.get(name) === null ||
				/^on(?:begin|end|repeat)$/.test(name)) &&
			decoded.trim() !== "" &&
			xmlElementIsStyled(node) &&
			(declared === undefined || !declared.has(name))
		) {
			const handler = xmlEventHandlerAttribute(name, decoded);
			if (handler !== null) {
				out += handler;
				continue;
			}
		}
		const hasDouble = decoded.includes('"');
		const hasSingle = decoded.includes("'");
		let quote = S._xmlQuote;
		if (hasDouble || hasSingle) {
			const doubles = decoded.split('"').length;
			const singles = decoded.split("'").length;
			quote = doubles === singles ? S._xmlQuote : doubles > singles ? "'" : '"';
		}
		const value = escapeXmlAttribute(decoded, quote);
		let writtenValue = `${quote}${value}${quote}`;
		const valueStart = S._attrValueStarts[i];
		// The spelling the source quoted is kept when shorter, an entity reference
		// the DTD declares being the usual reason.
		if (
			S._attrValues[i] === null &&
			valueStart > 0 &&
			S._attrValueEnds[i] - valueStart < value.length
		) {
			const raw = S._input.slice(valueStart, S._attrValueEnds[i]);
			const written = S._input.charAt(valueStart - 1);
			if ((written === '"' || written === "'") && isXmlWellFormedText(raw)) {
				writtenValue = `${written}${raw}${written}`;
			}
		}
		const attribute = ` ${S._attrNames[i]}=${writtenValue}`;
		out +=
			S._xmlColorAttributes !== null && S._xmlColorAttributes.has(i)
				? xmlColorAttribute(S._attrNames[i], decoded, attribute)
				: attribute;
	}
	return `${out}>`;
};

// What may follow `script` in a tag name that is one (§13.2.5.28 / .31).
const SCRIPT_NAME_END_REGEXP = /^[\t\n\f\r />]$/;

/**
 * Whether a script body read to its end leaves the tokenizer double-escaped
 * (§13.2.5.20 on): `<!--` opens an escaped run, `<script` in one doubles it,
 * `</script` ends the doubling and `-->` both. A `</script>` after a double one
 * only ends the doubling, so it does not close the script.
 * @param {string} text the body
 * @returns {boolean} true when the body ends double-escaped
 */
const staysDoubleEscaped = (text) => {
	let escaped = false;
	let double = false;
	let dashes = 0;
	for (let i = 0; i < text.length; i++) {
		const c = text.charCodeAt(i);
		if (!escaped) {
			if (c === CC_LESS_THAN && text.startsWith("<!--", i)) {
				escaped = true;
				dashes = 2;
				i += 3;
			}
			continue;
		}
		if (c === CC_HYPHEN_MINUS) {
			dashes++;
			continue;
		}
		if (c === CC_GREATER_THAN && dashes >= 2) {
			escaped = false;
			double = false;
		} else if (c === CC_LESS_THAN) {
			const closing = text.charCodeAt(i + 1) === CC_SOLIDUS;
			const at = i + (closing ? 2 : 1);
			if (
				closing === double &&
				rangeAsciiCaseInsensitiveMatch(text, at, at + 6, "script") &&
				SCRIPT_NAME_END_REGEXP.test(text.charAt(at + 6))
			) {
				double = !closing;
			}
		}
		dashes = 0;
	}
	return double;
};

/**
 * Whether no end tag printed after `node` can close it: an HTML `<plaintext>`,
 * whose state the tokenizer never leaves, or a `<script>` the input ran out in
 * double-escaped.
 * @param {HtmlNodeRef} node an element
 * @returns {boolean} true when everything after its start tag is its text
 */
const textRunsToEnd = (node) => {
	if (namespaceOf(node) !== NS_HTML) return false;
	const name = tagNameOf(node);
	if (name === "plaintext") return true;
	if (name !== "script") return false;
	const text = S._firstChildren[node];
	return (
		text !== 0 &&
		S._ends[text] === S._input.length &&
		staysDoubleEscaped(S._strings[text])
	);
};

/**
 * The element `textRunsToEnd` holds for, and its ancestors: an end tag
 * printed for any of them would come after its start tag and read as text.
 * @returns {Set<HtmlNodeRef> | null} those elements, or null for none
 */
const findPlaintextHolders = () => {
	if (
		!/<plaintext/i.test(S._input) &&
		!(S._input.includes("<!--") && /<script/i.test(S._input))
	) {
		return null;
	}
	const types = S._types;
	const strings = S._strings;
	const element = NodeType.Element;
	for (let i = 1; i <= S._nodeCount; i++) {
		// The names `textRunsToEnd` can hold for, read before the call.
		const name = strings[i];
		if (
			(name === "script" || name === "plaintext") &&
			types[i] === element &&
			textRunsToEnd(i)
		) {
			// Every element the input left open closes after it too, the table a
			// fostered one was written in among them.
			const holders = new Set(S._open);
			for (let node = i; node !== 0; node = S._parents[node]) {
				holders.add(node);
				// An empty element the parser implied, a `<body>` at the end of the
				// input, prints nothing that could follow it.
				for (let n = S._nextSiblings[node]; n !== 0; n = S._nextSiblings[n]) {
					if (
						S._types[n] !== NodeType.Element ||
						hasSourceTag(n) ||
						attributeCountOf(n) !== 0 ||
						S._firstChildren[n] !== 0
					) {
						S._plaintextTrails = true;
					}
				}
			}
			return holders;
		}
	}
	return null;
};

/**
 * Whether an element's end tag would print where it re-parses as literal text:
 * the element is or holds the one `textRunsToEnd` holds for.
 * @param {HtmlNodeRef} node the element
 * @returns {boolean} true when no end tag may print for it
 */
const endTagReadsAsText = (node) =>
	S._plaintextHolders !== null && S._plaintextHolders.has(node);

/**
 * An element's end tag as the printer would emit it.
 * @param {HtmlPath} path positioned on the element
 * @param {string} name its tag name
 * @param {string} open its source open tag
 * @param {boolean} innerEmpty whether it printed no children
 * @param {boolean} minify whether minifying
 * @returns {string} the end tag, `""` when it carries nothing
 */
const elementCloseTag = (path, name, open, innerEmpty, minify) => {
	const node = path.node;
	// Everything after `<plaintext>` is text, so an emitted end tag would re-parse
	// as literal text; a foreign element the tokenizer self-closed (`<rect/>`)
	// needs none either. In HTML the `/` closes nothing.
	if (
		endTagReadsAsText(node) ||
		(innerEmpty && namespaceOf(node) !== NS_HTML && spellsSelfClosing(open)) ||
		(minify && canOmitEndTag(path, name, node))
	) {
		return "";
	}
	// `</name>` spelled by the source, falling back to the element's own name when
	// there is no source end tag to echo. Read here rather than up front: an
	// omitted end tag throws it away, and that is what minifying mostly does.
	if (minify && namespaceOf(node) === NS_HTML) {
		// The source name folds to the element's own - the common case, answered
		// off the raw range without building the source spelling to cut apart.
		if (
			rangeAsciiCaseInsensitiveMatch(
				S._input,
				startOf(node) + 1,
				nameEndOf(node),
				name
			)
		) {
			return `</${name}>`;
		}
		return `</${asciiLowercase(closeTagOf(node).slice(2, -1)).trim() || name}>`;
	}
	const sourceClose = closeTagOf(node);
	return sourceClose === "" ? `</${name}>` : sourceClose;
};

/**
 * Whether a start tag's source sets the tokenizer's self-closing flag, which
 * closes a foreign element. Its spelling cannot tell: in `<math a=/>` the `/`
 * ends an unquoted value.
 * @param {string} open the start tag as the source wrote it
 * @returns {boolean} true when the tag is self-closing
 */
const spellsSelfClosing = (open) => {
	if (!open.endsWith("/>")) return false;
	let selfClosing = false;
	tokenize(open, 0, {
		openTag: (_input, _start, end, _nameStart, _nameEnd, flag) => {
			selfClosing = flag;
			return end;
		}
	});
	return selfClosing;
};

/**
 * Whether an implied element is the `<html>` / `<body>` whose start tag is
 * written after all when what it holds would not re-parse into it. Not the
 * `<html>` a fragment parse roots its nodes in: it stands for the context
 * element, which parses its own content, and nothing re-parses into it.
 * @param {string} name the implied element's tag name
 * @returns {boolean} true for an implied shell element of the document
 */
const opensImpliedShell = (name) =>
	name === "body" || (name === "html" && S._fragment === 0);

/**
 * Whether re-parsing an implied `<html>` / `<body>`'s children without its start
 * tag would not hand them back: a start tag `inBody` ignores still closed
 * `<head>` on the way there, so a head element written after one belongs to the
 * body, and §13.2.6.4.6 gives it back to the head the modes had already left. A
 * comment goes further out still, to the element above.
 * @param {HtmlPath} path the accessor
 * @param {HtmlNodeRef} node the implied element
 * @returns {boolean} true when its start tag has to materialize
 */
const contentOpensOutside = (path, node) => {
	// What prints first, as for every other omitted tag: whitespace the collapse
	// drops leaves what follows it first.
	let first = S._firstChildren[node];
	while (first !== 0 && printsNothing(path, first)) {
		first = S._nextSiblings[first];
	}
	if (first === 0) return false;
	const type = S._types[first];
	if (type === NodeType.Comment || type === NodeType.ProcessingInstruction) {
		return true;
	}
	// A `<noscript>` the "in head" mode still reads, before an omitted `</head>`.
	return (
		type === NodeType.Element &&
		namespaceOf(first) === NS_HTML &&
		(HEAD_ELEMENTS.has(tagNameOf(first)) ||
			BODY_START_KEPT_BEFORE.has(tagNameOf(first)))
	);
};

/**
 * An element printed in pieces prints as `open + children + close`, and these are
 * those two - the printer's `Element` case, minus everything in it that can only
 * be decided once the children's text is in. They are left in `_streamOpen` /
 * `_streamClose` / `_streamImplied`; `false` for an element not of that
 * shape: a leading newline to round-trip, a self-closing tag, a `<template>`'s
 * content fragment, or a source `/>` whose end tag hangs on whether anything
 * printed inside it. `_streamImplied` names an omitted `<html>` / `<body>` whose
 * open tag still materializes if the first thing inside it turns out to be
 * whitespace.
 * @param {HtmlPath} path positioned on the element
 * @param {boolean} minify whether minifying
 * @returns {boolean} whether the element prints in pieces
 */
const streamTags = (path, minify) => {
	const tree = S;
	tree._streamImplied = "";
	if (tree._xmlMode) {
		// Composed instead when it has no children, so it can print as `<a/>`, and
		// so is a minified `<style>`, whose sheet may minify to nothing.
		if (tree._xmlVerbatim || !xmlPrintsChildren(path, minify)) return false;
		if (minify) {
			const name = tagNameOf(path.node);
			if (name === "style" || name.endsWith(":style")) return false;
		}
		tree._streamOpen = xmlOpenTag(path, minify);
		tree._streamClose = `</${tagNameOf(path.node)}>`;
		return true;
	}
	const node = path.node;
	// Composed, so the contents its printer drops never stream out.
	if (minify && isRemovedSvgMetadata(node)) return false;
	// Folded into the `<style>` before it, which already printed its text, or
	// carrying nothing at all.
	if (
		minify &&
		((tree._absorbed !== null && tree._absorbed.has(node)) ||
			isRemovableEmptyElement(path, node))
	) {
		tree._streamOpen = "";
		tree._streamClose = "";
		return true;
	}
	// What would print as its end tag is decided by the printer, as for the rest.
	if (
		(tree._flags[node] & FLAG_SELF_CLOSING) !== 0 ||
		templateContentOf(node) !== 0 ||
		endTagReadsAsText(node)
	) {
		return false;
	}
	// A fostered run that moves prints inside the table it came out of, which needs
	// both of them held rather than emitted as the walk reaches them. One printing
	// from source holds nothing: its content is a slice, so it still streams.
	if (
		tree._fosterHolders !== null &&
		tree._fosterHolders.has(node) &&
		((tree._flags[node] & FLAG_FOSTER_REGION) === 0 ||
			!(/** @type {Set<HtmlNodeRef>} */ (tree._fosterVerbatim).has(node)))
	) {
		return false;
	}

	const name = tagNameOf(node);
	if (LEADING_NEWLINE_ELEMENTS.has(name)) return false;
	if (name === "form" && formNeedsPointerReset(path)) return false;
	// An SVG subtree is offered to the renderer whole, so it has to be composed
	// rather than streamed out in pieces that never form one string.
	if (
		(tree._renderEmbeddedSource !== undefined ||
			tree._deferEmbeddedSource !== undefined) &&
		name === "svg" &&
		isSvgRoot(path)
	) {
		return false;
	}
	// Read before minifying: bailing afterwards would throw the work away and
	// leave `printer` to redo it, minifying every `style=""` on a `/>`-spelled
	// tag twice - and running a renderer twice over it.
	const source = openTagSource(path);
	if (source.endsWith("/>")) return false;
	const tag = minify && source !== "" ? minifyOpenTag(path, source) : source;
	if (minify && canOmitStartTag(path, name, node, source)) {
		tree._streamOpen = "";
		tree._streamClose = impliedCloseTag(path, name, node);
		// Held back as an implied one's is: whitespace printing first keeps it.
		if (opensImpliedShell(name)) {
			tree._streamCloseIfOpened = canOmitEndTag(path, name, node)
				? ""
				: `</${name}>`;
			tree._streamImplied = name;
		}
		return true;
	}
	if (source === "") {
		if (
			attributeCountOf(node) === 0 &&
			TRANSPARENT_IMPLIED_ELEMENTS.has(name)
		) {
			// The parser re-implies the start tag, but not the end tag the source
			// carried: without it whatever follows moves inside this element.
			tree._streamClose = impliedCloseTag(path, name, node);
			tree._streamCloseIfOpened =
				minify && canOmitEndTag(path, name, node) ? "" : `</${name}>`;
			// Leading whitespace is decided on the first piece emitted; what the modes
			// hand back out is known here, from the node itself.
			const shell = opensImpliedShell(name);
			const opensOutside = shell && contentOpensOutside(path, node);
			tree._streamOpen =
				opensOutside || impliedTableGroupStartNeeded(path, name, node)
					? `<${name}>`
					: "";
			// Printed, the start tag is one the next pass reads as written.
			if (tree._streamOpen !== "") {
				tree._streamClose = tree._streamCloseIfOpened;
			}
			tree._streamImplied = shell && !opensOutside ? name : "";
		} else {
			tree._streamOpen = synthesizeOpenTag(path);
			tree._streamClose =
				minify && canOmitEndTag(path, name, node) ? "" : `</${name}>`;
		}
		return true;
	}
	tree._streamOpen = tag;
	tree._streamClose = elementCloseTag(path, name, source, false, minify);
	return true;
};

/**
 * Whether a `<form>` needs a `</form>` in front of it: one written inside another
 * reaches the tree only because an end tag cleared the form element pointer on
 * the way - §13.2.6.4.7 ignores the start tag while the pointer is set, so
 * without it the element is dropped on re-parsing. A `<template>` between the two
 * suspends the pointer instead, and needs nothing.
 * @param {HtmlPath} path the accessor positioned on the `<form>`
 * @returns {boolean} true when the end tag has to be written first
 */
const formNeedsPointerReset = (path) => {
	// §13.2.6.5 inserts a foreign `<form>` without consulting the pointer at all.
	if (namespaceOf(path.node) !== NS_HTML) return false;
	let found = false;
	let ancestor = parentOf(path.node);
	while (ancestor !== 0 && path.type(ancestor) === NodeType.Element) {
		if (namespaceOf(ancestor) === NS_HTML && tagNameOf(ancestor) === "form") {
			found = true;
		}
		ancestor = parentOf(ancestor);
	}
	// A template's content is a fragment, not an element: reaching it means the
	// walk left a `<template>`, which suspends the pointer, whichever side of the
	// outer form it is on. A `<template>` context parses as template contents too.
	const needed =
		found &&
		(ancestor === 0 || path.type(ancestor) !== NodeType.DocumentFragment) &&
		(S._fragment === 0 || !isHtmlTemplateEl(S._fragment));
	// The end tag clears the pointer for the rest of the document too, so the
	// outer form's own end tag goes unread: the print is read back.
	if (needed) S._nestedFormPrinted = true;
	return needed;
};

/**
 * Whether printing a fostered run back inside its table hands the parser the same
 * tree: only when "in table" fosters every node of it straight back out. What it
 * keeps instead - its own content, and the start tags §13.2.6.4.9 gives a rule of
 * their own - would stay in the table, and a formatting element §13.2.4.3 rebuilt
 * has no source tag to place it with.
 * @param {HtmlPath} path the accessor
 * @param {HtmlNodeRef} node the run's root
 * @param {0 | 1} needed 1 once a start tag in it is known to end something open
 * @returns {0 | 1 | 2 | 3} 0 = stays put, 1 = replays, 2 = replays and is needed,
 * 3 = has to move but cannot replay, so the table prints from its own source
 */
const fosterRunReplays = (path, node, needed) => {
	let blocked = false;
	for (let n = node; ;) {
		if (path.type(n) === NodeType.Element) {
			const html = namespaceOf(n) === NS_HTML;
			const name = html ? tagNameOf(n) : "";
			// Only the root has to be one "in table" fosters: everything under it was
			// inserted at the same current node either way. "In table" never fosters
			// a table part or a `<form>`, so a root is neither.
			if (
				html &&
				((FORMATTING.has(name) && !hasSourceTag(n)) ||
					(n === node &&
						(name === "input"
							? isHiddenInput(path, n)
							: FOSTER_KEPT.has(name))))
			) {
				blocked = true;
			}
			if (!html) {
				const child = firstChild(n);
				if (child !== 0) {
					n = child;
					continue;
				}
			}
			// A scope rule ends the nearest match on the stack, not the parent, so
			// every element still open above it is a candidate.
			let a = html ? parentOf(n) : 0;
			while (needed === 0 && a !== 0) {
				if (
					path.type(a) === NodeType.Element &&
					namespaceOf(a) === NS_HTML &&
					startTagEnds(tagNameOf(a), name)
				) {
					needed = 1;
				}
				a = parentOf(a);
			}
		}
		const child = firstChild(n);
		if (child !== 0) {
			n = child;
			continue;
		}
		for (;;) {
			if (n === node) {
				return needed === 1 ? (blocked ? 3 : 2) : blocked ? 0 : 1;
			}
			const next = nextSibling(n);
			if (next !== 0) {
				n = next;
				break;
			}
			n = parentOf(n);
		}
	}
};

/**
 * Whether an `<input>` is the one §13.2.6.4.9 keeps rather than fosters: every
 * other one takes the "anything else" arc out of the table.
 * @param {HtmlPath} path the accessor
 * @param {HtmlNodeRef} node the `<input>`
 * @returns {boolean} true when the table would keep it
 */
/**
 * Whether a `</form>` written in front of the form about to be inserted would
 * take something with it: §13.2.6.4.7 generates implied end tags before removing
 * the form, and the source's own end tag ran with nothing of the sort open.
 * @returns {boolean} true when one is open between here and the enclosing form
 */
const formResetWouldPop = () => {
	// §13.2.6.4.7 removes the form from the stack rather than popping to it, so the
	// enclosing one is in the tree and not on the stack - the walk is up the tree.
	let popped = false;
	// Read from "in body", where the stack holds at least `<html>`; `> 0` still
	// ends the walk at the root, and on an empty stack before it starts.
	for (let n = S._open[S._open.length - 1]; n > 0; n = S._parents[n]) {
		if (S._types[n] !== NodeType.Element || namespaceOf(n) !== NS_HTML) {
			continue;
		}
		const name = tagNameOf(n);
		if (name === "form") return popped;
		if (IMPLIED.has(name)) popped = true;
	}
	return false;
};

/**
 * Whether an entry of this name sits below the marker a §13.2.4.3 scan stopped
 * at. The marker is what hides it, and the marker is there because an element
 * the source left open put it there - so the tree is a shape only that element
 * staying open reproduces.
 * @param {number} from index the scan stopped at
 * @param {string} name the tag name it was looking for
 * @returns {boolean} true when the marker is hiding one
 */
const afeNameBelowMarker = (from, name) => {
	for (let i = from - 1; i >= 0; i--) {
		const e = S._afe[i];
		if (e === AFE_MARKER) continue;
		if (namespaceOf(e) === NS_HTML && tagNameOf(e) === name) return true;
	}
	return false;
};

/**
 * Whether an `<input>` is the one §13.2.6.4.9 keeps rather than fosters: every
 * other one takes the "anything else" arc out of the table.
 * @param {HtmlPath} path the accessor
 * @param {HtmlNodeRef} node the `<input>`
 * @returns {boolean} true when the table would keep it
 */
const isHiddenInput = (path, node) => {
	for (let i = 0, n = attributeCountOf(node); i < n; i++) {
		const a = attributeAt(i, node);
		if (attrNameOf(a) === "type") {
			return asciiLowercase(attrValueOf(a)) === "hidden";
		}
	}
	return false;
};

/**
 * Whether a start tag ends an open element of `openName` through a scope check -
 * §4.13's followers, a second tag of the same name, one heading behind another,
 * and the set whose members end each other by generating implied end tags. Inside
 * a table none of them reach it, every scope stopping at the table; printed back
 * with no table between them they do.
 * @param {string} openName the open element's lowercased tag name
 * @param {string} name the start tag's lowercased name
 * @returns {boolean} true when the start tag ends it
 */
const startTagEnds = (openName, name) => {
	if (name === openName) return true;
	const ended = SCOPE_ENDED_BY.get(openName);
	if (ended !== undefined && ended !== null && ended.has(name)) return true;
	const closers = OPTIONAL_END_TAG_FOLLOWERS.get(openName);
	if (closers !== undefined && closers.has(name)) return true;
	// §4.13's tag-omission list is not §13.2.6.4.7's close-a-p list - `center` is in
	// one and not the other, and the parser's is what decides the tree.
	if (openName === "p" && BLOCK_START.has(name)) return true;
	if (HEADING.has(openName)) return HEADING.has(name);
	return IMPLIED.has(openName) && IMPLIED.has(name);
};

/**
 * Whether `table`'s fostered run prints back inside it, memoized so the holder
 * that skips the run and the table that takes it in answer this the same way.
 * Moving it is a repair, not a preference: tree order is left alone unless a
 * start tag in the run would close the holder on the way back in, and the run
 * replays out of the table it is moved into.
 * @param {HtmlPath} path the accessor
 * @param {HtmlNodeRef} table the table the run came out of
 * @returns {boolean} true when the run moves back in
 */
const fosterRunMoves = (path, table) => {
	const moves = /** @type {Map<HtmlNodeRef, boolean>} */ (S._fosterMoves);
	const cached = moves.get(table);
	if (cached !== undefined) return cached;
	moves.set(table, false);
	const run = /** @type {Map<HtmlNodeRef, HtmlNodeRef[]>} */ (
		S._fosteredRuns
	).get(table);
	if (run === undefined) return false;
	// The table has a parent: no script runs to take it out of the tree.
	let closes = false;
	let text = false;
	let blocked = false;
	for (let i = 0; i < run.length; i++) {
		const verdict = fosterRunReplays(path, run[i], 0);
		if (verdict === 0 || verdict === 3) {
			blocked = true;
			break;
		}
		if (verdict === 2) closes = true;
		if (path.type(run[i]) === NodeType.Text) text = true;
	}
	// Interleaving reads both in source order, which holds only while they do not
	// overlap: one written inside a sibling's span has no place among them.
	if (!blocked) {
		for (let i = 0; i < run.length && !blocked; i++) {
			const at = startOf(run[i]);
			for (let c = firstChild(table); c !== 0; c = nextSibling(c)) {
				if (at > startOf(c) && at < fosterRegionEnd(path, c)) {
					blocked = true;
					break;
				}
			}
		}
	}
	// A table keeps whitespace-only text and fosters the rest: moved back in beside
	// each other the two fuse, and one non-whitespace character fosters all of it.
	// That blocks the re-nesting like any other node that cannot replay.
	if (text && !blocked) {
		for (let c = firstChild(table); c !== 0; c = nextSibling(c)) {
			if (path.type(c) === NodeType.Text) {
				blocked = true;
				break;
			}
		}
	}
	// The run moves or stays whole, so one node needing to move and another unable
	// to replay is the verbatim case - worth a second look only once blocked.
	if (blocked) {
		closes = false;
		for (let i = 0; i < run.length && !closes; i++) {
			const verdict = fosterRunReplays(path, run[i], 0);
			if (verdict === 2 || verdict === 3) closes = true;
		}
	}
	if (!closes) return false;
	// Nothing re-nested reproduces this one, so it prints the source it was built
	// from and the run prints nothing: it is already inside that.
	if (blocked) {
		if (S._fosterVerbatim === null) S._fosterVerbatim = new Set();
		// The holder, not the table: an earlier run in it prints end tags that leave
		// the list of active formatting elements elsewhere before this one is read.
		const holder = parentOf(table);
		S._fosterVerbatim.add(holder);
		// Anything still open around it: the slice runs to where the source stopped,
		// so an end tag none of them was given cannot be invented after it.
		if (S._fosterOpenTail === null) S._fosterOpenTail = new Set();
		for (let a = holder; a !== 0; a = parentOf(a)) {
			S._fosterOpenTail.add(a);
			S._flags[a] |= FLAG_FOSTER_REGION;
		}
		const reach = fosterRegionEnd(path, table);
		if (reach > S._fosterSpanEnd) S._fosterSpanEnd = reach;
		moves.set(table, true);
		return true;
	}
	moves.set(table, closes);
	return closes;
};

/**
 * Decide every fostered run before the walk starts and forget the ones that stay
 * put: a holder whose run moves cannot print in pieces, and that costs its whole
 * subtree the streamed path - a price only the runs that actually move should
 * pay. With none left the walk runs exactly as it does for a document that never
 * fostered anything.
 * @param {HtmlPath} path the accessor
 * @returns {void}
 */
const settleFosteredRuns = (path) => {
	const log = /** @type {HtmlNodeRef[]} */ (S._fosteredLog);
	// Nothing is built for a document whose runs all stay put, which is most of
	// them: one pass says whether any node would be moved at all.
	let moves = false;
	for (let i = 1; i < log.length; i += 2) {
		const verdict = fosterRunReplays(path, log[i], 0);
		if (verdict === 2 || verdict === 3) {
			moves = true;
			break;
		}
	}
	if (!moves) return;
	/** @type {Map<HtmlNodeRef, HtmlNodeRef[]>} */
	const runs = new Map();
	for (let i = 0; i < log.length; i += 2) {
		const run = runs.get(log[i]);
		if (run === undefined) runs.set(log[i], [log[i + 1]]);
		else run.push(log[i + 1]);
	}
	S._fosteredRuns = runs;
	S._fosterMoves = new Map();
	/** @type {Map<HtmlNodeRef, HtmlNodeRef>} */
	const nodes = new Map();
	/** @type {Set<HtmlNodeRef>} */
	const holders = new Set();
	for (let i = 0; i < log.length; i += 2) {
		if (!fosterRunMoves(path, log[i])) continue;
		// The adoption agency can move a node after it is fostered, so the holder
		// that skips the run is read from the tree, not from where it went in.
		holders.add(parentOf(log[i + 1]));
		nodes.set(log[i + 1], log[i]);
	}
	for (const table of runs.keys()) {
		if (!fosterRunMoves(path, table)) runs.delete(table);
	}
	S._fosteredNodes = nodes;
	S._fosterHolders = holders;
};

// Stands in for what the print chooses the bytes of: a raw-text body it
// rewrites whole, or an attribute value it respells.
const DIGEST_OPAQUE = "\u0003";

/**
 * The tree as a string, for the one check the printer cannot make from the tree
 * alone: whether what it printed parses back to what it printed from. Read in
 * the form the print is licensed to leave - comments gone, a run of text
 * collapsed and joined, the elements and attributes the options drop dropped,
 * every value the printer respells standing in for itself - so an equal digest
 * says the print moved nothing, not that it changed nothing. What a repair does
 * move (a node under another parent, an attribute a bad quote swallowed)
 * reshapes the tree, and that is what parts the two.
 * @param {HtmlNodeRef} root the node whose children are read
 * @returns {string} a rendering equal for equal trees
 */
const digest = (root) => {
	/** @type {string[]} */
	const out = [];
	// A stack rather than recursion: a document nests as deeply as its source says
	// it does, and the tree this reads is the one the printer just walked.
	// The root is a document, which a parse always gives an `<html>`.
	/** @type {number[]} */
	const stack = [firstChild(root), 0];
	// A run of text siblings reads as one string: dropping the comment or the
	// empty element between two of them is what joins them in the output.
	let pendingText = "";
	let pendingDepth = 0;
	const flushText = () => {
		const text = stripAsciiWhitespace(pendingText);
		pendingText = "";
		if (text !== "") out.push(`${pendingDepth}\u0001t\u0001${text}`);
	};
	while (stack.length !== 0) {
		const depth = /** @type {number} */ (stack.pop());
		const node = /** @type {HtmlNodeRef} */ (stack.pop());
		// The sibling goes on first, so this node's own subtree drains before it.
		const next = nextSibling(node);
		if (next !== 0) stack.push(next, depth);
		const type = A.type(node);
		// Not flushed: a comment minifying drops leaves the text around it one run.
		if (type === NodeType.Comment) continue;
		if (type === NodeType.Text) {
			if (depth !== pendingDepth) flushText();
			pendingDepth = depth;
			const parent = parentOf(node);
			pendingText +=
				parent !== 0 && LITERAL_TEXT_PARENTS.has(tagNameOf(parent))
					? DIGEST_OPAQUE
					: collapseWhitespaceRuns(dataOf(node));
			continue;
		}
		if (type === NodeType.Element) {
			// Same as a comment: an element the print drops joins what surrounds it.
			if (
				isRemovableEmptyElement(A, node) ||
				(S._absorbed !== null && S._absorbed.has(node))
			) {
				continue;
			}
			flushText();
			const elementName = tagNameOf(node);
			const html = namespaceOf(node) === NS_HTML;
			out.push(`${depth}\u0001e\u0001${namespaceOf(node)}\u0001${elementName}`);
			// Per element, as in `minifyOpenTag`: every attribute of one tag gets the
			// same answer out of these tables.
			const markers =
				html && S._removeRedundantAttributes !== "none"
					? REDUNDANT_TYPE_ATTRIBUTES[elementName]
					: undefined;
			const defaults =
				html && S._removeRedundantAttributes === "all"
					? REDUNDANT_DEFAULT_ATTRIBUTES[elementName]
					: undefined;
			/** @type {string[]} */
			const attributes = [];
			for (const a of attributeList(node)) {
				if (
					html &&
					(((markers !== undefined || defaults !== undefined) &&
						isRedundantAttribute(
							markers,
							defaults,
							elementName,
							a.name,
							a.value
						)) ||
						isRemovableEmptyAttribute(elementName, a.name, a.value))
				) {
					continue;
				}
				const name = a.serializedName || a.name;
				// A handler joins the two the printer rewrites wholesale: a renderer's
				// answer is other text for the same behavior, so comparing it says nothing.
				if (
					REWRITABLE_ATTRIBUTES.has(a.name) ||
					a.name === "srcdoc" ||
					isEventHandlerAttribute(elementName, a.name)
				) {
					attributes.push(`${name}=${DIGEST_OPAQUE}`);
					continue;
				}
				// The value as the DOM holds it, since another quote and another escape
				// spell the same attribute, with a boolean named by itself as the bare
				// presence the printer writes back.
				attributes.push(
					`${name}=${
						html &&
						a.value.length === a.name.length &&
						isBooleanAttribute(elementName, a.name) &&
						asciiLowercase(a.value) === a.name
							? ""
							: decodeEntities(a.value, true)
					}`
				);
			}
			attributes.sort();
			out.push(attributes.join("\u0002"));
			const content = templateContentOf(node);
			const inner = content !== 0 ? firstChild(content) : firstChild(node);
			if (inner !== 0) stack.push(inner, depth + 1);
			continue;
		}
		flushText();
		out.push(`${depth}\u0001${type}\u0001${dataOf(node)}`);
	}
	flushText();
	return out.join("\n");
};

/**
 * Whether this element still owes an end tag once its content printed from
 * source: one the source never wrote is not the printer's to invent, and one it
 * did write is already inside the slice when the span ran past it.
 * @param {HtmlPath} path the accessor positioned on the element
 * @returns {boolean} true when the end tag still has to be printed
 */
const endTagOutsideSpan = (path) =>
	endTagStart(path.node) !== -1 && endOf(path.node) > S._fosterSpanEnd;

/**
 * The source an element's content was built from. Nothing re-nested reproduces a
 * run that lands here, and the source did - anchored on the element itself, so no
 * child of it can start earlier and none is left out.
 * @param {HtmlPath} path the accessor
 * @param {HtmlNodeRef} node the element printing from source
 * @returns {string} its raw content
 */
const fosterSourceRegion = (path, node) => {
	let end = contentStartOf(node);
	// A fragment, or an element the parser implied, has no opening tag to start
	// from - its content begins wherever the first thing in it was written.
	let from = -1;
	for (let c = firstChild(node); c !== 0; c = nextSibling(c)) {
		const reach = fosterRegionEnd(path, c);
		if (reach > end) end = reach;
		// Offset 0 is a real position for the first node in the source; a node the
		// parser made has no range at all, which is both offsets at zero.
		const at = startOf(c);
		if ((at !== 0 || endOf(c) !== 0) && (from === -1 || at < from)) {
			from = at;
		}
	}
	// The table is one of its children, so `from` is set, and no later than `end`.
	return path.source(from, end);
};

/**
 * The last source offset the table's own tokens reach. Its recorded end stops at
 * the start tag when the source never closed it, and the fostered nodes were
 * written inside it, so the whole subtree and the run answer together.
 * @param {HtmlPath} path the accessor
 * @param {HtmlNodeRef} table the table printing from source
 * @returns {number} end offset
 */
const fosterRegionEnd = (path, table) => {
	let end = endOf(table);
	const run = /** @type {Map<HtmlNodeRef, HtmlNodeRef[]>} */ (
		S._fosteredRuns
	).get(table);
	const roots = run === undefined ? [table] : [table, ...run];
	if (path.type(table) !== NodeType.Element) return end;
	for (const root of roots) {
		for (let n = root; ;) {
			if (endOf(n) > end) end = endOf(n);
			const child = firstChild(n);
			if (child !== 0) {
				n = child;
				continue;
			}
			for (;;) {
				if (n === root) break;
				const next = nextSibling(n);
				if (next !== 0) {
					n = next;
					break;
				}
				n = parentOf(n);
			}
			if (n === root) break;
		}
	}
	return end;
};

// === Walk ===
// Walk state lives on the tree (`S`), so the walk helpers keep one function
// identity across parses and the streaming path can drive them mid-parse.
/** @type {CompiledVisitorMap} the between-parses value, so no map is retained */
const EMPTY_VISITORS = [];

// WHY: an iterative depth-first walk over the link columns - `firstChild` and
// `nextSibling` descend, `parent` ascends - so arbitrarily deep markup cannot
// overflow the call stack, where the old recursive walk died at ~10U+2075 nesting. A
// `<template>`'s content fragment is visited before the element's children, and
// ascending out of it continues with those: the fragment is never in a sibling
// chain, so its `_nextSiblings` is 0.

/**
 * Fire a node's `enter` visitors; true when the walk may descend.
 * @param {HtmlNodeRef} node node
 * @returns {boolean} false when a visitor called `skipChildren()`
 */
const enterNode = (node) => {
	const tree = S;
	// A holder printing from source composes out of the tree, not out of its
	// children's text, so printing them would only be thrown away.
	if (
		(tree._flags[node] & FLAG_FOSTER_REGION) !== 0 &&
		/** @type {Set<HtmlNodeRef>} */ (tree._fosterVerbatim).has(node)
	) {
		return false;
	}
	const b = tree._walkVisitors[tree._types[node]];
	if (b === undefined || b.enter.length === 0) return true;
	tree._walkSkipped = false;
	tree._walkNode = node;
	const e = b.enter;
	for (let i = 0; i < e.length; i++) e[i](visitorPath);
	const skip = tree._walkSkipped;
	tree._walkSkipped = false;
	if (tree._walkStopped && tree._writer === undefined) throw WALK_STOPPED;
	return !skip;
};

/**
 * Emit one piece of a node printed in pieces. The omitted openers held back above
 * it decide first: an omitted `<html>` / `<body>` materializes exactly when the
 * first thing inside it is whitespace, which the parser would otherwise drop on
 * the way back in. Only the innermost can - once it does, everything outside it
 * starts with a `<`.
 * @param {string} text output text
 */
const emitPiece = (text) => {
	const tree = S;
	if (text === "") return;
	const w = /** @type {PrintContext} */ (tree._writer);
	const held = tree._printPendingNames.length;
	if (held !== 0) {
		const c = text.charCodeAt(0);
		if (c === 0x09 || c === 0x0a || c === 0x0c || c === 0x0d || c === 0x20) {
			w.setPending(held - 1, `<${tree._printPendingNames[held - 1]}>`);
			tree._materializedPendingSlot = held - 1;
		}
		tree._printPendingNames.length = 0;
		w.flushPending();
	}
	if (tree._markedCharsets.length !== 0 && text.includes("\u0000")) {
		emitMarked(w, text);
	} else {
		w.emitStreamed(text);
	}
	if (tree._heldCharsets !== null) documentDeclaresUtf8();
};

// What `minifyOpenTag` writes where a held tag's rewrites differ, naming the
// pair in `_markedCharsets`; a deferred write's marker has a `:` in it.
// eslint-disable-next-line no-control-regex
const CHARSET_MARK_REGEXP = /\u0000charset([\da-f]+:)?(\d+)\u0000/g;

/**
 * The next of `minifyOpenTag`'s marks in a text, from `CHARSET_MARK_REGEXP`'s
 * `lastIndex` on: one a NUL the source carried spells lacks this run's infix,
 * and is read past from its next character, where a real one may start.
 * @param {string} text the text to read
 * @returns {RegExpExecArray | null} the mark, its id in group 2, or null
 */
const nextCharsetMark = (text) => {
	const infix = S._charsetMarkInfix;
	let match = CHARSET_MARK_REGEXP.exec(text);
	while (match !== null && (match[1] === undefined ? "" : match[1]) !== infix) {
		CHARSET_MARK_REGEXP.lastIndex = match.index + 1;
		match = CHARSET_MARK_REGEXP.exec(text);
	}
	return match;
};

/**
 * A text holding `minifyOpenTag`'s marks with each one spelled as its tag
 * prints dropped or kept.
 * @param {string} text the text to read
 * @param {0 | 1} kept 1 for the kept spelling
 * @returns {string} the text without marks
 */
const expandCharsetMarks = (text, kept) => {
	const marks = S._markedCharsets;
	CHARSET_MARK_REGEXP.lastIndex = 0;
	let out = "";
	let last = 0;
	for (
		let match = nextCharsetMark(text);
		match !== null;
		match = nextCharsetMark(text)
	) {
		out += text.slice(last, match.index) + marks[Number(match[2]) + kept];
		last = CHARSET_MARK_REGEXP.lastIndex;
	}
	return out + text.slice(last);
};

/**
 * Emit a piece holding `minifyOpenTag`'s marks: the span from the first to the
 * last goes out as one piece of its own, dropped, for `settleUtf8` to write back.
 * @param {PrintContext} w the print context
 * @param {string} text output text
 */
const emitMarked = (w, text) => {
	const tree = S;
	const marks = tree._markedCharsets;
	CHARSET_MARK_REGEXP.lastIndex = 0;
	let match = nextCharsetMark(text);
	if (match === null) {
		w.emitStreamed(text);
		return;
	}
	const first = match.index;
	let last = first;
	let dropped = "";
	let kept = "";
	while (match !== null) {
		const between = text.slice(last, match.index);
		const id = Number(match[2]);
		dropped += between + marks[id];
		kept += between + marks[id + 1];
		last = CHARSET_MARK_REGEXP.lastIndex;
		match = nextCharsetMark(text);
	}
	w.emitStreamed(text.slice(0, first));
	if (tree._heldCharsets === null) tree._heldCharsets = [];
	tree._heldCharsets.push(w.emitRetractable(dropped));
	tree._heldCharsetTexts.push(kept);
	w.emitStreamed(text.slice(last));
};

/**
 * Emit a piece that opens with an element's start tag, splitting out what
 * `minifyOpenTag` held: the bytes where its dropped and kept rewrites differ go
 * out as a piece of their own, dropped, for `settleUtf8` to write back.
 * @param {string} text output text, the start tag first
 */
const emitOpening = (text) => {
	const tree = S;
	if (tree._heldTagNode === 0) {
		emitPiece(text);
		return;
	}
	tree._heldTagNode = 0;
	const dropped = tree._heldTagDropped;
	const kept = tree._heldTagKept;
	tree._heldTagDropped = "";
	tree._heldTagKept = "";
	const start = sharedStart(dropped, kept);
	const end = sharedEnd(dropped, kept, start);
	emitPiece(text.slice(0, start));
	const w = /** @type {PrintContext} */ (tree._writer);
	if (tree._heldCharsets === null) tree._heldCharsets = [];
	tree._heldCharsets.push(
		w.emitRetractable(dropped.slice(start, dropped.length - end))
	);
	tree._heldCharsetTexts.push(kept.slice(start, kept.length - end));
	emitPiece(text.slice(dropped.length - end));
	documentDeclaresUtf8();
};

/**
 * Decide whether the node just entered prints in pieces, and emit its opener if
 * so. A node can only do that inside something that already is, so the decision
 * walks down from the root and stops at the first that cannot.
 * @param {HtmlNodeRef} node node
 * @param {number} depth its depth in the walk
 * @param {boolean} descending whether the walk may enter its children
 */
const openStreamed = (node, depth, descending) => {
	const tree = S;
	const w = /** @type {PrintContext} */ (tree._writer);
	let streams = 0;
	tree._printPendingSlot[depth] = -1;
	if (tree._replacedNode === node) {
		// Its `enter` replaced it, so it composes at once, where the text applies.
	} else if (descending && (depth === 0 || tree._printOpen[depth - 1] === 1)) {
		const ty = tree._types[node];
		if (ty === NodeType.Document || ty === NodeType.DocumentFragment) {
			// Nothing of its own to print: its text is its children's, in order.
			streams = 1;
			tree._printClose[depth] = "";
		} else if (ty === NodeType.Element) {
			tree._walkNode = node;
			if (streamTags(A, w.options.mode === "minify")) {
				streams = 1;
				tree._printClose[depth] =
					(tree._flags[node] & FLAG_FOSTER_REGION) !== 0 &&
					!endTagOutsideSpan(A)
						? ""
						: tree._streamClose;
				if (tree._streamImplied === "") {
					emitOpening(tree._streamOpen);
				} else {
					tree._printCloseIfOpened[depth] = tree._streamCloseIfOpened;
					tree._printPendingSlot[depth] = w.pushPending("");
					tree._printPendingNames.push(tree._streamImplied);
				}
			}
		}
	} else if (
		(tree._flags[node] & FLAG_FOSTER_REGION) !== 0 &&
		(depth === 0 || tree._printOpen[depth - 1] === 1) &&
		/** @type {Set<HtmlNodeRef>} */ (tree._fosterVerbatim).has(node)
	) {
		// Its children are skipped and its text is `open + that source + close`, so
		// it streams like any other element rather than composing nothing.
		tree._walkNode = node;
		if (streamTags(A, w.options.mode === "minify")) {
			streams = 1;
			tree._printClose[depth] = endTagOutsideSpan(A) ? tree._streamClose : "";
			const region = fosterSourceRegion(A, node);
			if (tree._streamImplied === "") {
				emitOpening(tree._streamOpen + region);
			} else {
				// Implied, it ends nowhere in the source either, so it owes no end tag
				// whether or not the held-back start tag prints.
				tree._printCloseIfOpened[depth] = "";
				tree._printPendingSlot[depth] = w.pushPending("");
				tree._printPendingNames.push(tree._streamImplied);
				// The tag is still undecided; the content behind it is not, and nothing
				// else will emit it because the children are skipped.
				emitPiece(region);
			}
		}
	}
	tree._printOpen[depth] = streams;
};

/**
 * Fire a node's `exit` visitors, then - when printing - its printer (the
 * post-order point: its children are already printed). `_writer` undefined =
 * walk only.
 * @param {HtmlNodeRef} node node
 */
const exitNode = (node) => {
	const tree = S;
	const b = tree._walkVisitors[tree._types[node]];
	if (b === undefined && tree._writer === undefined) return;
	tree._walkNode = node;
	if (b !== undefined) {
		const x = b.exit;
		for (let i = 0; i < x.length; i++) x[i](visitorPath);
		if (tree._walkStopped && tree._writer === undefined) throw WALK_STOPPED;
	}
	if (tree._writer === undefined) return;
	const depth = tree._printDepth;
	if (tree._printOpen[depth] === 1) {
		// Printed in pieces: its opener went out as it opened and its children as
		// they finished, so only its closer is left.
		if (tree._replacedNode !== 0) tree._writer.discardReplacement(node);
		const slot = tree._printPendingSlot[depth];
		// Its start tag printed after all, so the end tag is no longer the one a
		// transparent element leaves behind.
		emitPiece(
			slot !== -1 && slot === tree._materializedPendingSlot
				? tree._printCloseIfOpened[depth]
				: tree._printClose[depth]
		);
		// Nothing inside it printed, so its held-back opener never had to.
		if (slot !== -1 && tree._writer.isPending(slot)) {
			tree._printPendingNames.pop();
			tree._writer.dropPending();
		}
		return;
	}
	// Composed at once, but whatever holds it is being printed in pieces, so it
	// goes straight out rather than into the store for a read-back that will never
	// come.
	if (depth !== 0 && tree._printOpen[depth - 1] === 1) {
		if (tree._replacedNode === 0) {
			emitOpening(tree._writer.printPiece(visitorPath));
		} else {
			tree._writer.printNode(node, visitorPath);
			emitOpening(tree._writer.get(node));
		}
		return;
	}
	tree._writer.printNode(node, visitorPath);
};

// WHY: the streaming walk.
// It follows the parser's open element stack: everything under the
// deepest *entered* element is finished markup, so it is visited and its node
// ids recycled, and peak storage is the open subtree rather than the whole
// document - the HTML analog of the CSS grammar's per-top-level-rule recycling.
//
// Streaming starts only once the document passes `STREAM_MIN_NODES`: below it
// the walk is a single pass at EOF, which is what a small page wants anyway.
//
// Two rules keep it correct and cheap:
//  - An element is entered only when something beneath it has to be flushed
//    (`FLUSH_BATCH` worth of nodes). Anything that opens and closes in between
//    is never entered and is walked as one completed subtree, so its visitors
//    see a final `end` and live child links.
//  - Nothing is visited unless `canFlush()` holds. An unsafe stretch (the
//    adoption agency, tables, templates) just buffers, and the next sync sees
//    the final tree.
//
// Only walk-only passes stream: printing holds every node's text until its
// parent prints.
/** @type {number} how many `grammar` runs are in progress, the innermost reading `S` */
let grammarDepth = 0;
// Nodes that must pile up under the deepest entered element before a flush
// earns its walk setup. Closing an entered element always flushes, so this only
// bounds how much an un-entered subtree holds - a few KB of columns.
const FLUSH_BATCH = 4096;
// WHY: below this many nodes a document is walked once at EOF instead.
// Recycling only pays once the columns are big enough that not growing them
// beats the per-token sync, and a page never reaching that must not carry the
// cost. Chosen so the streamed cap below stays under
// `SHRINK_CAPACITY`, keeping the columns reusable by the next parse.
const STREAM_MIN_NODES = 49152;

/**
 * Whether completed subtrees may be visited and recycled at this point in the
 * parse. An empty active-formatting-elements list is the load-bearing check:
 * the adoption agency only moves elements drawn from `open` / `afe` and the
 * direct children of an element that is still open, and table markers live in
 * `afe` too, so with `afe` empty neither it nor foster parenting can reach a
 * node that was already flushed. The rest keep node ids that outlive the open
 * stack out of the recycled range - template contents, pending table text, the
 * `<selectedcontent>` post-pass, the form pointer - and `MODE_IN_BODY` covers
 * the head, which "after head" reopens to insert into.
 * @returns {boolean} true when flushing is safe
 */
const canFlush = () =>
	!S._streamHalted &&
	S._afe.length === 0 &&
	S._templateModes.length === 0 &&
	S._pendingTableChars === null &&
	!S._sawSelectedContent &&
	S.mode === MODE_IN_BODY &&
	S._open.length !== 0 &&
	(S._form === 0 || S._open.includes(S._form));

/**
 * Whether a printing walk still descends into a node it was told not to: a
 * print writes what a `skipChildren()` node holds all the same, with no visitor
 * firing below it until its own `exit`. A holder printing from source is not
 * descended into either way.
 * @param {HtmlNodeRef} node the node whose `enter` said not to descend
 * @returns {boolean} true when the walk goes on below it
 */
const printsSkipped = (node) => {
	if (
		S._writer === undefined ||
		((S._flags[node] & FLAG_FOSTER_REGION) !== 0 &&
			/** @type {Set<HtmlNodeRef>} */ (S._fosterVerbatim).has(node))
	) {
		return false;
	}
	S._printSkipped = node;
	S._skippedVisitors = S._walkVisitors;
	S._walkVisitors = EMPTY_VISITORS;
	return true;
};

/**
 * Depth-first walk of a whole run of `container`'s children, from `first` up to
 * (not including) `stop` (0 = to the end). One loop for the entire run instead
 * of a call per child - sibling-heavy markup flushes hundreds at a time.
 * @param {HtmlNodeRef} container parent the run hangs off
 * @param {HtmlNodeRef} first first child of the run
 * @param {HtmlNodeRef} stop child to stop before (0 = end of the run)
 */
const walkRun = (container, first, stop) => {
	const tree = S;
	let node = first;
	descend: for (;;) {
		const descending = enterNode(node) || printsSkipped(node);
		// Printing tracks the open path so a node can emit its own pieces; the
		// streamed walk-only runs never print, so they never pay for it.
		if (tree._writer !== undefined) {
			openStreamed(node, tree._printDepth, descending);
		}
		if (descending) {
			// The first node inside: a template's content before its children,
			// and nothing inside a leaf.
			const ty = tree._types[node];
			const inner =
				ty === NodeType.Element
					? (tree._flags[node] & FLAG_HAS_TEMPLATE) !== 0
						? tree._contentEnds[node]
						: tree._firstChildren[node]
					: ty === NodeType.Document || ty === NodeType.DocumentFragment
						? tree._firstChildren[node]
						: 0;
			if (inner !== 0) {
				node = inner;
				tree._printDepth++;
				continue;
			}
		}
		for (;;) {
			if (node === tree._printSkipped) {
				tree._walkVisitors = tree._skippedVisitors;
				tree._skippedVisitors = EMPTY_VISITORS;
				tree._printSkipped = 0;
			}
			exitNode(node);
			const parent = tree._parents[node];
			// Whether `node` is its parent's `templateContentOf`, read inline.
			const fromContent =
				(tree._flags[parent] & FLAG_HAS_TEMPLATE) !== 0 &&
				tree._contentEnds[parent] === node;
			// Back at the run's own level: step to the next sibling, or stop.
			if (parent === container && !fromContent) {
				const next = tree._nextSiblings[node];
				if (next === 0 || next === stop) return;
				node = next;
				continue descend;
			}
			// Out of a template's content fragment there is nothing left: every
			// insertion into a `<template>` goes to its content, so it has no
			// children of its own.
			if (!fromContent) {
				const next = tree._nextSiblings[node];
				if (next !== 0) {
					node = next;
					continue descend;
				}
			}
			node = parent;
			tree._printDepth--;
		}
	}
};

/**
 * Rewind the node allocator to `to`, never past the deepest open element. Every
 * still-open element is live and its id must survive, so a flush that empties a
 * parent may not reclaim ids a deeper open element already took.
 * @param {number} to id to rewind to
 */
const streamRewind = (to) => {
	const top = S._open.length !== 0 ? S._open[S._open.length - 1] : 0;
	if (to >= top && to < S._nodeCount) {
		if (S._nodeCount > S._nodeHighWater) S._nodeHighWater = S._nodeCount;
		S._nodeCount = to;
	}
};

/**
 * Visit and recycle `parent`'s completed children - everything before
 * `openChild`, the child still on the open stack (0 = none, i.e. `parent` is
 * the deepest open element). A trailing text node is held back:
 * `appendTo` merges following text into the last child, so flushing it early
 * would split one text node in two.
 * @param {HtmlNodeRef} parent open element to flush under
 * @param {HtmlElement} openChild still-open child to stop before (0 = none)
 * @param {boolean} visit false to recycle without visiting (under `skipChildren`)
 * @param {boolean} hold true while `parent` can still receive text, so a
 * trailing text node stays put; false once it is closing (nothing follows)
 */
const streamFlush = (parent, openChild, visit, hold) => {
	S._cursorEpoch = (S._cursorEpoch + 1) | 0;
	const container = effParent(parent);
	const first = S._firstChildren[container];
	if (first === 0 || first === openChild) return;
	// Where the run ends: before the still-open child, and before a trailing text
	// node while `parent` can still receive text (`appendTo` merges into the last
	// child, so flushing it early would split one text node in two).
	let child = openChild;
	if (hold && openChild === 0) {
		const lastChild = S._lastChildren[container];
		if (lastChild !== 0 && S._types[lastChild] === NodeType.Text) {
			child = lastChild;
		}
	}
	if (first === child) return;
	if (visit) walkRun(container, first, child);
	S._firstChildren[container] = child;
	if (child === 0) S._lastChildren[container] = 0;
	// Ids are bump-allocated in tree order, so the visited run and its
	// descendants fill `[parent + 1, _nodeCount]` whenever nothing below
	// `parent` is still open - rewind the allocator over them.
	if (child === 0 && container === parent) streamRewind(parent);
};

/**
 * Detach a closed element from its parent, releasing its id when it was the
 * parent's last remaining child. Earlier siblings are always flushed before an
 * element is entered, so it is the first child left.
 * @param {HtmlElement} el closed element
 */
const streamDetach = (el) => {
	const parent = S._parents[el];
	const next = S._nextSiblings[el];
	if (parent !== 0) {
		S._firstChildren[parent] = next;
		if (next === 0) S._lastChildren[parent] = 0;
	}
	S._nextSiblings[el] = 0;
	S._parents[el] = 0;
	if (next === 0 && S._nodeCount === el) streamRewind(el - 1);
};

/**
 * Bring the streamed walk up to date with the tree built so far: `exit` the
 * elements that closed, `enter` the ones that opened, and flush the completed
 * subtrees in between. Called once per token but does nothing unless
 * `canFlush()` holds, so an unsafe stretch (incorrectly nested formatting elements,
 * tables, templates) simply buffers and the next catch-up sees the final tree.
 */
/**
 * Index up to which `_entered` still matches the open stack. Pushes and pops
 * only ever diverge in a suffix; a mid-stack `open.splice` sets `_openSpliced`
 * and forces the full scan.
 * @returns {number} length of the common prefix
 */
const enteredPrefix = () => {
	if (S._openSpliced) {
		S._openSpliced = false;
		let i = 0;
		while (
			i < S._entered.length &&
			i < S._open.length &&
			S._entered[i] === S._open[i]
		) {
			i++;
		}
		return i;
	}
	let i =
		S._entered.length < S._open.length ? S._entered.length : S._open.length;
	while (i > 0 && S._entered[i - 1] !== S._open[i - 1]) i--;
	return i;
};

const streamSync = () => {
	// The tree under the walk grows and is recycled from here on.
	S._cursorEpoch = (S._cursorEpoch + 1) | 0;
	const entered = S._entered.length;
	const last = entered !== 0 ? S._entered[entered - 1] : 0;
	// Still nothing to do: the entered prefix matches the open stack and too
	// little has piled up under it to be worth a flush.
	if (
		!S._openSpliced &&
		S._open.length >= entered &&
		(entered === 0 || S._open[entered - 1] === last) &&
		S._nodeCount - last < FLUSH_BATCH
	) {
		return;
	}
	if (!canFlush()) return;
	// The first catch-up enters the open stack whole, which describes the tree only
	// while each element is the one below's child: a `</form>` before streaming
	// began can have taken the form out from under what it still holds open.
	if (S._entered.length === 0) {
		for (let k = 1; k < S._open.length; k++) {
			if (S._parents[S._open[k]] !== S._open[k - 1]) {
				S._streamHalted = true;
				return;
			}
		}
	}

	let i = enteredPrefix();
	// Close: everything entered below the divergence has finished. A descendant
	// of a `skipChildren()` element was tracked without being entered, so it does
	// not exit either - only the skipped element itself does.
	for (let k = S._entered.length - 1; k >= i; k--) {
		const el = S._entered[k];
		const belowSkip = S._skipFrom !== -1 && k > S._skipFrom;
		streamFlush(el, 0, S._skipFrom === -1 || k < S._skipFrom, false);
		if (!belowSkip) exitNode(el);
		if (S._skipFrom === k) S._skipFrom = -1;
		streamDetach(el);
	}
	S._entered.length = i;
	// Open: enter the elements now needed, flushing each level's finished
	// children before descending past them.
	for (; i < S._open.length; i++) {
		const el = S._open[i];
		const suppressed = S._skipFrom !== -1;
		streamFlush(S._parents[el], el, !suppressed, false);
		if (!suppressed && !enterNode(el)) S._skipFrom = i;
		S._entered.push(el);
	}
	// Finally the current insertion point's own finished children.
	streamFlush(S._open[S._open.length - 1], 0, S._skipFrom === -1, true);
};

/**
 * Finish a streamed walk at EOF: close everything still open (their never-
 * entered descendants are walked as completed children), then the root.
 * @param {HtmlNodeRef} root document / fragment root
 */
const streamFinish = (root) => {
	for (let k = S._entered.length - 1; k >= 0; k--) {
		const el = S._entered[k];
		const belowSkip = S._skipFrom !== -1 && k > S._skipFrom;
		streamFlush(el, 0, S._skipFrom === -1 || k < S._skipFrom, false);
		if (!belowSkip) exitNode(el);
		if (S._skipFrom === k) S._skipFrom = -1;
		streamDetach(el);
	}
	S._entered.length = 0;
	streamFlush(root, 0, true, false);
	exitNode(root);
};

/**
 * Where a document starts once its byte order mark is read as the decoder reads
 * it (HTML §13.2.3.1): as the encoding's mark, not as text.
 * @param {string} input source text
 * @returns {number} 1 past a leading BOM, else 0
 */
const afterBom = (input) => (input.charCodeAt(0) === 0xfeff ? 1 : 0);

// A start or end tag read whole, quoted values and all; one of its attributes;
// a UTF-8 label; the label a `charset=` inside an `http-equiv` content value names.
const WHOLE_TAG_REGEXP =
	/<(\/?)([a-zA-Z][^\s/>]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/y;
const META_ATTRIBUTE_REGEXP =
	/([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
const UTF8_LABEL_REGEXP = /^\s*utf-?8\s*$/i;
const CONTENT_CHARSET_REGEXP = /charset\s*=\s*["']?\s*([^\s"';]*)/i;

/**
 * Reads one `<meta>` tag's attributes the way a browser does while it looks for the encoding.
 * @param {string} attributes the tag's text after its name
 * @returns {string | undefined} the encoding label it names, or undefined when it names none
 */
const metaCharset = (attributes) => {
	/** @type {string | undefined} */
	let charset;
	/** @type {boolean | undefined} */
	let contentType;
	/** @type {string | undefined} */
	let content;
	META_ATTRIBUTE_REGEXP.lastIndex = 0;
	for (let match; (match = META_ATTRIBUTE_REGEXP.exec(attributes)) !== null;) {
		const name = asciiLowercase(match[1]);
		const raw =
			match[2] !== undefined
				? match[2]
				: match[3] !== undefined
					? match[3]
					: match[4] || "";
		const value = raw.includes("&") ? decodeEntities(raw, true) : raw;
		if (name === "charset") {
			if (charset === undefined) charset = value;
		} else if (name === "http-equiv" && contentType === undefined) {
			contentType =
				asciiLowercase(stripAsciiWhitespace(value)) === "content-type";
		} else if (name === "content" && content === undefined) {
			content = value;
		}
	}
	if (charset !== undefined) return charset;
	if (contentType && content !== undefined) {
		const match = CONTENT_CHARSET_REGEXP.exec(content);
		if (match !== null) return match[1];
	}
};

/**
 * The encoding a document declares where a browser looks before reading it: a
 * byte order mark, or the first `<meta>` naming an encoding in 1024 bytes.
 * @param {string} input document source
 * @returns {"utf8" | "other" | undefined} UTF-8, another encoding, or undefined when it declares none
 */
const declaredEncoding = (input) => {
	if (input.charCodeAt(0) === 0xfeff) return "utf8";
	const declared = prescan(input, false);
	if (declared === null || declared === undefined) return;
	return UTF8_LABEL_REGEXP.test(declared) ? "utf8" : "other";
};

/**
 * The encoding label the first `<meta>` naming one in a document's first 1024
 * bytes names (see `prescan`).
 * @param {string} input the document's bytes, one character per byte
 * @returns {string | undefined} the label, or undefined when it names none
 */
const declaredCharset = (input) => prescan(input, false, true) || undefined;

/**
 * The encoding the first `<meta>` naming one in a text's first 1024 bytes
 * names, read the way a browser's prescan reads it.
 * @param {string} input document source, or the start of a print still going on
 * @param {boolean} partial whether more text may still follow `input`
 * @param {boolean=} byteChars whether `input` holds one character per byte
 * @returns {string | null | undefined} the label it names, null when it names none, or undefined where only the text still to follow can give it
 */
const prescan = (input, partial, byteChars) => {
	// The characters that fit in 1024 UTF-8 bytes: a surrogate is half of four.
	let end = byteChars ? Math.min(input.length, 1024) : 0;
	let bytes = byteChars ? end : 0;
	for (; end < input.length && bytes < 1024; end++) {
		const code = input.charCodeAt(end);
		bytes +=
			code < 0x80 ? 1 : code < 0x800 || (code & 0xf800) === 0xd800 ? 2 : 3;
	}
	const head = input.slice(0, end);
	// A deferred write stands as a NUL marker, so what follows it has no known
	// place in the bytes the browser reads; a NUL the source carried is a byte.
	if (
		partial &&
		S._deferEmbeddedSource !== undefined &&
		head.includes("\u0000")
	) {
		return null;
	}
	// Short of 1024 bytes, a text that goes on decides nothing by ending.
	const unread = partial && bytes < 1024 ? undefined : null;
	// Comments, tags and their quoted values are skipped whole, so only a real
	// `<meta>` is read; one left open hides the rest, as it does for the browser.
	for (let pos = head.indexOf("<"); pos !== -1;) {
		if (head.startsWith("<!--", pos)) {
			const close = head.indexOf("-->", pos + 2);
			if (close === -1) return unread;
			pos = head.indexOf("<", close + 3);
			continue;
		}
		WHOLE_TAG_REGEXP.lastIndex = pos;
		const tag = WHOLE_TAG_REGEXP.exec(head);
		if (tag !== null) {
			if (tag[1] === "" && asciiLowercase(tag[2]) === "meta") {
				const declared = metaCharset(tag[3]);
				if (declared !== undefined) return declared;
			}
			pos = head.indexOf("<", WHOLE_TAG_REGEXP.lastIndex);
			continue;
		}
		// A tag the pattern did not take is one left open, `</x` as much as `<x`.
		const slash = head.charCodeAt(pos + 1) === 47; /* / */
		const next = head.charCodeAt(slash ? pos + 2 : pos + 1);
		if ((next >= 65 && next <= 90) || (next >= 97 && next <= 122)) {
			return unread;
		} else if (slash || next === 33 /* ! */ || next === 63 /* ? */) {
			const close = head.indexOf(">", pos + 1);
			if (close === -1) return unread;
			pos = head.indexOf("<", close + 1);
		} else {
			pos = head.indexOf("<", pos + 1);
		}
	}
	return unread;
};

/**
 * Whether the first `<meta>` naming an encoding in a text's first 1024 bytes
 * names UTF-8 (see `prescan`).
 * @param {string} input document source, or the start of a print still going on
 * @param {boolean} partial whether more text may still follow `input`
 * @returns {boolean | undefined} the answer, or undefined where only the text still to follow can give it
 */
const prescanUtf8 = (input, partial) => {
	const declared = prescan(input, partial);
	return declared === undefined
		? undefined
		: declared !== null && UTF8_LABEL_REGEXP.test(declared);
};

/**
 * Whether the document declares UTF-8: as its source does or, where that says
 * nothing, as the print so far does, which dropping a `<style>` can bring a
 * `<meta charset>` into. The print's answer is final once found.
 * @returns {boolean | undefined} true when `<script charset=utf-8>` restates the default, undefined while the print so far cannot tell
 */
const documentDeclaresUtf8 = () => {
	let declared = S._declaresUtf8;
	if (declared === undefined && S._writer !== undefined) {
		declared = prescanUtf8(printedStart(S._writer), true);
		if (declared !== undefined) settleUtf8(declared);
	}
	return declared;
};

/**
 * The print's first 1024 characters, each deferred event handler in them read
 * as declined where every write deferred so far is one: an answer is written
 * only where it spells shorter, inside its tag, so it only moves a `<meta>` up.
 * @param {PrintContext} writer the print context
 * @returns {string} the start of the print
 */
const printedStart = (writer) => {
	const start = writer.emittedStart(1024);
	const holes = S._deferEmbeddedSource;
	if (holes === undefined || !start.includes("\u0000")) return start;
	for (let i = 0; i < holes.length; i++) {
		if (holes[i].as !== EVENT_HANDLER) return start;
	}
	return declineDeferredWrites(start, holes);
};

/**
 * Take the print's answer and settle the held `<script charset>` pieces on it:
 * printed dropped, they keep that on a yes and get their text back on a no.
 * Dropping only moves a `<meta>` earlier, so a yes read without them holds.
 * @param {boolean} declared whether the print declares UTF-8
 */
const settleUtf8 = (declared) => {
	S._declaresUtf8 = declared;
	const held = S._heldCharsets;
	if (held === null) return;
	S._heldCharsets = null;
	const texts = S._heldCharsetTexts;
	if (!declared) {
		const writer = /** @type {PrintContext} */ (S._writer);
		for (let i = 0; i < held.length; i++) {
			writer.rewriteRetractable(held[i], texts[i]);
		}
	}
	texts.length = 0;
};

/**
 * Whether a document declares itself UTF-8 (see `declaredEncoding`).
 * @param {string} input document source
 * @returns {boolean} true when the document's own declaration makes it UTF-8
 */
const declaresUtf8 = (input) => declaredEncoding(input) === "utf8";

/**
 * The HTML `SourceProcessor` grammar: build the document AST (WHATWG tree
 * construction) and walk it, firing `enter` / `exit` in source order. The root
 * document / fragment node is visited too (with a `null` parent). When `writer`
 * is given the same walk also prints: each node's printer builds its text into
 * `writer` as the node finishes (post-order), and the root's text is taken as the
 * result - one parse, no re-tokenization.
 * @param {string} input source text
 * @param {CompiledVisitorMap} visitors compiled visitor map
 * @param {PrintContext | undefined} writer the print context to build output into, or undefined (walk only)
 * @param {HtmlProcessOptions} options process options
 */
const runGrammar = (input, visitors, writer, options) => {
	S._walkVisitors = visitors;
	S._writer = writer;
	S._walkStopped = false;
	// Set here, not in `printer`: a tag streams out before the first `printer`
	// call, so these must be known from the start of the walk.
	const redundant =
		writer === undefined ? undefined : writer.options.removeRedundantAttributes;
	S._removeRedundantAttributes =
		redundant === true
			? "smart"
			: redundant === false || redundant === undefined
				? "none"
				: redundant;
	// Undefined leaves the answer to the print's own first bytes.
	S._declaresUtf8 =
		S._removeRedundantAttributes === "none" ||
		options.fragmentContext !== undefined
			? false
			: declaresUtf8(input) || undefined;
	S._heldCharsets = null;
	S._heldCharsetTexts.length = 0;
	S._heldTagNode = 0;
	S._charsetMarkInfix = undefined;
	S._markedCharsets.length = 0;
	S._removeEmptyAttributes =
		writer !== undefined && writer.options.removeEmptyAttributes === true;
	S._removeEmptyElements =
		writer !== undefined && writer.options.removeEmptyElements === true;
	S._transforms = transformsFrom(
		writer === undefined ? undefined : writer.options.transforms
	);
	S._commentsKept = keptComments(S._transforms.comments);
	S._commentInput = input;
	S._commentLocs = undefined;
	// With the rest, not in `printer`: a tag streams out before the first
	// `printer` call, and both the optional-end-tag tests and
	// `removeEmptyElements` ask what this tier does with a whitespace node.
	const collapse =
		writer === undefined ? undefined : writer.options.collapseWhitespace;
	S._collapseWhitespace =
		collapse === true
			? "conservative"
			: collapse === false || collapse === undefined
				? "none"
				: collapse;
	S._minifying = writer !== undefined && writer.options.mode === "minify";
	S._renderEmbeddedSource =
		writer === undefined ? undefined : writer.options.renderEmbeddedSource;
	S._deferEmbeddedSource =
		writer === undefined ? undefined : writer.options.deferEmbeddedSource;
	S._embeddedAnswers =
		writer === undefined ? undefined : writer.options.embeddedAnswers;
	S._deferSrcdoc = writer === undefined || writer.options.deferSrcdoc !== false;
	S._sortAttributes =
		writer !== undefined && writer.options.sortAttributes === true;
	S._sortTokenLists =
		writer !== undefined && writer.options.sortTokenLists === true;
	S._xmlQuote =
		writer !== undefined && writer.options.xmlQuote === "'" ? "'" : '"';
	S._removeSvgMetadata =
		writer !== undefined &&
		S._minifying &&
		writer.options.removeSvgMetadata === true;
	S._removeSvgEditorData =
		writer !== undefined &&
		S._minifying &&
		options.xml === true &&
		writer.options.removeSvgEditorData === true;
	S._removeUnusedSvgNamespaces =
		writer !== undefined &&
		S._minifying &&
		options.xml === true &&
		writer.options.removeUnusedSvgNamespaces === true;
	S._shortenSvgNumbers =
		writer !== undefined &&
		S._minifying &&
		writer.options.shortenSvgNumbers === true;
	S._svgPrecision =
		writer !== undefined &&
		S._minifying &&
		typeof writer.options.svgPrecision === "number" &&
		Number.isInteger(writer.options.svgPrecision) &&
		writer.options.svgPrecision >= 0 &&
		writer.options.svgPrecision <= 15
			? writer.options.svgPrecision
			: -1;
	S._svgAnglePrecision =
		writer !== undefined &&
		S._minifying &&
		typeof writer.options.svgAnglePrecision === "number" &&
		Number.isInteger(writer.options.svgAnglePrecision) &&
		writer.options.svgAnglePrecision >= 0 &&
		writer.options.svgAnglePrecision <= 15
			? writer.options.svgAnglePrecision
			: -1;
	S._shortenSvgTransformFunctions = false;
	S._convertSvgTransforms = false;
	S._mergeDisjointSvgPaths = false;
	S._shortenSvgColors =
		writer !== undefined &&
		S._minifying &&
		options.xml === true &&
		writer.options.shortenSvgColors === true;
	S._shortenSvgPathData =
		writer !== undefined &&
		S._minifying &&
		writer.options.shortenSvgPathData === true;
	S._mergeStyles = writer !== undefined && writer.options.mergeStyles === true;
	S._mergeScripts =
		writer !== undefined && writer.options.mergeScripts === true;
	// Node ids are per-parse, so a set kept from the last one would name this
	// one's nodes. Dropped rather than cleared: most documents never fill it.
	S._absorbed = null;
	// Counted from the parse this call is about to run, so it cannot be kept.
	S._attributeRanks = null;
	const implied =
		writer === undefined ? false : writer.options.removeImpliedTags;
	S._removeImpliedTags =
		implied === undefined || implied === "smart"
			? "smart"
			: implied === false
				? "none"
				: "all";
	// Printing holds every node's text until its parent prints, so only
	// walk-only passes stream; the printing path builds the tree and walks it.
	S._streamEligible = writer === undefined;
	S._streaming = false;
	S._printDepth = 0;
	// A print is read as the browsers it is for read it, scripting on: what a
	// `noscript` holds is then text, kept as written for either reader.
	const parseOptions =
		writer === undefined ? options : { ...options, scripting: true };
	try {
		const start = afterBom(input);
		// Written back first, since the mark is what names the encoding as UTF-8.
		if (writer !== undefined && start === 1) writer.emitStreamed("\uFEFF");
		const root = parseHtmlUnchecked(input, start, parseOptions);
		if (writer !== undefined) {
			const opted = writer.options;
			const optional =
				options.xml === true &&
				S._minifying &&
				!S._xmlVerbatim &&
				(opted.removeSvgScripts === true ||
					opted.removeSvgTitles === true ||
					opted.removeSvgDescriptions === true ||
					opted.removeSvgRasterImages === true ||
					opted.removeSvgXlink === true ||
					opted.removeSvgDimensions === true ||
					opted.removeSvgViewBox === true ||
					opted.removeXmlDoctype === true ||
					opted.cleanupSvgIds === true ||
					opted.removeHiddenSvgElements === true ||
					opted.removeOffCanvasSvgPaths === true ||
					opted.removeUnknownSvgElements === true ||
					(opted.removeUnknownSvgAttributes !== undefined &&
						opted.removeUnknownSvgAttributes !== false) ||
					opted.removeDeprecatedSvgAttributes !== undefined ||
					opted.collapseSvgAttributeWhitespace === true ||
					opted.removeSvgAttributes !== undefined ||
					opted.removeSvgElements !== undefined ||
					opted.inlineSvgStyles === true);
			if (
				S._removeSvgMetadata ||
				S._removeSvgEditorData ||
				opted.cleanupSvgStructure === true ||
				opted.applySvgTransforms === true ||
				optional
			) {
				collectSvgIdAncestors();
			}
			if (optional) removeOptionalSvgContent(opted, root);
			// Before anything asks whether a stylesheet could depend on structure.
			if (optional && opted.inlineSvgStyles === true) {
				inlineSvgStyles(
					(opted.inlineSvgStylePseudoClasses || []).map((name) =>
						asciiLowercase(name.replace(/^:/, ""))
					)
				);
			}
			if (
				(S._shortenSvgNumbers || S._shortenSvgColors) &&
				hasSvgGeometryDependency()
			) {
				S._shortenSvgNumbers = false;
				S._shortenSvgColors = false;
			}
			if (S._shortenSvgPathData && hasSvgGeometryDependency("d")) {
				S._shortenSvgPathData = false;
			}
			// An attribute selector can match an editor attribute.
			if (S._removeSvgEditorData && hasSvgGeometryDependency()) {
				S._removeSvgEditorData = false;
			}
			S._shortenSvgTransformFunctions =
				S._shortenSvgNumbers && !hasSvgGeometryDependency("transform");
			S._convertSvgTransforms =
				S._shortenSvgTransformFunctions &&
				writer.options.convertSvgTransforms === true;
			if (
				options.xml === true &&
				S._minifying &&
				(S._removeSvgMetadata ||
					S._removeSvgEditorData ||
					S._removeEmptyAttributes ||
					S._removeUnusedSvgNamespaces ||
					S._shortenSvgNumbers ||
					S._shortenSvgColors ||
					S._shortenSvgPathData ||
					S._removeEmptyElements ||
					S._collapseWhitespace !== "none" ||
					optional) &&
				!S._xmlVerbatim
			) {
				// First, since a namespace it trims can make an element SVG for the rest.
				if (optional && opted.collapseSvgAttributeWhitespace === true) {
					collapseSvgAttributeWhitespace();
				}
				removeXmlData();
			}
			// Before IDs, which an unknown element may hold the only reference to.
			if (
				optional &&
				opted.removeUnknownSvgElements === true &&
				svgStructureSymbols(false, false, true) !== null
			) {
				removeUnknownSvgElements();
			}
			if (
				optional &&
				opted.removeUnknownSvgAttributes !== undefined &&
				opted.removeUnknownSvgAttributes !== false &&
				svgStructureSymbols(false, false, true) !== null
			) {
				removeUnknownSvgAttributes(
					opted.removeUnknownSvgAttributes === "unsafe"
				);
			}
			if (
				optional &&
				opted.removeDeprecatedSvgAttributes !== undefined &&
				opted.removeDeprecatedSvgAttributes !== false &&
				svgStructureSymbols(false, false, true) !== null
			) {
				removeDeprecatedSvgAttributes(
					opted.removeDeprecatedSvgAttributes === "unsafe"
				);
			}
			// After metadata goes, which can hold the links a dependency check declines.
			const independent =
				optional &&
				(opted.cleanupSvgIds === true ||
					opted.removeHiddenSvgElements === true) &&
				svgStructureSymbols(false, false, true) !== null;
			const cleanIds = independent && opted.cleanupSvgIds === true;
			const hidden = independent && opted.removeHiddenSvgElements === true;
			// IDs go first so hidden content they kept can go, until neither finds more.
			if (independent) {
				settleSvgCleanup(() => {
					if (cleanIds) cleanupSvgIds();
					if (hidden) removeHiddenSvgElements();
				});
			}
			// Animations and stylesheets can read the transform, so they keep it.
			// Before closing, which writes `d` rounded, so the bake reads it exact.
			if (
				opted.applySvgTransforms === true &&
				S._shortenSvgPathData &&
				options.xml === true &&
				S._minifying &&
				!S._xmlVerbatim &&
				!hasSvgGeometryDependency("transform") &&
				svgStructureSymbols(false, false) !== null
			) {
				applySvgPathTransforms();
			}
			// Animations and stylesheets can read `d`, so they keep the curves.
			// Before closing too, so the fit reads exact data.
			if (
				(opted.convertSvgCurvesToArcs === true ||
					opted.convertSvgCurvesToArcs === "loose") &&
				S._shortenSvgPathData &&
				options.xml === true &&
				S._minifying &&
				!S._xmlVerbatim &&
				svgStructureSymbols(false, false) !== null
			) {
				S._looseSvgArcs = opted.convertSvgCurvesToArcs === "loose";
				convertSvgCurvesToArcs();
			}
			// First where the removals and merges can see what goes.
			const closing =
				S._shortenSvgPathData &&
				options.xml === true &&
				S._minifying &&
				!S._xmlVerbatim &&
				svgStructureSymbols(false, false) !== null;
			if (closing) {
				collectSvgIdAncestors();
				closeSvgPaths();
			}
			// Animations can move a path into view, so they keep the whole document.
			if (
				optional &&
				opted.removeOffCanvasSvgPaths === true &&
				svgStructureSymbols(false, false) !== null
			) {
				removeOffCanvasSvgPaths();
			}
			if (
				options.xml === true &&
				S._minifying &&
				!S._xmlVerbatim &&
				(writer.options.sortSvgSymbols === true ||
					writer.options.convertSvgShapes === true ||
					writer.options.cleanupSvgStructure === true ||
					writer.options.mergeSvgPaths === true ||
					writer.options.mergeDisjointSvgPaths === true ||
					writer.options.reuseSvgPaths === true ||
					writer.options.sortSvgDefinitions === true)
			) {
				S._mergeDisjointSvgPaths =
					writer.options.mergeDisjointSvgPaths === true;
				const symbols = svgStructureSymbols(
					writer.options.sortSvgDefinitions === true,
					writer.options.sortSvgSymbols === true
				);
				if (symbols !== null) {
					if (writer.options.cleanupSvgStructure === true) {
						cleanupSvgStructure(true);
						convertSvgOneStopGradients();
						hoistSvgGroupAttributes();
						cleanupSvgStructure();
						moveSvgGroupAttributes();
						// Before reuse, so paths that join alike compare alike.
						if (S._shortenSvgPathData) joinSvgDocumentPathRuns();
					}
					if (writer.options.reuseSvgPaths === true) reuseSvgPaths();
					if (
						writer.options.mergeSvgPaths === true ||
						S._mergeDisjointSvgPaths
					) {
						mergeSvgPaths();
					}
					if (writer.options.cleanupSvgStructure === true) {
						moveSvgGroupAttributes();
						// Each can leave work for another, as the next pass would find it.
						settleSvgCleanup(() => {
							dropUnpaintedSvgShapeDetails();
							if (cleanIds) cleanupSvgIds();
							if (hidden) removeHiddenSvgElements();
							// After reuse, which needs paint it compares spelled out.
							dropInitialSvgValues();
							cleanupSvgStructure();
							moveSvgGroupAttributes();
							// An unwrapped group can leave children that now share a value.
							hoistSvgGroupAttributes();
						});
					}
					if (S._removeEmptyElements) dropEmptySvgContainers();
					if (writer.options.convertSvgShapes === true) {
						convertSvgShapes();
						// A converted polyline's points can join as a path's lines do.
						if (
							writer.options.cleanupSvgStructure === true &&
							S._shortenSvgPathData
						) {
							joinSvgDocumentPathRuns();
						}
					}
					if (
						writer.options.sortSvgSymbols === true ||
						writer.options.sortSvgDefinitions === true
					) {
						sortSvgSymbols(
							cleanIds
								? /** @type {Map<HtmlNodeRef, string>} */ (
										svgStructureSymbols(
											writer.options.sortSvgDefinitions === true,
											writer.options.sortSvgSymbols === true
										)
									)
								: symbols
						);
					}
				}
			}
			// Again last, since shapes, merges and joins write paths of their own.
			if (closing) closeSvgPaths();
			if (!S._xmlMode) S._plaintextHolders = findPlaintextHolders();
			if (S._fosteredLog !== null) settleFosteredRuns(A);
			// Checked, not trusted: a shape no tags reach, foster parenting's repair, and
			// a fragment whose context (foreign, `select`, raw text) no body reads alike.
			const verify =
				S._printFromSource ||
				S._fosteredLog !== null ||
				(S._fragment !== 0 &&
					(namespaceOf(S._fragment) !== NS_HTML ||
						tagNameOf(S._fragment) === "select" ||
						getContentModeForTag(tagNameOf(S._fragment), true) !== STATE_DATA));
			walkRun(S._parents[root], root, S._nextSiblings[root]);
			// What the print's start never answered, its end does.
			if (S._heldCharsets !== null) {
				settleUtf8(prescanUtf8(writer.emittedStart(1024), false) === true);
			}
			// The root is a document, which prints in pieces: everything it holds has
			// been emitted already, unless a visitor replaced it, composing it whole.
			if (S._printOpen[0] === 0) emitOpening(writer.get(root));
			writer.dropStore();
			// A visitor's replacement reads back as no source, so its print stands.
			const edited = S._replacedNode !== 0;
			// An entity expanded into markup that no reference could be rebuilt from,
			// or a node the source wrote before a `<plaintext>` the tree puts after it.
			// Or a document whose mode the reader decides: no one print reads alike.
			if (
				!edited &&
				(S._xmlVerbatim ||
					S._plaintextTrails ||
					(S._minifying && S._quirksDisputed))
			) {
				writer.replaceAll(input);
			}
			// Print, then read the output back: the source always parses to its own
			// tree, so it stands in when the printed form does not. Digested after the
			// walk, which is what settles the elements the print left out.
			const ignoresNoscriptEnd =
				noscriptEndIgnored(input) || noscriptHoldsMarkup();
			if (!edited && (verify || S._nestedFormPrinted || ignoresNoscriptEnd)) {
				const printedDigest = digest(root);
				// A deferred body prints as a marker, which reads back as text where
				// its node stood - put it back, or the whole document is handed back.
				const printed =
					S._deferEmbeddedSource === undefined ||
					S._deferEmbeddedSource.length === 0
						? writer.result()
						: declineDeferredWrites(writer.result(), S._deferEmbeddedSource);
				// Both are keyed by node id, which the next parse hands out afresh.
				S._emptyElements.clear();
				S._absorbed = null;
				// The printed form is ours: its errors are not the source's.
				const verifyOptions = { ...parseOptions, parseError: undefined };
				// The print reads a `noscript` as text, which a browser with scripting off
				// reads as markup, so a `</noscript>` the tree ignored can still close one.
				const scriptingOff = { ...verifyOptions, scripting: false };
				if (
					digest(
						parseHtmlUnchecked(printed, afterBom(printed), verifyOptions)
					) !== printedDigest ||
					(ignoresNoscriptEnd &&
						digest(
							parseHtmlUnchecked(printed, afterBom(printed), scriptingOff)
						) !==
							digest(parseHtmlUnchecked(input, afterBom(input), scriptingOff)))
				) {
					writer.replaceAll(input);
				}
			}
		}
	} catch (err) {
		if (err !== WALK_STOPPED) throw err;
	} finally {
		S._walkStopped = false;
		if (S._walkHalted !== null) {
			resumeVisitors(S._walkHalted);
			S._walkHalted = null;
		}
		// Each held write keeps its offered source - a `<style>`, a `<script>`, a
		// whole `srcdoc` document - and a closure over it, so both go with the parse.
		S._renderEmbeddedSource = undefined;
		S._deferEmbeddedSource = undefined;
		S._embeddedAnswers = undefined;
		S._removeImpliedTags = "smart";
		S._transforms = DEFAULT_TRANSFORMS;
		S._commentInput = "";
		S._commentLocs = undefined;
		S._minifying = false;
		S._xmlRemovedNodes = null;
		S._svgIdAncestors.clear();
		S._xmlRemovedAttributes = null;
		S._xmlRenderedStyles = null;
		S._xmlShortenedNumbers = null;
		S._xmlColorAttributes = null;
		// Keyed by this parse's interned names, so it must not outlive it.
		S._attributeRanks = null;
		S._renderedSheets = null;
		S._plaintextHolders = null;
		S._plaintextTrails = false;
		S._nestedFormPrinted = false;
		if (S._emptyElements.size !== 0) S._emptyElements.clear();
		S._streamEligible = false;
		S._streaming = false;
		S._docSkipped = false;
		S._heldCharsets = null;
		S._heldCharsetTexts.length = 0;
		S._heldTagNode = 0;
		S._heldTagDropped = "";
		S._heldTagKept = "";
		S._charsetMarkInfix = undefined;
		S._markedCharsets.length = 0;
		// Held across the walk, so they outlive it the way the visitors do.
		if (S._printOpen.length !== 0) S._printOpen.length = 0;
		if (S._printClose.length !== 0) S._printClose.length = 0;
		S._printPendingNames.length = 0;
		if (S._printPendingSlot.length !== 0) S._printPendingSlot.length = 0;
		if (S._printCloseIfOpened.length !== 0) S._printCloseIfOpened.length = 0;
		S._materializedPendingSlot = -1;
		// The tree outlives the call, so drop the caller's visitors and print
		// context here - they used to fall away with `grammar`.
		S._walkVisitors = EMPTY_VISITORS;
		S._skippedVisitors = EMPTY_VISITORS;
		S._printSkipped = 0;
		S._replacedNode = 0;
		S._writer = undefined;
		// The walk consumed the tree: release the side arrays' heap references so
		// the reused columns don't pin this parse's strings until the next parse.
		releaseColumns();
	}
};

/**
 * Refill or empty again, through `lend`, the visitor lists the run just parked
 * halted: a nested run on the same processor shares them, and the runs parked
 * further out lent theirs when that run started.
 * @param {HtmlSyntaxTree} parked the tree of the run the nested one interrupts
 * @param {(halted: VisitorFn[][]) => void} lend `resumeVisitors` or `haltVisitorsAgain`
 */
const lendHaltedVisitors = (parked, lend) => {
	if (parked._walkHalted !== null) lend(parked._walkHalted);
};

/**
 * The HTML `SourceProcessor` grammar (see `runGrammar`).
 * @param {string} input source text
 * @param {CompiledVisitorMap} visitors compiled visitor map
 * @param {PrintContext | undefined} writer the print context to build output into, or undefined (walk only)
 * @param {HtmlProcessOptions} options process options
 * @param {HtmlPath=} path the processor's own path, handed to the visitors
 */
const grammar = (input, visitors, writer, options, path = A) => {
	// WHY: the tree, its parse state and the walk's live on `S`, so a run a
	// visitor starts (mid-parse, too, from a streamed walk or the document's
	// `enter`) parks the outer tree in a spare and takes it back on the way out.
	/** @type {HtmlSyntaxTree | undefined} */
	let parked;
	if (grammarDepth !== 0) {
		parked = spareTrees[grammarDepth - 1];
		if (parked === undefined) {
			parked = new HtmlSyntaxTree();
			spareTrees.push(parked);
		}
		swapTrees(parked);
		lendHaltedVisitors(parked, resumeVisitors);
	}
	grammarDepth++;
	const outerPath = visitorPath;
	visitorPath = path;
	try {
		runGrammar(input, visitors, writer, options);
	} finally {
		visitorPath = outerPath;
		grammarDepth--;
		if (parked !== undefined) {
			lendHaltedVisitors(parked, haltVisitorsAgain);
			swapTrees(parked);
		}
	}
};

/** @typedef {[string, number, number]} ParsedSource */

// `parseSrcset` is a direct implementation of the WHATWG "parse a srcset
// attribute" algorithm; it lives here with the other spec-level HTML parsing
// so it can move into the WASM parser alongside the tokenizer in the future.
const COMMA = ",".charCodeAt(0);
const LEFT_PARENTHESIS = "(".charCodeAt(0);
const RIGHT_PARENTHESIS = ")".charCodeAt(0);
const SMALL_LETTER_W = "w".charCodeAt(0);
const SMALL_LETTER_X = "x".charCodeAt(0);
const SMALL_LETTER_H = "h".charCodeAt(0);
// Not `\s`, which matches a non-breaking space. Sticky so `collectCharacters`
// matches at an offset rather than slicing per call, which was quadratic.
// eslint-disable-next-line no-control-regex
const LEADING_SPACES_REGEXP = /[ \t\n\r\u000C]+/y;
// eslint-disable-next-line no-control-regex
const LEADING_COMMAS_OR_SPACES_REGEXP = /[, \t\n\r\u000C]+/y;
// eslint-disable-next-line no-control-regex
const LEADING_NOT_SPACES = /[^ \t\n\r\u000C]+/y;
const TRAILING_COMMAS_REGEXP = /[,]+$/;
const NON_NEGATIVE_INTEGER_REGEXP = /^\d+$/;
// A signed or unsigned integer or decimal, with or without an exponent, holding
// at least one digit, no leading plus, and a digit after any decimal point.
// https://html.spec.whatwg.org/multipage/infrastructure.html#valid-floating-point-number
const FLOATING_POINT_REGEXP =
	/^-?(?:[0-9]+|[0-9]*\.[0-9]+)(?:[eE][+-]?[0-9]+)?$/;

/**
 * @param {string} input input
 * @returns {ParsedSource[]} parsed srcset
 */
const parseSrcset = (input) => {
	// 1. Let input be the value passed to this algorithm.
	const inputLength = input.length;

	/** @type {string | undefined} */
	let url;
	/** @type {string[]} */
	let descriptors;
	/** @type {number} */
	let descriptorStart;
	/** @type {string} */
	let state;
	/** @type {number} */
	let charCode;
	/** @type {number} */
	let position = 0;
	/** @type {number} */
	let start;

	/** @type {[string, number, number][]} */
	const candidates = [];

	/**
	 * @param {RegExp} regExp sticky reg exp to collect characters
	 * @returns {string | undefined} characters
	 */
	function collectCharacters(regExp) {
		regExp.lastIndex = Math.max(0, position);
		const match = regExp.exec(input);

		if (match) {
			const [chars] = match;
			position += chars.length;

			return chars;
		}
	}

	/**
	 * @returns {void}
	 */
	function parseDescriptors() {
		// 9. Descriptor parser: Let error be no.
		let pError = false;

		// 10. Let width be absent.
		// 11. Let density be absent.
		// 12. Let future-compat-h be absent. (We're implementing it now as h)
		/** @type {number | undefined} */
		let width;
		/** @type {number | undefined} */
		let density;
		/** @type {number | undefined} */
		let height;
		/** @type {string | undefined} */
		let desc;

		// 13. For each descriptor in descriptors, run the appropriate set of steps
		// from the following list:
		for (let i = 0; i < descriptors.length; i++) {
			desc = descriptors[i];

			const lastChar = desc[desc.length - 1].charCodeAt(0);
			const value = desc.slice(0, Math.max(0, desc.length - 1));

			// If the descriptor consists of a valid non-negative integer followed by
			// a U+0077 LATIN SMALL LETTER W character
			if (
				NON_NEGATIVE_INTEGER_REGEXP.test(value) &&
				lastChar === SMALL_LETTER_W
			) {
				// If width and density are not both absent, then let error be yes.
				if (width !== undefined || density !== undefined) {
					pError = true;
				}

				const intVal = Number.parseInt(value, 10);

				// Apply the rules for parsing non-negative integers to the descriptor.
				// If the result is zero, let error be yes.
				// Otherwise, let width be the result.
				if (intVal === 0) {
					pError = true;
				} else {
					width = intVal;
				}
			}
			// If the descriptor consists of a valid floating-point number followed by
			// a U+0078 LATIN SMALL LETTER X character
			else if (
				FLOATING_POINT_REGEXP.test(value) &&
				lastChar === SMALL_LETTER_X
			) {
				// If width, density and future-compat-h are not all absent, then let error
				// be yes.
				if (
					width !== undefined ||
					density !== undefined ||
					height !== undefined
				) {
					pError = true;
				}

				const floatVal = Number.parseFloat(value);

				// Apply the rules for parsing floating-point number values to the descriptor.
				// If the result is less than zero, let error be yes. Otherwise, let density
				// be the result.
				if (floatVal < 0) {
					pError = true;
				} else {
					density = floatVal;
				}
			}
			// If the descriptor consists of a valid non-negative integer followed by
			// a U+0068 LATIN SMALL LETTER H character
			else if (
				NON_NEGATIVE_INTEGER_REGEXP.test(value) &&
				lastChar === SMALL_LETTER_H
			) {
				// If height and density are not both absent, then let error be yes.
				if (height !== undefined || density !== undefined) {
					pError = true;
				}

				const intVal = Number.parseInt(value, 10);

				// Apply the rules for parsing non-negative integers to the descriptor.
				// If the result is zero, let error be yes. Otherwise, let future-compat-h
				// be the result.
				if (intVal === 0) {
					pError = true;
				} else {
					height = intVal;
				}

				// Anything else, Let error be yes.
			} else {
				pError = true;
			}
		}

		// 15. If error is still no, then append a new image source to candidates whose
		// URL is url, associated with a width width if not absent and a pixel
		// density density if not absent. Otherwise, there is a parse error.
		if (!pError) {
			candidates.push([
				/** @type {string} */ (url),
				start,
				start + /** @type {string} */ (url).length
			]);
		} else {
			throw new Error(
				`Invalid srcset descriptor found in '${input}' at '${desc}'`
			);
		}
	}

	/**
	 * @returns {void}
	 */
	function tokenizeDescriptor() {
		// 8.1. Descriptor tokenizer: Skip whitespace
		collectCharacters(LEADING_SPACES_REGEXP);

		// 8.2. Let current descriptor be the empty string.
		// (Tracked as a start offset, `-1` = empty; sliced once per descriptor.)
		descriptorStart = -1;

		// 8.3. Let state be in descriptor.
		state = "in descriptor";

		while (true) {
			// 8.4. Let charCode be the character at position.
			charCode = input.charCodeAt(position);

			//  Do the following depending on the value of state.
			//  For the purpose of this step, "EOF" is a special character representing
			//  that position is past the end of input.

			// In descriptor
			if (state === "in descriptor") {
				// Do the following, depending on the value of charCode:

				// Space: append the current descriptor to descriptors and empty it, then
				// set state to after descriptor. It is never empty here: 8.1 skipped the
				// leading whitespace, and any other first character starts it or returns.
				if (isAsciiWhitespace(charCode)) {
					descriptors.push(input.slice(descriptorStart, position));
					descriptorStart = -1;
					state = "after descriptor";
				}
				// `,`: Advance position to the next character in input. If current
				// descriptor is not empty, append current descriptor to descriptors. Jump
				// to the step labeled descriptor parser.
				else if (charCode === COMMA) {
					position += 1;

					if (descriptorStart !== -1) {
						descriptors.push(input.slice(descriptorStart, position - 1));
					}

					parseDescriptors();

					return;
				}
				// U+0028 LEFT PARENTHESIS (()
				// Append charCode to current descriptor. Set state to in parens.
				else if (charCode === LEFT_PARENTHESIS) {
					if (descriptorStart === -1) descriptorStart = position;
					state = "in parens";
				}
				// EOF
				// If current descriptor is not empty, append current descriptor to
				// descriptors. Jump to the step labeled descriptor parser.
				else if (Number.isNaN(charCode)) {
					if (descriptorStart !== -1) {
						descriptors.push(input.slice(descriptorStart, position));
					}

					parseDescriptors();

					return;

					// Anything else
					// Append charCode to current descriptor.
				} else if (descriptorStart === -1) {
					descriptorStart = position;
				}
			}
			// In parens
			else if (state === "in parens") {
				// U+0029 RIGHT PARENTHESIS ())
				// Append charCode to current descriptor. Set state to in descriptor.
				if (charCode === RIGHT_PARENTHESIS) {
					state = "in descriptor";
				}
				// EOF
				// Append current descriptor to descriptors. Jump to the step labeled
				// descriptor parser, which throws: no valid descriptor holds a `(`.
				else if (Number.isNaN(charCode)) {
					descriptors.push(input.slice(descriptorStart, position));
					return parseDescriptors();
				}
				// Anything else
				// Append charCode to current descriptor. (Covered by the tracked range.)
			}
			// After descriptor, the one state left: depending on the value of charCode,
			// Space character: Stay in this state.
			else if (isAsciiWhitespace(charCode)) {
				// (nothing to do)
			}
			// EOF: Jump to the step labeled descriptor parser.
			else if (Number.isNaN(charCode)) {
				parseDescriptors();
				return;
			}
			// Anything else
			// Set state to in descriptor. Set position to the previous character in input.
			else {
				state = "in descriptor";
				position -= 1;
			}

			// Advance position to the next character in input.
			position += 1;
		}
	}

	// 3. Let candidates be an initially empty source set.
	// const candidates = []; // Moved to top

	// 4. Splitting loop: Collect a sequence of characters that are space
	//    characters or U+002C COMMA characters. If any U+002C COMMA characters
	//    were collected, that is a parse error.

	while (true) {
		collectCharacters(LEADING_COMMAS_OR_SPACES_REGEXP);

		// 5. If position is past the end of input, return candidates and abort these steps.
		if (position >= inputLength) {
			if (candidates.length === 0) {
				throw new Error("Must contain one or more image candidate strings");
			}

			// (we're done, this is the sole return path)
			return candidates;
		}

		// 6. Collect a sequence of characters that are not space characters,
		//    and let that be url.
		start = position;
		url = collectCharacters(LEADING_NOT_SPACES);

		// 7. Let descriptors be a new empty list.
		descriptors = [];

		// 8. If url ends with a U+002C COMMA character (,), follow these sub steps:
		//		(1). Remove all trailing U+002C COMMA characters from url. If this removed
		//         more than one character, that is a parse error.
		if (url && url.charCodeAt(url.length - 1) === COMMA) {
			url = url.replace(TRAILING_COMMAS_REGEXP, "");

			// (Jump ahead to step 9 to skip tokenization and just push the candidate).
			parseDescriptors();
		}
		//	Otherwise, follow these sub steps:
		else {
			tokenizeDescriptor();
		}

		// 16. Return to the step labeled splitting loop.
	}
};

// The spec's "URL-potentially-surrounded-by-spaces" cleanup: C0 controls,
// DEL..C1 and U+00A0 are stripped from the value after the whitespace trim.
// eslint-disable-next-line no-control-regex
const IGNORE_CHARS_REGEXP = /[\u0000-\u001F\u007F-\u009F\u00A0]/g;

/**
 * Parse a `src`-like URL attribute value: trim ASCII whitespace / U+00A0 from
 * both ends (offsets preserved for source rewriting), then strip ignorable
 * control characters. Throws when nothing remains.
 * @param {string} input attribute value
 * @returns {ParsedSource[]} parsed src
 */
const parseSrc = (input) => {
	const len = input.length;
	if (len === 0) throw new Error("Must be non-empty");

	let start = 0;
	let end = len;

	while (start < end) {
		const code = input.charCodeAt(start);
		if (code > 32 && code !== 160) break;
		start++;
	}

	if (start === end) throw new Error("Must be non-empty");

	while (end > start) {
		const code = input.charCodeAt(end - 1);
		if (code > 32 && code !== 160) break;
		end--;
	}

	let value = input.slice(start, end);

	if (IGNORE_CHARS_REGEXP.test(value)) {
		value = value.replace(IGNORE_CHARS_REGEXP, "");
		if (value.length === 0) throw new Error("Must be non-empty");
	}

	return [[value, start, end]];
};

/**
 * Extracts the `icon-uri` value of an `msapplication-task` meta content
 * (`name=...;action-uri=...;icon-uri=...`) - the other parts are page URLs, not assets.
 * @param {string} input input
 * @returns {ParsedSource[]} parsed icon-uri
 */
const parseMsapplicationTask = (input) => {
	const len = input.length;
	let pos = 0;
	while (pos < len) {
		let sep = input.indexOf(";", pos);
		if (sep === -1) sep = len;
		const eq = input.indexOf("=", pos);
		if (eq !== -1 && eq < sep) {
			const key = input.slice(pos, eq).trim().toLowerCase();
			if (key === "icon-uri") {
				let start = eq + 1;
				let end = sep;
				while (start < end && isAsciiWhitespace(input.charCodeAt(start))) {
					start++;
				}
				while (end > start && isAsciiWhitespace(input.charCodeAt(end - 1))) {
					end--;
				}
				if (start === end) return [];
				return [[input.slice(start, end), start, end]];
			}
		}
		pos = sep + 1;
	}
	return [];
};

/**
 * Extracts `url(...)` references from a CSS value (an SVG presentation
 * attribute). Reuses webpack's CSS lexer so quoting/escaping match the CSS
 * spec; returns the `parseSrc` shape so the shared emit path maps and rewrites
 * the spans. Unquoted `url(path)` rewrites the content span; quoted
 * `url("path")` rewrites the inner string span (quotes preserved).
 * @param {string} input attribute value (a CSS component-value list)
 * @returns {ParsedSource[]} url references
 */
const parseCssUrls = (input) => {
	const { TokenType, TokenStream, asciiCaseInsensitiveMatch } = cssParser();
	const ts = new TokenStream(input);
	/** @type {ParsedSource[]} */
	const result = [];
	for (;;) {
		const t = ts.consume();
		if (t.type === TokenType.EOF) break;
		if (t.type === TokenType.Url) {
			if (t.contentEnd > t.contentStart) {
				result.push([
					input.slice(t.contentStart, t.contentEnd),
					t.contentStart,
					t.contentEnd
				]);
			}
		} else if (
			t.type === TokenType.Function &&
			asciiCaseInsensitiveMatch(input.slice(t.start, t.end - 1), "url")
		) {
			let s = ts.consume();
			while (s.type === TokenType.Whitespace) s = ts.consume();
			if (s.type === TokenType.String) {
				const quote = input.charCodeAt(s.start);
				const innerStart = s.start + 1;
				// Drop the closing quote, unless the string is unterminated at EOF.
				const innerEnd =
					input.charCodeAt(s.end - 1) === quote ? s.end - 1 : s.end;
				if (innerEnd > innerStart) {
					result.push([
						input.slice(innerStart, innerEnd),
						innerStart,
						innerEnd
					]);
				}
			}
		}
	}
	return result;
};

// Thrown out of the walk to end a stopped walk-only parse; `grammar` catches it.
const WALK_STOPPED = new Error("html syntax: walk stopped");
// WHY: where the last `A.child` / `A.childCount` read under a parent stopped,
// so a loop over its children takes one step per child even while a nested loop
// reads another parent's: a slot per parent id modulo 64, valid while it carries
// the current epoch, which moves with each parse and streamed sync, the only
// points the tree under a walk grows or recycles ids.
const CURSOR_SLOTS = 64;

/**
 * The HTML path, the single argument every visitor receives. `A` is the same
 * object, for reads outside a walk with the node passed in.
 * @typedef {HtmlSyntaxPath} HtmlPath
 */

/**
 * HTML's parts by node type, which type each visitor's path.
 * @typedef {{
 * types: HtmlNodeType,
 * field: typeof Field.attributes | typeof Field.content,
 * flag: typeof Flag.mathml | typeof Flag.svg | typeof Flag.selfClosing,
 * part: 1 | 2 | 3 | 4 | 5 | 6 | 7,
 * text: typeof Part.publicId | typeof Part.systemId,
 * fields: { 1: never, 2: never, 3: typeof Field.attributes | typeof Field.content, 4: never, 5: never, 6: never, 7: never, 8: never },
 * flags: { 1: never, 2: never, 3: typeof Flag.mathml | typeof Flag.svg | typeof Flag.selfClosing, 4: never, 5: never, 6: never, 7: never, 8: never },
 * parts: { 1: never, 2: never, 3: typeof Part.name | typeof Part.content | typeof Part.startTag | typeof Part.endTag, 4: never, 5: never, 6: typeof Part.publicId | typeof Part.systemId, 7: never, 8: typeof Part.name | typeof Part.value },
 * texts: { 1: never, 2: never, 3: never, 4: never, 5: never, 6: typeof Part.publicId | typeof Part.systemId, 7: never, 8: never },
 * items: { [field: number]: number, 1: 8, 2: 2 },
 * }} HtmlParts
 */
/**
 * The path a visitor of node type `T` receives, with the run's state `S`.
 * @template [T=number]
 * @template [S=undefined]
 * @typedef {import("../util/SourceProcessor").TypedNodePath<HtmlPath, HtmlNodeRef, HtmlParts, T, S>} HtmlNodePath
 */
/**
 * A visitor map whose each visitor's path is typed by its node type and run state.
 * @template [S=undefined]
 * @typedef {{
 * 1?: import("../util/SourceProcessor").VisitorBucket<HtmlNodePath<1, S>>,
 * 2?: import("../util/SourceProcessor").VisitorBucket<HtmlNodePath<2, S>>,
 * 3?: import("../util/SourceProcessor").VisitorBucket<HtmlNodePath<3, S>>,
 * 4?: import("../util/SourceProcessor").VisitorBucket<HtmlNodePath<4, S>>,
 * 5?: import("../util/SourceProcessor").VisitorBucket<HtmlNodePath<5, S>>,
 * 6?: import("../util/SourceProcessor").VisitorBucket<HtmlNodePath<6, S>>,
 * 7?: import("../util/SourceProcessor").VisitorBucket<HtmlNodePath<7, S>>,
 * 8?: import("../util/SourceProcessor").VisitorBucket<HtmlNodePath<8, S>>,
 * }} HtmlVisitorMap
 */
/** @typedef {(typeof NodeType)[keyof typeof NodeType]} HtmlNodeType a `NodeType` member */

// WHY: a class keeps the path's getters on the prototype, so `A` itself keeps
// fast properties; an object literal holding a getter falls into dictionary
// mode, which makes every read through it a lookup.
/**
 * The path every visitor of an HTML `SourceProcessor` run receives, its reads
 * defaulting to the node the walk is at; outside a walk it is `A`, read by
 * passing the node a parse returned. Every field a consumer reads goes through
 * it, so the node representation can change underneath; `n` is an `HtmlNodeRef`,
 * valid until the next `parseHtml`.
 */
class HtmlSyntaxPath {
	// === path position (rebound by the walk before every visitor call) ===
	/**
	 * @returns {HtmlNodeRef} current node - only valid during a visitor callback
	 */
	get node() {
		return S._walkNode;
	}

	/**
	 * @returns {HtmlNodeRef | null} enclosing node (null = the document root)
	 */
	get parent() {
		const p = S._parents[S._walkNode];
		return p === 0 ? null : p;
	}

	/**
	 * Counted along the sibling links when asked, so the walk stores nothing for it.
	 * @returns {number} index of the current node among its parent's children (0 for the root or a `<template>`'s content)
	 */
	get index() {
		const node = S._walkNode;
		let i = 0;
		let c = S._firstChildren[S._parents[node]];
		while (c !== node) {
			// Not in its parent's chain: the root, or a `<template>`'s content.
			if (c === 0) return 0;
			c = S._nextSiblings[c];
			i++;
		}
		return i;
	}

	/** Stop the walk descending into the current node (enter only). */
	skipChildren() {
		S._walkSkipped = true;
	}

	/** Stop the walk: no visitor fires after the current one returns. */
	stop() {
		if (S._walkStopped) return;
		S._walkStopped = true;
		S._walkHalted = haltVisitors(S._walkVisitors);
		S._walkVisitors = EMPTY_VISITORS;
	}

	/**
	 * Print the current node as `text` in place of what the printer writes; on a
	 * walk that prints nothing it does nothing. Replaced from `exit`, an element
	 * already printed in pieces keeps what it printed.
	 * @param {string} text what the node prints as
	 * @returns {void}
	 */
	replace(text) {
		const writer = S._writer;
		if (writer === undefined) return;
		writer.replace(S._walkNode, text);
		S._replacedNode = S._walkNode;
	}

	/**
	 * Print nothing for the current node, as `replace("")`.
	 * @returns {void}
	 */
	remove() {
		A.replace("");
	}

	/**
	 * Walks the parent links, so a `<template>`'s content ends at its fragment.
	 * @param {number} level how many levels further out than the parent
	 * @returns {HtmlNodeRef} a node enclosing the current one (0 = none)
	 */
	ancestor(level) {
		let p = S._parents[S._walkNode];
		for (let l = 0; l < level && p !== 0; l++) p = S._parents[p];
		return p;
	}

	/**
	 * Walks the parent links, so a `<template>`'s content ends at its fragment.
	 * @param {number} type a `NodeType`
	 * @returns {boolean} whether an ancestor of the current node has that type
	 */
	within(type) {
		for (let p = S._parents[S._walkNode]; p !== 0; p = S._parents[p]) {
			if (S._types[p] === type) return true;
		}
		return false;
	}

	// === field reads - `n` defaults to the current node ===
	/**
	 * @param {HtmlNodeRef=} n node
	 * @returns {number} `NodeType`
	 */
	type(n = S._walkNode) {
		return n < 0 ? NodeType.Attribute : S._types[n];
	}

	/**
	 * @param {HtmlNodeRef=} n node
	 * @returns {[number, number]} start and end offsets in the input (an attribute's end past its closing quote)
	 */
	range(n = S._walkNode) {
		return [startOf(n), endOf(n)];
	}

	/**
	 * @param {HtmlNodeRef=} n node
	 * @returns {number} where the node starts in the input
	 */
	start(n = S._walkNode) {
		return startOf(n);
	}

	/**
	 * @param {HtmlNodeRef=} n node
	 * @returns {number} where the node ends in the input
	 */
	end(n = S._walkNode) {
		return endOf(n);
	}

	/**
	 * Line / column are converted only when asked, by a converter made on the
	 * first call of a parse. Valid during the walk, as {@link source} is.
	 * @param {HtmlNodeRef=} n node
	 * @returns {[number, number, number, number]} start line and column, end line and column (lines from 1, columns from 0)
	 */
	loc(n = S._walkNode) {
		const lc =
			S._locConverter || (S._locConverter = new LocConverter(S._input, "html"));
		const s = lc.get(startOf(n));
		const line = s.line;
		const column = s.column;
		const e = lc.get(endOf(n));
		return [line, column, e.line, e.column];
	}

	/**
	 * A node's text as written; valid during the walk, before `parseHtml` releases the source.
	 * @param {HtmlNodeRef | number=} n node, or the start offset when `end` is given
	 * @param {number=} end end offset, to read the input between two offsets
	 * @returns {string} the node's source, or the input between the offsets
	 */
	source(n, end) {
		if (end !== undefined) return S._input.slice(n, end);
		const node = n === undefined ? S._walkNode : n;
		if (node < 0) {
			return S._input.slice(S._attrNameStarts[-node], attrEnd(-node));
		}
		return S._input.slice(S._starts[node], S._ends[node]);
	}

	/**
	 * An element's or attribute's name (lowercased, adjusted in foreign content),
	 * a doctype's name, a processing instruction's target; "" for other nodes.
	 * @param {HtmlNodeRef=} n node
	 * @returns {string} its name
	 */
	name(n = S._walkNode) {
		if (n < 0) return S._attrNames[-n];
		const type = S._types[n];
		if (type === NodeType.Element || type === NodeType.Doctype) {
			return S._strings[n];
		}
		return type === NodeType.ProcessingInstruction
			? S._piTargets.get(n) || ""
			: "";
	}

	/**
	 * @param {number} field a `Field`
	 * @param {HtmlNodeRef=} n node
	 * @returns {number} number of items in that field (0 when the node has none)
	 */
	fieldCount(field, n = S._walkNode) {
		if (field === Field.attributes) {
			return S._types[n] === NodeType.Element ? S._attrCounts[n] : 0;
		}
		return field === Field.content && templateContentOf(n) !== 0 ? 1 : 0;
	}

	/**
	 * An attribute item is a node the shared reads take.
	 * @param {number} i item index
	 * @param {number} field a `Field`
	 * @param {HtmlNodeRef=} n node
	 * @returns {HtmlNodeRef} the i-th item of that field (0 = none)
	 */
	field(i, field, n = S._walkNode) {
		if (field === Field.attributes) {
			return S._types[n] === NodeType.Element && i >= 0 && i < S._attrCounts[n]
				? -(S._attrStarts[n] + i)
				: 0;
		}
		return field === Field.content && i === 0 ? templateContentOf(n) : 0;
	}

	/**
	 * Attribute names are stored lowercased, so `name` is compared as written.
	 * @param {number} field a `Field`
	 * @param {string} name the name to look for
	 * @param {HtmlNodeRef=} n node
	 * @returns {HtmlNodeRef} the first item of that field with this name (0 = none)
	 */
	fieldNamed(field, name, n = S._walkNode) {
		return field === Field.attributes && S._types[n] === NodeType.Element
			? -findAttr(S._attrStarts[n], S._attrCounts[n], name) | 0
			: 0;
	}

	/**
	 * @param {number} flag a `Flag`
	 * @param {HtmlNodeRef=} n node
	 * @returns {boolean} whether that flag is set
	 */
	flag(flag, n = S._walkNode) {
		return n > 0 && (S._flags[n] & flag) !== 0;
	}

	/**
	 * A parser-inserted element has no name, tags or content in the source.
	 * @param {number} part a `Part`
	 * @param {HtmlNodeRef=} n node
	 * @returns {[number, number] | null} where that part is written (null without one)
	 */
	rangeOf(part, n = S._walkNode) {
		const start = A.startOf(part, n);
		return start === -1 ? null : [start, A.endOf(part, n)];
	}

	/**
	 * @param {number} part a `Part`
	 * @param {HtmlNodeRef=} n node
	 * @returns {number} where that part starts (-1 without one)
	 */
	startOf(part, n = S._walkNode) {
		if (n < 0) {
			if (part === Part.name) return S._attrNameStarts[-n];
			return part === Part.value ? S._attrValueStarts[-n] : -1;
		}
		const type = S._types[n];
		if (type === NodeType.Doctype) {
			if (part === Part.publicId) return S._doctypePublicStart;
			return part === Part.systemId ? S._doctypeSystemStart : -1;
		}
		if (type !== NodeType.Element || S._nameEnds[n] === 0) return -1;
		if (part === Part.name) return S._starts[n] + 1;
		if (part === Part.startTag) {
			return hasSourceTag(n) ? S._starts[n] : -1;
		}
		if (part === Part.content) return S._tagEnds[n];
		return part === Part.endTag ? endTagStart(n) : -1;
	}

	/**
	 * @param {number} part a `Part`
	 * @param {HtmlNodeRef=} n node
	 * @returns {number} where that part ends (-1 without one)
	 */
	endOf(part, n = S._walkNode) {
		if (n < 0) {
			if (part === Part.name) return S._attrNameEnds[-n];
			return part === Part.value && S._attrValueStarts[-n] !== -1
				? S._attrValueEnds[-n]
				: -1;
		}
		const type = S._types[n];
		if (type === NodeType.Doctype) {
			if (part === Part.publicId) return S._doctypePublicEnd;
			return part === Part.systemId ? S._doctypeSystemEnd : -1;
		}
		if (type !== NodeType.Element || S._nameEnds[n] === 0) return -1;
		if (part === Part.name) return S._nameEnds[n];
		if (part === Part.startTag) {
			return hasSourceTag(n) ? S._tagEnds[n] : -1;
		}
		if (part !== Part.content && part !== Part.endTag) return -1;
		// Under `skip.text` a raw-text body records its own end, which also holds
		// where the end tag has attributes and so cannot be read back off the range.
		if (
			part === Part.content &&
			S.skipText &&
			!S._xmlMode &&
			RAW_TEXT_ELEMENTS.has(tagNameOf(n))
		) {
			return S._contentEnds[n];
		}
		const endTag = endTagStart(n);
		if (part === Part.endTag) return endTag === -1 ? -1 : S._ends[n];
		return endTag === -1 ? S._ends[n] : endTag;
	}

	/**
	 * Name and value are read with `name` and `value`; this reads a node's
	 * other text, such as a doctype's identifiers, which are stored decoded.
	 * @param {number} part a `Part`
	 * @param {HtmlNodeRef=} n node
	 * @returns {string | null} that part's text (null without one)
	 */
	textOf(part, n = S._walkNode) {
		if (n <= 0 || S._types[n] !== NodeType.Doctype) return null;
		if (part === Part.publicId) return S._doctypePublicId;
		return part === Part.systemId ? S._doctypeSystemId : null;
	}

	/**
	 * A text's, comment's, processing instruction's or attribute's data,
	 * character references decoded; "" for other nodes.
	 * @param {HtmlNodeRef=} n node
	 * @returns {string} its value
	 */
	value(n = S._walkNode) {
		if (n < 0) return attrValueDecoded(-n);
		const type = S._types[n];
		return type === NodeType.Text ||
			type === NodeType.Comment ||
			type === NodeType.ProcessingInstruction
			? S._strings[n]
			: "";
	}

	/**
	 * Counted along the sibling links once per node and visitor call.
	 * @param {HtmlNodeRef=} n node
	 * @returns {number} number of children
	 */
	childCount(n = S._walkNode) {
		const slot = cursorSlot(n);
		const known = S._cursorCounts[slot];
		if (known !== -1) return known;
		let count = 0;
		for (let c = S._firstChildren[n]; c !== 0; c = S._nextSiblings[c]) {
			count++;
		}
		S._cursorCounts[slot] = count;
		return count;
	}

	/**
	 * Reached along the sibling links from the last child read under `n`, so a
	 * loop over a node's children takes one step per child.
	 * @param {number} i child index (`0 <= i < childCount(n)`)
	 * @param {HtmlNodeRef=} n node
	 * @returns {HtmlNodeRef} the i-th child (0 = none)
	 */
	child(i, n = S._walkNode) {
		const slot = cursorSlot(n);
		let k = S._cursorIndexes[slot];
		let c = S._cursorChildren[slot];
		if (i < k) {
			k = 0;
			c = S._firstChildren[n];
		}
		for (; k < i && c !== 0; k++) c = S._nextSiblings[c];
		S._cursorIndexes[slot] = k;
		S._cursorChildren[slot] = c;
		return c;
	}

	/**
	 * Every child as a new array, for a reader that keeps or searches them.
	 * @param {HtmlNodeRef=} n node
	 * @returns {HtmlNodeRef[]} its children (empty for an attribute or a leaf)
	 */
	children(n = S._walkNode) {
		/** @type {HtmlNodeRef[]} */
		const out = [];
		if (n < 0) return out;
		for (let c = S._firstChildren[n]; c !== 0; c = S._nextSiblings[c]) {
			out.push(c);
		}
		return out;
	}
}

// WHY: the tree being read, which every per-run read goes through. A `const`,
// so the optimizer keeps one load and map check of it across calls; a nested
// run swaps the tree's contents with a spare from `spareTrees` instead.
const S = new HtmlSyntaxTree();
/** @type {HtmlSyntaxTree[]} parked trees for runs nested one deeper each, made on first use */
const spareTrees = [];
const TREE_FIELDS = /** @type {(keyof HtmlSyntaxTree)[]} */ (Object.keys(S));

/**
 * Exchange one field of `S` with the same field of `parked`.
 * @template {keyof HtmlSyntaxTree} K
 * @param {HtmlSyntaxTree} parked the spare to exchange with
 * @param {K} key the field
 */
const swapField = (parked, key) => {
	const value = S[key];
	S[key] = parked[key];
	parked[key] = value;
};

/**
 * Exchange every field of `S` with `parked`'s: the outer tree is parked on
 * entry to a nested run and read again once the same call puts it back.
 * @param {HtmlSyntaxTree} parked the spare to exchange with
 */
const swapTrees = (parked) => {
	for (const key of TREE_FIELDS) swapField(parked, key);
};

const A = new HtmlSyntaxPath();
// The path the visitors are handed: the run's processor's own, which reads
// through `A` and holds the run's `state`.
/** @type {HtmlPath} */
let visitorPath = A;

module.exports.A = A;
module.exports.EMBEDDED_STYLESHEET = EMBEDDED_STYLESHEET;
module.exports.FOREIGN_ELEMENT = FOREIGN_ELEMENT;
module.exports.FLAG_FOSTER_REGION = FLAG_FOSTER_REGION;
module.exports.Field = Field;
module.exports.declaredCharset = declaredCharset;
module.exports.declaredEncoding = declaredEncoding;
module.exports.declaresUtf8 = declaresUtf8;
module.exports.Flag = Flag;
module.exports.Part = Part;
module.exports.Namespace = Namespace;
module.exports.NodeType = NodeType;
module.exports.Quote = Quote;
module.exports._CC_NUMBER_SIGN = CC_NUMBER_SIGN;
module.exports._S = S;
module.exports._attributeCountOf = attributeCountOf;
module.exports._attributeList = attributeList;
module.exports._dataOf = dataOf;
module.exports._firstChild = firstChild;
module.exports._tagNameOf = tagNameOf;
module.exports._namespaceOf = namespaceOf;
module.exports._nextSibling = nextSibling;
module.exports._parentOf = parentOf;
module.exports.asciiLowercase = asciiLowercase;
module.exports.stripAsciiWhitespace = stripAsciiWhitespace;
module.exports._canOmitEndTag = canOmitEndTag;
module.exports._canOmitStartTag = canOmitStartTag;
module.exports._contentOpensOutside = contentOpensOutside;
module.exports._deferEmbedded = deferEmbedded;
module.exports._elementCloseTag = elementCloseTag;
module.exports._endTagReadsAsText = endTagReadsAsText;
module.exports._endTagOutsideSpan = endTagOutsideSpan;
module.exports._endsOutsideLineBox = endsOutsideLineBox;
module.exports._formNeedsPointerReset = formNeedsPointerReset;
module.exports._fosterRunMoves = fosterRunMoves;
module.exports._fosterSourceRegion = fosterSourceRegion;
module.exports._impliedCloseTag = impliedCloseTag;
module.exports._impliedTableGroupStartNeeded = impliedTableGroupStartNeeded;
module.exports._isCssStyleElement = isCssStyleElement;
module.exports._isRemovableEmptyElement = isRemovableEmptyElement;
module.exports._isSvgRoot = isSvgRoot;
module.exports._keepComment = keepComment;
module.exports._minifyOpenTag = minifyOpenTag;
module.exports._openTagSource = openTagSource;
module.exports._opensImpliedShell = opensImpliedShell;
module.exports._printedAttributeCount = printedAttributeCount;
module.exports._printsNothing = printsNothing;
module.exports._headLeftBefore = headLeftBefore;
module.exports._whitespaceInertUnder = whitespaceInertUnder;
module.exports._renderEmbeddedOrNull = renderEmbeddedOrNull;
module.exports._startsCharacterReference = startsCharacterReference;
module.exports._startsOutsideLineBox = startsOutsideLineBox;
module.exports._synthesizeOpenTag = synthesizeOpenTag;
module.exports._takeRenderedSheet = takeRenderedSheet;
module.exports._rendersNow = rendersNow;
module.exports._sheetDecides = sheetDecides;
module.exports._onlyTextChild = onlyTextChild;
module.exports._sheetClosing = sheetClosing;
module.exports._styleRunText = styleRunText;
module.exports._xmlCharacterData = xmlCharacterData;
module.exports._xmlElementIsStyled = xmlElementIsStyled;
module.exports._xmlOpenTag = xmlOpenTag;
module.exports.baseTag = baseTag;
module.exports.buildHeadTags = buildHeadTags;
module.exports.collapseWhitespaceRuns = collapseWhitespaceRuns;
module.exports.decodeEntities = decodeEntities;
module.exports.decodeXmlAttribute = decodeXmlAttribute;
module.exports.decodeXmlEntities = decodeXmlEntities;
module.exports.escapeAttribute = escapeAttribute;
module.exports.escapeText = escapeText;
module.exports.escapeXmlAttribute = escapeXmlAttribute;
module.exports.escapeXmlText = escapeXmlText;
module.exports.grammar = grammar;
module.exports.isAllAsciiWhitespace = isAllAsciiWhitespace;
module.exports.isAsciiAlphanumeric = isAsciiAlphanumeric;
module.exports.isAsciiWhitespace = isAsciiWhitespace;
module.exports.isXmlWellFormedText = isXmlWellFormedText;
module.exports.metaTag = metaTag;
module.exports.parseCssUrls = parseCssUrls;
module.exports.parseHtml = parseHtml;
module.exports.parseMsapplicationTask = parseMsapplicationTask;
module.exports.parseSrc = parseSrc;
module.exports.parseSrcset = parseSrcset;
module.exports.pickTransforms = pickTransforms;
module.exports.startsWithAsciiWhitespace = startsWithAsciiWhitespace;
module.exports.tokenize = tokenize;
module.exports.tokenizeXml = tokenizeXml;
