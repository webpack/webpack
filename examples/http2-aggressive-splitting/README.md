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
Hash: 0ecfeb6caca9aaf7c61a
Version: webpack 3.0.0-rc.0
                  Asset     Size  Chunks             Chunk Names
63720a012abfcaff3dc2.js  53.1 kB       7  [emitted]  
d781be6d09f29b2b4827.js    58 kB       0  [emitted]  
e22d04fae277d630dffb.js  36.5 kB       2  [emitted]  
9e7f806cd88dbd9d6fb2.js  55.8 kB       3  [emitted]  
ac431bb53a29734a7779.js  55.1 kB       4  [emitted]  
b25aa19ca5829abb4fab.js  54.2 kB       5  [emitted]  
4e84b25ca2817f467451.js  53.7 kB       6  [emitted]  
de7417f0e2c93a0b6c6b.js  56.9 kB       1  [emitted]  
1643f493a78100985651.js  52.2 kB       8  [emitted]  
5126389152f68b572f76.js  34.6 kB       9  [emitted]  
7b4ee2059f1ad5fc6917.js    51 kB      10  [emitted]  
93a5c3d8205908bfd0ed.js  50.7 kB      11  [emitted]  
7204579bf3a7fc284bd7.js  61.2 kB      12  [emitted]  
1c09c55e51c8551491d7.js  35.1 kB      13  [emitted]  
b2c554fdf2bde4af1bc2.js  31.4 kB      14  [emitted]  
Entrypoint main = 7204579bf3a7fc284bd7.js b2c554fdf2bde4af1bc2.js 1c09c55e51c8551491d7.js
chunk    {0} d781be6d09f29b2b4827.js 50 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
   [31] (webpack)/node_modules/react-dom/index.js 59 bytes {0} [built]
   [34] (webpack)/node_modules/fbjs/lib/ExecutionEnvironment.js 1.06 kB {0} [built]
   [62] (webpack)/node_modules/fbjs/lib/shallowEqual.js 1.74 kB {0} [built]
   [77] (webpack)/node_modules/fbjs/lib/focusNode.js 704 bytes {0} [built]
   [78] (webpack)/node_modules/react-dom/lib/CSSProperty.js 3.66 kB {0} [built]
   [81] (webpack)/node_modules/process/browser.js 5.42 kB {0} [built]
   [88] (webpack)/node_modules/fbjs/lib/EventListener.js 2.67 kB {0} [built]
   [90] (webpack)/node_modules/fbjs/lib/getActiveElement.js 1.04 kB {0} [built]
   [95] (webpack)/node_modules/react-dom/lib/ARIADOMPropertyConfig.js 1.82 kB {0} [built]
   [96] (webpack)/node_modules/react-dom/lib/BeforeInputEventPlugin.js 13.3 kB {0} [built]
  [108] (webpack)/node_modules/fbjs/lib/createNodesFromMarkup.js 2.66 kB {0} [built]
  [109] (webpack)/node_modules/fbjs/lib/createArrayFromMixed.js 4.11 kB {0} [built]
  [110] (webpack)/node_modules/fbjs/lib/getMarkupWrap.js 3.04 kB {0} [built]
  [113] (webpack)/node_modules/react-dom/lib/AutoFocusUtils.js 599 bytes {0} [built]
  [115] (webpack)/node_modules/fbjs/lib/camelizeStyleName.js 1 kB {0} [built]
  [116] (webpack)/node_modules/fbjs/lib/camelize.js 708 bytes {0} [built]
  [118] (webpack)/node_modules/fbjs/lib/hyphenateStyleName.js 974 bytes {0} [built]
  [119] (webpack)/node_modules/fbjs/lib/hyphenate.js 800 bytes {0} [built]
  [120] (webpack)/node_modules/fbjs/lib/memoizeStringOnly.js 698 bytes {0} [built]
  [142] (webpack)/node_modules/fbjs/lib/getUnboundedScrollPosition.js 1.12 kB {0} [built]
  [147] (webpack)/node_modules/fbjs/lib/containsNode.js 1.05 kB {0} [built]
  [148] (webpack)/node_modules/fbjs/lib/isTextNode.js 605 bytes {0} [built]
  [149] (webpack)/node_modules/fbjs/lib/isNode.js 828 bytes {0} [built]
  [166] (webpack)/node_modules/react-dom/lib/ReactVersion.js 350 bytes {0} [built]
chunk    {1} de7417f0e2c93a0b6c6b.js 49.9 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
   [35] (webpack)/node_modules/react-dom/lib/ReactInstrumentation.js 601 bytes {1} [built]
   [45] (webpack)/node_modules/react-dom/lib/ReactInstanceMap.js 1.22 kB {1} [built]
   [53] (webpack)/node_modules/react-dom/lib/ReactErrorUtils.js 2.19 kB {1} [built]
   [83] (webpack)/node_modules/react-dom/lib/ReactNodeTypes.js 1.02 kB {1} [built]
   [85] (webpack)/node_modules/react-dom/lib/ReactHostComponent.js 1.98 kB {1} [built]
   [89] (webpack)/node_modules/react-dom/lib/ReactInputSelection.js 4.27 kB {1} [built]
   [94] (webpack)/node_modules/react-dom/lib/ReactDefaultInjection.js 3.5 kB {1} [built]
   [98] (webpack)/node_modules/react-dom/lib/SyntheticCompositionEvent.js 1.1 kB {1} [built]
  [101] (webpack)/node_modules/react-dom/lib/ReactRef.js 2.56 kB {1} [built]
  [102] (webpack)/node_modules/react-dom/lib/ReactOwner.js 3.53 kB {1} [built]
  [122] (webpack)/node_modules/react-dom/lib/ReactEventEmitterMixin.js 959 bytes {1} [built]
  [127] (webpack)/node_modules/react-dom/lib/ReactDOMTextarea.js 6.46 kB {1} [built]
  [139] (webpack)/node_modules/react-dom/lib/ReactDOMTextComponent.js 5.82 kB {1} [built]
  [141] (webpack)/node_modules/react-dom/lib/ReactEventListener.js 5.3 kB {1} [built]
  [143] (webpack)/node_modules/react-dom/lib/ReactInjection.js 1.2 kB {1} [built]
  [145] (webpack)/node_modules/react-dom/lib/ReactDOMSelection.js 6.78 kB {1} [built]
  [164] (webpack)/node_modules/react-dom/lib/ReactMarkupChecksum.js 1.47 kB {1} [built]
chunk    {2} e22d04fae277d630dffb.js 30.5 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
   [32] (webpack)/node_modules/react-dom/lib/reactProdInvariant.js 1.24 kB {2} [built]
   [48] (webpack)/node_modules/react-dom/lib/setInnerHTML.js 3.86 kB {2} [built]
   [54] (webpack)/node_modules/react-dom/lib/getEventTarget.js 1.01 kB {2} [built]
   [55] (webpack)/node_modules/react-dom/lib/isEventSupported.js 1.94 kB {2} [built]
   [56] (webpack)/node_modules/react-dom/lib/getEventModifierState.js 1.23 kB {2} [built]
   [71] (webpack)/node_modules/react-dom/lib/getTextContentAccessor.js 955 bytes {2} [built]
   [74] (webpack)/node_modules/react-dom/lib/isTextInputElement.js 1.04 kB {2} [built]
   [76] (webpack)/node_modules/react-dom/lib/setTextContent.js 1.45 kB {2} [built]
   [82] (webpack)/node_modules/react-dom/lib/instantiateReactComponent.js 5.06 kB {2} [built]
   [92] (webpack)/node_modules/react-dom/lib/getHostComponentFromComposite.js 740 bytes {2} [built]
  [121] (webpack)/node_modules/react-dom/lib/quoteAttributeValueForBrowser.js 700 bytes {2} [built]
  [123] (webpack)/node_modules/react-dom/lib/getVendorPrefixedEventName.js 2.87 kB {2} [built]
  [133] (webpack)/node_modules/react-dom/lib/getIteratorFn.js 1.12 kB {2} [built]
  [134] (webpack)/node_modules/react-dom/lib/flattenChildren.js 2.77 kB {2} [built]
  [146] (webpack)/node_modules/react-dom/lib/getNodeForCharacterOffset.js 1.62 kB {2} [built]
  [157] (webpack)/node_modules/react-dom/lib/getEventKey.js 2.87 kB {2} [built]
