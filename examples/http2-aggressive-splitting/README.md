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
Hash: 5184413f3a374e7b5936
Version: webpack 2.1.0-beta.22
Time: 2195ms
                  Asset     Size  Chunks             Chunk Names
3068d4ff9b2dfb5c271a.js  52.9 kB       7  [emitted]  
1063f7bead1953d50075.js  57.7 kB       0  [emitted]  
fe372bb5ee58ecbb3049.js  55.3 kB       2  [emitted]  
ba0a52412704eb5fca77.js  54.6 kB       3  [emitted]  
3e6efa14517e3078592b.js  34.4 kB       4  [emitted]  
310186c03028a0b418f9.js  53.5 kB       5  [emitted]  
1040df4c2eee288dc9fc.js  36.2 kB       6  [emitted]  
b161c72948813fe0486f.js    56 kB       1  [emitted]  
2223fbc79b19b9c04ab0.js  52.8 kB       8  [emitted]  
e43acdd06dbd3b718702.js  51.2 kB       9  [emitted]  
60106e3f2b149c66854f.js    51 kB      10  [emitted]  
90e7ca83098a54640244.js  49.7 kB      11  [emitted]  
26c97ecb935008096f9b.js  58.6 kB      12  [emitted]  
31e30b54bea15a36c45b.js  34.3 kB      13  [emitted]  
26934d90a868e3c64b52.js  27.9 kB      14  [emitted]  
Entrypoint main = 26c97ecb935008096f9b.js 26934d90a868e3c64b52.js 31e30b54bea15a36c45b.js
chunk    {0} 1063f7bead1953d50075.js 49.8 kB {13} {12} {14} [rendered] [recorded]
    > aggressive-splitted [31] ./example.js 2:0-22
   [26] (webpack)/~/react-dom/index.js 63 bytes {0} [built]
   [33] (webpack)/~/fbjs/lib/ExecutionEnvironment.js 1.06 kB {0} [built]
   [51] (webpack)/~/fbjs/lib/shallowEqual.js 1.66 kB {0} [built]
   [52] (webpack)/~/process/browser.js 2.06 kB {0} [built]
   [54] (webpack)/~/react/lib/DOMNamespaces.js 538 bytes {0} [built]
   [69] (webpack)/~/fbjs/lib/EventListener.js 2.67 kB {0} [built]
   [70] (webpack)/~/fbjs/lib/focusNode.js 704 bytes {0} [built]
   [71] (webpack)/~/fbjs/lib/getActiveElement.js 895 bytes {0} [built]
   [72] (webpack)/~/react/lib/CSSProperty.js 3.69 kB {0} [built]
   [73] (webpack)/~/react/lib/CallbackQueue.js 2.73 kB {0} [built]
   [93] (webpack)/~/fbjs/lib/camelize.js 708 bytes {0} [built]
   [94] (webpack)/~/fbjs/lib/camelizeStyleName.js 1 kB {0} [built]
   [95] (webpack)/~/fbjs/lib/containsNode.js 1.05 kB {0} [built]
   [96] (webpack)/~/fbjs/lib/createArrayFromMixed.js 4.11 kB {0} [built]
   [97] (webpack)/~/fbjs/lib/createNodesFromMarkup.js 2.66 kB {0} [built]
   [98] (webpack)/~/fbjs/lib/getMarkupWrap.js 3.04 kB {0} [built]
   [99] (webpack)/~/fbjs/lib/getUnboundedScrollPosition.js 1.05 kB {0} [built]
  [100] (webpack)/~/fbjs/lib/hyphenate.js 800 bytes {0} [built]
  [101] (webpack)/~/fbjs/lib/hyphenateStyleName.js 974 bytes {0} [built]
  [102] (webpack)/~/fbjs/lib/isNode.js 693 bytes {0} [built]
  [103] (webpack)/~/fbjs/lib/isTextNode.js 605 bytes {0} [built]
  [104] (webpack)/~/fbjs/lib/memoizeStringOnly.js 698 bytes {0} [built]
  [105] (webpack)/~/react/lib/AutoFocusUtils.js 633 bytes {0} [built]
  [106] (webpack)/~/react/lib/BeforeInputEventPlugin.js 13.9 kB {0} [built]
  [110] (webpack)/~/react/lib/DefaultEventPluginOrder.js 1.26 kB {0} [built]
  [117] (webpack)/~/react/lib/ReactDOMButton.js 634 bytes {0} [built]
chunk    {1} b161c72948813fe0486f.js 49.9 kB {13} {12} {14} [rendered] [recorded]
    > aggressive-splitted [31] ./example.js 2:0-22
   [34] (webpack)/~/react/lib/ReactInstrumentation.js 559 bytes {1} [built]
   [43] (webpack)/~/react/lib/ReactInstanceMap.js 1.26 kB {1} [built]
   [60] (webpack)/~/react/lib/ReactErrorUtils.js 2.26 kB {1} [built]
   [79] (webpack)/~/react/lib/ReactFeatureFlags.js 665 bytes {1} [built]
   [80] (webpack)/~/react/lib/ReactHostComponent.js 2.42 kB {1} [built]
   [81] (webpack)/~/react/lib/ReactInputSelection.js 4.31 kB {1} [built]
   [83] (webpack)/~/react/lib/ReactMultiChildUpdateTypes.js 864 bytes {1} [built]
   [84] (webpack)/~/react/lib/ReactNodeTypes.js 1.06 kB {1} [built]
   [85] (webpack)/~/react/lib/ViewportMetrics.js 641 bytes {1} [built]
  [126] (webpack)/~/react/lib/ReactDOMSelection.js 6.81 kB {1} [built]
  [127] (webpack)/~/react/lib/ReactDOMTextComponent.js 6.14 kB {1} [built]
  [128] (webpack)/~/react/lib/ReactDOMTextarea.js 6.36 kB {1} [built]
  [129] (webpack)/~/react/lib/ReactDOMTreeTraversal.js 3.74 kB {1} [built]
  [132] (webpack)/~/react/lib/ReactEventEmitterMixin.js 1 kB {1} [built]
  [133] (webpack)/~/react/lib/ReactEventListener.js 5.38 kB {1} [built]
  [134] (webpack)/~/react/lib/ReactInjection.js 1.31 kB {1} [built]
  [135] (webpack)/~/react/lib/ReactMarkupChecksum.js 1.51 kB {1} [built]
  [137] (webpack)/~/react/lib/ReactOwner.js 3.6 kB {1} [built]
chunk    {2} fe372bb5ee58ecbb3049.js 49.8 kB {13} {12} {14} [rendered] [recorded]
    > aggressive-splitted [31] ./example.js 2:0-22
   [37] (webpack)/~/react/lib/SyntheticEvent.js 8.73 kB {2} [built]
   [44] (webpack)/~/react/lib/SyntheticUIEvent.js 1.61 kB {2} [built]
   [48] (webpack)/~/react/lib/SyntheticMouseEvent.js 2.18 kB {2} [built]
   [86] (webpack)/~/react/lib/accumulateInto.js 1.73 kB {2} [built]
   [87] (webpack)/~/react/lib/forEachAccumulated.js 893 bytes {2} [built]
   [88] (webpack)/~/react/lib/getHostComponentFromComposite.js 789 bytes {2} [built]
  [144] (webpack)/~/react/lib/SimpleEventPlugin.js 18.9 kB {2} [built]
  [149] (webpack)/~/react/lib/SyntheticFocusEvent.js 1.1 kB {2} [built]
  [150] (webpack)/~/react/lib/SyntheticInputEvent.js 1.13 kB {2} [built]
  [151] (webpack)/~/react/lib/SyntheticKeyboardEvent.js 2.75 kB {2} [built]
  [152] (webpack)/~/react/lib/SyntheticTouchEvent.js 1.32 kB {2} [built]
  [153] (webpack)/~/react/lib/SyntheticTransitionEvent.js 1.27 kB {2} [built]
  [154] (webpack)/~/react/lib/SyntheticWheelEvent.js 1.98 kB {2} [built]
  [155] (webpack)/~/react/lib/adler32.js 1.22 kB {2} [built]
  [156] (webpack)/~/react/lib/checkReactTypeSpec.js 4.25 kB {2} [built]
chunk    {3} ba0a52412704eb5fca77.js 49.7 kB {13} {12} {14} [rendered] [recorded]
    > aggressive-splitted [31] ./example.js 2:0-22
   [32] (webpack)/~/react/lib/ReactDOMComponentTree.js 6.2 kB {3} [built]
   [47] (webpack)/~/react/lib/ReactBrowserEventEmitter.js 12.5 kB {3} [built]
   [58] (webpack)/~/react/lib/ReactComponentEnvironment.js 1.72 kB {3} [built]
   [59] (webpack)/~/react/lib/ReactComponentTreeDevtool.js 7.12 kB {3} [built]
   [75] (webpack)/~/react/lib/ReactComponentBrowserEnvironment.js 1.24 kB {3} [built]
  [114] (webpack)/~/react/lib/ReactChildReconciler.js 6.05 kB {3} [built]
  [116] (webpack)/~/react/lib/ReactDOM.js 4.67 kB {3} [built]
  [119] (webpack)/~/react/lib/ReactDOMContainerInfo.js 1.01 kB {3} [built]
  [120] (webpack)/~/react/lib/ReactDOMEmptyComponent.js 1.95 kB {3} [built]
  [122] (webpack)/~/react/lib/ReactDOMIDOperations.js 996 bytes {3} [built]
  [124] (webpack)/~/react/lib/ReactDOMInstrumentation.js 571 bytes {3} [built]
  [125] (webpack)/~/react/lib/ReactDOMOption.js 3.73 kB {3} [built]
  [130] (webpack)/~/react/lib/ReactDefaultBatchingStrategy.js 1.92 kB {3} [built]
