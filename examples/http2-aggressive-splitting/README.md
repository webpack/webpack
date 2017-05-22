This example demonstrates the AggressiveSplittingPlugin for splitting the bundle into multiple smaller chunks to improve caching. This works best with a HTTP2 web server elsewise there is an overhead for the increased number of requests.

The AggressiveSplittingPlugin split every chunk until it reaches the specified `maxSize`. In this example it tries to create chunks with <50kB code (after minimizing this reduces to ~10kB). It groups modules together by folder structure. We assume modules in the same folder as similar likely to change and minimize and gzip good together.

The AggressiveSplittingPlugin records it's splitting in the webpack records and try to restore splitting from records. This ensures that after changes to the application old splittings (and chunks) are reused. They are probably already in the clients cache. Therefore it's heavily recommended to use records!

Only chunks which are bigger than the specified `minSize` are stored into the records. This ensures that these chunks fill up as your application grows, instead of creating too many chunks for every change.

Chunks can get invalid if a module changes. Modules from invalid chunks go back into the module pool and new chunks are created from all modules in the pool.

There is a tradeoff here:

The caching improves with smaller `maxSize`, as chunks change less often and can be reused more often after an update.

The compression improves with bigger `maxSize`, as gzip works better for bigger files. It's more likely to find duplicate strings, etc.

The backward compatibility (non HTTP2 client) improves with bigger `maxSize`, as the number of requests decreases.

``` js
var path = require("path");
var webpack = require("../../");
module.exports = {
	entry: "./example",
	output: {
		path: path.join(__dirname, "js"),
		filename: "[chunkhash].js",
		chunkFilename: "[chunkhash].js"
	},
	plugins: [
		new webpack.optimize.AggressiveSplittingPlugin({
			minSize: 30000,
			maxSize: 50000
		}),
		new webpack.DefinePlugin({
			"process.env.NODE_ENV": JSON.stringify("production")
		})
	],
	recordsOutputPath: path.join(__dirname, "js", "records.json")
};
```

# Info

## Uncompressed