chunk    {3} 9e7f806cd88dbd9d6fb2.js 49.7 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
   [37] (webpack)/node_modules/react-dom/lib/SyntheticEvent.js 9.18 kB {3} [built]
   [44] (webpack)/node_modules/react-dom/lib/SyntheticUIEvent.js 1.57 kB {3} [built]
   [46] (webpack)/node_modules/react-dom/lib/Transaction.js 9.45 kB {3} [built]
   [47] (webpack)/node_modules/react-dom/lib/SyntheticMouseEvent.js 2.14 kB {3} [built]
   [49] (webpack)/node_modules/react-dom/lib/escapeTextContentForBrowser.js 3.43 kB {3} [built]
   [59] (webpack)/node_modules/react-dom/lib/createMicrosoftUnsafeLocalFunction.js 810 bytes {3} [built]
   [67] (webpack)/node_modules/react-dom/lib/getEventCharCode.js 1.5 kB {3} [built]
   [69] (webpack)/node_modules/react-dom/lib/accumulateInto.js 1.69 kB {3} [built]
   [70] (webpack)/node_modules/react-dom/lib/forEachAccumulated.js 855 bytes {3} [built]
  [117] (webpack)/node_modules/react-dom/lib/dangerousStyleValue.js 3.02 kB {3} [built]
  [152] (webpack)/node_modules/react-dom/lib/SimpleEventPlugin.js 7.97 kB {3} [built]
  [159] (webpack)/node_modules/react-dom/lib/SyntheticTouchEvent.js 1.28 kB {3} [built]
  [160] (webpack)/node_modules/react-dom/lib/SyntheticTransitionEvent.js 1.23 kB {3} [built]
  [161] (webpack)/node_modules/react-dom/lib/SyntheticWheelEvent.js 1.94 kB {3} [built]
  [165] (webpack)/node_modules/react-dom/lib/adler32.js 1.19 kB {3} [built]
  [167] (webpack)/node_modules/react-dom/lib/findDOMNode.js 2.46 kB {3} [built]
chunk    {4} ac431bb53a29734a7779.js 49.8 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
   [33] (webpack)/node_modules/react-dom/lib/ReactDOMComponentTree.js 6.27 kB {4} [built]
   [38] (webpack)/node_modules/react-dom/lib/PooledClass.js 3.36 kB {4} [built]
   [50] (webpack)/node_modules/react-dom/lib/ReactBrowserEventEmitter.js 12.6 kB {4} [built]
   [60] (webpack)/node_modules/react-dom/lib/LinkedValueUtils.js 5.25 kB {4} [built]
   [61] (webpack)/node_modules/react-dom/lib/ReactComponentEnvironment.js 1.3 kB {4} [built]
   [93] (webpack)/node_modules/react-dom/lib/ReactDOM.js 5.14 kB {4} [built]
  [111] (webpack)/node_modules/react-dom/lib/ReactDOMIDOperations.js 956 bytes {4} [built]
  [126] (webpack)/node_modules/react-dom/lib/ReactDOMOption.js 3.69 kB {4} [built]
  [129] (webpack)/node_modules/react-dom/lib/ReactChildReconciler.js 6.11 kB {4} [built]
  [137] (webpack)/node_modules/react-dom/lib/ReactDOMEmptyComponent.js 1.9 kB {4} [built]
  [140] (webpack)/node_modules/react-dom/lib/ReactDefaultBatchingStrategy.js 1.88 kB {4} [built]
  [162] (webpack)/node_modules/react-dom/lib/ReactDOMContainerInfo.js 967 bytes {4} [built]
  [163] (webpack)/node_modules/react-dom/lib/ReactDOMFeatureFlags.js 439 bytes {4} [built]
chunk    {5} b25aa19ca5829abb4fab.js 50 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
   [42] (webpack)/node_modules/react-dom/lib/EventPropagators.js 5.09 kB {5} [built]
   [43] (webpack)/node_modules/react-dom/lib/EventPluginHub.js 9.11 kB {5} [built]
   [51] (webpack)/node_modules/react-dom/lib/EventPluginRegistry.js 9.75 kB {5} [built]
   [52] (webpack)/node_modules/react-dom/lib/EventPluginUtils.js 7.95 kB {5} [built]
   [64] (webpack)/node_modules/react-dom/lib/KeyEscapeUtils.js 1.29 kB {5} [built]
   [97] (webpack)/node_modules/react-dom/lib/FallbackCompositionState.js 2.43 kB {5} [built]
  [103] (webpack)/node_modules/react-dom/lib/DefaultEventPluginOrder.js 1.08 kB {5} [built]
  [104] (webpack)/node_modules/react-dom/lib/EnterLeaveEventPlugin.js 3.16 kB {5} [built]
  [105] (webpack)/node_modules/react-dom/lib/HTMLDOMPropertyConfig.js 6.57 kB {5} [built]
  [106] (webpack)/node_modules/react-dom/lib/ReactComponentBrowserEnvironment.js 906 bytes {5} [built]
  [107] (webpack)/node_modules/react-dom/lib/Danger.js 2.24 kB {5} [built]
  [168] (webpack)/node_modules/react-dom/lib/renderSubtreeIntoContainer.js 422 bytes {5} [built]
chunk    {6} 4e84b25ca2817f467451.js 49.8 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
   [36] (webpack)/node_modules/react-dom/lib/ReactUpdates.js 9.53 kB {6} [built]
   [40] (webpack)/node_modules/react-dom/lib/ReactReconciler.js 6.21 kB {6} [built]
   [65] (webpack)/node_modules/react-dom/lib/ReactUpdateQueue.js 9.36 kB {6} [built]
   [75] (webpack)/node_modules/react-dom/lib/ViewportMetrics.js 606 bytes {6} [built]
   [99] (webpack)/node_modules/react-dom/lib/SyntheticInputEvent.js 1.09 kB {6} [built]
  [136] (webpack)/node_modules/react-dom/lib/ReactServerUpdateQueue.js 4.83 kB {6} [built]
  [150] (webpack)/node_modules/react-dom/lib/SVGDOMPropertyConfig.js 7.32 kB {6} [built]
  [151] (webpack)/node_modules/react-dom/lib/SelectEventPlugin.js 6.06 kB {6} [built]
  [155] (webpack)/node_modules/react-dom/lib/SyntheticFocusEvent.js 1.07 kB {6} [built]
  [156] (webpack)/node_modules/react-dom/lib/SyntheticKeyboardEvent.js 2.71 kB {6} [built]
  [158] (webpack)/node_modules/react-dom/lib/SyntheticDragEvent.js 1.07 kB {6} [built]
chunk    {7} 63720a012abfcaff3dc2.js 50 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
   [39] (webpack)/node_modules/react-dom/lib/DOMProperty.js 8.24 kB {7} [built]
   [41] (webpack)/node_modules/react-dom/lib/DOMLazyTree.js 3.71 kB {7} [built]
   [57] (webpack)/node_modules/react-dom/lib/DOMChildrenOperations.js 7.67 kB {7} [built]
   [58] (webpack)/node_modules/react-dom/lib/DOMNamespaces.js 505 bytes {7} [built]
   [68] (webpack)/node_modules/react-dom/lib/ReactDOMComponentFlags.js 429 bytes {7} [built]
   [72] (webpack)/node_modules/react-dom/lib/CallbackQueue.js 3.16 kB {7} [built]
   [79] (webpack)/node_modules/react-dom/lib/DOMPropertyOperations.js 7.61 kB {7} [built]
  [100] (webpack)/node_modules/react-dom/lib/ChangeEventPlugin.js 11.8 kB {7} [built]
  [114] (webpack)/node_modules/react-dom/lib/CSSPropertyOperations.js 6.87 kB {7} [built]
chunk    {8} 1643f493a78100985651.js 50 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
   [91] (webpack)/node_modules/react-dom/lib/ReactMount.js 25.5 kB {8} [built]
  [128] (webpack)/node_modules/react-dom/lib/ReactMultiChild.js 14.6 kB {8} [built]
  [135] (webpack)/node_modules/react-dom/lib/ReactServerRenderingTransaction.js 2.29 kB {8} [built]
  [144] (webpack)/node_modules/react-dom/lib/ReactReconcileTransaction.js 5.26 kB {8} [built]
  [153] (webpack)/node_modules/react-dom/lib/SyntheticAnimationEvent.js 1.21 kB {8} [built]
  [154] (webpack)/node_modules/react-dom/lib/SyntheticClipboardEvent.js 1.17 kB {8} [built]
chunk    {9} 5126389152f68b572f76.js 32.9 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
   [63] (webpack)/node_modules/react-dom/lib/shouldUpdateReactComponent.js 1.4 kB {9} [built]
   [66] (webpack)/node_modules/react-dom/lib/validateDOMNesting.js 13.7 kB {9} [built]
   [86] (webpack)/node_modules/react-dom/lib/traverseAllChildren.js 7.04 kB {9} [built]
   [87] (webpack)/node_modules/react/lib/ReactComponentTreeHook.js 10.4 kB {9} [built]
  [131] (webpack)/node_modules/react/lib/getNextDebugID.js 437 bytes {9} [built]