chunk    {4} 3e6efa14517e3078592b.js 30.8 kB {13} {12} {14} [rendered] [recorded]
    > aggressive-splitted [31] ./example.js 2:0-22
   [45] (webpack)/~/react/lib/Transaction.js 9.61 kB {4} [built]
   [49] (webpack)/~/react/lib/escapeTextContentForBrowser.js 3.48 kB {4} [built]
   [63] (webpack)/~/react/lib/getEventCharCode.js 1.54 kB {4} [built]
   [64] (webpack)/~/react/lib/getEventModifierState.js 1.27 kB {4} [built]
   [65] (webpack)/~/react/lib/getEventTarget.js 1.04 kB {4} [built]
   [89] (webpack)/~/react/lib/getTextContentAccessor.js 997 bytes {4} [built]
  [157] (webpack)/~/react/lib/dangerousStyleValue.js 3.06 kB {4} [built]
  [158] (webpack)/~/react/lib/findDOMNode.js 2.49 kB {4} [built]
  [159] (webpack)/~/react/lib/flattenChildren.js 2.78 kB {4} [built]
  [160] (webpack)/~/react/lib/getEventKey.js 2.9 kB {4} [built]
  [161] (webpack)/~/react/lib/getNodeForCharacterOffset.js 1.66 kB {4} [built]
chunk    {5} 310186c03028a0b418f9.js 50 kB {13} {12} {14} [rendered] [recorded]
    > aggressive-splitted [31] ./example.js 2:0-22
   [35] (webpack)/~/react/lib/ReactUpdates.js 9.6 kB {5} [built]
   [40] (webpack)/~/react/lib/ReactReconciler.js 6.96 kB {5} [built]
   [61] (webpack)/~/react/lib/ReactUpdateQueue.js 9.03 kB {5} [built]
   [62] (webpack)/~/react/lib/createMicrosoftUnsafeLocalFunction.js 864 bytes {5} [built]
  [141] (webpack)/~/react/lib/ReactServerUpdateQueue.js 4.95 kB {5} [built]
  [142] (webpack)/~/react/lib/SVGDOMPropertyConfig.js 7.36 kB {5} [built]
  [143] (webpack)/~/react/lib/SelectEventPlugin.js 6.49 kB {5} [built]
  [145] (webpack)/~/react/lib/SyntheticAnimationEvent.js 1.25 kB {5} [built]
  [146] (webpack)/~/react/lib/SyntheticClipboardEvent.js 1.21 kB {5} [built]
  [147] (webpack)/~/react/lib/SyntheticCompositionEvent.js 1.14 kB {5} [built]
  [148] (webpack)/~/react/lib/SyntheticDragEvent.js 1.11 kB {5} [built]
chunk    {6} 1040df4c2eee288dc9fc.js 32.8 kB {13} {12} {14} [rendered] [recorded]
    > aggressive-splitted [31] ./example.js 2:0-22
   [50] (webpack)/~/react/lib/setInnerHTML.js 3.91 kB {6} [built]
   [66] (webpack)/~/react/lib/isEventSupported.js 1.97 kB {6} [built]
   [67] (webpack)/~/react/lib/shouldUpdateReactComponent.js 1.45 kB {6} [built]
   [68] (webpack)/~/react/lib/validateDOMNesting.js 13.1 kB {6} [built]
   [90] (webpack)/~/react/lib/instantiateReactComponent.js 5.68 kB {6} [built]
   [91] (webpack)/~/react/lib/isTextInputElement.js 1.08 kB {6} [built]
   [92] (webpack)/~/react/lib/setTextContent.js 1.4 kB {6} [built]
  [162] (webpack)/~/react/lib/getVendorPrefixedEventName.js 2.92 kB {6} [built]
  [163] (webpack)/~/react/lib/quoteAttributeValueForBrowser.js 749 bytes {6} [built]
  [164] (webpack)/~/react/lib/renderSubtreeIntoContainer.js 466 bytes {6} [built]
chunk    {7} 3068d4ff9b2dfb5c271a.js 49.7 kB {13} {12} {14} [rendered] [recorded]
    > aggressive-splitted [31] ./example.js 2:0-22
   [38] (webpack)/~/react/lib/DOMLazyTree.js 3.75 kB {7} [built]
   [39] (webpack)/~/react/lib/DOMProperty.js 8.13 kB {7} [built]
   [46] (webpack)/~/react/lib/DisabledInputUtils.js 1.16 kB {7} [built]
   [53] (webpack)/~/react/lib/DOMChildrenOperations.js 7.3 kB {7} [built]
   [74] (webpack)/~/react/lib/DOMPropertyOperations.js 7.85 kB {7} [built]
   [76] (webpack)/~/react/lib/ReactDOMComponentFlags.js 471 bytes {7} [built]
  [107] (webpack)/~/react/lib/CSSPropertyOperations.js 6.85 kB {7} [built]
  [108] (webpack)/~/react/lib/ChangeEventPlugin.js 11.5 kB {7} [built]
  [109] (webpack)/~/react/lib/Danger.js 2.27 kB {7} [built]
  [121] (webpack)/~/react/lib/ReactDOMFeatureFlags.js 460 bytes {7} [built]
chunk    {8} 2223fbc79b19b9c04ab0.js 50 kB {13} {12} {14} [rendered] [recorded]
    > aggressive-splitted [31] ./example.js 2:0-22
   [36] (webpack)/~/react/lib/EventConstants.js 2.17 kB {8} [built]
   [41] (webpack)/~/react/lib/EventPluginHub.js 8.23 kB {8} [built]
   [42] (webpack)/~/react/lib/EventPropagators.js 5.32 kB {8} [built]
   [55] (webpack)/~/react/lib/EventPluginRegistry.js 9.48 kB {8} [built]
   [56] (webpack)/~/react/lib/EventPluginUtils.js 8.17 kB {8} [built]
   [57] (webpack)/~/react/lib/LinkedValueUtils.js 5.28 kB {8} [built]
  [111] (webpack)/~/react/lib/EnterLeaveEventPlugin.js 3.46 kB {8} [built]
  [112] (webpack)/~/react/lib/FallbackCompositionState.js 2.47 kB {8} [built]
  [113] (webpack)/~/react/lib/HTMLDOMPropertyConfig.js 5.38 kB {8} [built]
chunk    {9} e43acdd06dbd3b718702.js 49.6 kB {13} {12} {14} [rendered] [recorded]
    > aggressive-splitted [31] ./example.js 2:0-22
   [82] (webpack)/~/react/lib/ReactMount.js 24.6 kB {9} [built]
  [136] (webpack)/~/react/lib/ReactMultiChild.js 14.8 kB {9} [built]
  [138] (webpack)/~/react/lib/ReactReconcileTransaction.js 5.31 kB {9} [built]
  [139] (webpack)/~/react/lib/ReactRef.js 2.47 kB {9} [built]
  [140] (webpack)/~/react/lib/ReactServerRenderingTransaction.js 2.35 kB {9} [built]
chunk   {10} 60106e3f2b149c66854f.js 49.8 kB {13} {12} {14} [rendered] [recorded]
    > aggressive-splitted [31] ./example.js 2:0-22
   [77] (webpack)/~/react/lib/ReactDOMSelect.js 6.9 kB {10} [built]
  [118] (webpack)/~/react/lib/ReactDOMComponent.js 39.5 kB {10} [built]
  [131] (webpack)/~/react/lib/ReactDefaultInjection.js 3.4 kB {10} [built]
chunk   {11} 90e7ca83098a54640244.js 49.8 kB {13} {12} {14} [rendered] [recorded]
    > aggressive-splitted [31] ./example.js 2:0-22
   [78] (webpack)/~/react/lib/ReactEmptyComponent.js 743 bytes {11} [built]
  [115] (webpack)/~/react/lib/ReactCompositeComponent.js 37.5 kB {11} [built]
  [123] (webpack)/~/react/lib/ReactDOMInput.js 11.5 kB {11} [built]