```
Hash: 5eb645c89262ade6ab18
Version: webpack 2.6.0
                  Asset     Size  Chunks             Chunk Names
b37172807f93b7d59181.js  52.8 kB       7  [emitted]  
f0597ceec26d85e14094.js  57.2 kB       0  [emitted]  
4bb149689ae97f5d46e7.js    36 kB       2  [emitted]  
8940e378350d3e1324c1.js  55.3 kB       3  [emitted]  
f45002fdb16fe5adab39.js  54.7 kB       4  [emitted]  
41c4bfca01dacc328b9b.js  53.8 kB       5  [emitted]  
79966dbf56b74a83076f.js  53.4 kB       6  [emitted]  
118f4e8acf782daf7bde.js  56.3 kB       1  [emitted]  
2fcd17b3e056f863b2d3.js    52 kB       8  [emitted]  
766d1060910b08c5b00b.js  34.5 kB       9  [emitted]  
7731c65a1a824990e2dd.js  50.9 kB      10  [emitted]  
32f25aae39ba65782773.js  50.6 kB      11  [emitted]  
98d8187845fe0bf1e18c.js  60.8 kB      12  [emitted]  
b86956e055f0f09d9e19.js  34.7 kB      13  [emitted]  
141c9029a3b722f94828.js  31.3 kB      14  [emitted]  
Entrypoint main = 98d8187845fe0bf1e18c.js 141c9029a3b722f94828.js b86956e055f0f09d9e19.js
chunk    {0} f0597ceec26d85e14094.js 50 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [15] ./example.js 2:0-22
   [19] (webpack)/~/react-dom/index.js 59 bytes {0} [built]
   [34] (webpack)/~/fbjs/lib/ExecutionEnvironment.js 1.06 kB {0} [built]
   [51] (webpack)/~/fbjs/lib/shallowEqual.js 1.74 kB {0} [built]
   [68] (webpack)/~/fbjs/lib/EventListener.js 2.67 kB {0} [built]
   [69] (webpack)/~/fbjs/lib/focusNode.js 704 bytes {0} [built]
   [70] (webpack)/~/fbjs/lib/getActiveElement.js 1.04 kB {0} [built]
   [71] (webpack)/~/process/browser.js 5.42 kB {0} [built]
   [72] (webpack)/~/react-dom/lib/CSSProperty.js 3.66 kB {0} [built]
   [93] (webpack)/~/fbjs/lib/camelize.js 708 bytes {0} [built]
   [94] (webpack)/~/fbjs/lib/camelizeStyleName.js 1 kB {0} [built]
   [95] (webpack)/~/fbjs/lib/containsNode.js 1.05 kB {0} [built]
   [96] (webpack)/~/fbjs/lib/createArrayFromMixed.js 4.11 kB {0} [built]
   [97] (webpack)/~/fbjs/lib/createNodesFromMarkup.js 2.66 kB {0} [built]
   [98] (webpack)/~/fbjs/lib/getMarkupWrap.js 3.04 kB {0} [built]
   [99] (webpack)/~/fbjs/lib/getUnboundedScrollPosition.js 1.12 kB {0} [built]
  [100] (webpack)/~/fbjs/lib/hyphenate.js 800 bytes {0} [built]
  [101] (webpack)/~/fbjs/lib/hyphenateStyleName.js 974 bytes {0} [built]
  [102] (webpack)/~/fbjs/lib/isNode.js 828 bytes {0} [built]
  [103] (webpack)/~/fbjs/lib/isTextNode.js 605 bytes {0} [built]
  [104] (webpack)/~/fbjs/lib/memoizeStringOnly.js 698 bytes {0} [built]
  [105] (webpack)/~/react-dom/lib/ARIADOMPropertyConfig.js 1.82 kB {0} [built]
  [106] (webpack)/~/react-dom/lib/AutoFocusUtils.js 599 bytes {0} [built]
  [107] (webpack)/~/react-dom/lib/BeforeInputEventPlugin.js 13.3 kB {0} [built]
  [144] (webpack)/~/react-dom/lib/ReactVersion.js 350 bytes {0} [built]
chunk    {1} 118f4e8acf782daf7bde.js 49.9 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [15] ./example.js 2:0-22
   [35] (webpack)/~/react-dom/lib/ReactInstrumentation.js 601 bytes {1} [built]
   [44] (webpack)/~/react-dom/lib/ReactInstanceMap.js 1.22 kB {1} [built]
   [59] (webpack)/~/react-dom/lib/ReactErrorUtils.js 2.19 kB {1} [built]
   [79] (webpack)/~/react-dom/lib/ReactHostComponent.js 1.98 kB {1} [built]
   [80] (webpack)/~/react-dom/lib/ReactInputSelection.js 4.27 kB {1} [built]
   [82] (webpack)/~/react-dom/lib/ReactNodeTypes.js 1.02 kB {1} [built]
  [126] (webpack)/~/react-dom/lib/ReactDOMSelection.js 6.78 kB {1} [built]
  [127] (webpack)/~/react-dom/lib/ReactDOMTextComponent.js 5.82 kB {1} [built]
  [128] (webpack)/~/react-dom/lib/ReactDOMTextarea.js 6.46 kB {1} [built]
  [131] (webpack)/~/react-dom/lib/ReactDefaultInjection.js 3.5 kB {1} [built]
  [133] (webpack)/~/react-dom/lib/ReactEventEmitterMixin.js 959 bytes {1} [built]
  [134] (webpack)/~/react-dom/lib/ReactEventListener.js 5.3 kB {1} [built]
  [135] (webpack)/~/react-dom/lib/ReactInjection.js 1.2 kB {1} [built]
  [136] (webpack)/~/react-dom/lib/ReactMarkupChecksum.js 1.47 kB {1} [built]
  [138] (webpack)/~/react-dom/lib/ReactOwner.js 3.53 kB {1} [built]
  [141] (webpack)/~/react-dom/lib/ReactRef.js 2.56 kB {1} [built]
  [150] (webpack)/~/react-dom/lib/SyntheticCompositionEvent.js 1.1 kB {1} [built]
chunk    {2} 4bb149689ae97f5d46e7.js 30.5 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [15] ./example.js 2:0-22
   [32] (webpack)/~/react-dom/lib/reactProdInvariant.js 1.24 kB {2} [built]
   [50] (webpack)/~/react-dom/lib/setInnerHTML.js 3.86 kB {2} [built]
   [63] (webpack)/~/react-dom/lib/getEventModifierState.js 1.23 kB {2} [built]
   [64] (webpack)/~/react-dom/lib/getEventTarget.js 1.01 kB {2} [built]
   [65] (webpack)/~/react-dom/lib/isEventSupported.js 1.94 kB {2} [built]
   [86] (webpack)/~/react-dom/lib/getHostComponentFromComposite.js 740 bytes {2} [built]
   [87] (webpack)/~/react-dom/lib/getTextContentAccessor.js 955 bytes {2} [built]
   [88] (webpack)/~/react-dom/lib/instantiateReactComponent.js 5.06 kB {2} [built]
   [89] (webpack)/~/react-dom/lib/isTextInputElement.js 1.04 kB {2} [built]
   [90] (webpack)/~/react-dom/lib/setTextContent.js 1.45 kB {2} [built]
  [161] (webpack)/~/react-dom/lib/flattenChildren.js 2.77 kB {2} [built]
  [162] (webpack)/~/react-dom/lib/getEventKey.js 2.87 kB {2} [built]
  [163] (webpack)/~/react-dom/lib/getIteratorFn.js 1.12 kB {2} [built]
  [164] (webpack)/~/react-dom/lib/getNodeForCharacterOffset.js 1.62 kB {2} [built]
  [165] (webpack)/~/react-dom/lib/getVendorPrefixedEventName.js 2.87 kB {2} [built]
  [166] (webpack)/~/react-dom/lib/quoteAttributeValueForBrowser.js 700 bytes {2} [built]
chunk    {3} 8940e378350d3e1324c1.js 49.7 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [15] ./example.js 2:0-22
   [37] (webpack)/~/react-dom/lib/SyntheticEvent.js 9.18 kB {3} [built]
   [45] (webpack)/~/react-dom/lib/SyntheticUIEvent.js 1.57 kB {3} [built]
   [47] (webpack)/~/react-dom/lib/SyntheticMouseEvent.js 2.14 kB {3} [built]
   [48] (webpack)/~/react-dom/lib/Transaction.js 9.45 kB {3} [built]
   [49] (webpack)/~/react-dom/lib/escapeTextContentForBrowser.js 3.43 kB {3} [built]
   [61] (webpack)/~/react-dom/lib/createMicrosoftUnsafeLocalFunction.js 810 bytes {3} [built]
   [62] (webpack)/~/react-dom/lib/getEventCharCode.js 1.5 kB {3} [built]
   [84] (webpack)/~/react-dom/lib/accumulateInto.js 1.69 kB {3} [built]
   [85] (webpack)/~/react-dom/lib/forEachAccumulated.js 855 bytes {3} [built]
  [147] (webpack)/~/react-dom/lib/SimpleEventPlugin.js 7.97 kB {3} [built]
  [155] (webpack)/~/react-dom/lib/SyntheticTouchEvent.js 1.28 kB {3} [built]
  [156] (webpack)/~/react-dom/lib/SyntheticTransitionEvent.js 1.23 kB {3} [built]
  [157] (webpack)/~/react-dom/lib/SyntheticWheelEvent.js 1.94 kB {3} [built]
  [158] (webpack)/~/react-dom/lib/adler32.js 1.19 kB {3} [built]
  [159] (webpack)/~/react-dom/lib/dangerousStyleValue.js 3.02 kB {3} [built]
  [160] (webpack)/~/react-dom/lib/findDOMNode.js 2.46 kB {3} [built]
chunk    {4} f45002fdb16fe5adab39.js 49.8 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [15] ./example.js 2:0-22
   [33] (webpack)/~/react-dom/lib/ReactDOMComponentTree.js 6.27 kB {4} [built]
   [38] (webpack)/~/react-dom/lib/PooledClass.js 3.36 kB {4} [built]
   [46] (webpack)/~/react-dom/lib/ReactBrowserEventEmitter.js 12.6 kB {4} [built]
   [57] (webpack)/~/react-dom/lib/LinkedValueUtils.js 5.25 kB {4} [built]
   [58] (webpack)/~/react-dom/lib/ReactComponentEnvironment.js 1.3 kB {4} [built]
  [115] (webpack)/~/react-dom/lib/ReactChildReconciler.js 6.11 kB {4} [built]
  [118] (webpack)/~/react-dom/lib/ReactDOM.js 5.14 kB {4} [built]
  [120] (webpack)/~/react-dom/lib/ReactDOMContainerInfo.js 967 bytes {4} [built]
  [121] (webpack)/~/react-dom/lib/ReactDOMEmptyComponent.js 1.9 kB {4} [built]
  [122] (webpack)/~/react-dom/lib/ReactDOMFeatureFlags.js 439 bytes {4} [built]
  [123] (webpack)/~/react-dom/lib/ReactDOMIDOperations.js 956 bytes {4} [built]
  [125] (webpack)/~/react-dom/lib/ReactDOMOption.js 3.69 kB {4} [built]
  [130] (webpack)/~/react-dom/lib/ReactDefaultBatchingStrategy.js 1.88 kB {4} [built]
chunk    {5} 41c4bfca01dacc328b9b.js 50 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [15] ./example.js 2:0-22
   [42] (webpack)/~/react-dom/lib/EventPluginHub.js 9.11 kB {5} [built]
   [43] (webpack)/~/react-dom/lib/EventPropagators.js 5.09 kB {5} [built]
   [54] (webpack)/~/react-dom/lib/EventPluginRegistry.js 9.75 kB {5} [built]
   [55] (webpack)/~/react-dom/lib/EventPluginUtils.js 7.95 kB {5} [built]
   [56] (webpack)/~/react-dom/lib/KeyEscapeUtils.js 1.29 kB {5} [built]
  [110] (webpack)/~/react-dom/lib/Danger.js 2.24 kB {5} [built]
  [111] (webpack)/~/react-dom/lib/DefaultEventPluginOrder.js 1.08 kB {5} [built]
  [112] (webpack)/~/react-dom/lib/EnterLeaveEventPlugin.js 3.16 kB {5} [built]
  [113] (webpack)/~/react-dom/lib/FallbackCompositionState.js 2.43 kB {5} [built]
  [114] (webpack)/~/react-dom/lib/HTMLDOMPropertyConfig.js 6.57 kB {5} [built]
  [116] (webpack)/~/react-dom/lib/ReactComponentBrowserEnvironment.js 906 bytes {5} [built]
  [167] (webpack)/~/react-dom/lib/renderSubtreeIntoContainer.js 422 bytes {5} [built]
chunk    {6} 79966dbf56b74a83076f.js 49.8 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [15] ./example.js 2:0-22
   [36] (webpack)/~/react-dom/lib/ReactUpdates.js 9.53 kB {6} [built]
   [41] (webpack)/~/react-dom/lib/ReactReconciler.js 6.21 kB {6} [built]
   [60] (webpack)/~/react-dom/lib/ReactUpdateQueue.js 9.36 kB {6} [built]
   [83] (webpack)/~/react-dom/lib/ViewportMetrics.js 606 bytes {6} [built]
  [143] (webpack)/~/react-dom/lib/ReactServerUpdateQueue.js 4.83 kB {6} [built]
  [145] (webpack)/~/react-dom/lib/SVGDOMPropertyConfig.js 7.32 kB {6} [built]
  [146] (webpack)/~/react-dom/lib/SelectEventPlugin.js 6.06 kB {6} [built]
  [151] (webpack)/~/react-dom/lib/SyntheticDragEvent.js 1.07 kB {6} [built]
  [152] (webpack)/~/react-dom/lib/SyntheticFocusEvent.js 1.07 kB {6} [built]
  [153] (webpack)/~/react-dom/lib/SyntheticInputEvent.js 1.09 kB {6} [built]
  [154] (webpack)/~/react-dom/lib/SyntheticKeyboardEvent.js 2.71 kB {6} [built]
chunk    {7} b37172807f93b7d59181.js 50 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [15] ./example.js 2:0-22
   [39] (webpack)/~/react-dom/lib/DOMLazyTree.js 3.71 kB {7} [built]
   [40] (webpack)/~/react-dom/lib/DOMProperty.js 8.24 kB {7} [built]
   [52] (webpack)/~/react-dom/lib/DOMChildrenOperations.js 7.67 kB {7} [built]
   [53] (webpack)/~/react-dom/lib/DOMNamespaces.js 505 bytes {7} [built]
   [73] (webpack)/~/react-dom/lib/CallbackQueue.js 3.16 kB {7} [built]
   [74] (webpack)/~/react-dom/lib/DOMPropertyOperations.js 7.61 kB {7} [built]
   [75] (webpack)/~/react-dom/lib/ReactDOMComponentFlags.js 429 bytes {7} [built]
  [108] (webpack)/~/react-dom/lib/CSSPropertyOperations.js 6.87 kB {7} [built]
  [109] (webpack)/~/react-dom/lib/ChangeEventPlugin.js 11.8 kB {7} [built]
chunk    {8} 2fcd17b3e056f863b2d3.js 50 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [15] ./example.js 2:0-22
   [81] (webpack)/~/react-dom/lib/ReactMount.js 25.5 kB {8} [built]
  [137] (webpack)/~/react-dom/lib/ReactMultiChild.js 14.6 kB {8} [built]
  [140] (webpack)/~/react-dom/lib/ReactReconcileTransaction.js 5.26 kB {8} [built]
  [142] (webpack)/~/react-dom/lib/ReactServerRenderingTransaction.js 2.29 kB {8} [built]
  [148] (webpack)/~/react-dom/lib/SyntheticAnimationEvent.js 1.21 kB {8} [built]
  [149] (webpack)/~/react-dom/lib/SyntheticClipboardEvent.js 1.17 kB {8} [built]
chunk    {9} 766d1060910b08c5b00b.js 32.9 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [15] ./example.js 2:0-22
   [66] (webpack)/~/react-dom/lib/shouldUpdateReactComponent.js 1.4 kB {9} [built]
   [67] (webpack)/~/react-dom/lib/validateDOMNesting.js 13.7 kB {9} [built]
   [91] (webpack)/~/react-dom/lib/traverseAllChildren.js 7.04 kB {9} [built]
   [92] (webpack)/~/react/lib/ReactComponentTreeHook.js 10.4 kB {9} [built]
  [168] (webpack)/~/react/lib/getNextDebugID.js 437 bytes {9} [built]
chunk   {10} 7731c65a1a824990e2dd.js 50 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [15] ./example.js 2:0-22
   [77] (webpack)/~/react-dom/lib/ReactEmptyComponent.js 704 bytes {10} [built]
  [117] (webpack)/~/react-dom/lib/ReactCompositeComponent.js 35.2 kB {10} [built]
  [124] (webpack)/~/react-dom/lib/ReactDOMInput.js 13 kB {10} [built]
  [132] (webpack)/~/react-dom/lib/ReactElementSymbol.js 622 bytes {10} [built]
  [139] (webpack)/~/react-dom/lib/ReactPropTypesSecret.js 442 bytes {10} [built]
chunk   {11} 32f25aae39ba65782773.js 49.7 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [15] ./example.js 2:0-22
   [76] (webpack)/~/react-dom/lib/ReactDOMSelect.js 6.81 kB {11} [built]
   [78] (webpack)/~/react-dom/lib/ReactFeatureFlags.js 628 bytes {11} [built]
  [119] (webpack)/~/react-dom/lib/ReactDOMComponent.js 38.5 kB {11} [built]
  [129] (webpack)/~/react-dom/lib/ReactDOMTreeTraversal.js 3.72 kB {11} [built]
chunk   {12} 98d8187845fe0bf1e18c.js 50 kB [entry] [rendered] [recorded]
    > aggressive-splitted main [15] ./example.js 
    [0] (webpack)/~/fbjs/lib/warning.js 2.1 kB {12} [built]
    [1] (webpack)/~/fbjs/lib/invariant.js 1.63 kB {12} [built]
    [4] (webpack)/~/object-assign/index.js 2.11 kB {12} [built]
    [5] (webpack)/~/fbjs/lib/emptyFunction.js 1.08 kB {12} [built]
    [6] (webpack)/~/fbjs/lib/emptyObject.js 458 bytes {12} [built]
    [7] (webpack)/~/react/lib/ReactComponent.js 4.61 kB {12} [built]
    [9] (webpack)/~/react/lib/ReactCurrentOwner.js 623 bytes {12} [built]
   [13] (webpack)/~/react/lib/React.js 3.32 kB {12} [built]
   [14] (webpack)/~/prop-types/factory.js 890 bytes {12} [built]
   [16] (webpack)/~/prop-types/checkPropTypes.js 2.94 kB {12} [built]
   [17] (webpack)/~/prop-types/factoryWithTypeCheckers.js 18.6 kB {12} [built]
   [18] (webpack)/~/prop-types/lib/ReactPropTypesSecret.js 436 bytes {12} [built]
   [20] (webpack)/~/react/lib/KeyEscapeUtils.js 1.29 kB {12} [built]
   [21] (webpack)/~/react/lib/PooledClass.js 3.36 kB {12} [built]
   [22] (webpack)/~/react/lib/ReactChildren.js 6.19 kB {12} [built]
   [28] (webpack)/~/react/lib/ReactVersion.js 350 bytes {12} [built]
chunk   {13} b86956e055f0f09d9e19.js 30.6 kB [initial] [rendered]
    > aggressive-splitted main [15] ./example.js 
    [2] (webpack)/~/react/lib/ReactElement.js 11.2 kB {13} [built]
    [3] (webpack)/~/react/lib/reactProdInvariant.js 1.24 kB {13} [built]
   [11] (webpack)/~/react/lib/canDefineProperty.js 661 bytes {13} [built]
   [12] (webpack)/~/react/react.js 56 bytes {13} [built]
   [15] ./example.js 44 bytes {13} [built]
   [24] (webpack)/~/react/lib/ReactDOMFactories.js 5.53 kB {13} [built]
   [25] (webpack)/~/react/lib/ReactPropTypeLocationNames.js 572 bytes {13} [built]
   [26] (webpack)/~/react/lib/ReactPropTypes.js 500 bytes {13} [built]
   [27] (webpack)/~/react/lib/ReactPureComponent.js 1.32 kB {13} [built]
   [29] (webpack)/~/react/lib/getIteratorFn.js 1.12 kB {13} [built]
   [30] (webpack)/~/react/lib/onlyChild.js 1.34 kB {13} [built]
   [31] (webpack)/~/react/lib/traverseAllChildren.js 7.03 kB {13} [built]
chunk   {14} 141c9029a3b722f94828.js 30.9 kB [initial] [rendered] [recorded]
    > aggressive-splitted main [15] ./example.js 
    [8] (webpack)/~/react/lib/ReactNoopUpdateQueue.js 3.36 kB {14} [built]
   [10] (webpack)/~/react/lib/ReactElementSymbol.js 622 bytes {14} [built]
   [23] (webpack)/~/react/lib/ReactClass.js 26.9 kB {14} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: 5eb645c89262ade6ab18
Version: webpack 2.6.0
                  Asset     Size  Chunks             Chunk Names
b37172807f93b7d59181.js  10.4 kB       7  [emitted]  
f0597ceec26d85e14094.js  12.3 kB       0  [emitted]  
4bb149689ae97f5d46e7.js  7.08 kB       2  [emitted]  
8940e378350d3e1324c1.js  9.58 kB       3  [emitted]  
f45002fdb16fe5adab39.js    12 kB       4  [emitted]  
41c4bfca01dacc328b9b.js  11.5 kB       5  [emitted]  
79966dbf56b74a83076f.js  13.3 kB       6  [emitted]  
118f4e8acf782daf7bde.js  11.1 kB       1  [emitted]  
2fcd17b3e056f863b2d3.js  8.29 kB       8  [emitted]  
766d1060910b08c5b00b.js  4.87 kB       9  [emitted]  
7731c65a1a824990e2dd.js  10.2 kB      10  [emitted]  
32f25aae39ba65782773.js  12.5 kB      11  [emitted]  
98d8187845fe0bf1e18c.js    12 kB      12  [emitted]  
b86956e055f0f09d9e19.js  6.08 kB      13  [emitted]  
141c9029a3b722f94828.js  3.81 kB      14  [emitted]  
Entrypoint main = 98d8187845fe0bf1e18c.js 141c9029a3b722f94828.js b86956e055f0f09d9e19.js
chunk    {0} f0597ceec26d85e14094.js 50 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [15] ./example.js 2:0-22
   [19] (webpack)/~/react-dom/index.js 59 bytes {0} [built]
   [34] (webpack)/~/fbjs/lib/ExecutionEnvironment.js 1.06 kB {0} [built]
   [51] (webpack)/~/fbjs/lib/shallowEqual.js 1.74 kB {0} [built]
   [68] (webpack)/~/fbjs/lib/EventListener.js 2.67 kB {0} [built]
   [69] (webpack)/~/fbjs/lib/focusNode.js 704 bytes {0} [built]
   [70] (webpack)/~/fbjs/lib/getActiveElement.js 1.04 kB {0} [built]
   [71] (webpack)/~/process/browser.js 5.42 kB {0} [built]
   [72] (webpack)/~/react-dom/lib/CSSProperty.js 3.66 kB {0} [built]
   [93] (webpack)/~/fbjs/lib/camelize.js 708 bytes {0} [built]
   [94] (webpack)/~/fbjs/lib/camelizeStyleName.js 1 kB {0} [built]
   [95] (webpack)/~/fbjs/lib/containsNode.js 1.05 kB {0} [built]
   [96] (webpack)/~/fbjs/lib/createArrayFromMixed.js 4.11 kB {0} [built]
   [97] (webpack)/~/fbjs/lib/createNodesFromMarkup.js 2.66 kB {0} [built]
   [98] (webpack)/~/fbjs/lib/getMarkupWrap.js 3.04 kB {0} [built]
   [99] (webpack)/~/fbjs/lib/getUnboundedScrollPosition.js 1.12 kB {0} [built]
  [100] (webpack)/~/fbjs/lib/hyphenate.js 800 bytes {0} [built]
  [101] (webpack)/~/fbjs/lib/hyphenateStyleName.js 974 bytes {0} [built]
  [102] (webpack)/~/fbjs/lib/isNode.js 828 bytes {0} [built]
  [103] (webpack)/~/fbjs/lib/isTextNode.js 605 bytes {0} [built]
  [104] (webpack)/~/fbjs/lib/memoizeStringOnly.js 698 bytes {0} [built]
  [105] (webpack)/~/react-dom/lib/ARIADOMPropertyConfig.js 1.82 kB {0} [built]
  [106] (webpack)/~/react-dom/lib/AutoFocusUtils.js 599 bytes {0} [built]
  [107] (webpack)/~/react-dom/lib/BeforeInputEventPlugin.js 13.3 kB {0} [built]
  [144] (webpack)/~/react-dom/lib/ReactVersion.js 350 bytes {0} [built]
chunk    {1} 118f4e8acf782daf7bde.js 49.9 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [15] ./example.js 2:0-22
   [35] (webpack)/~/react-dom/lib/ReactInstrumentation.js 601 bytes {1} [built]
   [44] (webpack)/~/react-dom/lib/ReactInstanceMap.js 1.22 kB {1} [built]
   [59] (webpack)/~/react-dom/lib/ReactErrorUtils.js 2.19 kB {1} [built]
   [79] (webpack)/~/react-dom/lib/ReactHostComponent.js 1.98 kB {1} [built]
   [80] (webpack)/~/react-dom/lib/ReactInputSelection.js 4.27 kB {1} [built]
   [82] (webpack)/~/react-dom/lib/ReactNodeTypes.js 1.02 kB {1} [built]
  [126] (webpack)/~/react-dom/lib/ReactDOMSelection.js 6.78 kB {1} [built]
  [127] (webpack)/~/react-dom/lib/ReactDOMTextComponent.js 5.82 kB {1} [built]
  [128] (webpack)/~/react-dom/lib/ReactDOMTextarea.js 6.46 kB {1} [built]
  [131] (webpack)/~/react-dom/lib/ReactDefaultInjection.js 3.5 kB {1} [built]
  [133] (webpack)/~/react-dom/lib/ReactEventEmitterMixin.js 959 bytes {1} [built]
  [134] (webpack)/~/react-dom/lib/ReactEventListener.js 5.3 kB {1} [built]
  [135] (webpack)/~/react-dom/lib/ReactInjection.js 1.2 kB {1} [built]
  [136] (webpack)/~/react-dom/lib/ReactMarkupChecksum.js 1.47 kB {1} [built]
  [138] (webpack)/~/react-dom/lib/ReactOwner.js 3.53 kB {1} [built]
  [141] (webpack)/~/react-dom/lib/ReactRef.js 2.56 kB {1} [built]
  [150] (webpack)/~/react-dom/lib/SyntheticCompositionEvent.js 1.1 kB {1} [built]
chunk    {2} 4bb149689ae97f5d46e7.js 30.5 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [15] ./example.js 2:0-22
   [32] (webpack)/~/react-dom/lib/reactProdInvariant.js 1.24 kB {2} [built]
   [50] (webpack)/~/react-dom/lib/setInnerHTML.js 3.86 kB {2} [built]
   [63] (webpack)/~/react-dom/lib/getEventModifierState.js 1.23 kB {2} [built]
   [64] (webpack)/~/react-dom/lib/getEventTarget.js 1.01 kB {2} [built]
   [65] (webpack)/~/react-dom/lib/isEventSupported.js 1.94 kB {2} [built]
   [86] (webpack)/~/react-dom/lib/getHostComponentFromComposite.js 740 bytes {2} [built]
   [87] (webpack)/~/react-dom/lib/getTextContentAccessor.js 955 bytes {2} [built]
   [88] (webpack)/~/react-dom/lib/instantiateReactComponent.js 5.06 kB {2} [built]
   [89] (webpack)/~/react-dom/lib/isTextInputElement.js 1.04 kB {2} [built]
   [90] (webpack)/~/react-dom/lib/setTextContent.js 1.45 kB {2} [built]
  [161] (webpack)/~/react-dom/lib/flattenChildren.js 2.77 kB {2} [built]
  [162] (webpack)/~/react-dom/lib/getEventKey.js 2.87 kB {2} [built]
  [163] (webpack)/~/react-dom/lib/getIteratorFn.js 1.12 kB {2} [built]
  [164] (webpack)/~/react-dom/lib/getNodeForCharacterOffset.js 1.62 kB {2} [built]
  [165] (webpack)/~/react-dom/lib/getVendorPrefixedEventName.js 2.87 kB {2} [built]
  [166] (webpack)/~/react-dom/lib/quoteAttributeValueForBrowser.js 700 bytes {2} [built]
chunk    {3} 8940e378350d3e1324c1.js 49.7 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [15] ./example.js 2:0-22
   [37] (webpack)/~/react-dom/lib/SyntheticEvent.js 9.18 kB {3} [built]
   [45] (webpack)/~/react-dom/lib/SyntheticUIEvent.js 1.57 kB {3} [built]
   [47] (webpack)/~/react-dom/lib/SyntheticMouseEvent.js 2.14 kB {3} [built]
   [48] (webpack)/~/react-dom/lib/Transaction.js 9.45 kB {3} [built]
   [49] (webpack)/~/react-dom/lib/escapeTextContentForBrowser.js 3.43 kB {3} [built]
   [61] (webpack)/~/react-dom/lib/createMicrosoftUnsafeLocalFunction.js 810 bytes {3} [built]
   [62] (webpack)/~/react-dom/lib/getEventCharCode.js 1.5 kB {3} [built]
   [84] (webpack)/~/react-dom/lib/accumulateInto.js 1.69 kB {3} [built]
   [85] (webpack)/~/react-dom/lib/forEachAccumulated.js 855 bytes {3} [built]
  [147] (webpack)/~/react-dom/lib/SimpleEventPlugin.js 7.97 kB {3} [built]
  [155] (webpack)/~/react-dom/lib/SyntheticTouchEvent.js 1.28 kB {3} [built]
  [156] (webpack)/~/react-dom/lib/SyntheticTransitionEvent.js 1.23 kB {3} [built]
  [157] (webpack)/~/react-dom/lib/SyntheticWheelEvent.js 1.94 kB {3} [built]
  [158] (webpack)/~/react-dom/lib/adler32.js 1.19 kB {3} [built]
  [159] (webpack)/~/react-dom/lib/dangerousStyleValue.js 3.02 kB {3} [built]
  [160] (webpack)/~/react-dom/lib/findDOMNode.js 2.46 kB {3} [built]
chunk    {4} f45002fdb16fe5adab39.js 49.8 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [15] ./example.js 2:0-22
   [33] (webpack)/~/react-dom/lib/ReactDOMComponentTree.js 6.27 kB {4} [built]
   [38] (webpack)/~/react-dom/lib/PooledClass.js 3.36 kB {4} [built]
   [46] (webpack)/~/react-dom/lib/ReactBrowserEventEmitter.js 12.6 kB {4} [built]
   [57] (webpack)/~/react-dom/lib/LinkedValueUtils.js 5.25 kB {4} [built]
   [58] (webpack)/~/react-dom/lib/ReactComponentEnvironment.js 1.3 kB {4} [built]
  [115] (webpack)/~/react-dom/lib/ReactChildReconciler.js 6.11 kB {4} [built]
  [118] (webpack)/~/react-dom/lib/ReactDOM.js 5.14 kB {4} [built]
  [120] (webpack)/~/react-dom/lib/ReactDOMContainerInfo.js 967 bytes {4} [built]
  [121] (webpack)/~/react-dom/lib/ReactDOMEmptyComponent.js 1.9 kB {4} [built]
  [122] (webpack)/~/react-dom/lib/ReactDOMFeatureFlags.js 439 bytes {4} [built]
  [123] (webpack)/~/react-dom/lib/ReactDOMIDOperations.js 956 bytes {4} [built]
  [125] (webpack)/~/react-dom/lib/ReactDOMOption.js 3.69 kB {4} [built]
  [130] (webpack)/~/react-dom/lib/ReactDefaultBatchingStrategy.js 1.88 kB {4} [built]
chunk    {5} 41c4bfca01dacc328b9b.js 50 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [15] ./example.js 2:0-22
   [42] (webpack)/~/react-dom/lib/EventPluginHub.js 9.11 kB {5} [built]
   [43] (webpack)/~/react-dom/lib/EventPropagators.js 5.09 kB {5} [built]
   [54] (webpack)/~/react-dom/lib/EventPluginRegistry.js 9.75 kB {5} [built]
   [55] (webpack)/~/react-dom/lib/EventPluginUtils.js 7.95 kB {5} [built]
   [56] (webpack)/~/react-dom/lib/KeyEscapeUtils.js 1.29 kB {5} [built]
  [110] (webpack)/~/react-dom/lib/Danger.js 2.24 kB {5} [built]
  [111] (webpack)/~/react-dom/lib/DefaultEventPluginOrder.js 1.08 kB {5} [built]
  [112] (webpack)/~/react-dom/lib/EnterLeaveEventPlugin.js 3.16 kB {5} [built]
  [113] (webpack)/~/react-dom/lib/FallbackCompositionState.js 2.43 kB {5} [built]
  [114] (webpack)/~/react-dom/lib/HTMLDOMPropertyConfig.js 6.57 kB {5} [built]
  [116] (webpack)/~/react-dom/lib/ReactComponentBrowserEnvironment.js 906 bytes {5} [built]
  [167] (webpack)/~/react-dom/lib/renderSubtreeIntoContainer.js 422 bytes {5} [built]
chunk    {6} 79966dbf56b74a83076f.js 49.8 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [15] ./example.js 2:0-22
   [36] (webpack)/~/react-dom/lib/ReactUpdates.js 9.53 kB {6} [built]
   [41] (webpack)/~/react-dom/lib/ReactReconciler.js 6.21 kB {6} [built]
   [60] (webpack)/~/react-dom/lib/ReactUpdateQueue.js 9.36 kB {6} [built]
   [83] (webpack)/~/react-dom/lib/ViewportMetrics.js 606 bytes {6} [built]
  [143] (webpack)/~/react-dom/lib/ReactServerUpdateQueue.js 4.83 kB {6} [built]
  [145] (webpack)/~/react-dom/lib/SVGDOMPropertyConfig.js 7.32 kB {6} [built]
  [146] (webpack)/~/react-dom/lib/SelectEventPlugin.js 6.06 kB {6} [built]
  [151] (webpack)/~/react-dom/lib/SyntheticDragEvent.js 1.07 kB {6} [built]
  [152] (webpack)/~/react-dom/lib/SyntheticFocusEvent.js 1.07 kB {6} [built]
  [153] (webpack)/~/react-dom/lib/SyntheticInputEvent.js 1.09 kB {6} [built]
  [154] (webpack)/~/react-dom/lib/SyntheticKeyboardEvent.js 2.71 kB {6} [built]
chunk    {7} b37172807f93b7d59181.js 50 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [15] ./example.js 2:0-22
   [39] (webpack)/~/react-dom/lib/DOMLazyTree.js 3.71 kB {7} [built]
   [40] (webpack)/~/react-dom/lib/DOMProperty.js 8.24 kB {7} [built]
   [52] (webpack)/~/react-dom/lib/DOMChildrenOperations.js 7.67 kB {7} [built]
   [53] (webpack)/~/react-dom/lib/DOMNamespaces.js 505 bytes {7} [built]
   [73] (webpack)/~/react-dom/lib/CallbackQueue.js 3.16 kB {7} [built]
   [74] (webpack)/~/react-dom/lib/DOMPropertyOperations.js 7.61 kB {7} [built]
   [75] (webpack)/~/react-dom/lib/ReactDOMComponentFlags.js 429 bytes {7} [built]
  [108] (webpack)/~/react-dom/lib/CSSPropertyOperations.js 6.87 kB {7} [built]
  [109] (webpack)/~/react-dom/lib/ChangeEventPlugin.js 11.8 kB {7} [built]
chunk    {8} 2fcd17b3e056f863b2d3.js 50 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [15] ./example.js 2:0-22
   [81] (webpack)/~/react-dom/lib/ReactMount.js 25.5 kB {8} [built]
  [137] (webpack)/~/react-dom/lib/ReactMultiChild.js 14.6 kB {8} [built]
  [140] (webpack)/~/react-dom/lib/ReactReconcileTransaction.js 5.26 kB {8} [built]
  [142] (webpack)/~/react-dom/lib/ReactServerRenderingTransaction.js 2.29 kB {8} [built]
  [148] (webpack)/~/react-dom/lib/SyntheticAnimationEvent.js 1.21 kB {8} [built]
  [149] (webpack)/~/react-dom/lib/SyntheticClipboardEvent.js 1.17 kB {8} [built]
chunk    {9} 766d1060910b08c5b00b.js 32.9 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [15] ./example.js 2:0-22
   [66] (webpack)/~/react-dom/lib/shouldUpdateReactComponent.js 1.4 kB {9} [built]
   [67] (webpack)/~/react-dom/lib/validateDOMNesting.js 13.7 kB {9} [built]
   [91] (webpack)/~/react-dom/lib/traverseAllChildren.js 7.04 kB {9} [built]
   [92] (webpack)/~/react/lib/ReactComponentTreeHook.js 10.4 kB {9} [built]
  [168] (webpack)/~/react/lib/getNextDebugID.js 437 bytes {9} [built]
chunk   {10} 7731c65a1a824990e2dd.js 50 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [15] ./example.js 2:0-22
   [77] (webpack)/~/react-dom/lib/ReactEmptyComponent.js 704 bytes {10} [built]
  [117] (webpack)/~/react-dom/lib/ReactCompositeComponent.js 35.2 kB {10} [built]
  [124] (webpack)/~/react-dom/lib/ReactDOMInput.js 13 kB {10} [built]
  [132] (webpack)/~/react-dom/lib/ReactElementSymbol.js 622 bytes {10} [built]
  [139] (webpack)/~/react-dom/lib/ReactPropTypesSecret.js 442 bytes {10} [built]
chunk   {11} 32f25aae39ba65782773.js 49.7 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [15] ./example.js 2:0-22
   [76] (webpack)/~/react-dom/lib/ReactDOMSelect.js 6.81 kB {11} [built]
   [78] (webpack)/~/react-dom/lib/ReactFeatureFlags.js 628 bytes {11} [built]
  [119] (webpack)/~/react-dom/lib/ReactDOMComponent.js 38.5 kB {11} [built]
  [129] (webpack)/~/react-dom/lib/ReactDOMTreeTraversal.js 3.72 kB {11} [built]
chunk   {12} 98d8187845fe0bf1e18c.js 50 kB [entry] [rendered] [recorded]
    > aggressive-splitted main [15] ./example.js 
    [0] (webpack)/~/fbjs/lib/warning.js 2.1 kB {12} [built]
    [1] (webpack)/~/fbjs/lib/invariant.js 1.63 kB {12} [built]
    [4] (webpack)/~/object-assign/index.js 2.11 kB {12} [built]
    [5] (webpack)/~/fbjs/lib/emptyFunction.js 1.08 kB {12} [built]
    [6] (webpack)/~/fbjs/lib/emptyObject.js 458 bytes {12} [built]
    [7] (webpack)/~/react/lib/ReactComponent.js 4.61 kB {12} [built]
    [9] (webpack)/~/react/lib/ReactCurrentOwner.js 623 bytes {12} [built]
   [13] (webpack)/~/react/lib/React.js 3.32 kB {12} [built]
   [14] (webpack)/~/prop-types/factory.js 890 bytes {12} [built]
   [16] (webpack)/~/prop-types/checkPropTypes.js 2.94 kB {12} [built]
   [17] (webpack)/~/prop-types/factoryWithTypeCheckers.js 18.6 kB {12} [built]
   [18] (webpack)/~/prop-types/lib/ReactPropTypesSecret.js 436 bytes {12} [built]
   [20] (webpack)/~/react/lib/KeyEscapeUtils.js 1.29 kB {12} [built]
   [21] (webpack)/~/react/lib/PooledClass.js 3.36 kB {12} [built]
   [22] (webpack)/~/react/lib/ReactChildren.js 6.19 kB {12} [built]
   [28] (webpack)/~/react/lib/ReactVersion.js 350 bytes {12} [built]
chunk   {13} b86956e055f0f09d9e19.js 30.6 kB [initial] [rendered]
    > aggressive-splitted main [15] ./example.js 
    [2] (webpack)/~/react/lib/ReactElement.js 11.2 kB {13} [built]
    [3] (webpack)/~/react/lib/reactProdInvariant.js 1.24 kB {13} [built]
   [11] (webpack)/~/react/lib/canDefineProperty.js 661 bytes {13} [built]
   [12] (webpack)/~/react/react.js 56 bytes {13} [built]
   [15] ./example.js 44 bytes {13} [built]
   [24] (webpack)/~/react/lib/ReactDOMFactories.js 5.53 kB {13} [built]
   [25] (webpack)/~/react/lib/ReactPropTypeLocationNames.js 572 bytes {13} [built]
   [26] (webpack)/~/react/lib/ReactPropTypes.js 500 bytes {13} [built]
   [27] (webpack)/~/react/lib/ReactPureComponent.js 1.32 kB {13} [built]
   [29] (webpack)/~/react/lib/getIteratorFn.js 1.12 kB {13} [built]
   [30] (webpack)/~/react/lib/onlyChild.js 1.34 kB {13} [built]
   [31] (webpack)/~/react/lib/traverseAllChildren.js 7.03 kB {13} [built]
chunk   {14} 141c9029a3b722f94828.js 30.9 kB [initial] [rendered] [recorded]
    > aggressive-splitted main [15] ./example.js 
    [8] (webpack)/~/react/lib/ReactNoopUpdateQueue.js 3.36 kB {14} [built]
   [10] (webpack)/~/react/lib/ReactElementSymbol.js 622 bytes {14} [built]
   [23] (webpack)/~/react/lib/ReactClass.js 26.9 kB {14} [built]
```