chunk   {10} 7b4ee2059f1ad5fc6917.js 50 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
   [84] (webpack)/node_modules/react-dom/lib/ReactEmptyComponent.js 704 bytes {10} [built]
  [124] (webpack)/node_modules/react-dom/lib/ReactDOMInput.js 13 kB {10} [built]
  [125] (webpack)/node_modules/react-dom/lib/ReactPropTypesSecret.js 442 bytes {10} [built]
  [130] (webpack)/node_modules/react-dom/lib/ReactCompositeComponent.js 35.2 kB {10} [built]
  [132] (webpack)/node_modules/react-dom/lib/ReactElementSymbol.js 622 bytes {10} [built]
chunk   {11} 93a5c3d8205908bfd0ed.js 49.7 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
   [73] (webpack)/node_modules/react-dom/lib/ReactFeatureFlags.js 628 bytes {11} [built]
   [80] (webpack)/node_modules/react-dom/lib/ReactDOMSelect.js 6.81 kB {11} [built]
  [112] (webpack)/node_modules/react-dom/lib/ReactDOMComponent.js 38.5 kB {11} [built]
  [138] (webpack)/node_modules/react-dom/lib/ReactDOMTreeTraversal.js 3.72 kB {11} [built]
chunk   {12} 7204579bf3a7fc284bd7.js 50 kB [entry] [rendered] [recorded]
    > aggressive-splitted main [14] ./example.js 
    [0] (webpack)/node_modules/fbjs/lib/warning.js 2.1 kB {12} [built]
    [1] (webpack)/node_modules/fbjs/lib/invariant.js 1.63 kB {12} [built]
    [4] (webpack)/node_modules/object-assign/index.js 2.11 kB {12} [built]
    [5] (webpack)/node_modules/fbjs/lib/emptyFunction.js 1.08 kB {12} [built]
    [6] (webpack)/node_modules/fbjs/lib/emptyObject.js 458 bytes {12} [built]
    [7] (webpack)/node_modules/react/lib/ReactComponent.js 4.61 kB {12} [built]
    [9] (webpack)/node_modules/react/lib/ReactCurrentOwner.js 623 bytes {12} [built]
   [12] (webpack)/node_modules/react/lib/React.js 3.32 kB {12} [built]
   [13] (webpack)/node_modules/prop-types/factory.js 890 bytes {12} [built]
   [16] (webpack)/node_modules/react/lib/ReactChildren.js 6.19 kB {12} [built]
   [17] (webpack)/node_modules/react/lib/PooledClass.js 3.36 kB {12} [built]
   [20] (webpack)/node_modules/react/lib/KeyEscapeUtils.js 1.29 kB {12} [built]
   [26] (webpack)/node_modules/prop-types/factoryWithTypeCheckers.js 18.6 kB {12} [built]
   [27] (webpack)/node_modules/prop-types/lib/ReactPropTypesSecret.js 436 bytes {12} [built]
   [28] (webpack)/node_modules/prop-types/checkPropTypes.js 2.94 kB {12} [built]
   [29] (webpack)/node_modules/react/lib/ReactVersion.js 350 bytes {12} [built]
chunk   {13} 1c09c55e51c8551491d7.js 30.6 kB [initial] [rendered]
    > aggressive-splitted main [14] ./example.js 
    [2] (webpack)/node_modules/react/lib/ReactElement.js 11.2 kB {13} [built]
    [3] (webpack)/node_modules/react/lib/reactProdInvariant.js 1.24 kB {13} [built]
   [10] (webpack)/node_modules/react/lib/canDefineProperty.js 661 bytes {13} [built]
   [14] ./example.js 44 bytes {13} [built]
   [15] (webpack)/node_modules/react/react.js 56 bytes {13} [built]
   [18] (webpack)/node_modules/react/lib/traverseAllChildren.js 7.03 kB {13} [built]
   [19] (webpack)/node_modules/react/lib/getIteratorFn.js 1.12 kB {13} [built]
   [21] (webpack)/node_modules/react/lib/ReactPureComponent.js 1.32 kB {13} [built]
   [23] (webpack)/node_modules/react/lib/ReactPropTypeLocationNames.js 572 bytes {13} [built]
   [24] (webpack)/node_modules/react/lib/ReactDOMFactories.js 5.53 kB {13} [built]
   [25] (webpack)/node_modules/react/lib/ReactPropTypes.js 500 bytes {13} [built]
   [30] (webpack)/node_modules/react/lib/onlyChild.js 1.34 kB {13} [built]
chunk   {14} b2c554fdf2bde4af1bc2.js 30.9 kB [initial] [rendered] [recorded]
    > aggressive-splitted main [14] ./example.js 
    [8] (webpack)/node_modules/react/lib/ReactNoopUpdateQueue.js 3.36 kB {14} [built]
   [11] (webpack)/node_modules/react/lib/ReactElementSymbol.js 622 bytes {14} [built]
   [22] (webpack)/node_modules/react/lib/ReactClass.js 26.9 kB {14} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: 0ecfeb6caca9aaf7c61a
Version: webpack 3.0.0-rc.0
                  Asset     Size  Chunks             Chunk Names
63720a012abfcaff3dc2.js  10.4 kB       7  [emitted]  
d781be6d09f29b2b4827.js  12.3 kB       0  [emitted]  
e22d04fae277d630dffb.js  7.08 kB       2  [emitted]  
9e7f806cd88dbd9d6fb2.js  9.58 kB       3  [emitted]  
ac431bb53a29734a7779.js    12 kB       4  [emitted]  
b25aa19ca5829abb4fab.js  11.5 kB       5  [emitted]  
4e84b25ca2817f467451.js  13.3 kB       6  [emitted]  
de7417f0e2c93a0b6c6b.js  11.1 kB       1  [emitted]  
1643f493a78100985651.js  8.29 kB       8  [emitted]  
5126389152f68b572f76.js  4.87 kB       9  [emitted]  
7b4ee2059f1ad5fc6917.js  10.2 kB      10  [emitted]  
93a5c3d8205908bfd0ed.js  12.5 kB      11  [emitted]  
7204579bf3a7fc284bd7.js    12 kB      12  [emitted]  
1c09c55e51c8551491d7.js  6.08 kB      13  [emitted]  
b2c554fdf2bde4af1bc2.js  3.81 kB      14  [emitted]  
Entrypoint main = 7204579bf3a7fc284bd7.js b2c554fdf2bde4af1bc2.js 1c09c55e51c8551491d7.js
chunk    {0} d781be6d09f29b2b4827.js 50 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
   [31] (webpack)/node_modules/react-dom/index.js 59 bytes {0} [built]
   [34] (webpack)/node_modules/fbjs/lib/ExecutionEnvironment.js 1.06 kB {0} [built]
   [62] (webpack)/node_modules/fbjs/lib/shallowEqual.js 1.74 kB {0} [built]
   [77] (webpack)/node_modules/fbjs/lib/focusNode.js 704 bytes {0} [built]
   [78] (webpack)/node_modules/react-dom/lib/CSSProperty.js 3.66 kB {0} [built]
   [81] (webpack)/node_modules/process/browser.js 5.42 kB {0} [built]
   [88] (webpack)/node_modules/fbjs/lib/EventListener.js 2.67 kB {0} [built]
   [90] (webpack)/node_modules/fbjs/lib/getActiveElement.js 1.04 kB {0} [built]
   [95] (webpack)/node_modules/react-dom/lib/ARIADOMPropertyConfig.js 1.82 kB {0} [built]
   [96] (webpack)/node_modules/react-dom/lib/BeforeInputEventPlugin.js 13.3 kB {0} [built]
  [108] (webpack)/node_modules/fbjs/lib/createNodesFromMarkup.js 2.66 kB {0} [built]
  [109] (webpack)/node_modules/fbjs/lib/createArrayFromMixed.js 4.11 kB {0} [built]
  [110] (webpack)/node_modules/fbjs/lib/getMarkupWrap.js 3.04 kB {0} [built]
  [113] (webpack)/node_modules/react-dom/lib/AutoFocusUtils.js 599 bytes {0} [built]
  [115] (webpack)/node_modules/fbjs/lib/camelizeStyleName.js 1 kB {0} [built]
  [116] (webpack)/node_modules/fbjs/lib/camelize.js 708 bytes {0} [built]
  [118] (webpack)/node_modules/fbjs/lib/hyphenateStyleName.js 974 bytes {0} [built]
  [119] (webpack)/node_modules/fbjs/lib/hyphenate.js 800 bytes {0} [built]
  [120] (webpack)/node_modules/fbjs/lib/memoizeStringOnly.js 698 bytes {0} [built]
  [142] (webpack)/node_modules/fbjs/lib/getUnboundedScrollPosition.js 1.12 kB {0} [built]
  [147] (webpack)/node_modules/fbjs/lib/containsNode.js 1.05 kB {0} [built]
  [148] (webpack)/node_modules/fbjs/lib/isTextNode.js 605 bytes {0} [built]
  [149] (webpack)/node_modules/fbjs/lib/isNode.js 828 bytes {0} [built]
  [166] (webpack)/node_modules/react-dom/lib/ReactVersion.js 350 bytes {0} [built]