chunk   {12} 26c97ecb935008096f9b.js 49.7 kB [entry] [rendered] [recorded]
    > aggressive-splitted main [31] ./example.js 
    [0] (webpack)/~/fbjs/lib/warning.js 1.75 kB {12} [built]
    [2] (webpack)/~/fbjs/lib/invariant.js 1.49 kB {12} [built]
    [5] (webpack)/~/fbjs/lib/emptyFunction.js 1.08 kB {12} [built]
    [6] (webpack)/~/fbjs/lib/emptyObject.js 458 bytes {12} [built]
   [10] (webpack)/~/fbjs/lib/keyMirror.js 1.25 kB {12} [built]
   [14] (webpack)/~/react/react.js 56 bytes {12} [built]
   [15] (webpack)/~/fbjs/lib/keyOf.js 1.1 kB {12} [built]
   [16] (webpack)/~/react/lib/PooledClass.js 3.59 kB {12} [built]
   [17] (webpack)/~/react/lib/KeyEscapeUtils.js 1.33 kB {12} [built]
   [21] (webpack)/~/react/lib/ReactChildren.js 6.22 kB {12} [built]
   [22] (webpack)/~/react/lib/ReactClass.js 27.2 kB {12} [built]
   [25] (webpack)/~/fbjs/lib/mapObject.js 1.44 kB {12} [built]
   [27] (webpack)/~/react/lib/React.js 2.72 kB {12} [built]
chunk   {13} 31e30b54bea15a36c45b.js 30.3 kB [initial] [rendered]
    > aggressive-splitted main [31] ./example.js 
    [3] (webpack)/~/react/lib/reactProdInvariant.js 1.27 kB {13} [built]
    [4] (webpack)/~/react/~/object-assign/index.js 1.99 kB {13} [built]
   [12] (webpack)/~/react/lib/canDefineProperty.js 632 bytes {13} [built]
   [13] (webpack)/~/react/lib/getIteratorFn.js 1.15 kB {13} [built]
   [19] (webpack)/~/react/lib/ReactPropTypesSecret.js 478 bytes {13} [built]
   [20] (webpack)/~/react/lib/traverseAllChildren.js 6.74 kB {13} [built]
   [23] (webpack)/~/react/lib/ReactPropTypes.js 14.9 kB {13} [built]
   [24] (webpack)/~/react/lib/ReactVersion.js 382 bytes {13} [built]
   [29] (webpack)/~/react/lib/ReactPureComponent.js 1.36 kB {13} [built]
   [30] (webpack)/~/react/lib/onlyChild.js 1.36 kB {13} [built]
   [31] ./example.js 44 bytes {13} [built]
chunk   {14} 26934d90a868e3c64b52.js 25.7 kB [initial] [rendered]
    > aggressive-splitted main [31] ./example.js 
    [1] (webpack)/~/react/lib/ReactElement.js 12.5 kB {14} [built]
    [7] (webpack)/~/react/lib/ReactComponent.js 4.64 kB {14} [built]
    [8] (webpack)/~/react/lib/ReactNoopUpdateQueue.js 3.4 kB {14} [built]
    [9] (webpack)/~/react/lib/ReactCurrentOwner.js 657 bytes {14} [built]
   [11] (webpack)/~/react/lib/ReactPropTypeLocationNames.js 614 bytes {14} [built]
   [18] (webpack)/~/react/lib/ReactPropTypeLocations.js 552 bytes {14} [built]
   [28] (webpack)/~/react/lib/ReactDOMFactories.js 3.34 kB {14} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: 5184413f3a374e7b5936
Version: webpack 2.1.0-beta.22
Time: 5468ms
                  Asset     Size  Chunks             Chunk Names
3068d4ff9b2dfb5c271a.js  9.88 kB       7  [emitted]  
1063f7bead1953d50075.js  11.8 kB       0  [emitted]  
fe372bb5ee58ecbb3049.js  15.1 kB       2  [emitted]  
ba0a52412704eb5fca77.js  12.3 kB       3  [emitted]  
3e6efa14517e3078592b.js  4.61 kB       4  [emitted]  
310186c03028a0b418f9.js  13.2 kB       5  [emitted]  
1040df4c2eee288dc9fc.js  4.52 kB       6  [emitted]  
b161c72948813fe0486f.js  10.9 kB       1  [emitted]  
2223fbc79b19b9c04ab0.js  12.8 kB       8  [emitted]  
e43acdd06dbd3b718702.js  8.53 kB       9  [emitted]  
60106e3f2b149c66854f.js  12.7 kB      10  [emitted]  
90e7ca83098a54640244.js  9.79 kB      11  [emitted]  
26c97ecb935008096f9b.js   9.7 kB      12  [emitted]  
31e30b54bea15a36c45b.js  7.37 kB      13  [emitted]  
26934d90a868e3c64b52.js  4.53 kB      14  [emitted]  
Entrypoint main = 26c97ecb935008096f9b.js 26934d90a868e3c64b52.js 31e30b54bea15a36c45b.js
chunk    {0} 1063f7bead1953d50075.js 49.8 kB {13} {12} {14} [rendered] [recorded]
    > aggressive-splitted [31] ./example.js 2:0-22
   [26] (webpack)/~/react-dom/index.js 63 bytes {0} [built]
   [33] (webpack)/~/fbjs/lib/ExecutionEnvironment.js 1.06 kB {0} [built]
   [51] (webpack)/~/fbjs/lib/shallowEqual.js 1.66 kB {0} [built]
   [52] (webpack)/~/process/browser.js 2.06 kB {0} [built]
   [54] (webpack)/~/react/lib/DOMNamespaces.js 538 bytes {0} [built]
   [69] (webpack)/~/fbjs/lib/EventListener.js 2.67 kB {0} [built]
   [70] (webpack)/~/fbjs/lib/focusNode.js 704 bytes {0} [built]
   [71] (webpack)/~/fbjs/lib/getActiveElement.js 895 bytes {0} [built]
   [72] (webpack)/~/react/lib/CSSProperty.js 3.69 kB {0} [built]
   [73] (webpack)/~/react/lib/CallbackQueue.js 2.73 kB {0} [built]
   [93] (webpack)/~/fbjs/lib/camelize.js 708 bytes {0} [built]
   [94] (webpack)/~/fbjs/lib/camelizeStyleName.js 1 kB {0} [built]
   [95] (webpack)/~/fbjs/lib/containsNode.js 1.05 kB {0} [built]
   [96] (webpack)/~/fbjs/lib/createArrayFromMixed.js 4.11 kB {0} [built]
   [97] (webpack)/~/fbjs/lib/createNodesFromMarkup.js 2.66 kB {0} [built]
   [98] (webpack)/~/fbjs/lib/getMarkupWrap.js 3.04 kB {0} [built]
   [99] (webpack)/~/fbjs/lib/getUnboundedScrollPosition.js 1.05 kB {0} [built]
  [100] (webpack)/~/fbjs/lib/hyphenate.js 800 bytes {0} [built]
  [101] (webpack)/~/fbjs/lib/hyphenateStyleName.js 974 bytes {0} [built]
  [102] (webpack)/~/fbjs/lib/isNode.js 693 bytes {0} [built]
  [103] (webpack)/~/fbjs/lib/isTextNode.js 605 bytes {0} [built]
  [104] (webpack)/~/fbjs/lib/memoizeStringOnly.js 698 bytes {0} [built]
  [105] (webpack)/~/react/lib/AutoFocusUtils.js 633 bytes {0} [built]
  [106] (webpack)/~/react/lib/BeforeInputEventPlugin.js 13.9 kB {0} [built]
  [110] (webpack)/~/react/lib/DefaultEventPluginOrder.js 1.26 kB {0} [built]
  [117] (webpack)/~/react/lib/ReactDOMButton.js 634 bytes {0} [built]
chunk    {1} b161c72948813fe0486f.js 49.9 kB {13} {12} {14} [rendered] [recorded]
    > aggressive-splitted [31] ./example.js 2:0-22
   [34] (webpack)/~/react/lib/ReactInstrumentation.js 559 bytes {1} [built]
   [43] (webpack)/~/react/lib/ReactInstanceMap.js 1.26 kB {1} [built]
   [60] (webpack)/~/react/lib/ReactErrorUtils.js 2.26 kB {1} [built]
   [79] (webpack)/~/react/lib/ReactFeatureFlags.js 665 bytes {1} [built]
   [80] (webpack)/~/react/lib/ReactHostComponent.js 2.42 kB {1} [built]
   [81] (webpack)/~/react/lib/ReactInputSelection.js 4.31 kB {1} [built]
   [83] (webpack)/~/react/lib/ReactMultiChildUpdateTypes.js 864 bytes {1} [built]
   [84] (webpack)/~/react/lib/ReactNodeTypes.js 1.06 kB {1} [built]
   [85] (webpack)/~/react/lib/ViewportMetrics.js 641 bytes {1} [built]
  [126] (webpack)/~/react/lib/ReactDOMSelection.js 6.81 kB {1} [built]
  [127] (webpack)/~/react/lib/ReactDOMTextComponent.js 6.14 kB {1} [built]
  [128] (webpack)/~/react/lib/ReactDOMTextarea.js 6.36 kB {1} [built]
  [129] (webpack)/~/react/lib/ReactDOMTreeTraversal.js 3.74 kB {1} [built]
  [132] (webpack)/~/react/lib/ReactEventEmitterMixin.js 1 kB {1} [built]
  [133] (webpack)/~/react/lib/ReactEventListener.js 5.38 kB {1} [built]
  [134] (webpack)/~/react/lib/ReactInjection.js 1.31 kB {1} [built]
  [135] (webpack)/~/react/lib/ReactMarkupChecksum.js 1.51 kB {1} [built]
  [137] (webpack)/~/react/lib/ReactOwner.js 3.6 kB {1} [built]