## Records

```
{
  "modules": {
    "byIdentifier": {
      "../../node_modules/fbjs/lib/warning.js": 0,
      "../../node_modules/fbjs/lib/invariant.js": 1,
      "../../node_modules/react/lib/ReactElement.js": 2,
      "../../node_modules/react/lib/reactProdInvariant.js": 3,
      "../../node_modules/object-assign/index.js": 4,
      "../../node_modules/fbjs/lib/emptyFunction.js": 5,
      "../../node_modules/fbjs/lib/emptyObject.js": 6,
      "../../node_modules/react/lib/ReactComponent.js": 7,
      "../../node_modules/react/lib/ReactNoopUpdateQueue.js": 8,
      "../../node_modules/react/lib/ReactCurrentOwner.js": 9,
      "../../node_modules/react/lib/ReactElementSymbol.js": 10,
      "../../node_modules/react/lib/canDefineProperty.js": 11,
      "../../node_modules/react/react.js": 12,
      "../../node_modules/react/lib/React.js": 13,
      "../../node_modules/prop-types/factory.js": 14,
      "example.js": 15,
      "../../node_modules/prop-types/checkPropTypes.js": 16,
      "../../node_modules/prop-types/factoryWithTypeCheckers.js": 17,
      "../../node_modules/prop-types/lib/ReactPropTypesSecret.js": 18,
      "../../node_modules/react-dom/index.js": 19,
      "../../node_modules/react/lib/KeyEscapeUtils.js": 20,
      "../../node_modules/react/lib/PooledClass.js": 21,
      "../../node_modules/react/lib/ReactChildren.js": 22,
      "../../node_modules/react/lib/ReactClass.js": 23,
      "../../node_modules/react/lib/ReactDOMFactories.js": 24,
      "../../node_modules/react/lib/ReactPropTypeLocationNames.js": 25,
      "../../node_modules/react/lib/ReactPropTypes.js": 26,
      "../../node_modules/react/lib/ReactPureComponent.js": 27,
      "../../node_modules/react/lib/ReactVersion.js": 28,
      "../../node_modules/react/lib/getIteratorFn.js": 29,
      "../../node_modules/react/lib/onlyChild.js": 30,
      "../../node_modules/react/lib/traverseAllChildren.js": 31,
      "../../node_modules/react-dom/lib/reactProdInvariant.js": 32,
      "../../node_modules/react-dom/lib/ReactDOMComponentTree.js": 33,
      "../../node_modules/fbjs/lib/ExecutionEnvironment.js": 34,
      "../../node_modules/react-dom/lib/ReactInstrumentation.js": 35,
      "../../node_modules/react-dom/lib/ReactUpdates.js": 36,
      "../../node_modules/react-dom/lib/SyntheticEvent.js": 37,
      "../../node_modules/react-dom/lib/PooledClass.js": 38,
      "../../node_modules/react-dom/lib/DOMLazyTree.js": 39,
      "../../node_modules/react-dom/lib/DOMProperty.js": 40,
      "../../node_modules/react-dom/lib/ReactReconciler.js": 41,
      "../../node_modules/react-dom/lib/EventPluginHub.js": 42,
      "../../node_modules/react-dom/lib/EventPropagators.js": 43,
      "../../node_modules/react-dom/lib/ReactInstanceMap.js": 44,
      "../../node_modules/react-dom/lib/SyntheticUIEvent.js": 45,
      "../../node_modules/react-dom/lib/ReactBrowserEventEmitter.js": 46,
      "../../node_modules/react-dom/lib/SyntheticMouseEvent.js": 47,
      "../../node_modules/react-dom/lib/Transaction.js": 48,
      "../../node_modules/react-dom/lib/escapeTextContentForBrowser.js": 49,
      "../../node_modules/react-dom/lib/setInnerHTML.js": 50,
      "../../node_modules/fbjs/lib/shallowEqual.js": 51,
      "../../node_modules/react-dom/lib/DOMChildrenOperations.js": 52,
      "../../node_modules/react-dom/lib/DOMNamespaces.js": 53,
      "../../node_modules/react-dom/lib/EventPluginRegistry.js": 54,
      "../../node_modules/react-dom/lib/EventPluginUtils.js": 55,
      "../../node_modules/react-dom/lib/KeyEscapeUtils.js": 56,
      "../../node_modules/react-dom/lib/LinkedValueUtils.js": 57,
      "../../node_modules/react-dom/lib/ReactComponentEnvironment.js": 58,
      "../../node_modules/react-dom/lib/ReactErrorUtils.js": 59,
      "../../node_modules/react-dom/lib/ReactUpdateQueue.js": 60,
      "../../node_modules/react-dom/lib/createMicrosoftUnsafeLocalFunction.js": 61,
      "../../node_modules/react-dom/lib/getEventCharCode.js": 62,
      "../../node_modules/react-dom/lib/getEventModifierState.js": 63,
      "../../node_modules/react-dom/lib/getEventTarget.js": 64,
      "../../node_modules/react-dom/lib/isEventSupported.js": 65,
      "../../node_modules/react-dom/lib/shouldUpdateReactComponent.js": 66,
      "../../node_modules/react-dom/lib/validateDOMNesting.js": 67,
      "../../node_modules/fbjs/lib/EventListener.js": 68,
      "../../node_modules/fbjs/lib/focusNode.js": 69,
      "../../node_modules/fbjs/lib/getActiveElement.js": 70,
      "../../node_modules/process/browser.js": 71,
      "../../node_modules/react-dom/lib/CSSProperty.js": 72,
      "../../node_modules/react-dom/lib/CallbackQueue.js": 73,
      "../../node_modules/react-dom/lib/DOMPropertyOperations.js": 74,
      "../../node_modules/react-dom/lib/ReactDOMComponentFlags.js": 75,
      "../../node_modules/react-dom/lib/ReactDOMSelect.js": 76,
      "../../node_modules/react-dom/lib/ReactEmptyComponent.js": 77,
      "../../node_modules/react-dom/lib/ReactFeatureFlags.js": 78,
      "../../node_modules/react-dom/lib/ReactHostComponent.js": 79,
      "../../node_modules/react-dom/lib/ReactInputSelection.js": 80,
      "../../node_modules/react-dom/lib/ReactMount.js": 81,
      "../../node_modules/react-dom/lib/ReactNodeTypes.js": 82,
      "../../node_modules/react-dom/lib/ViewportMetrics.js": 83,
      "../../node_modules/react-dom/lib/accumulateInto.js": 84,
      "../../node_modules/react-dom/lib/forEachAccumulated.js": 85,
      "../../node_modules/react-dom/lib/getHostComponentFromComposite.js": 86,
      "../../node_modules/react-dom/lib/getTextContentAccessor.js": 87,
      "../../node_modules/react-dom/lib/instantiateReactComponent.js": 88,
      "../../node_modules/react-dom/lib/isTextInputElement.js": 89,
      "../../node_modules/react-dom/lib/setTextContent.js": 90,
      "../../node_modules/react-dom/lib/traverseAllChildren.js": 91,
      "../../node_modules/react/lib/ReactComponentTreeHook.js": 92,
      "../../node_modules/fbjs/lib/camelize.js": 93,
      "../../node_modules/fbjs/lib/camelizeStyleName.js": 94,
      "../../node_modules/fbjs/lib/containsNode.js": 95,
      "../../node_modules/fbjs/lib/createArrayFromMixed.js": 96,
      "../../node_modules/fbjs/lib/createNodesFromMarkup.js": 97,
      "../../node_modules/fbjs/lib/getMarkupWrap.js": 98,
      "../../node_modules/fbjs/lib/getUnboundedScrollPosition.js": 99,
      "../../node_modules/fbjs/lib/hyphenate.js": 100,
      "../../node_modules/fbjs/lib/hyphenateStyleName.js": 101,
      "../../node_modules/fbjs/lib/isNode.js": 102,
      "../../node_modules/fbjs/lib/isTextNode.js": 103,
      "../../node_modules/fbjs/lib/memoizeStringOnly.js": 104,
      "../../node_modules/react-dom/lib/ARIADOMPropertyConfig.js": 105,
      "../../node_modules/react-dom/lib/AutoFocusUtils.js": 106,
      "../../node_modules/react-dom/lib/BeforeInputEventPlugin.js": 107,
      "../../node_modules/react-dom/lib/CSSPropertyOperations.js": 108,
      "../../node_modules/react-dom/lib/ChangeEventPlugin.js": 109,
      "../../node_modules/react-dom/lib/Danger.js": 110,
      "../../node_modules/react-dom/lib/DefaultEventPluginOrder.js": 111,
      "../../node_modules/react-dom/lib/EnterLeaveEventPlugin.js": 112,
      "../../node_modules/react-dom/lib/FallbackCompositionState.js": 113,
      "../../node_modules/react-dom/lib/HTMLDOMPropertyConfig.js": 114,
      "../../node_modules/react-dom/lib/ReactChildReconciler.js": 115,
      "../../node_modules/react-dom/lib/ReactComponentBrowserEnvironment.js": 116,
      "../../node_modules/react-dom/lib/ReactCompositeComponent.js": 117,
      "../../node_modules/react-dom/lib/ReactDOM.js": 118,
      "../../node_modules/react-dom/lib/ReactDOMComponent.js": 119,
      "../../node_modules/react-dom/lib/ReactDOMContainerInfo.js": 120,
      "../../node_modules/react-dom/lib/ReactDOMEmptyComponent.js": 121,
      "../../node_modules/react-dom/lib/ReactDOMFeatureFlags.js": 122,
      "../../node_modules/react-dom/lib/ReactDOMIDOperations.js": 123,
      "../../node_modules/react-dom/lib/ReactDOMInput.js": 124,
      "../../node_modules/react-dom/lib/ReactDOMOption.js": 125,
      "../../node_modules/react-dom/lib/ReactDOMSelection.js": 126,
      "../../node_modules/react-dom/lib/ReactDOMTextComponent.js": 127,
      "../../node_modules/react-dom/lib/ReactDOMTextarea.js": 128,
      "../../node_modules/react-dom/lib/ReactDOMTreeTraversal.js": 129,
      "../../node_modules/react-dom/lib/ReactDefaultBatchingStrategy.js": 130,
      "../../node_modules/react-dom/lib/ReactDefaultInjection.js": 131,
      "../../node_modules/react-dom/lib/ReactElementSymbol.js": 132,
      "../../node_modules/react-dom/lib/ReactEventEmitterMixin.js": 133,
      "../../node_modules/react-dom/lib/ReactEventListener.js": 134,
      "../../node_modules/react-dom/lib/ReactInjection.js": 135,
      "../../node_modules/react-dom/lib/ReactMarkupChecksum.js": 136,
      "../../node_modules/react-dom/lib/ReactMultiChild.js": 137,
      "../../node_modules/react-dom/lib/ReactOwner.js": 138,
      "../../node_modules/react-dom/lib/ReactPropTypesSecret.js": 139,
      "../../node_modules/react-dom/lib/ReactReconcileTransaction.js": 140,
      "../../node_modules/react-dom/lib/ReactRef.js": 141,
      "../../node_modules/react-dom/lib/ReactServerRenderingTransaction.js": 142,
      "../../node_modules/react-dom/lib/ReactServerUpdateQueue.js": 143,
      "../../node_modules/react-dom/lib/ReactVersion.js": 144,
      "../../node_modules/react-dom/lib/SVGDOMPropertyConfig.js": 145,
      "../../node_modules/react-dom/lib/SelectEventPlugin.js": 146,
      "../../node_modules/react-dom/lib/SimpleEventPlugin.js": 147,
      "../../node_modules/react-dom/lib/SyntheticAnimationEvent.js": 148,
      "../../node_modules/react-dom/lib/SyntheticClipboardEvent.js": 149,
      "../../node_modules/react-dom/lib/SyntheticCompositionEvent.js": 150,
      "../../node_modules/react-dom/lib/SyntheticDragEvent.js": 151,
      "../../node_modules/react-dom/lib/SyntheticFocusEvent.js": 152,
      "../../node_modules/react-dom/lib/SyntheticInputEvent.js": 153,
      "../../node_modules/react-dom/lib/SyntheticKeyboardEvent.js": 154,
      "../../node_modules/react-dom/lib/SyntheticTouchEvent.js": 155,
      "../../node_modules/react-dom/lib/SyntheticTransitionEvent.js": 156,
      "../../node_modules/react-dom/lib/SyntheticWheelEvent.js": 157,
      "../../node_modules/react-dom/lib/adler32.js": 158,
      "../../node_modules/react-dom/lib/dangerousStyleValue.js": 159,
      "../../node_modules/react-dom/lib/findDOMNode.js": 160,
      "../../node_modules/react-dom/lib/flattenChildren.js": 161,
      "../../node_modules/react-dom/lib/getEventKey.js": 162,
      "../../node_modules/react-dom/lib/getIteratorFn.js": 163,
      "../../node_modules/react-dom/lib/getNodeForCharacterOffset.js": 164,
      "../../node_modules/react-dom/lib/getVendorPrefixedEventName.js": 165,
      "../../node_modules/react-dom/lib/quoteAttributeValueForBrowser.js": 166,
      "../../node_modules/react-dom/lib/renderSubtreeIntoContainer.js": 167,
      "../../node_modules/react/lib/getNextDebugID.js": 168
    },
    "usedIds": {
      "0": 0,
      "1": 1,
      "2": 2,
      "3": 3,
      "4": 4,
      "5": 5,
      "6": 6,
      "7": 7,
      "8": 8,
      "9": 9,
      "10": 10,
      "11": 11,
      "12": 12,
      "13": 13,
      "14": 14,
      "15": 15,
      "16": 16,
      "17": 17,
      "18": 18,
      "19": 19,
      "20": 20,
      "21": 21,
      "22": 22,
      "23": 23,
      "24": 24,
      "25": 25,
      "26": 26,
      "27": 27,
      "28": 28,
      "29": 29,
      "30": 30,
      "31": 31,
      "32": 32,
      "33": 33,
      "34": 34,
      "35": 35,
      "36": 36,
      "37": 37,
      "38": 38,
      "39": 39,
      "40": 40,
      "41": 41,
      "42": 42,
      "43": 43,
      "44": 44,
      "45": 45,
      "46": 46,
      "47": 47,
      "48": 48,
      "49": 49,
      "50": 50,
      "51": 51,
      "52": 52,
      "53": 53,
      "54": 54,
      "55": 55,
      "56": 56,
      "57": 57,
      "58": 58,
      "59": 59,
      "60": 60,
      "61": 61,
      "62": 62,
      "63": 63,
      "64": 64,
      "65": 65,
      "66": 66,
      "67": 67,
      "68": 68,
      "69": 69,
      "70": 70,
      "71": 71,
      "72": 72,
      "73": 73,
      "74": 74,
      "75": 75,
      "76": 76,
      "77": 77,
      "78": 78,
      "79": 79,
      "80": 80,
      "81": 81,
      "82": 82,
      "83": 83,
      "84": 84,
      "85": 85,
      "86": 86,
      "87": 87,
      "88": 88,
      "89": 89,
      "90": 90,
      "91": 91,
      "92": 92,
      "93": 93,
      "94": 94,
      "95": 95,
      "96": 96,
      "97": 97,
      "98": 98,
      "99": 99,
      "100": 100,
      "101": 101,
      "102": 102,
      "103": 103,
      "104": 104,
      "105": 105,
      "106": 106,
      "107": 107,
      "108": 108,
      "109": 109,
      "110": 110,
      "111": 111,
      "112": 112,
      "113": 113,
      "114": 114,
      "115": 115,
      "116": 116,
      "117": 117,
      "118": 118,
      "119": 119,
      "120": 120,
      "121": 121,
      "122": 122,
      "123": 123,
      "124": 124,
      "125": 125,
      "126": 126,
      "127": 127,
      "128": 128,
      "129": 129,
      "130": 130,
      "131": 131,
      "132": 132,
      "133": 133,
      "134": 134,
      "135": 135,
      "136": 136,
      "137": 137,
      "138": 138,
      "139": 139,
      "140": 140,
      "141": 141,
      "142": 142,
      "143": 143,
      "144": 144,
      "145": 145,
      "146": 146,
      "147": 147,
      "148": 148,
      "149": 149,
      "150": 150,
      "151": 151,
      "152": 152,
      "153": 153,
      "154": 154,
      "155": 155,
      "156": 156,
      "157": 157,
      "158": 158,
      "159": 159,
      "160": 160,
      "161": 161,
      "162": 162,
      "163": 163,
      "164": 164,
      "165": 165,
      "166": 166,
      "167": 167,
      "168": 168
    }
  },
  "chunks": {
    "byName": {},
    "byBlocks": {
      "example.js:0/0:3": 0,
      "example.js:0/0:9": 1,
      "example.js:0/0:11": 2,
      "example.js:0/0:10": 3,
      "example.js:0/0:1": 4,
      "example.js:0/0:6": 5,
      "example.js:0/0:0": 6,
      "example.js:0/0:5": 7,
      "example.js:0/0:4": 8,
      "example.js:0/0:2": 9,
      "example.js:0/0:7": 10,
      "example.js:0/0:8": 11
    },
    "usedIds": {
      "0": 0,
      "1": 1,
      "2": 2,
      "3": 3,
      "4": 4,
      "5": 5,
      "6": 6,
      "7": 7,
      "8": 8,
      "9": 9,
      "10": 10,
      "11": 11,
      "12": 12,
      "13": 13,
      "14": 14
    }
  },
  "aggressiveSplits": [
    {
      "modules": [
        "../../node_modules/react-dom/index.js",
        "../../node_modules/fbjs/lib/ExecutionEnvironment.js",
        "../../node_modules/fbjs/lib/shallowEqual.js",
        "../../node_modules/fbjs/lib/EventListener.js",
        "../../node_modules/fbjs/lib/focusNode.js",
        "../../node_modules/fbjs/lib/getActiveElement.js",
        "../../node_modules/process/browser.js",
        "../../node_modules/react-dom/lib/CSSProperty.js",
        "../../node_modules/fbjs/lib/camelize.js",
        "../../node_modules/fbjs/lib/camelizeStyleName.js",
        "../../node_modules/fbjs/lib/containsNode.js",
        "../../node_modules/fbjs/lib/createArrayFromMixed.js",
        "../../node_modules/fbjs/lib/createNodesFromMarkup.js",
        "../../node_modules/fbjs/lib/getMarkupWrap.js",
        "../../node_modules/fbjs/lib/getUnboundedScrollPosition.js",
        "../../node_modules/fbjs/lib/hyphenate.js",
        "../../node_modules/fbjs/lib/hyphenateStyleName.js",
        "../../node_modules/fbjs/lib/isNode.js",
        "../../node_modules/fbjs/lib/isTextNode.js",
        "../../node_modules/fbjs/lib/memoizeStringOnly.js",
        "../../node_modules/react-dom/lib/ARIADOMPropertyConfig.js",
        "../../node_modules/react-dom/lib/AutoFocusUtils.js",
        "../../node_modules/react-dom/lib/BeforeInputEventPlugin.js",
        "../../node_modules/react-dom/lib/ReactVersion.js"
      ],
      "hash": "f0597ceec26d85e1409479a344ec49ad",
      "id": 0
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/ReactInstrumentation.js",
        "../../node_modules/react-dom/lib/ReactInstanceMap.js",
        "../../node_modules/react-dom/lib/ReactErrorUtils.js",
        "../../node_modules/react-dom/lib/ReactHostComponent.js",
        "../../node_modules/react-dom/lib/ReactInputSelection.js",
        "../../node_modules/react-dom/lib/ReactNodeTypes.js",
        "../../node_modules/react-dom/lib/ReactDOMSelection.js",
        "../../node_modules/react-dom/lib/ReactDOMTextComponent.js",
        "../../node_modules/react-dom/lib/ReactDOMTextarea.js",
        "../../node_modules/react-dom/lib/ReactDefaultInjection.js",
        "../../node_modules/react-dom/lib/ReactEventEmitterMixin.js",
        "../../node_modules/react-dom/lib/ReactEventListener.js",
        "../../node_modules/react-dom/lib/ReactInjection.js",
        "../../node_modules/react-dom/lib/ReactMarkupChecksum.js",
        "../../node_modules/react-dom/lib/ReactOwner.js",
        "../../node_modules/react-dom/lib/ReactRef.js",
        "../../node_modules/react-dom/lib/SyntheticCompositionEvent.js"
      ],
      "hash": "118f4e8acf782daf7bde7519c39acf76",
      "id": 1
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/reactProdInvariant.js",
        "../../node_modules/react-dom/lib/setInnerHTML.js",
        "../../node_modules/react-dom/lib/getEventModifierState.js",
        "../../node_modules/react-dom/lib/getEventTarget.js",
        "../../node_modules/react-dom/lib/isEventSupported.js",
        "../../node_modules/react-dom/lib/getHostComponentFromComposite.js",
        "../../node_modules/react-dom/lib/getTextContentAccessor.js",
        "../../node_modules/react-dom/lib/instantiateReactComponent.js",
        "../../node_modules/react-dom/lib/isTextInputElement.js",
        "../../node_modules/react-dom/lib/setTextContent.js",
        "../../node_modules/react-dom/lib/flattenChildren.js",
        "../../node_modules/react-dom/lib/getEventKey.js",
        "../../node_modules/react-dom/lib/getIteratorFn.js",
        "../../node_modules/react-dom/lib/getNodeForCharacterOffset.js",
        "../../node_modules/react-dom/lib/getVendorPrefixedEventName.js",
        "../../node_modules/react-dom/lib/quoteAttributeValueForBrowser.js"
      ],
      "hash": "4bb149689ae97f5d46e7b968ed2ba814",
      "id": 2
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/SyntheticEvent.js",
        "../../node_modules/react-dom/lib/SyntheticUIEvent.js",
        "../../node_modules/react-dom/lib/SyntheticMouseEvent.js",
        "../../node_modules/react-dom/lib/Transaction.js",
        "../../node_modules/react-dom/lib/escapeTextContentForBrowser.js",
        "../../node_modules/react-dom/lib/createMicrosoftUnsafeLocalFunction.js",
        "../../node_modules/react-dom/lib/getEventCharCode.js",
        "../../node_modules/react-dom/lib/accumulateInto.js",
        "../../node_modules/react-dom/lib/forEachAccumulated.js",
        "../../node_modules/react-dom/lib/SimpleEventPlugin.js",
        "../../node_modules/react-dom/lib/SyntheticTouchEvent.js",
        "../../node_modules/react-dom/lib/SyntheticTransitionEvent.js",
        "../../node_modules/react-dom/lib/SyntheticWheelEvent.js",
        "../../node_modules/react-dom/lib/adler32.js",
        "../../node_modules/react-dom/lib/dangerousStyleValue.js",
        "../../node_modules/react-dom/lib/findDOMNode.js"
      ],
      "hash": "8940e378350d3e1324c168d5b1a985e3",
      "id": 3
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/ReactDOMComponentTree.js",
        "../../node_modules/react-dom/lib/PooledClass.js",
        "../../node_modules/react-dom/lib/ReactBrowserEventEmitter.js",
        "../../node_modules/react-dom/lib/LinkedValueUtils.js",
        "../../node_modules/react-dom/lib/ReactComponentEnvironment.js",
        "../../node_modules/react-dom/lib/ReactChildReconciler.js",
        "../../node_modules/react-dom/lib/ReactDOM.js",
        "../../node_modules/react-dom/lib/ReactDOMContainerInfo.js",
        "../../node_modules/react-dom/lib/ReactDOMEmptyComponent.js",
        "../../node_modules/react-dom/lib/ReactDOMFeatureFlags.js",
        "../../node_modules/react-dom/lib/ReactDOMIDOperations.js",
        "../../node_modules/react-dom/lib/ReactDOMOption.js",
        "../../node_modules/react-dom/lib/ReactDefaultBatchingStrategy.js"
      ],
      "hash": "f45002fdb16fe5adab39e12d3bda5931",
      "id": 4
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/EventPluginHub.js",
        "../../node_modules/react-dom/lib/EventPropagators.js",
        "../../node_modules/react-dom/lib/EventPluginRegistry.js",
        "../../node_modules/react-dom/lib/EventPluginUtils.js",
        "../../node_modules/react-dom/lib/KeyEscapeUtils.js",
        "../../node_modules/react-dom/lib/Danger.js",
        "../../node_modules/react-dom/lib/DefaultEventPluginOrder.js",
        "../../node_modules/react-dom/lib/EnterLeaveEventPlugin.js",
        "../../node_modules/react-dom/lib/FallbackCompositionState.js",
        "../../node_modules/react-dom/lib/HTMLDOMPropertyConfig.js",
        "../../node_modules/react-dom/lib/ReactComponentBrowserEnvironment.js",
        "../../node_modules/react-dom/lib/renderSubtreeIntoContainer.js"
      ],
      "hash": "41c4bfca01dacc328b9b6355d7d08277",
      "id": 5
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/ReactUpdates.js",
        "../../node_modules/react-dom/lib/ReactReconciler.js",
        "../../node_modules/react-dom/lib/ReactUpdateQueue.js",
        "../../node_modules/react-dom/lib/ViewportMetrics.js",
        "../../node_modules/react-dom/lib/ReactServerUpdateQueue.js",
        "../../node_modules/react-dom/lib/SVGDOMPropertyConfig.js",
        "../../node_modules/react-dom/lib/SelectEventPlugin.js",
        "../../node_modules/react-dom/lib/SyntheticDragEvent.js",
        "../../node_modules/react-dom/lib/SyntheticFocusEvent.js",
        "../../node_modules/react-dom/lib/SyntheticInputEvent.js",
        "../../node_modules/react-dom/lib/SyntheticKeyboardEvent.js"
      ],
      "hash": "79966dbf56b74a83076f5ba4ed889bfa",
      "id": 6
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/DOMLazyTree.js",
        "../../node_modules/react-dom/lib/DOMProperty.js",
        "../../node_modules/react-dom/lib/DOMChildrenOperations.js",
        "../../node_modules/react-dom/lib/DOMNamespaces.js",
        "../../node_modules/react-dom/lib/CallbackQueue.js",
        "../../node_modules/react-dom/lib/DOMPropertyOperations.js",
        "../../node_modules/react-dom/lib/ReactDOMComponentFlags.js",
        "../../node_modules/react-dom/lib/CSSPropertyOperations.js",
        "../../node_modules/react-dom/lib/ChangeEventPlugin.js"
      ],
      "hash": "b37172807f93b7d591817c9da8a79b0c",
      "id": 7
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/ReactMount.js",
        "../../node_modules/react-dom/lib/ReactMultiChild.js",
        "../../node_modules/react-dom/lib/ReactReconcileTransaction.js",
        "../../node_modules/react-dom/lib/ReactServerRenderingTransaction.js",
        "../../node_modules/react-dom/lib/SyntheticAnimationEvent.js",
        "../../node_modules/react-dom/lib/SyntheticClipboardEvent.js"
      ],
      "hash": "2fcd17b3e056f863b2d3fd2b7fbde362",
      "id": 8
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/shouldUpdateReactComponent.js",
        "../../node_modules/react-dom/lib/validateDOMNesting.js",
        "../../node_modules/react-dom/lib/traverseAllChildren.js",
        "../../node_modules/react/lib/ReactComponentTreeHook.js",
        "../../node_modules/react/lib/getNextDebugID.js"
      ],
      "hash": "766d1060910b08c5b00b13f7892a6776",
      "id": 9
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/ReactEmptyComponent.js",
        "../../node_modules/react-dom/lib/ReactCompositeComponent.js",
        "../../node_modules/react-dom/lib/ReactDOMInput.js",
        "../../node_modules/react-dom/lib/ReactElementSymbol.js",
        "../../node_modules/react-dom/lib/ReactPropTypesSecret.js"
      ],
      "hash": "7731c65a1a824990e2dd8cf0ba9d6ab6",
      "id": 10
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/ReactDOMSelect.js",
        "../../node_modules/react-dom/lib/ReactFeatureFlags.js",
        "../../node_modules/react-dom/lib/ReactDOMComponent.js",
        "../../node_modules/react-dom/lib/ReactDOMTreeTraversal.js"
      ],
      "hash": "32f25aae39ba65782773d69b996549e8",
      "id": 11
    },
    {
      "modules": [
        "../../node_modules/fbjs/lib/warning.js",
        "../../node_modules/fbjs/lib/invariant.js",
        "../../node_modules/object-assign/index.js",
        "../../node_modules/fbjs/lib/emptyFunction.js",
        "../../node_modules/fbjs/lib/emptyObject.js",
        "../../node_modules/react/lib/ReactComponent.js",
        "../../node_modules/react/lib/ReactCurrentOwner.js",
        "../../node_modules/react/lib/React.js",
        "../../node_modules/prop-types/factory.js",
        "../../node_modules/prop-types/checkPropTypes.js",
        "../../node_modules/prop-types/factoryWithTypeCheckers.js",
        "../../node_modules/prop-types/lib/ReactPropTypesSecret.js",
        "../../node_modules/react/lib/KeyEscapeUtils.js",
        "../../node_modules/react/lib/PooledClass.js",
        "../../node_modules/react/lib/ReactChildren.js",
        "../../node_modules/react/lib/ReactVersion.js"
      ],
      "hash": "98d8187845fe0bf1e18c50cdba5e810c",
      "id": 12
    },
    {
      "modules": [
        "../../node_modules/react/lib/ReactNoopUpdateQueue.js",
        "../../node_modules/react/lib/ReactElementSymbol.js",
        "../../node_modules/react/lib/ReactClass.js"
      ],
      "hash": "141c9029a3b722f94828792e8cf16f85",
      "id": 14
    }
  ]
}
```