chunk    {1} de7417f0e2c93a0b6c6b.js 49.9 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
   [35] (webpack)/node_modules/react-dom/lib/ReactInstrumentation.js 601 bytes {1} [built]
   [45] (webpack)/node_modules/react-dom/lib/ReactInstanceMap.js 1.22 kB {1} [built]
   [53] (webpack)/node_modules/react-dom/lib/ReactErrorUtils.js 2.19 kB {1} [built]
   [83] (webpack)/node_modules/react-dom/lib/ReactNodeTypes.js 1.02 kB {1} [built]
   [85] (webpack)/node_modules/react-dom/lib/ReactHostComponent.js 1.98 kB {1} [built]
   [89] (webpack)/node_modules/react-dom/lib/ReactInputSelection.js 4.27 kB {1} [built]
   [94] (webpack)/node_modules/react-dom/lib/ReactDefaultInjection.js 3.5 kB {1} [built]
   [98] (webpack)/node_modules/react-dom/lib/SyntheticCompositionEvent.js 1.1 kB {1} [built]
  [101] (webpack)/node_modules/react-dom/lib/ReactRef.js 2.56 kB {1} [built]
  [102] (webpack)/node_modules/react-dom/lib/ReactOwner.js 3.53 kB {1} [built]
  [122] (webpack)/node_modules/react-dom/lib/ReactEventEmitterMixin.js 959 bytes {1} [built]
  [127] (webpack)/node_modules/react-dom/lib/ReactDOMTextarea.js 6.46 kB {1} [built]
  [139] (webpack)/node_modules/react-dom/lib/ReactDOMTextComponent.js 5.82 kB {1} [built]
  [141] (webpack)/node_modules/react-dom/lib/ReactEventListener.js 5.3 kB {1} [built]
  [143] (webpack)/node_modules/react-dom/lib/ReactInjection.js 1.2 kB {1} [built]
  [145] (webpack)/node_modules/react-dom/lib/ReactDOMSelection.js 6.78 kB {1} [built]
  [164] (webpack)/node_modules/react-dom/lib/ReactMarkupChecksum.js 1.47 kB {1} [built]
chunk    {2} e22d04fae277d630dffb.js 30.5 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
   [32] (webpack)/node_modules/react-dom/lib/reactProdInvariant.js 1.24 kB {2} [built]
   [48] (webpack)/node_modules/react-dom/lib/setInnerHTML.js 3.86 kB {2} [built]
   [54] (webpack)/node_modules/react-dom/lib/getEventTarget.js 1.01 kB {2} [built]
   [55] (webpack)/node_modules/react-dom/lib/isEventSupported.js 1.94 kB {2} [built]
   [56] (webpack)/node_modules/react-dom/lib/getEventModifierState.js 1.23 kB {2} [built]
   [71] (webpack)/node_modules/react-dom/lib/getTextContentAccessor.js 955 bytes {2} [built]
   [74] (webpack)/node_modules/react-dom/lib/isTextInputElement.js 1.04 kB {2} [built]
   [76] (webpack)/node_modules/react-dom/lib/setTextContent.js 1.45 kB {2} [built]
   [82] (webpack)/node_modules/react-dom/lib/instantiateReactComponent.js 5.06 kB {2} [built]
   [92] (webpack)/node_modules/react-dom/lib/getHostComponentFromComposite.js 740 bytes {2} [built]
  [121] (webpack)/node_modules/react-dom/lib/quoteAttributeValueForBrowser.js 700 bytes {2} [built]
  [123] (webpack)/node_modules/react-dom/lib/getVendorPrefixedEventName.js 2.87 kB {2} [built]
  [133] (webpack)/node_modules/react-dom/lib/getIteratorFn.js 1.12 kB {2} [built]
  [134] (webpack)/node_modules/react-dom/lib/flattenChildren.js 2.77 kB {2} [built]
  [146] (webpack)/node_modules/react-dom/lib/getNodeForCharacterOffset.js 1.62 kB {2} [built]
  [157] (webpack)/node_modules/react-dom/lib/getEventKey.js 2.87 kB {2} [built]
chunk    {3} 9e7f806cd88dbd9d6fb2.js 49.7 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
   [37] (webpack)/node_modules/react-dom/lib/SyntheticEvent.js 9.18 kB {3} [built]
   [44] (webpack)/node_modules/react-dom/lib/SyntheticUIEvent.js 1.57 kB {3} [built]
   [46] (webpack)/node_modules/react-dom/lib/Transaction.js 9.45 kB {3} [built]
   [47] (webpack)/node_modules/react-dom/lib/SyntheticMouseEvent.js 2.14 kB {3} [built]
   [49] (webpack)/node_modules/react-dom/lib/escapeTextContentForBrowser.js 3.43 kB {3} [built]
   [59] (webpack)/node_modules/react-dom/lib/createMicrosoftUnsafeLocalFunction.js 810 bytes {3} [built]
   [67] (webpack)/node_modules/react-dom/lib/getEventCharCode.js 1.5 kB {3} [built]
   [69] (webpack)/node_modules/react-dom/lib/accumulateInto.js 1.69 kB {3} [built]
   [70] (webpack)/node_modules/react-dom/lib/forEachAccumulated.js 855 bytes {3} [built]
  [117] (webpack)/node_modules/react-dom/lib/dangerousStyleValue.js 3.02 kB {3} [built]
  [152] (webpack)/node_modules/react-dom/lib/SimpleEventPlugin.js 7.97 kB {3} [built]
  [159] (webpack)/node_modules/react-dom/lib/SyntheticTouchEvent.js 1.28 kB {3} [built]
  [160] (webpack)/node_modules/react-dom/lib/SyntheticTransitionEvent.js 1.23 kB {3} [built]
  [161] (webpack)/node_modules/react-dom/lib/SyntheticWheelEvent.js 1.94 kB {3} [built]
  [165] (webpack)/node_modules/react-dom/lib/adler32.js 1.19 kB {3} [built]
  [167] (webpack)/node_modules/react-dom/lib/findDOMNode.js 2.46 kB {3} [built]
chunk    {4} ac431bb53a29734a7779.js 49.8 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
   [33] (webpack)/node_modules/react-dom/lib/ReactDOMComponentTree.js 6.27 kB {4} [built]
   [38] (webpack)/node_modules/react-dom/lib/PooledClass.js 3.36 kB {4} [built]
   [50] (webpack)/node_modules/react-dom/lib/ReactBrowserEventEmitter.js 12.6 kB {4} [built]
   [60] (webpack)/node_modules/react-dom/lib/LinkedValueUtils.js 5.25 kB {4} [built]
   [61] (webpack)/node_modules/react-dom/lib/ReactComponentEnvironment.js 1.3 kB {4} [built]
   [93] (webpack)/node_modules/react-dom/lib/ReactDOM.js 5.14 kB {4} [built]
  [111] (webpack)/node_modules/react-dom/lib/ReactDOMIDOperations.js 956 bytes {4} [built]
  [126] (webpack)/node_modules/react-dom/lib/ReactDOMOption.js 3.69 kB {4} [built]
  [129] (webpack)/node_modules/react-dom/lib/ReactChildReconciler.js 6.11 kB {4} [built]
  [137] (webpack)/node_modules/react-dom/lib/ReactDOMEmptyComponent.js 1.9 kB {4} [built]
  [140] (webpack)/node_modules/react-dom/lib/ReactDefaultBatchingStrategy.js 1.88 kB {4} [built]
  [162] (webpack)/node_modules/react-dom/lib/ReactDOMContainerInfo.js 967 bytes {4} [built]
  [163] (webpack)/node_modules/react-dom/lib/ReactDOMFeatureFlags.js 439 bytes {4} [built]