chunk    {2} fe372bb5ee58ecbb3049.js 49.8 kB {13} {12} {14} [rendered] [recorded]
    > aggressive-splitted [31] ./example.js 2:0-22
   [37] (webpack)/~/react/lib/SyntheticEvent.js 8.73 kB {2} [built]
   [44] (webpack)/~/react/lib/SyntheticUIEvent.js 1.61 kB {2} [built]
   [48] (webpack)/~/react/lib/SyntheticMouseEvent.js 2.18 kB {2} [built]
   [86] (webpack)/~/react/lib/accumulateInto.js 1.73 kB {2} [built]
   [87] (webpack)/~/react/lib/forEachAccumulated.js 893 bytes {2} [built]
   [88] (webpack)/~/react/lib/getHostComponentFromComposite.js 789 bytes {2} [built]
  [144] (webpack)/~/react/lib/SimpleEventPlugin.js 18.9 kB {2} [built]
  [149] (webpack)/~/react/lib/SyntheticFocusEvent.js 1.1 kB {2} [built]
  [150] (webpack)/~/react/lib/SyntheticInputEvent.js 1.13 kB {2} [built]
  [151] (webpack)/~/react/lib/SyntheticKeyboardEvent.js 2.75 kB {2} [built]
  [152] (webpack)/~/react/lib/SyntheticTouchEvent.js 1.32 kB {2} [built]
  [153] (webpack)/~/react/lib/SyntheticTransitionEvent.js 1.27 kB {2} [built]
  [154] (webpack)/~/react/lib/SyntheticWheelEvent.js 1.98 kB {2} [built]
  [155] (webpack)/~/react/lib/adler32.js 1.22 kB {2} [built]
  [156] (webpack)/~/react/lib/checkReactTypeSpec.js 4.25 kB {2} [built]
chunk    {3} ba0a52412704eb5fca77.js 49.7 kB {13} {12} {14} [rendered] [recorded]
    > aggressive-splitted [31] ./example.js 2:0-22
   [32] (webpack)/~/react/lib/ReactDOMComponentTree.js 6.2 kB {3} [built]
   [47] (webpack)/~/react/lib/ReactBrowserEventEmitter.js 12.5 kB {3} [built]
   [58] (webpack)/~/react/lib/ReactComponentEnvironment.js 1.72 kB {3} [built]
   [59] (webpack)/~/react/lib/ReactComponentTreeDevtool.js 7.12 kB {3} [built]
   [75] (webpack)/~/react/lib/ReactComponentBrowserEnvironment.js 1.24 kB {3} [built]
  [114] (webpack)/~/react/lib/ReactChildReconciler.js 6.05 kB {3} [built]
  [116] (webpack)/~/react/lib/ReactDOM.js 4.67 kB {3} [built]
  [119] (webpack)/~/react/lib/ReactDOMContainerInfo.js 1.01 kB {3} [built]
  [120] (webpack)/~/react/lib/ReactDOMEmptyComponent.js 1.95 kB {3} [built]
  [122] (webpack)/~/react/lib/ReactDOMIDOperations.js 996 bytes {3} [built]
  [124] (webpack)/~/react/lib/ReactDOMInstrumentation.js 571 bytes {3} [built]
  [125] (webpack)/~/react/lib/ReactDOMOption.js 3.73 kB {3} [built]
  [130] (webpack)/~/react/lib/ReactDefaultBatchingStrategy.js 1.92 kB {3} [built]
chunk    {4} 3e6efa14517e3078592b.js 30.8 kB {13} {12} {14} [rendered] [recorded]
    > aggressive-splitted [31] ./example.js 2:0-22
   [45] (webpack)/~/react/lib/Transaction.js 9.61 kB {4} [built]
   [49] (webpack)/~/react/lib/escapeTextContentForBrowser.js 3.48 kB {4} [built]
   [63] (webpack)/~/react/lib/getEventCharCode.js 1.54 kB {4} [built]
   [64] (webpack)/~/react/lib/getEventModifierState.js 1.27 kB {4} [built]
   [65] (webpack)/~/react/lib/getEventTarget.js 1.04 kB {4} [built]
   [89] (webpack)/~/react/lib/getTextContentAccessor.js 997 bytes {4} [built]
  [157] (webpack)/~/react/lib/dangerousStyleValue.js 3.06 kB {4} [built]
  [158] (webpack)/~/react/lib/findDOMNode.js 2.49 kB {4} [built]
  [159] (webpack)/~/react/lib/flattenChildren.js 2.78 kB {4} [built]
  [160] (webpack)/~/react/lib/getEventKey.js 2.9 kB {4} [built]
  [161] (webpack)/~/react/lib/getNodeForCharacterOffset.js 1.66 kB {4} [built]
chunk    {5} 310186c03028a0b418f9.js 50 kB {13} {12} {14} [rendered] [recorded]
    > aggressive-splitted [31] ./example.js 2:0-22
   [35] (webpack)/~/react/lib/ReactUpdates.js 9.6 kB {5} [built]
   [40] (webpack)/~/react/lib/ReactReconciler.js 6.96 kB {5} [built]
   [61] (webpack)/~/react/lib/ReactUpdateQueue.js 9.03 kB {5} [built]
   [62] (webpack)/~/react/lib/createMicrosoftUnsafeLocalFunction.js 864 bytes {5} [built]
  [141] (webpack)/~/react/lib/ReactServerUpdateQueue.js 4.95 kB {5} [built]
  [142] (webpack)/~/react/lib/SVGDOMPropertyConfig.js 7.36 kB {5} [built]
  [143] (webpack)/~/react/lib/SelectEventPlugin.js 6.49 kB {5} [built]
  [145] (webpack)/~/react/lib/SyntheticAnimationEvent.js 1.25 kB {5} [built]
  [146] (webpack)/~/react/lib/SyntheticClipboardEvent.js 1.21 kB {5} [built]
  [147] (webpack)/~/react/lib/SyntheticCompositionEvent.js 1.14 kB {5} [built]
  [148] (webpack)/~/react/lib/SyntheticDragEvent.js 1.11 kB {5} [built]
chunk    {6} 1040df4c2eee288dc9fc.js 32.8 kB {13} {12} {14} [rendered] [recorded]
    > aggressive-splitted [31] ./example.js 2:0-22
   [50] (webpack)/~/react/lib/setInnerHTML.js 3.91 kB {6} [built]
   [66] (webpack)/~/react/lib/isEventSupported.js 1.97 kB {6} [built]
   [67] (webpack)/~/react/lib/shouldUpdateReactComponent.js 1.45 kB {6} [built]
   [68] (webpack)/~/react/lib/validateDOMNesting.js 13.1 kB {6} [built]
   [90] (webpack)/~/react/lib/instantiateReactComponent.js 5.68 kB {6} [built]
   [91] (webpack)/~/react/lib/isTextInputElement.js 1.08 kB {6} [built]
   [92] (webpack)/~/react/lib/setTextContent.js 1.4 kB {6} [built]
  [162] (webpack)/~/react/lib/getVendorPrefixedEventName.js 2.92 kB {6} [built]
  [163] (webpack)/~/react/lib/quoteAttributeValueForBrowser.js 749 bytes {6} [built]
  [164] (webpack)/~/react/lib/renderSubtreeIntoContainer.js 466 bytes {6} [built]
chunk    {7} 3068d4ff9b2dfb5c271a.js 49.7 kB {13} {12} {14} [rendered] [recorded]
    > aggressive-splitted [31] ./example.js 2:0-22
   [38] (webpack)/~/react/lib/DOMLazyTree.js 3.75 kB {7} [built]
   [39] (webpack)/~/react/lib/DOMProperty.js 8.13 kB {7} [built]
   [46] (webpack)/~/react/lib/DisabledInputUtils.js 1.16 kB {7} [built]
   [53] (webpack)/~/react/lib/DOMChildrenOperations.js 7.3 kB {7} [built]
   [74] (webpack)/~/react/lib/DOMPropertyOperations.js 7.85 kB {7} [built]
   [76] (webpack)/~/react/lib/ReactDOMComponentFlags.js 471 bytes {7} [built]
  [107] (webpack)/~/react/lib/CSSPropertyOperations.js 6.85 kB {7} [built]
  [108] (webpack)/~/react/lib/ChangeEventPlugin.js 11.5 kB {7} [built]
  [109] (webpack)/~/react/lib/Danger.js 2.27 kB {7} [built]
  [121] (webpack)/~/react/lib/ReactDOMFeatureFlags.js 460 bytes {7} [built]
chunk    {8} 2223fbc79b19b9c04ab0.js 50 kB {13} {12} {14} [rendered] [recorded]
    > aggressive-splitted [31] ./example.js 2:0-22
   [36] (webpack)/~/react/lib/EventConstants.js 2.17 kB {8} [built]
   [41] (webpack)/~/react/lib/EventPluginHub.js 8.23 kB {8} [built]
   [42] (webpack)/~/react/lib/EventPropagators.js 5.32 kB {8} [built]
   [55] (webpack)/~/react/lib/EventPluginRegistry.js 9.48 kB {8} [built]
   [56] (webpack)/~/react/lib/EventPluginUtils.js 8.17 kB {8} [built]
   [57] (webpack)/~/react/lib/LinkedValueUtils.js 5.28 kB {8} [built]
  [111] (webpack)/~/react/lib/EnterLeaveEventPlugin.js 3.46 kB {8} [built]
  [112] (webpack)/~/react/lib/FallbackCompositionState.js 2.47 kB {8} [built]
  [113] (webpack)/~/react/lib/HTMLDOMPropertyConfig.js 5.38 kB {8} [built]
chunk    {9} e43acdd06dbd3b718702.js 49.6 kB {13} {12} {14} [rendered] [recorded]
    > aggressive-splitted [31] ./example.js 2:0-22
   [82] (webpack)/~/react/lib/ReactMount.js 24.6 kB {9} [built]
  [136] (webpack)/~/react/lib/ReactMultiChild.js 14.8 kB {9} [built]
  [138] (webpack)/~/react/lib/ReactReconcileTransaction.js 5.31 kB {9} [built]
  [139] (webpack)/~/react/lib/ReactRef.js 2.47 kB {9} [built]
  [140] (webpack)/~/react/lib/ReactServerRenderingTransaction.js 2.35 kB {9} [built]
chunk   {10} 60106e3f2b149c66854f.js 49.8 kB {13} {12} {14} [rendered] [recorded]
    > aggressive-splitted [31] ./example.js 2:0-22
   [77] (webpack)/~/react/lib/ReactDOMSelect.js 6.9 kB {10} [built]
  [118] (webpack)/~/react/lib/ReactDOMComponent.js 39.5 kB {10} [built]
  [131] (webpack)/~/react/lib/ReactDefaultInjection.js 3.4 kB {10} [built]
chunk   {11} 90e7ca83098a54640244.js 49.8 kB {13} {12} {14} [rendered] [recorded]
    > aggressive-splitted [31] ./example.js 2:0-22
   [78] (webpack)/~/react/lib/ReactEmptyComponent.js 743 bytes {11} [built]
  [115] (webpack)/~/react/lib/ReactCompositeComponent.js 37.5 kB {11} [built]
  [123] (webpack)/~/react/lib/ReactDOMInput.js 11.5 kB {11} [built]
chunk   {12} 26c97ecb935008096f9b.js 49.7 kB [entry] [rendered] [recorded]
    > aggressive-splitted main [31] ./example.js 
    [0] (webpack)/~/fbjs/lib/warning.js 1.75 kB {12} [built]
    [2] (webpack)/~/fbjs/lib/invariant.js 1.49 kB {12} [built]
    [5] (webpack)/~/fbjs/lib/emptyFunction.js 1.08 kB {12} [built]
    [6] (webpack)/~/fbjs/lib/emptyObject.js 458 bytes {12} [built]
   [10] (webpack)/~/fbjs/lib/keyMirror.js 1.25 kB {12} [built]
   [14] (webpack)/~/react/react.js 56 bytes {12} [built]
   [15] (webpack)/~/fbjs/lib/keyOf.js 1.1 kB {12} [built]
   [16] (webpack)/~/react/lib/PooledClass.js 3.59 kB {12} [built]
   [17] (webpack)/~/react/lib/KeyEscapeUtils.js 1.33 kB {12} [built]
   [21] (webpack)/~/react/lib/ReactChildren.js 6.22 kB {12} [built]
   [22] (webpack)/~/react/lib/ReactClass.js 27.2 kB {12} [built]
   [25] (webpack)/~/fbjs/lib/mapObject.js 1.44 kB {12} [built]
   [27] (webpack)/~/react/lib/React.js 2.72 kB {12} [built]
chunk   {13} 31e30b54bea15a36c45b.js 30.3 kB [initial] [rendered]
    > aggressive-splitted main [31] ./example.js 
    [3] (webpack)/~/react/lib/reactProdInvariant.js 1.27 kB {13} [built]
    [4] (webpack)/~/react/~/object-assign/index.js 1.99 kB {13} [built]
   [12] (webpack)/~/react/lib/canDefineProperty.js 632 bytes {13} [built]
   [13] (webpack)/~/react/lib/getIteratorFn.js 1.15 kB {13} [built]
   [19] (webpack)/~/react/lib/ReactPropTypesSecret.js 478 bytes {13} [built]
   [20] (webpack)/~/react/lib/traverseAllChildren.js 6.74 kB {13} [built]
   [23] (webpack)/~/react/lib/ReactPropTypes.js 14.9 kB {13} [built]
   [24] (webpack)/~/react/lib/ReactVersion.js 382 bytes {13} [built]
   [29] (webpack)/~/react/lib/ReactPureComponent.js 1.36 kB {13} [built]
   [30] (webpack)/~/react/lib/onlyChild.js 1.36 kB {13} [built]
   [31] ./example.js 44 bytes {13} [built]
chunk   {14} 26934d90a868e3c64b52.js 25.7 kB [initial] [rendered]
    > aggressive-splitted main [31] ./example.js 
    [1] (webpack)/~/react/lib/ReactElement.js 12.5 kB {14} [built]
    [7] (webpack)/~/react/lib/ReactComponent.js 4.64 kB {14} [built]
    [8] (webpack)/~/react/lib/ReactNoopUpdateQueue.js 3.4 kB {14} [built]
    [9] (webpack)/~/react/lib/ReactCurrentOwner.js 657 bytes {14} [built]
   [11] (webpack)/~/react/lib/ReactPropTypeLocationNames.js 614 bytes {14} [built]
   [18] (webpack)/~/react/lib/ReactPropTypeLocations.js 552 bytes {14} [built]
   [28] (webpack)/~/react/lib/ReactDOMFactories.js 3.34 kB {14} [built]