chunk    {5} b25aa19ca5829abb4fab.js 50 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
   [42] (webpack)/node_modules/react-dom/lib/EventPropagators.js 5.09 kB {5} [built]
   [43] (webpack)/node_modules/react-dom/lib/EventPluginHub.js 9.11 kB {5} [built]
   [51] (webpack)/node_modules/react-dom/lib/EventPluginRegistry.js 9.75 kB {5} [built]
   [52] (webpack)/node_modules/react-dom/lib/EventPluginUtils.js 7.95 kB {5} [built]
   [64] (webpack)/node_modules/react-dom/lib/KeyEscapeUtils.js 1.29 kB {5} [built]
   [97] (webpack)/node_modules/react-dom/lib/FallbackCompositionState.js 2.43 kB {5} [built]
  [103] (webpack)/node_modules/react-dom/lib/DefaultEventPluginOrder.js 1.08 kB {5} [built]
  [104] (webpack)/node_modules/react-dom/lib/EnterLeaveEventPlugin.js 3.16 kB {5} [built]
  [105] (webpack)/node_modules/react-dom/lib/HTMLDOMPropertyConfig.js 6.57 kB {5} [built]
  [106] (webpack)/node_modules/react-dom/lib/ReactComponentBrowserEnvironment.js 906 bytes {5} [built]
  [107] (webpack)/node_modules/react-dom/lib/Danger.js 2.24 kB {5} [built]
  [168] (webpack)/node_modules/react-dom/lib/renderSubtreeIntoContainer.js 422 bytes {5} [built]
chunk    {6} 4e84b25ca2817f467451.js 49.8 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
   [36] (webpack)/node_modules/react-dom/lib/ReactUpdates.js 9.53 kB {6} [built]
   [40] (webpack)/node_modules/react-dom/lib/ReactReconciler.js 6.21 kB {6} [built]
   [65] (webpack)/node_modules/react-dom/lib/ReactUpdateQueue.js 9.36 kB {6} [built]
   [75] (webpack)/node_modules/react-dom/lib/ViewportMetrics.js 606 bytes {6} [built]
   [99] (webpack)/node_modules/react-dom/lib/SyntheticInputEvent.js 1.09 kB {6} [built]
  [136] (webpack)/node_modules/react-dom/lib/ReactServerUpdateQueue.js 4.83 kB {6} [built]
  [150] (webpack)/node_modules/react-dom/lib/SVGDOMPropertyConfig.js 7.32 kB {6} [built]
  [151] (webpack)/node_modules/react-dom/lib/SelectEventPlugin.js 6.06 kB {6} [built]
  [155] (webpack)/node_modules/react-dom/lib/SyntheticFocusEvent.js 1.07 kB {6} [built]
  [156] (webpack)/node_modules/react-dom/lib/SyntheticKeyboardEvent.js 2.71 kB {6} [built]
  [158] (webpack)/node_modules/react-dom/lib/SyntheticDragEvent.js 1.07 kB {6} [built]
chunk    {7} 63720a012abfcaff3dc2.js 50 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
   [39] (webpack)/node_modules/react-dom/lib/DOMProperty.js 8.24 kB {7} [built]
   [41] (webpack)/node_modules/react-dom/lib/DOMLazyTree.js 3.71 kB {7} [built]
   [57] (webpack)/node_modules/react-dom/lib/DOMChildrenOperations.js 7.67 kB {7} [built]
   [58] (webpack)/node_modules/react-dom/lib/DOMNamespaces.js 505 bytes {7} [built]
   [68] (webpack)/node_modules/react-dom/lib/ReactDOMComponentFlags.js 429 bytes {7} [built]
   [72] (webpack)/node_modules/react-dom/lib/CallbackQueue.js 3.16 kB {7} [built]
   [79] (webpack)/node_modules/react-dom/lib/DOMPropertyOperations.js 7.61 kB {7} [built]
  [100] (webpack)/node_modules/react-dom/lib/ChangeEventPlugin.js 11.8 kB {7} [built]
  [114] (webpack)/node_modules/react-dom/lib/CSSPropertyOperations.js 6.87 kB {7} [built]
chunk    {8} 1643f493a78100985651.js 50 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
   [91] (webpack)/node_modules/react-dom/lib/ReactMount.js 25.5 kB {8} [built]
  [128] (webpack)/node_modules/react-dom/lib/ReactMultiChild.js 14.6 kB {8} [built]
  [135] (webpack)/node_modules/react-dom/lib/ReactServerRenderingTransaction.js 2.29 kB {8} [built]
  [144] (webpack)/node_modules/react-dom/lib/ReactReconcileTransaction.js 5.26 kB {8} [built]
  [153] (webpack)/node_modules/react-dom/lib/SyntheticAnimationEvent.js 1.21 kB {8} [built]
  [154] (webpack)/node_modules/react-dom/lib/SyntheticClipboardEvent.js 1.17 kB {8} [built]
chunk    {9} 5126389152f68b572f76.js 32.9 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
   [63] (webpack)/node_modules/react-dom/lib/shouldUpdateReactComponent.js 1.4 kB {9} [built]
   [66] (webpack)/node_modules/react-dom/lib/validateDOMNesting.js 13.7 kB {9} [built]
   [86] (webpack)/node_modules/react-dom/lib/traverseAllChildren.js 7.04 kB {9} [built]
   [87] (webpack)/node_modules/react/lib/ReactComponentTreeHook.js 10.4 kB {9} [built]
  [131] (webpack)/node_modules/react/lib/getNextDebugID.js 437 bytes {9} [built]
chunk   {10} 7b4ee2059f1ad5fc6917.js 50 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
   [84] (webpack)/node_modules/react-dom/lib/ReactEmptyComponent.js 704 bytes {10} [built]
  [124] (webpack)/node_modules/react-dom/lib/ReactDOMInput.js 13 kB {10} [built]
  [125] (webpack)/node_modules/react-dom/lib/ReactPropTypesSecret.js 442 bytes {10} [built]
  [130] (webpack)/node_modules/react-dom/lib/ReactCompositeComponent.js 35.2 kB {10} [built]
  [132] (webpack)/node_modules/react-dom/lib/ReactElementSymbol.js 622 bytes {10} [built]
chunk   {11} 93a5c3d8205908bfd0ed.js 49.7 kB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
   [73] (webpack)/node_modules/react-dom/lib/ReactFeatureFlags.js 628 bytes {11} [built]
   [80] (webpack)/node_modules/react-dom/lib/ReactDOMSelect.js 6.81 kB {11} [built]
  [112] (webpack)/node_modules/react-dom/lib/ReactDOMComponent.js 38.5 kB {11} [built]
  [138] (webpack)/node_modules/react-dom/lib/ReactDOMTreeTraversal.js 3.72 kB {11} [built]
chunk   {12} 7204579bf3a7fc284bd7.js 50 kB [entry] [rendered] [recorded]
    > aggressive-splitted main [14] ./example.js 
    [0] (webpack)/node_modules/fbjs/lib/warning.js 2.1 kB {12} [built]
    [1] (webpack)/node_modules/fbjs/lib/invariant.js 1.63 kB {12} [built]
    [4] (webpack)/node_modules/object-assign/index.js 2.11 kB {12} [built]
    [5] (webpack)/node_modules/fbjs/lib/emptyFunction.js 1.08 kB {12} [built]
    [6] (webpack)/node_modules/fbjs/lib/emptyObject.js 458 bytes {12} [built]
    [7] (webpack)/node_modules/react/lib/ReactComponent.js 4.61 kB {12} [built]
    [9] (webpack)/node_modules/react/lib/ReactCurrentOwner.js 623 bytes {12} [built]
   [12] (webpack)/node_modules/react/lib/React.js 3.32 kB {12} [built]
   [13] (webpack)/node_modules/prop-types/factory.js 890 bytes {12} [built]
   [16] (webpack)/node_modules/react/lib/ReactChildren.js 6.19 kB {12} [built]
   [17] (webpack)/node_modules/react/lib/PooledClass.js 3.36 kB {12} [built]
   [20] (webpack)/node_modules/react/lib/KeyEscapeUtils.js 1.29 kB {12} [built]
   [26] (webpack)/node_modules/prop-types/factoryWithTypeCheckers.js 18.6 kB {12} [built]
   [27] (webpack)/node_modules/prop-types/lib/ReactPropTypesSecret.js 436 bytes {12} [built]
   [28] (webpack)/node_modules/prop-types/checkPropTypes.js 2.94 kB {12} [built]
   [29] (webpack)/node_modules/react/lib/ReactVersion.js 350 bytes {12} [built]