```

## Records

```
{
  "modules": {
    "byIdentifier": {
      "..\\..\\node_modules\\fbjs\\lib\\warning.js": 0,
      "..\\..\\node_modules\\react\\lib\\ReactElement.js": 1,
      "..\\..\\node_modules\\fbjs\\lib\\invariant.js": 2,
      "..\\..\\node_modules\\react\\lib\\reactProdInvariant.js": 3,
      "..\\..\\node_modules\\react\\node_modules\\object-assign\\index.js": 4,
      "..\\..\\node_modules\\fbjs\\lib\\emptyFunction.js": 5,
      "..\\..\\node_modules\\fbjs\\lib\\emptyObject.js": 6,
      "..\\..\\node_modules\\react\\lib\\ReactComponent.js": 7,
      "..\\..\\node_modules\\react\\lib\\ReactNoopUpdateQueue.js": 8,
      "..\\..\\node_modules\\react\\lib\\ReactCurrentOwner.js": 9,
      "..\\..\\node_modules\\fbjs\\lib\\keyMirror.js": 10,
      "..\\..\\node_modules\\react\\lib\\ReactPropTypeLocationNames.js": 11,
      "..\\..\\node_modules\\react\\lib\\canDefineProperty.js": 12,
      "..\\..\\node_modules\\react\\lib\\getIteratorFn.js": 13,
      "..\\..\\node_modules\\react\\react.js": 14,
      "..\\..\\node_modules\\fbjs\\lib\\keyOf.js": 15,
      "..\\..\\node_modules\\react\\lib\\PooledClass.js": 16,
      "..\\..\\node_modules\\react\\lib\\KeyEscapeUtils.js": 17,
      "..\\..\\node_modules\\react\\lib\\ReactPropTypeLocations.js": 18,
      "..\\..\\node_modules\\react\\lib\\ReactPropTypesSecret.js": 19,
      "..\\..\\node_modules\\react\\lib\\traverseAllChildren.js": 20,
      "..\\..\\node_modules\\react\\lib\\ReactChildren.js": 21,
      "..\\..\\node_modules\\react\\lib\\ReactClass.js": 22,
      "..\\..\\node_modules\\react\\lib\\ReactPropTypes.js": 23,
      "..\\..\\node_modules\\react\\lib\\ReactVersion.js": 24,
      "..\\..\\node_modules\\fbjs\\lib\\mapObject.js": 25,
      "..\\..\\node_modules\\react-dom\\index.js": 26,
      "..\\..\\node_modules\\react\\lib\\React.js": 27,
      "..\\..\\node_modules\\react\\lib\\ReactDOMFactories.js": 28,
      "..\\..\\node_modules\\react\\lib\\ReactPureComponent.js": 29,
      "..\\..\\node_modules\\react\\lib\\onlyChild.js": 30,
      "example.js": 31,
      "..\\..\\node_modules\\react\\lib\\ReactDOMComponentTree.js": 32,
      "..\\..\\node_modules\\fbjs\\lib\\ExecutionEnvironment.js": 33,
      "..\\..\\node_modules\\react\\lib\\ReactInstrumentation.js": 34,
      "..\\..\\node_modules\\react\\lib\\ReactUpdates.js": 35,
      "..\\..\\node_modules\\react\\lib\\EventConstants.js": 36,
      "..\\..\\node_modules\\react\\lib\\SyntheticEvent.js": 37,
      "..\\..\\node_modules\\react\\lib\\DOMLazyTree.js": 38,
      "..\\..\\node_modules\\react\\lib\\DOMProperty.js": 39,
      "..\\..\\node_modules\\react\\lib\\ReactReconciler.js": 40,
      "..\\..\\node_modules\\react\\lib\\EventPluginHub.js": 41,
      "..\\..\\node_modules\\react\\lib\\EventPropagators.js": 42,
      "..\\..\\node_modules\\react\\lib\\ReactInstanceMap.js": 43,
      "..\\..\\node_modules\\react\\lib\\SyntheticUIEvent.js": 44,
      "..\\..\\node_modules\\react\\lib\\Transaction.js": 45,
      "..\\..\\node_modules\\react\\lib\\DisabledInputUtils.js": 46,
      "..\\..\\node_modules\\react\\lib\\ReactBrowserEventEmitter.js": 47,
      "..\\..\\node_modules\\react\\lib\\SyntheticMouseEvent.js": 48,
      "..\\..\\node_modules\\react\\lib\\escapeTextContentForBrowser.js": 49,
      "..\\..\\node_modules\\react\\lib\\setInnerHTML.js": 50,
      "..\\..\\node_modules\\fbjs\\lib\\shallowEqual.js": 51,
      "..\\..\\node_modules\\process\\browser.js": 52,
      "..\\..\\node_modules\\react\\lib\\DOMChildrenOperations.js": 53,
      "..\\..\\node_modules\\react\\lib\\DOMNamespaces.js": 54,
      "..\\..\\node_modules\\react\\lib\\EventPluginRegistry.js": 55,
      "..\\..\\node_modules\\react\\lib\\EventPluginUtils.js": 56,
      "..\\..\\node_modules\\react\\lib\\LinkedValueUtils.js": 57,
      "..\\..\\node_modules\\react\\lib\\ReactComponentEnvironment.js": 58,
      "..\\..\\node_modules\\react\\lib\\ReactComponentTreeDevtool.js": 59,
      "..\\..\\node_modules\\react\\lib\\ReactErrorUtils.js": 60,
      "..\\..\\node_modules\\react\\lib\\ReactUpdateQueue.js": 61,
      "..\\..\\node_modules\\react\\lib\\createMicrosoftUnsafeLocalFunction.js": 62,
      "..\\..\\node_modules\\react\\lib\\getEventCharCode.js": 63,
      "..\\..\\node_modules\\react\\lib\\getEventModifierState.js": 64,
      "..\\..\\node_modules\\react\\lib\\getEventTarget.js": 65,
      "..\\..\\node_modules\\react\\lib\\isEventSupported.js": 66,
      "..\\..\\node_modules\\react\\lib\\shouldUpdateReactComponent.js": 67,
      "..\\..\\node_modules\\react\\lib\\validateDOMNesting.js": 68,
      "..\\..\\node_modules\\fbjs\\lib\\EventListener.js": 69,
      "..\\..\\node_modules\\fbjs\\lib\\focusNode.js": 70,
      "..\\..\\node_modules\\fbjs\\lib\\getActiveElement.js": 71,
      "..\\..\\node_modules\\react\\lib\\CSSProperty.js": 72,
      "..\\..\\node_modules\\react\\lib\\CallbackQueue.js": 73,
      "..\\..\\node_modules\\react\\lib\\DOMPropertyOperations.js": 74,
      "..\\..\\node_modules\\react\\lib\\ReactComponentBrowserEnvironment.js": 75,
      "..\\..\\node_modules\\react\\lib\\ReactDOMComponentFlags.js": 76,
      "..\\..\\node_modules\\react\\lib\\ReactDOMSelect.js": 77,
      "..\\..\\node_modules\\react\\lib\\ReactEmptyComponent.js": 78,
      "..\\..\\node_modules\\react\\lib\\ReactFeatureFlags.js": 79,
      "..\\..\\node_modules\\react\\lib\\ReactHostComponent.js": 80,
      "..\\..\\node_modules\\react\\lib\\ReactInputSelection.js": 81,
      "..\\..\\node_modules\\react\\lib\\ReactMount.js": 82,
      "..\\..\\node_modules\\react\\lib\\ReactMultiChildUpdateTypes.js": 83,
      "..\\..\\node_modules\\react\\lib\\ReactNodeTypes.js": 84,
      "..\\..\\node_modules\\react\\lib\\ViewportMetrics.js": 85,
      "..\\..\\node_modules\\react\\lib\\accumulateInto.js": 86,
      "..\\..\\node_modules\\react\\lib\\forEachAccumulated.js": 87,
      "..\\..\\node_modules\\react\\lib\\getHostComponentFromComposite.js": 88,
      "..\\..\\node_modules\\react\\lib\\getTextContentAccessor.js": 89,
      "..\\..\\node_modules\\react\\lib\\instantiateReactComponent.js": 90,
      "..\\..\\node_modules\\react\\lib\\isTextInputElement.js": 91,
      "..\\..\\node_modules\\react\\lib\\setTextContent.js": 92,
      "..\\..\\node_modules\\fbjs\\lib\\camelize.js": 93,
      "..\\..\\node_modules\\fbjs\\lib\\camelizeStyleName.js": 94,
      "..\\..\\node_modules\\fbjs\\lib\\containsNode.js": 95,
      "..\\..\\node_modules\\fbjs\\lib\\createArrayFromMixed.js": 96,
      "..\\..\\node_modules\\fbjs\\lib\\createNodesFromMarkup.js": 97,
      "..\\..\\node_modules\\fbjs\\lib\\getMarkupWrap.js": 98,
      "..\\..\\node_modules\\fbjs\\lib\\getUnboundedScrollPosition.js": 99,
      "..\\..\\node_modules\\fbjs\\lib\\hyphenate.js": 100,
      "..\\..\\node_modules\\fbjs\\lib\\hyphenateStyleName.js": 101,
      "..\\..\\node_modules\\fbjs\\lib\\isNode.js": 102,
      "..\\..\\node_modules\\fbjs\\lib\\isTextNode.js": 103,
      "..\\..\\node_modules\\fbjs\\lib\\memoizeStringOnly.js": 104,
      "..\\..\\node_modules\\react\\lib\\AutoFocusUtils.js": 105,
      "..\\..\\node_modules\\react\\lib\\BeforeInputEventPlugin.js": 106,
      "..\\..\\node_modules\\react\\lib\\CSSPropertyOperations.js": 107,
      "..\\..\\node_modules\\react\\lib\\ChangeEventPlugin.js": 108,
      "..\\..\\node_modules\\react\\lib\\Danger.js": 109,
      "..\\..\\node_modules\\react\\lib\\DefaultEventPluginOrder.js": 110,
      "..\\..\\node_modules\\react\\lib\\EnterLeaveEventPlugin.js": 111,
      "..\\..\\node_modules\\react\\lib\\FallbackCompositionState.js": 112,
      "..\\..\\node_modules\\react\\lib\\HTMLDOMPropertyConfig.js": 113,
      "..\\..\\node_modules\\react\\lib\\ReactChildReconciler.js": 114,
      "..\\..\\node_modules\\react\\lib\\ReactCompositeComponent.js": 115,
      "..\\..\\node_modules\\react\\lib\\ReactDOM.js": 116,
      "..\\..\\node_modules\\react\\lib\\ReactDOMButton.js": 117,
      "..\\..\\node_modules\\react\\lib\\ReactDOMComponent.js": 118,
      "..\\..\\node_modules\\react\\lib\\ReactDOMContainerInfo.js": 119,
      "..\\..\\node_modules\\react\\lib\\ReactDOMEmptyComponent.js": 120,
      "..\\..\\node_modules\\react\\lib\\ReactDOMFeatureFlags.js": 121,
      "..\\..\\node_modules\\react\\lib\\ReactDOMIDOperations.js": 122,
      "..\\..\\node_modules\\react\\lib\\ReactDOMInput.js": 123,
      "..\\..\\node_modules\\react\\lib\\ReactDOMInstrumentation.js": 124,
      "..\\..\\node_modules\\react\\lib\\ReactDOMOption.js": 125,
      "..\\..\\node_modules\\react\\lib\\ReactDOMSelection.js": 126,
      "..\\..\\node_modules\\react\\lib\\ReactDOMTextComponent.js": 127,
      "..\\..\\node_modules\\react\\lib\\ReactDOMTextarea.js": 128,
      "..\\..\\node_modules\\react\\lib\\ReactDOMTreeTraversal.js": 129,
      "..\\..\\node_modules\\react\\lib\\ReactDefaultBatchingStrategy.js": 130,
      "..\\..\\node_modules\\react\\lib\\ReactDefaultInjection.js": 131,
      "..\\..\\node_modules\\react\\lib\\ReactEventEmitterMixin.js": 132,
      "..\\..\\node_modules\\react\\lib\\ReactEventListener.js": 133,
      "..\\..\\node_modules\\react\\lib\\ReactInjection.js": 134,
      "..\\..\\node_modules\\react\\lib\\ReactMarkupChecksum.js": 135,
      "..\\..\\node_modules\\react\\lib\\ReactMultiChild.js": 136,
      "..\\..\\node_modules\\react\\lib\\ReactOwner.js": 137,
      "..\\..\\node_modules\\react\\lib\\ReactReconcileTransaction.js": 138,
      "..\\..\\node_modules\\react\\lib\\ReactRef.js": 139,
      "..\\..\\node_modules\\react\\lib\\ReactServerRenderingTransaction.js": 140,
      "..\\..\\node_modules\\react\\lib\\ReactServerUpdateQueue.js": 141,
      "..\\..\\node_modules\\react\\lib\\SVGDOMPropertyConfig.js": 142,
      "..\\..\\node_modules\\react\\lib\\SelectEventPlugin.js": 143,
      "..\\..\\node_modules\\react\\lib\\SimpleEventPlugin.js": 144,
      "..\\..\\node_modules\\react\\lib\\SyntheticAnimationEvent.js": 145,
      "..\\..\\node_modules\\react\\lib\\SyntheticClipboardEvent.js": 146,
      "..\\..\\node_modules\\react\\lib\\SyntheticCompositionEvent.js": 147,
      "..\\..\\node_modules\\react\\lib\\SyntheticDragEvent.js": 148,
      "..\\..\\node_modules\\react\\lib\\SyntheticFocusEvent.js": 149,
      "..\\..\\node_modules\\react\\lib\\SyntheticInputEvent.js": 150,
      "..\\..\\node_modules\\react\\lib\\SyntheticKeyboardEvent.js": 151,
      "..\\..\\node_modules\\react\\lib\\SyntheticTouchEvent.js": 152,
      "..\\..\\node_modules\\react\\lib\\SyntheticTransitionEvent.js": 153,
      "..\\..\\node_modules\\react\\lib\\SyntheticWheelEvent.js": 154,
      "..\\..\\node_modules\\react\\lib\\adler32.js": 155,
      "..\\..\\node_modules\\react\\lib\\checkReactTypeSpec.js": 156,
      "..\\..\\node_modules\\react\\lib\\dangerousStyleValue.js": 157,
      "..\\..\\node_modules\\react\\lib\\findDOMNode.js": 158,
      "..\\..\\node_modules\\react\\lib\\flattenChildren.js": 159,
      "..\\..\\node_modules\\react\\lib\\getEventKey.js": 160,
      "..\\..\\node_modules\\react\\lib\\getNodeForCharacterOffset.js": 161,
      "..\\..\\node_modules\\react\\lib\\getVendorPrefixedEventName.js": 162,
      "..\\..\\node_modules\\react\\lib\\quoteAttributeValueForBrowser.js": 163,
      "..\\..\\node_modules\\react\\lib\\renderSubtreeIntoContainer.js": 164
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
      "164": 164
    }
  },
  "chunks": {
    "byName": {},
    "byBlocks": {
      "example.js:0/0:3": 0,
      "example.js:0/0:9": 1,
      "example.js:0/0:10": 2,
      "example.js:0/0:2": 3,
      "example.js:0/0:1": 4,
      "example.js:0/0:0": 5,
      "example.js:0/0:11": 6,
      "example.js:0/0:5": 7,
      "example.js:0/0:6": 8,
      "example.js:0/0:4": 9,
      "example.js:0/0:8": 10,
      "example.js:0/0:7": 11
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
        "..\\..\\node_modules\\fbjs\\lib\\EventListener.js",
        "..\\..\\node_modules\\fbjs\\lib\\ExecutionEnvironment.js",
        "..\\..\\node_modules\\fbjs\\lib\\camelize.js",
        "..\\..\\node_modules\\fbjs\\lib\\camelizeStyleName.js",
        "..\\..\\node_modules\\fbjs\\lib\\containsNode.js",
        "..\\..\\node_modules\\fbjs\\lib\\createArrayFromMixed.js",
        "..\\..\\node_modules\\fbjs\\lib\\createNodesFromMarkup.js",
        "..\\..\\node_modules\\fbjs\\lib\\focusNode.js",
        "..\\..\\node_modules\\fbjs\\lib\\getActiveElement.js",
        "..\\..\\node_modules\\fbjs\\lib\\getMarkupWrap.js",
        "..\\..\\node_modules\\fbjs\\lib\\getUnboundedScrollPosition.js",
        "..\\..\\node_modules\\fbjs\\lib\\hyphenate.js",
        "..\\..\\node_modules\\fbjs\\lib\\hyphenateStyleName.js",
        "..\\..\\node_modules\\fbjs\\lib\\isNode.js",
        "..\\..\\node_modules\\fbjs\\lib\\isTextNode.js",
        "..\\..\\node_modules\\fbjs\\lib\\memoizeStringOnly.js",
        "..\\..\\node_modules\\fbjs\\lib\\shallowEqual.js",
        "..\\..\\node_modules\\process\\browser.js",
        "..\\..\\node_modules\\react-dom\\index.js",
        "..\\..\\node_modules\\react\\lib\\AutoFocusUtils.js",
        "..\\..\\node_modules\\react\\lib\\BeforeInputEventPlugin.js",
        "..\\..\\node_modules\\react\\lib\\CSSProperty.js",
        "..\\..\\node_modules\\react\\lib\\CallbackQueue.js",
        "..\\..\\node_modules\\react\\lib\\DOMNamespaces.js",
        "..\\..\\node_modules\\react\\lib\\DefaultEventPluginOrder.js",
        "..\\..\\node_modules\\react\\lib\\ReactDOMButton.js"
      ],
      "hash": "1063f7bead1953d500751fc6dcb11580",
      "id": 0
    },
    {
      "modules": [
        "..\\..\\node_modules\\react\\lib\\ReactDOMSelection.js",
        "..\\..\\node_modules\\react\\lib\\ReactDOMTextComponent.js",
        "..\\..\\node_modules\\react\\lib\\ReactDOMTextarea.js",
        "..\\..\\node_modules\\react\\lib\\ReactDOMTreeTraversal.js",
        "..\\..\\node_modules\\react\\lib\\ReactErrorUtils.js",
        "..\\..\\node_modules\\react\\lib\\ReactEventEmitterMixin.js",
        "..\\..\\node_modules\\react\\lib\\ReactEventListener.js",
        "..\\..\\node_modules\\react\\lib\\ReactFeatureFlags.js",
        "..\\..\\node_modules\\react\\lib\\ReactHostComponent.js",
        "..\\..\\node_modules\\react\\lib\\ReactInjection.js",
        "..\\..\\node_modules\\react\\lib\\ReactInputSelection.js",
        "..\\..\\node_modules\\react\\lib\\ReactInstanceMap.js",
        "..\\..\\node_modules\\react\\lib\\ReactInstrumentation.js",
        "..\\..\\node_modules\\react\\lib\\ReactMarkupChecksum.js",
        "..\\..\\node_modules\\react\\lib\\ReactMultiChildUpdateTypes.js",
        "..\\..\\node_modules\\react\\lib\\ReactNodeTypes.js",
        "..\\..\\node_modules\\react\\lib\\ReactOwner.js",
        "..\\..\\node_modules\\react\\lib\\ViewportMetrics.js"
      ],
      "hash": "b161c72948813fe0486f7d55fc47bac1",
      "id": 1
    },
    {
      "modules": [
        "..\\..\\node_modules\\react\\lib\\SimpleEventPlugin.js",
        "..\\..\\node_modules\\react\\lib\\SyntheticEvent.js",
        "..\\..\\node_modules\\react\\lib\\SyntheticFocusEvent.js",
        "..\\..\\node_modules\\react\\lib\\SyntheticInputEvent.js",
        "..\\..\\node_modules\\react\\lib\\SyntheticKeyboardEvent.js",
        "..\\..\\node_modules\\react\\lib\\SyntheticMouseEvent.js",
        "..\\..\\node_modules\\react\\lib\\SyntheticTouchEvent.js",
        "..\\..\\node_modules\\react\\lib\\SyntheticTransitionEvent.js",
        "..\\..\\node_modules\\react\\lib\\SyntheticUIEvent.js",
        "..\\..\\node_modules\\react\\lib\\SyntheticWheelEvent.js",
        "..\\..\\node_modules\\react\\lib\\accumulateInto.js",
        "..\\..\\node_modules\\react\\lib\\adler32.js",
        "..\\..\\node_modules\\react\\lib\\checkReactTypeSpec.js",
        "..\\..\\node_modules\\react\\lib\\forEachAccumulated.js",
        "..\\..\\node_modules\\react\\lib\\getHostComponentFromComposite.js"
      ],
      "hash": "fe372bb5ee58ecbb3049e3d3aeba9339",
      "id": 2
    },
    {
      "modules": [
        "..\\..\\node_modules\\react\\lib\\ReactBrowserEventEmitter.js",
        "..\\..\\node_modules\\react\\lib\\ReactChildReconciler.js",
        "..\\..\\node_modules\\react\\lib\\ReactComponentBrowserEnvironment.js",
        "..\\..\\node_modules\\react\\lib\\ReactComponentEnvironment.js",
        "..\\..\\node_modules\\react\\lib\\ReactComponentTreeDevtool.js",
        "..\\..\\node_modules\\react\\lib\\ReactDOM.js",
        "..\\..\\node_modules\\react\\lib\\ReactDOMComponentTree.js",
        "..\\..\\node_modules\\react\\lib\\ReactDOMContainerInfo.js",
        "..\\..\\node_modules\\react\\lib\\ReactDOMEmptyComponent.js",
        "..\\..\\node_modules\\react\\lib\\ReactDOMIDOperations.js",
        "..\\..\\node_modules\\react\\lib\\ReactDOMInstrumentation.js",
        "..\\..\\node_modules\\react\\lib\\ReactDOMOption.js",
        "..\\..\\node_modules\\react\\lib\\ReactDefaultBatchingStrategy.js"
      ],
      "hash": "ba0a52412704eb5fca7725f14d7c1e12",
      "id": 3
    },
    {
      "modules": [
        "..\\..\\node_modules\\react\\lib\\Transaction.js",
        "..\\..\\node_modules\\react\\lib\\dangerousStyleValue.js",
        "..\\..\\node_modules\\react\\lib\\escapeTextContentForBrowser.js",
        "..\\..\\node_modules\\react\\lib\\findDOMNode.js",
        "..\\..\\node_modules\\react\\lib\\flattenChildren.js",
        "..\\..\\node_modules\\react\\lib\\getEventCharCode.js",
        "..\\..\\node_modules\\react\\lib\\getEventKey.js",
        "..\\..\\node_modules\\react\\lib\\getEventModifierState.js",
        "..\\..\\node_modules\\react\\lib\\getEventTarget.js",
        "..\\..\\node_modules\\react\\lib\\getNodeForCharacterOffset.js",
        "..\\..\\node_modules\\react\\lib\\getTextContentAccessor.js"
      ],
      "hash": "3e6efa14517e3078592bd858b8e7dbdd",
      "id": 4
    },
    {
      "modules": [
        "..\\..\\node_modules\\react\\lib\\ReactReconciler.js",
        "..\\..\\node_modules\\react\\lib\\ReactServerUpdateQueue.js",
        "..\\..\\node_modules\\react\\lib\\ReactUpdateQueue.js",
        "..\\..\\node_modules\\react\\lib\\ReactUpdates.js",
        "..\\..\\node_modules\\react\\lib\\SVGDOMPropertyConfig.js",
        "..\\..\\node_modules\\react\\lib\\SelectEventPlugin.js",
        "..\\..\\node_modules\\react\\lib\\SyntheticAnimationEvent.js",
        "..\\..\\node_modules\\react\\lib\\SyntheticClipboardEvent.js",
        "..\\..\\node_modules\\react\\lib\\SyntheticCompositionEvent.js",
        "..\\..\\node_modules\\react\\lib\\SyntheticDragEvent.js",
        "..\\..\\node_modules\\react\\lib\\createMicrosoftUnsafeLocalFunction.js"
      ],
      "hash": "310186c03028a0b418f9e990c1711193",
      "id": 5
    },
    {
      "modules": [
        "..\\..\\node_modules\\react\\lib\\getVendorPrefixedEventName.js",
        "..\\..\\node_modules\\react\\lib\\instantiateReactComponent.js",
        "..\\..\\node_modules\\react\\lib\\isEventSupported.js",
        "..\\..\\node_modules\\react\\lib\\isTextInputElement.js",
        "..\\..\\node_modules\\react\\lib\\quoteAttributeValueForBrowser.js",
        "..\\..\\node_modules\\react\\lib\\renderSubtreeIntoContainer.js",
        "..\\..\\node_modules\\react\\lib\\setInnerHTML.js",
        "..\\..\\node_modules\\react\\lib\\setTextContent.js",
        "..\\..\\node_modules\\react\\lib\\shouldUpdateReactComponent.js",
        "..\\..\\node_modules\\react\\lib\\validateDOMNesting.js"
      ],
      "hash": "1040df4c2eee288dc9fc45fbf23bb2dd",
      "id": 6
    },
    {
      "modules": [
        "..\\..\\node_modules\\react\\lib\\CSSPropertyOperations.js",
        "..\\..\\node_modules\\react\\lib\\ChangeEventPlugin.js",
        "..\\..\\node_modules\\react\\lib\\DOMChildrenOperations.js",
        "..\\..\\node_modules\\react\\lib\\DOMLazyTree.js",
        "..\\..\\node_modules\\react\\lib\\DOMProperty.js",
        "..\\..\\node_modules\\react\\lib\\DOMPropertyOperations.js",
        "..\\..\\node_modules\\react\\lib\\Danger.js",
        "..\\..\\node_modules\\react\\lib\\DisabledInputUtils.js",
        "..\\..\\node_modules\\react\\lib\\ReactDOMComponentFlags.js",
        "..\\..\\node_modules\\react\\lib\\ReactDOMFeatureFlags.js"
      ],
      "hash": "3068d4ff9b2dfb5c271a27c72755cb15",
      "id": 7
    },
    {
      "modules": [
        "..\\..\\node_modules\\react\\lib\\EnterLeaveEventPlugin.js",
        "..\\..\\node_modules\\react\\lib\\EventConstants.js",
        "..\\..\\node_modules\\react\\lib\\EventPluginHub.js",
        "..\\..\\node_modules\\react\\lib\\EventPluginRegistry.js",
        "..\\..\\node_modules\\react\\lib\\EventPluginUtils.js",
        "..\\..\\node_modules\\react\\lib\\EventPropagators.js",
        "..\\..\\node_modules\\react\\lib\\FallbackCompositionState.js",
        "..\\..\\node_modules\\react\\lib\\HTMLDOMPropertyConfig.js",
        "..\\..\\node_modules\\react\\lib\\LinkedValueUtils.js"
      ],
      "hash": "2223fbc79b19b9c04ab03a266c03d44c",
      "id": 8
    },
    {
      "modules": [
        "..\\..\\node_modules\\react\\lib\\ReactMount.js",
        "..\\..\\node_modules\\react\\lib\\ReactMultiChild.js",
        "..\\..\\node_modules\\react\\lib\\ReactReconcileTransaction.js",
        "..\\..\\node_modules\\react\\lib\\ReactRef.js",
        "..\\..\\node_modules\\react\\lib\\ReactServerRenderingTransaction.js"
      ],
      "hash": "e43acdd06dbd3b718702db9fab274bdf",
      "id": 9
    },
    {
      "modules": [
        "..\\..\\node_modules\\react\\lib\\ReactDOMComponent.js",
        "..\\..\\node_modules\\react\\lib\\ReactDOMSelect.js",
        "..\\..\\node_modules\\react\\lib\\ReactDefaultInjection.js"
      ],
      "hash": "60106e3f2b149c66854f63f710e3bac9",
      "id": 10
    },
    {
      "modules": [
        "..\\..\\node_modules\\react\\lib\\ReactCompositeComponent.js",
        "..\\..\\node_modules\\react\\lib\\ReactDOMInput.js",
        "..\\..\\node_modules\\react\\lib\\ReactEmptyComponent.js"
      ],
      "hash": "90e7ca83098a5464024432a228c21528",
      "id": 11
    },
    {
      "modules": [
        "..\\..\\node_modules\\fbjs\\lib\\emptyFunction.js",
        "..\\..\\node_modules\\fbjs\\lib\\emptyObject.js",
        "..\\..\\node_modules\\fbjs\\lib\\invariant.js",
        "..\\..\\node_modules\\fbjs\\lib\\keyMirror.js",
        "..\\..\\node_modules\\fbjs\\lib\\keyOf.js",
        "..\\..\\node_modules\\fbjs\\lib\\mapObject.js",
        "..\\..\\node_modules\\fbjs\\lib\\warning.js",
        "..\\..\\node_modules\\react\\lib\\KeyEscapeUtils.js",
        "..\\..\\node_modules\\react\\lib\\PooledClass.js",
        "..\\..\\node_modules\\react\\lib\\React.js",
        "..\\..\\node_modules\\react\\lib\\ReactChildren.js",
        "..\\..\\node_modules\\react\\lib\\ReactClass.js",
        "..\\..\\node_modules\\react\\react.js"
      ],
      "hash": "26c97ecb935008096f9b82f71c42f426",
      "id": 12
    }
  ]
}
```