chunk   {13} 1c09c55e51c8551491d7.js 30.6 kB [initial] [rendered]
    > aggressive-splitted main [14] ./example.js 
    [2] (webpack)/node_modules/react/lib/ReactElement.js 11.2 kB {13} [built]
    [3] (webpack)/node_modules/react/lib/reactProdInvariant.js 1.24 kB {13} [built]
   [10] (webpack)/node_modules/react/lib/canDefineProperty.js 661 bytes {13} [built]
   [14] ./example.js 44 bytes {13} [built]
   [15] (webpack)/node_modules/react/react.js 56 bytes {13} [built]
   [18] (webpack)/node_modules/react/lib/traverseAllChildren.js 7.03 kB {13} [built]
   [19] (webpack)/node_modules/react/lib/getIteratorFn.js 1.12 kB {13} [built]
   [21] (webpack)/node_modules/react/lib/ReactPureComponent.js 1.32 kB {13} [built]
   [23] (webpack)/node_modules/react/lib/ReactPropTypeLocationNames.js 572 bytes {13} [built]
   [24] (webpack)/node_modules/react/lib/ReactDOMFactories.js 5.53 kB {13} [built]
   [25] (webpack)/node_modules/react/lib/ReactPropTypes.js 500 bytes {13} [built]
   [30] (webpack)/node_modules/react/lib/onlyChild.js 1.34 kB {13} [built]
chunk   {14} b2c554fdf2bde4af1bc2.js 30.9 kB [initial] [rendered] [recorded]
    > aggressive-splitted main [14] ./example.js 
    [8] (webpack)/node_modules/react/lib/ReactNoopUpdateQueue.js 3.36 kB {14} [built]
   [11] (webpack)/node_modules/react/lib/ReactElementSymbol.js 622 bytes {14} [built]
   [22] (webpack)/node_modules/react/lib/ReactClass.js 26.9 kB {14} [built]
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
      "../../node_modules/react/lib/canDefineProperty.js": 10,
      "../../node_modules/react/lib/ReactElementSymbol.js": 11,
      "../../node_modules/react/lib/React.js": 12,
      "../../node_modules/prop-types/factory.js": 13,
      "example.js": 14,
      "../../node_modules/react/react.js": 15,
      "../../node_modules/react/lib/ReactChildren.js": 16,
      "../../node_modules/react/lib/PooledClass.js": 17,
      "../../node_modules/react/lib/traverseAllChildren.js": 18,
      "../../node_modules/react/lib/getIteratorFn.js": 19,
      "../../node_modules/react/lib/KeyEscapeUtils.js": 20,
      "../../node_modules/react/lib/ReactPureComponent.js": 21,
      "../../node_modules/react/lib/ReactClass.js": 22,
      "../../node_modules/react/lib/ReactPropTypeLocationNames.js": 23,
      "../../node_modules/react/lib/ReactDOMFactories.js": 24,
      "../../node_modules/react/lib/ReactPropTypes.js": 25,
      "../../node_modules/prop-types/factoryWithTypeCheckers.js": 26,
      "../../node_modules/prop-types/lib/ReactPropTypesSecret.js": 27,
      "../../node_modules/prop-types/checkPropTypes.js": 28,
      "../../node_modules/react/lib/ReactVersion.js": 29,
      "../../node_modules/react/lib/onlyChild.js": 30,
      "../../node_modules/react-dom/index.js": 31,
      "../../node_modules/react-dom/lib/reactProdInvariant.js": 32,
      "../../node_modules/react-dom/lib/ReactDOMComponentTree.js": 33,
      "../../node_modules/fbjs/lib/ExecutionEnvironment.js": 34,
      "../../node_modules/react-dom/lib/ReactInstrumentation.js": 35,
      "../../node_modules/react-dom/lib/ReactUpdates.js": 36,
      "../../node_modules/react-dom/lib/SyntheticEvent.js": 37,
      "../../node_modules/react-dom/lib/PooledClass.js": 38,
      "../../node_modules/react-dom/lib/DOMProperty.js": 39,
      "../../node_modules/react-dom/lib/ReactReconciler.js": 40,
      "../../node_modules/react-dom/lib/DOMLazyTree.js": 41,
      "../../node_modules/react-dom/lib/EventPropagators.js": 42,
      "../../node_modules/react-dom/lib/EventPluginHub.js": 43,
      "../../node_modules/react-dom/lib/SyntheticUIEvent.js": 44,
      "../../node_modules/react-dom/lib/ReactInstanceMap.js": 45,
      "../../node_modules/react-dom/lib/Transaction.js": 46,
      "../../node_modules/react-dom/lib/SyntheticMouseEvent.js": 47,
      "../../node_modules/react-dom/lib/setInnerHTML.js": 48,
      "../../node_modules/react-dom/lib/escapeTextContentForBrowser.js": 49,
      "../../node_modules/react-dom/lib/ReactBrowserEventEmitter.js": 50,
      "../../node_modules/react-dom/lib/EventPluginRegistry.js": 51,
      "../../node_modules/react-dom/lib/EventPluginUtils.js": 52,
      "../../node_modules/react-dom/lib/ReactErrorUtils.js": 53,
      "../../node_modules/react-dom/lib/getEventTarget.js": 54,
      "../../node_modules/react-dom/lib/isEventSupported.js": 55,
      "../../node_modules/react-dom/lib/getEventModifierState.js": 56,
      "../../node_modules/react-dom/lib/DOMChildrenOperations.js": 57,
      "../../node_modules/react-dom/lib/DOMNamespaces.js": 58,
      "../../node_modules/react-dom/lib/createMicrosoftUnsafeLocalFunction.js": 59,
      "../../node_modules/react-dom/lib/LinkedValueUtils.js": 60,
      "../../node_modules/react-dom/lib/ReactComponentEnvironment.js": 61,
      "../../node_modules/fbjs/lib/shallowEqual.js": 62,
      "../../node_modules/react-dom/lib/shouldUpdateReactComponent.js": 63,
      "../../node_modules/react-dom/lib/KeyEscapeUtils.js": 64,
      "../../node_modules/react-dom/lib/ReactUpdateQueue.js": 65,
      "../../node_modules/react-dom/lib/validateDOMNesting.js": 66,
      "../../node_modules/react-dom/lib/getEventCharCode.js": 67,
      "../../node_modules/react-dom/lib/ReactDOMComponentFlags.js": 68,
      "../../node_modules/react-dom/lib/accumulateInto.js": 69,
      "../../node_modules/react-dom/lib/forEachAccumulated.js": 70,
      "../../node_modules/react-dom/lib/getTextContentAccessor.js": 71,
      "../../node_modules/react-dom/lib/CallbackQueue.js": 72,
      "../../node_modules/react-dom/lib/ReactFeatureFlags.js": 73,
      "../../node_modules/react-dom/lib/isTextInputElement.js": 74,
      "../../node_modules/react-dom/lib/ViewportMetrics.js": 75,
      "../../node_modules/react-dom/lib/setTextContent.js": 76,
      "../../node_modules/fbjs/lib/focusNode.js": 77,
      "../../node_modules/react-dom/lib/CSSProperty.js": 78,
      "../../node_modules/react-dom/lib/DOMPropertyOperations.js": 79,
      "../../node_modules/react-dom/lib/ReactDOMSelect.js": 80,
      "../../node_modules/process/browser.js": 81,
      "../../node_modules/react-dom/lib/instantiateReactComponent.js": 82,
      "../../node_modules/react-dom/lib/ReactNodeTypes.js": 83,
      "../../node_modules/react-dom/lib/ReactEmptyComponent.js": 84,
      "../../node_modules/react-dom/lib/ReactHostComponent.js": 85,
      "../../node_modules/react-dom/lib/traverseAllChildren.js": 86,
      "../../node_modules/react/lib/ReactComponentTreeHook.js": 87,
      "../../node_modules/fbjs/lib/EventListener.js": 88,
      "../../node_modules/react-dom/lib/ReactInputSelection.js": 89,
      "../../node_modules/fbjs/lib/getActiveElement.js": 90,
      "../../node_modules/react-dom/lib/ReactMount.js": 91,
      "../../node_modules/react-dom/lib/getHostComponentFromComposite.js": 92,
      "../../node_modules/react-dom/lib/ReactDOM.js": 93,
      "../../node_modules/react-dom/lib/ReactDefaultInjection.js": 94,
      "../../node_modules/react-dom/lib/ARIADOMPropertyConfig.js": 95,
      "../../node_modules/react-dom/lib/BeforeInputEventPlugin.js": 96,
      "../../node_modules/react-dom/lib/FallbackCompositionState.js": 97,
      "../../node_modules/react-dom/lib/SyntheticCompositionEvent.js": 98,
      "../../node_modules/react-dom/lib/SyntheticInputEvent.js": 99,
      "../../node_modules/react-dom/lib/ChangeEventPlugin.js": 100,
      "../../node_modules/react-dom/lib/ReactRef.js": 101,
      "../../node_modules/react-dom/lib/ReactOwner.js": 102,
      "../../node_modules/react-dom/lib/DefaultEventPluginOrder.js": 103,
      "../../node_modules/react-dom/lib/EnterLeaveEventPlugin.js": 104,
      "../../node_modules/react-dom/lib/HTMLDOMPropertyConfig.js": 105,
      "../../node_modules/react-dom/lib/ReactComponentBrowserEnvironment.js": 106,
      "../../node_modules/react-dom/lib/Danger.js": 107,
      "../../node_modules/fbjs/lib/createNodesFromMarkup.js": 108,
      "../../node_modules/fbjs/lib/createArrayFromMixed.js": 109,
      "../../node_modules/fbjs/lib/getMarkupWrap.js": 110,
      "../../node_modules/react-dom/lib/ReactDOMIDOperations.js": 111,
      "../../node_modules/react-dom/lib/ReactDOMComponent.js": 112,
      "../../node_modules/react-dom/lib/AutoFocusUtils.js": 113,
      "../../node_modules/react-dom/lib/CSSPropertyOperations.js": 114,
      "../../node_modules/fbjs/lib/camelizeStyleName.js": 115,
      "../../node_modules/fbjs/lib/camelize.js": 116,
      "../../node_modules/react-dom/lib/dangerousStyleValue.js": 117,
      "../../node_modules/fbjs/lib/hyphenateStyleName.js": 118,
      "../../node_modules/fbjs/lib/hyphenate.js": 119,
      "../../node_modules/fbjs/lib/memoizeStringOnly.js": 120,
      "../../node_modules/react-dom/lib/quoteAttributeValueForBrowser.js": 121,
      "../../node_modules/react-dom/lib/ReactEventEmitterMixin.js": 122,
      "../../node_modules/react-dom/lib/getVendorPrefixedEventName.js": 123,
      "../../node_modules/react-dom/lib/ReactDOMInput.js": 124,
      "../../node_modules/react-dom/lib/ReactPropTypesSecret.js": 125,
      "../../node_modules/react-dom/lib/ReactDOMOption.js": 126,
      "../../node_modules/react-dom/lib/ReactDOMTextarea.js": 127,
      "../../node_modules/react-dom/lib/ReactMultiChild.js": 128,
      "../../node_modules/react-dom/lib/ReactChildReconciler.js": 129,
      "../../node_modules/react-dom/lib/ReactCompositeComponent.js": 130,
      "../../node_modules/react/lib/getNextDebugID.js": 131,
      "../../node_modules/react-dom/lib/ReactElementSymbol.js": 132,
      "../../node_modules/react-dom/lib/getIteratorFn.js": 133,
      "../../node_modules/react-dom/lib/flattenChildren.js": 134,
      "../../node_modules/react-dom/lib/ReactServerRenderingTransaction.js": 135,
      "../../node_modules/react-dom/lib/ReactServerUpdateQueue.js": 136,
      "../../node_modules/react-dom/lib/ReactDOMEmptyComponent.js": 137,
      "../../node_modules/react-dom/lib/ReactDOMTreeTraversal.js": 138,
      "../../node_modules/react-dom/lib/ReactDOMTextComponent.js": 139,
      "../../node_modules/react-dom/lib/ReactDefaultBatchingStrategy.js": 140,
      "../../node_modules/react-dom/lib/ReactEventListener.js": 141,
      "../../node_modules/fbjs/lib/getUnboundedScrollPosition.js": 142,
      "../../node_modules/react-dom/lib/ReactInjection.js": 143,
      "../../node_modules/react-dom/lib/ReactReconcileTransaction.js": 144,
      "../../node_modules/react-dom/lib/ReactDOMSelection.js": 145,
      "../../node_modules/react-dom/lib/getNodeForCharacterOffset.js": 146,
      "../../node_modules/fbjs/lib/containsNode.js": 147,
      "../../node_modules/fbjs/lib/isTextNode.js": 148,
      "../../node_modules/fbjs/lib/isNode.js": 149,
      "../../node_modules/react-dom/lib/SVGDOMPropertyConfig.js": 150,
      "../../node_modules/react-dom/lib/SelectEventPlugin.js": 151,
      "../../node_modules/react-dom/lib/SimpleEventPlugin.js": 152,
      "../../node_modules/react-dom/lib/SyntheticAnimationEvent.js": 153,
      "../../node_modules/react-dom/lib/SyntheticClipboardEvent.js": 154,
      "../../node_modules/react-dom/lib/SyntheticFocusEvent.js": 155,
      "../../node_modules/react-dom/lib/SyntheticKeyboardEvent.js": 156,
      "../../node_modules/react-dom/lib/getEventKey.js": 157,
      "../../node_modules/react-dom/lib/SyntheticDragEvent.js": 158,
      "../../node_modules/react-dom/lib/SyntheticTouchEvent.js": 159,
      "../../node_modules/react-dom/lib/SyntheticTransitionEvent.js": 160,
      "../../node_modules/react-dom/lib/SyntheticWheelEvent.js": 161,
      "../../node_modules/react-dom/lib/ReactDOMContainerInfo.js": 162,
      "../../node_modules/react-dom/lib/ReactDOMFeatureFlags.js": 163,
      "../../node_modules/react-dom/lib/ReactMarkupChecksum.js": 164,
      "../../node_modules/react-dom/lib/adler32.js": 165,
      "../../node_modules/react-dom/lib/ReactVersion.js": 166,
      "../../node_modules/react-dom/lib/findDOMNode.js": 167,
      "../../node_modules/react-dom/lib/renderSubtreeIntoContainer.js": 168
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
      "example.js:0/0:0": 0,
      "example.js:0/0:1": 1,
      "example.js:0/0:2": 2,
      "example.js:0/0:3": 3,
      "example.js:0/0:4": 4,
      "example.js:0/0:5": 5,
      "example.js:0/0:6": 6,
      "example.js:0/0:7": 7,
      "example.js:0/0:8": 8,
      "example.js:0/0:9": 9,
      "example.js:0/0:10": 10,
      "example.js:0/0:11": 11
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
        "../../node_modules/fbjs/lib/focusNode.js",
        "../../node_modules/react-dom/lib/CSSProperty.js",
        "../../node_modules/process/browser.js",
        "../../node_modules/fbjs/lib/EventListener.js",
        "../../node_modules/fbjs/lib/getActiveElement.js",
        "../../node_modules/react-dom/lib/ARIADOMPropertyConfig.js",
        "../../node_modules/react-dom/lib/BeforeInputEventPlugin.js",
        "../../node_modules/fbjs/lib/createNodesFromMarkup.js",
        "../../node_modules/fbjs/lib/createArrayFromMixed.js",
        "../../node_modules/fbjs/lib/getMarkupWrap.js",
        "../../node_modules/react-dom/lib/AutoFocusUtils.js",
        "../../node_modules/fbjs/lib/camelizeStyleName.js",
        "../../node_modules/fbjs/lib/camelize.js",
        "../../node_modules/fbjs/lib/hyphenateStyleName.js",
        "../../node_modules/fbjs/lib/hyphenate.js",
        "../../node_modules/fbjs/lib/memoizeStringOnly.js",
        "../../node_modules/fbjs/lib/getUnboundedScrollPosition.js",
        "../../node_modules/fbjs/lib/containsNode.js",
        "../../node_modules/fbjs/lib/isTextNode.js",
        "../../node_modules/fbjs/lib/isNode.js",
        "../../node_modules/react-dom/lib/ReactVersion.js"
      ],
      "hash": "d781be6d09f29b2b482733e0093c9e63",
      "id": 0
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/ReactInstrumentation.js",
        "../../node_modules/react-dom/lib/ReactInstanceMap.js",
        "../../node_modules/react-dom/lib/ReactErrorUtils.js",
        "../../node_modules/react-dom/lib/ReactNodeTypes.js",
        "../../node_modules/react-dom/lib/ReactHostComponent.js",
        "../../node_modules/react-dom/lib/ReactInputSelection.js",
        "../../node_modules/react-dom/lib/ReactDefaultInjection.js",
        "../../node_modules/react-dom/lib/SyntheticCompositionEvent.js",
        "../../node_modules/react-dom/lib/ReactRef.js",
        "../../node_modules/react-dom/lib/ReactOwner.js",
        "../../node_modules/react-dom/lib/ReactEventEmitterMixin.js",
        "../../node_modules/react-dom/lib/ReactDOMTextarea.js",
        "../../node_modules/react-dom/lib/ReactDOMTextComponent.js",
        "../../node_modules/react-dom/lib/ReactEventListener.js",
        "../../node_modules/react-dom/lib/ReactInjection.js",
        "../../node_modules/react-dom/lib/ReactDOMSelection.js",
        "../../node_modules/react-dom/lib/ReactMarkupChecksum.js"
      ],
      "hash": "de7417f0e2c93a0b6c6b85726736ce98",
      "id": 1
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/reactProdInvariant.js",
        "../../node_modules/react-dom/lib/setInnerHTML.js",
        "../../node_modules/react-dom/lib/getEventTarget.js",
        "../../node_modules/react-dom/lib/isEventSupported.js",
        "../../node_modules/react-dom/lib/getEventModifierState.js",
        "../../node_modules/react-dom/lib/getTextContentAccessor.js",
        "../../node_modules/react-dom/lib/isTextInputElement.js",
        "../../node_modules/react-dom/lib/setTextContent.js",
        "../../node_modules/react-dom/lib/instantiateReactComponent.js",
        "../../node_modules/react-dom/lib/getHostComponentFromComposite.js",
        "../../node_modules/react-dom/lib/quoteAttributeValueForBrowser.js",
        "../../node_modules/react-dom/lib/getVendorPrefixedEventName.js",
        "../../node_modules/react-dom/lib/getIteratorFn.js",
        "../../node_modules/react-dom/lib/flattenChildren.js",
        "../../node_modules/react-dom/lib/getNodeForCharacterOffset.js",
        "../../node_modules/react-dom/lib/getEventKey.js"
      ],
      "hash": "e22d04fae277d630dffb51189052cf31",
      "id": 2
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/SyntheticEvent.js",
        "../../node_modules/react-dom/lib/SyntheticUIEvent.js",
        "../../node_modules/react-dom/lib/Transaction.js",
        "../../node_modules/react-dom/lib/SyntheticMouseEvent.js",
        "../../node_modules/react-dom/lib/escapeTextContentForBrowser.js",
        "../../node_modules/react-dom/lib/createMicrosoftUnsafeLocalFunction.js",
        "../../node_modules/react-dom/lib/getEventCharCode.js",
        "../../node_modules/react-dom/lib/accumulateInto.js",
        "../../node_modules/react-dom/lib/forEachAccumulated.js",
        "../../node_modules/react-dom/lib/dangerousStyleValue.js",
        "../../node_modules/react-dom/lib/SimpleEventPlugin.js",
        "../../node_modules/react-dom/lib/SyntheticTouchEvent.js",
        "../../node_modules/react-dom/lib/SyntheticTransitionEvent.js",
        "../../node_modules/react-dom/lib/SyntheticWheelEvent.js",
        "../../node_modules/react-dom/lib/adler32.js",
        "../../node_modules/react-dom/lib/findDOMNode.js"
      ],
      "hash": "9e7f806cd88dbd9d6fb2347515c07ffb",
      "id": 3
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/ReactDOMComponentTree.js",
        "../../node_modules/react-dom/lib/PooledClass.js",
        "../../node_modules/react-dom/lib/ReactBrowserEventEmitter.js",
        "../../node_modules/react-dom/lib/LinkedValueUtils.js",
        "../../node_modules/react-dom/lib/ReactComponentEnvironment.js",
        "../../node_modules/react-dom/lib/ReactDOM.js",
        "../../node_modules/react-dom/lib/ReactDOMIDOperations.js",
        "../../node_modules/react-dom/lib/ReactDOMOption.js",
        "../../node_modules/react-dom/lib/ReactChildReconciler.js",
        "../../node_modules/react-dom/lib/ReactDOMEmptyComponent.js",
        "../../node_modules/react-dom/lib/ReactDefaultBatchingStrategy.js",
        "../../node_modules/react-dom/lib/ReactDOMContainerInfo.js",
        "../../node_modules/react-dom/lib/ReactDOMFeatureFlags.js"
      ],
      "hash": "ac431bb53a29734a77790a9e80c3502f",
      "id": 4
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/EventPropagators.js",
        "../../node_modules/react-dom/lib/EventPluginHub.js",
        "../../node_modules/react-dom/lib/EventPluginRegistry.js",
        "../../node_modules/react-dom/lib/EventPluginUtils.js",
        "../../node_modules/react-dom/lib/KeyEscapeUtils.js",
        "../../node_modules/react-dom/lib/FallbackCompositionState.js",
        "../../node_modules/react-dom/lib/DefaultEventPluginOrder.js",
        "../../node_modules/react-dom/lib/EnterLeaveEventPlugin.js",
        "../../node_modules/react-dom/lib/HTMLDOMPropertyConfig.js",
        "../../node_modules/react-dom/lib/ReactComponentBrowserEnvironment.js",
        "../../node_modules/react-dom/lib/Danger.js",
        "../../node_modules/react-dom/lib/renderSubtreeIntoContainer.js"
      ],
      "hash": "b25aa19ca5829abb4fab95343add6bce",
      "id": 5
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/ReactUpdates.js",
        "../../node_modules/react-dom/lib/ReactReconciler.js",
        "../../node_modules/react-dom/lib/ReactUpdateQueue.js",
        "../../node_modules/react-dom/lib/ViewportMetrics.js",
        "../../node_modules/react-dom/lib/SyntheticInputEvent.js",
        "../../node_modules/react-dom/lib/ReactServerUpdateQueue.js",
        "../../node_modules/react-dom/lib/SVGDOMPropertyConfig.js",
        "../../node_modules/react-dom/lib/SelectEventPlugin.js",
        "../../node_modules/react-dom/lib/SyntheticFocusEvent.js",
        "../../node_modules/react-dom/lib/SyntheticKeyboardEvent.js",
        "../../node_modules/react-dom/lib/SyntheticDragEvent.js"
      ],
      "hash": "4e84b25ca2817f467451207312e9636c",
      "id": 6
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/DOMProperty.js",
        "../../node_modules/react-dom/lib/DOMLazyTree.js",
        "../../node_modules/react-dom/lib/DOMChildrenOperations.js",
        "../../node_modules/react-dom/lib/DOMNamespaces.js",
        "../../node_modules/react-dom/lib/ReactDOMComponentFlags.js",
        "../../node_modules/react-dom/lib/CallbackQueue.js",
        "../../node_modules/react-dom/lib/DOMPropertyOperations.js",
        "../../node_modules/react-dom/lib/ChangeEventPlugin.js",
        "../../node_modules/react-dom/lib/CSSPropertyOperations.js"
      ],
      "hash": "63720a012abfcaff3dc25de952050987",
      "id": 7
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/ReactMount.js",
        "../../node_modules/react-dom/lib/ReactMultiChild.js",
        "../../node_modules/react-dom/lib/ReactServerRenderingTransaction.js",
        "../../node_modules/react-dom/lib/ReactReconcileTransaction.js",
        "../../node_modules/react-dom/lib/SyntheticAnimationEvent.js",
        "../../node_modules/react-dom/lib/SyntheticClipboardEvent.js"
      ],
      "hash": "1643f493a7810098565156421a808c24",
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
      "hash": "5126389152f68b572f76deb03776e9d4",
      "id": 9
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/ReactEmptyComponent.js",
        "../../node_modules/react-dom/lib/ReactDOMInput.js",
        "../../node_modules/react-dom/lib/ReactPropTypesSecret.js",
        "../../node_modules/react-dom/lib/ReactCompositeComponent.js",
        "../../node_modules/react-dom/lib/ReactElementSymbol.js"
      ],
      "hash": "7b4ee2059f1ad5fc6917b59fc7a0fcee",
      "id": 10
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/ReactFeatureFlags.js",
        "../../node_modules/react-dom/lib/ReactDOMSelect.js",
        "../../node_modules/react-dom/lib/ReactDOMComponent.js",
        "../../node_modules/react-dom/lib/ReactDOMTreeTraversal.js"
      ],
      "hash": "93a5c3d8205908bfd0ed90b34b496f1e",
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
        "../../node_modules/react/lib/ReactChildren.js",
        "../../node_modules/react/lib/PooledClass.js",
        "../../node_modules/react/lib/KeyEscapeUtils.js",
        "../../node_modules/prop-types/factoryWithTypeCheckers.js",
        "../../node_modules/prop-types/lib/ReactPropTypesSecret.js",
        "../../node_modules/prop-types/checkPropTypes.js",
        "../../node_modules/react/lib/ReactVersion.js"
      ],
      "hash": "7204579bf3a7fc284bd78a4f5a8c8eb3",
      "id": 12
    },
    {
      "modules": [
        "../../node_modules/react/lib/ReactNoopUpdateQueue.js",
        "../../node_modules/react/lib/ReactElementSymbol.js",
        "../../node_modules/react/lib/ReactClass.js"
      ],
      "hash": "b2c554fdf2bde4af1bc2ebeafa0d56a1",
      "id": 14
    }
  ]
}
```
