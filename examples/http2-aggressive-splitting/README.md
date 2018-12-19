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
	// mode: "development || "production",
	cache: true, // better performance for the AggressiveSplittingPlugin
	entry: "./example",
	output: {
		path: path.join(__dirname, "dist"),
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
	recordsOutputPath: path.join(__dirname, "dist", "records.json")
};
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
                  Asset      Size  Chunks             Chunk Names
0417e3e7b982e7cb0872.js  42.1 KiB    {12}  [emitted]
20a9d2ff0c59034eeab4.js    53 KiB    {10}  [emitted]
3bb8b3efbe9893e490d4.js  45.5 KiB     {7}  [emitted]
3c0f1961d9ead1ee10fc.js  38.3 KiB     {8}  [emitted]
43703048905e474ac5df.js  51.9 KiB     {3}  [emitted]
5bee88903a6b72649a35.js  32.6 KiB     {2}  [emitted]
6788d6c5077b816444e8.js  35.8 KiB     {0}  [emitted]
6aa84794d93da89a5d1a.js  48.2 KiB     {9}  [emitted]
747e8acda85d89f1d087.js  45.1 KiB    {11}  [emitted]
861042764426921507e2.js  44.1 KiB     {1}  [emitted]
af41b1d584c9e280ea79.js  52.1 KiB     {6}  [emitted]
b4e5e8f2bb9b07598683.js  43.6 KiB     {5}  [emitted]
bfde483edb3158c52d2e.js  36.9 KiB     {4}  [emitted]
cd88452689363fe7e337.js  12.7 KiB    {14}  [emitted]
d67d405c10b9610feb93.js  46.5 KiB    {13}  [emitted]
Entrypoint main = 5bee88903a6b72649a35.js 861042764426921507e2.js 6788d6c5077b816444e8.js
chunk {0} 6788d6c5077b816444e8.js 28.3 KiB (javascript) 4.82 KiB (runtime) ={1}= ={2}= >{3}< >{4}< >{5}< >{6}< >{7}< >{8}< >{9}< >{10}< >{11}< >{12}< >{13}< >{14}< [entry] [rendered]
    > ./example main
  [0] ./example.js 42 bytes {0} [built]
  [1] (webpack)/node_modules/react/react.js 56 bytes {0} [built]
  [5] (webpack)/node_modules/react/lib/reactProdInvariant.js 1.08 KiB {0} [built]
  [6] (webpack)/node_modules/react/lib/ReactNoopUpdateQueue.js 3.16 KiB {0} [built]
  [9] (webpack)/node_modules/react/lib/canDefineProperty.js 539 bytes {0} [built]
 [12] (webpack)/node_modules/react/lib/lowPriorityWarning.js 2 KiB {0} [built]
 [15] (webpack)/node_modules/react/lib/ReactElement.js 10.9 KiB {0} [built]
 [17] (webpack)/node_modules/react/lib/ReactElementSymbol.js 500 bytes {0} [built]
 [18] (webpack)/node_modules/react/lib/traverseAllChildren.js 6.75 KiB {0} [built]
 [19] (webpack)/node_modules/react/lib/getIteratorFn.js 997 bytes {0} [built]
 [22] (webpack)/node_modules/react/lib/ReactPropTypes.js 378 bytes {0} [built]
 [27] (webpack)/node_modules/react/lib/ReactVersion.js 228 bytes {0} [built]
 [28] (webpack)/node_modules/react/lib/createClass.js 566 bytes {0} [built]
 [30] (webpack)/node_modules/react/lib/onlyChild.js 1.19 KiB {0} [built]
     + 4 hidden chunk modules
chunk {1} 861042764426921507e2.js 45.7 KiB ={0}= ={2}= >{3}< >{4}< >{5}< >{6}< >{7}< >{8}< >{9}< >{10}< >{11}< >{12}< >{13}< >{14}< [initial] [rendered] [recorded] aggressive splitted
    > ./example main
  [2] (webpack)/node_modules/react/lib/React.js 4.84 KiB {1} [built]
  [4] (webpack)/node_modules/react/lib/ReactBaseClasses.js 5.19 KiB {1} [built]
 [13] (webpack)/node_modules/react/lib/ReactChildren.js 5.92 KiB {1} [built]
 [14] (webpack)/node_modules/react/lib/PooledClass.js 3.16 KiB {1} [built]
 [16] (webpack)/node_modules/react/lib/ReactCurrentOwner.js 499 bytes {1} [built]
 [20] (webpack)/node_modules/react/lib/KeyEscapeUtils.js 1.14 KiB {1} [built]
 [21] (webpack)/node_modules/react/lib/ReactDOMFactories.js 5.23 KiB {1} [built]
 [24] (webpack)/node_modules/prop-types/factoryWithTypeCheckers.js 19.4 KiB {1} [built]
 [25] (webpack)/node_modules/prop-types/lib/ReactPropTypesSecret.js 314 bytes {1} [built]
chunk {2} 5bee88903a6b72649a35.js 39.3 KiB ={0}= ={1}= >{3}< >{4}< >{5}< >{6}< >{7}< >{8}< >{9}< >{10}< >{11}< >{12}< >{13}< >{14}< [initial] [rendered] [recorded] aggressive splitted
    > ./example main
  [3] (webpack)/node_modules/object-assign/index.js 2.06 KiB {2} [built]
  [7] (webpack)/node_modules/fbjs/lib/warning.js 1.85 KiB {2} [built]
  [8] (webpack)/node_modules/fbjs/lib/emptyFunction.js 959 bytes {2} [built]
 [10] (webpack)/node_modules/fbjs/lib/emptyObject.js 332 bytes {2} [built]
 [11] (webpack)/node_modules/fbjs/lib/invariant.js 1.47 KiB {2} [built]
 [23] (webpack)/node_modules/prop-types/factory.js 768 bytes {2} [built]
 [26] (webpack)/node_modules/prop-types/checkPropTypes.js 2.81 KiB {2} [built]
 [29] (webpack)/node_modules/create-react-class/factory.js 29.1 KiB {2} [built]
chunk {3} 43703048905e474ac5df.js 47.4 KiB <{0}> <{1}> <{2}> ={4}= ={5}= ={6}= ={7}= ={8}= ={9}= ={10}= ={11}= ={12}= ={13}= ={14}= [rendered] split chunk (cache group: defaultVendors)
    > react-dom [0] ./example.js 2:0-22
  [31] (webpack)/node_modules/react-dom/index.js 59 bytes {3} [built]
  [38] (webpack)/node_modules/react-dom/lib/ARIADOMPropertyConfig.js 1.65 KiB {3} [built]
  [39] (webpack)/node_modules/react-dom/lib/BeforeInputEventPlugin.js 12.8 KiB {3} [built]
  [47] (webpack)/node_modules/fbjs/lib/ExecutionEnvironment.js 935 bytes {3} [built]
  [83] (webpack)/node_modules/fbjs/lib/createNodesFromMarkup.js 2.48 KiB {3} [built]
  [84] (webpack)/node_modules/fbjs/lib/createArrayFromMixed.js 3.89 KiB {3} [built]
  [85] (webpack)/node_modules/fbjs/lib/getMarkupWrap.js 2.84 KiB {3} [built]
  [88] (webpack)/node_modules/react-dom/lib/AutoFocusUtils.js 477 bytes {3} [built]
  [89] (webpack)/node_modules/fbjs/lib/focusNode.js 578 bytes {3} [built]
  [90] (webpack)/node_modules/react-dom/lib/CSSPropertyOperations.js 6.91 KiB {3} [built]
  [91] (webpack)/node_modules/react-dom/lib/CSSProperty.js 3.61 KiB {3} [built]
  [92] (webpack)/node_modules/fbjs/lib/camelizeStyleName.js 875 bytes {3} [built]
  [93] (webpack)/node_modules/fbjs/lib/camelize.js 582 bytes {3} [built]
  [95] (webpack)/node_modules/fbjs/lib/hyphenateStyleName.js 848 bytes {3} [built]
  [96] (webpack)/node_modules/fbjs/lib/hyphenate.js 674 bytes {3} [built]
  [97] (webpack)/node_modules/fbjs/lib/memoizeStringOnly.js 572 bytes {3} [built]
 [116] (webpack)/node_modules/fbjs/lib/shallowEqual.js 1.58 KiB {3} [built]
 [136] (webpack)/node_modules/fbjs/lib/EventListener.js 2.2 KiB {3} [built]
 [137] (webpack)/node_modules/fbjs/lib/getUnboundedScrollPosition.js 996 bytes {3} [built]
 [143] (webpack)/node_modules/fbjs/lib/containsNode.js 923 bytes {3} [built]
 [144] (webpack)/node_modules/fbjs/lib/isTextNode.js 479 bytes {3} [built]
 [145] (webpack)/node_modules/fbjs/lib/isNode.js 702 bytes {3} [built]
 [146] (webpack)/node_modules/fbjs/lib/getActiveElement.js 912 bytes {3} [built]
chunk {4} bfde483edb3158c52d2e.js 43.3 KiB <{0}> <{1}> <{2}> ={3}= ={5}= ={6}= ={7}= ={8}= ={9}= ={10}= ={11}= ={12}= ={13}= ={14}= [rendered] split chunk (cache group: defaultVendors)
    > react-dom [0] ./example.js 2:0-22
 [32] (webpack)/node_modules/react-dom/lib/ReactDOM.js 4.93 KiB {4} [built]
 [36] (webpack)/node_modules/react-dom/lib/ReactDOMComponentFlags.js 307 bytes {4} [built]
 [87] (webpack)/node_modules/react-dom/lib/ReactDOMComponent.js 38.1 KiB {4} [built]
chunk {5} b4e5e8f2bb9b07598683.js 44.4 KiB <{0}> <{1}> <{2}> ={3}= ={4}= ={6}= ={7}= ={8}= ={9}= ={10}= ={11}= ={12}= ={13}= ={14}= [rendered] split chunk (cache group: defaultVendors)
    > react-dom [0] ./example.js 2:0-22
  [33] (webpack)/node_modules/react-dom/lib/ReactDOMComponentTree.js 6 KiB {5} [built]
  [86] (webpack)/node_modules/react-dom/lib/ReactDOMIDOperations.js 833 bytes {5} [built]
 [103] (webpack)/node_modules/react-dom/lib/ReactDOMInput.js 12.7 KiB {5} [built]
 [106] (webpack)/node_modules/react-dom/lib/ReactDOMOption.js 3.48 KiB {5} [built]
 [107] (webpack)/node_modules/react-dom/lib/ReactDOMSelect.js 6.53 KiB {5} [built]
 [131] (webpack)/node_modules/react-dom/lib/ReactDOMEmptyComponent.js 1.74 KiB {5} [built]
 [133] (webpack)/node_modules/react-dom/lib/ReactDOMTextComponent.js 5.56 KiB {5} [built]
 [141] (webpack)/node_modules/react-dom/lib/ReactDOMSelection.js 6.5 KiB {5} [built]
 [161] (webpack)/node_modules/react-dom/lib/ReactDOMContainerInfo.js 845 bytes {5} [built]
 [162] (webpack)/node_modules/react-dom/lib/ReactDOMFeatureFlags.js 317 bytes {5} [built]
chunk {6} af41b1d584c9e280ea79.js 46.6 KiB <{0}> <{1}> <{2}> ={3}= ={4}= ={5}= ={7}= ={8}= ={9}= ={10}= ={11}= ={12}= ={13}= ={14}= [rendered] split chunk (cache group: defaultVendors)
    > react-dom [0] ./example.js 2:0-22
  [34] (webpack)/node_modules/react-dom/lib/reactProdInvariant.js 1.08 KiB {6} [built]
  [46] (webpack)/node_modules/react-dom/lib/forEachAccumulated.js 733 bytes {6} [built]
  [50] (webpack)/node_modules/react-dom/lib/getTextContentAccessor.js 833 bytes {6} [built]
  [63] (webpack)/node_modules/react-dom/lib/inputValueTracking.js 2.9 KiB {6} [built]
  [64] (webpack)/node_modules/react-dom/lib/getEventTarget.js 888 bytes {6} [built]
  [65] (webpack)/node_modules/react-dom/lib/isEventSupported.js 1.77 KiB {6} [built]
  [66] (webpack)/node_modules/react-dom/lib/isTextInputElement.js 895 bytes {6} [built]
  [72] (webpack)/node_modules/react-dom/lib/getEventModifierState.js 1.08 KiB {6} [built]
  [78] (webpack)/node_modules/react-dom/lib/setInnerHTML.js 3.65 KiB {6} [built]
  [80] (webpack)/node_modules/react-dom/lib/setTextContent.js 1.3 KiB {6} [built]
  [81] (webpack)/node_modules/react-dom/lib/escapeTextContentForBrowser.js 3.23 KiB {6} [built]
  [99] (webpack)/node_modules/react-dom/lib/quoteAttributeValueForBrowser.js 578 bytes {6} [built]
 [102] (webpack)/node_modules/react-dom/lib/getVendorPrefixedEventName.js 2.68 KiB {6} [built]
 [113] (webpack)/node_modules/react-dom/lib/instantiateReactComponent.js 4.82 KiB {6} [built]
 [117] (webpack)/node_modules/react-dom/lib/shouldUpdateReactComponent.js 1.25 KiB {6} [built]
 [122] (webpack)/node_modules/react-dom/lib/traverseAllChildren.js 6.75 KiB {6} [built]
 [124] (webpack)/node_modules/react-dom/lib/getIteratorFn.js 997 bytes {6} [built]
 [126] (webpack)/node_modules/react-dom/lib/flattenChildren.js 2.59 KiB {6} [built]
 [142] (webpack)/node_modules/react-dom/lib/getNodeForCharacterOffset.js 1.46 KiB {6} [built]
 [154] (webpack)/node_modules/react-dom/lib/getEventCharCode.js 1.35 KiB {6} [built]
 [155] (webpack)/node_modules/react-dom/lib/getEventKey.js 2.68 KiB {6} [built]
 [166] (webpack)/node_modules/react-dom/lib/findDOMNode.js 2.29 KiB {6} [built]
 [167] (webpack)/node_modules/react-dom/lib/getHostComponentFromComposite.js 618 bytes {6} [built]
 [168] (webpack)/node_modules/react-dom/lib/renderSubtreeIntoContainer.js 300 bytes {6} [built]
chunk {7} 3bb8b3efbe9893e490d4.js 45.9 KiB <{0}> <{1}> <{2}> ={3}= ={4}= ={5}= ={6}= ={8}= ={9}= ={10}= ={11}= ={12}= ={13}= ={14}= [rendered] split chunk (cache group: defaultVendors)
    > react-dom [0] ./example.js 2:0-22
 [35] (webpack)/node_modules/react-dom/lib/DOMProperty.js 7.93 KiB {7} [built]
 [54] (webpack)/node_modules/react-dom/lib/ChangeEventPlugin.js 10.4 KiB {7} [built]
 [56] (webpack)/node_modules/react-dom/lib/CallbackQueue.js 2.97 KiB {7} [built]
 [67] (webpack)/node_modules/react-dom/lib/DefaultEventPluginOrder.js 955 bytes {7} [built]
 [68] (webpack)/node_modules/react-dom/lib/EnterLeaveEventPlugin.js 2.96 KiB {7} [built]
 [75] (webpack)/node_modules/react-dom/lib/DOMChildrenOperations.js 7.42 KiB {7} [built]
 [76] (webpack)/node_modules/react-dom/lib/DOMLazyTree.js 3.51 KiB {7} [built]
 [77] (webpack)/node_modules/react-dom/lib/DOMNamespaces.js 383 bytes {7} [built]
 [82] (webpack)/node_modules/react-dom/lib/Danger.js 2.07 KiB {7} [built]
 [98] (webpack)/node_modules/react-dom/lib/DOMPropertyOperations.js 7.31 KiB {7} [built]
chunk {8} 3c0f1961d9ead1ee10fc.js 34 KiB <{0}> <{1}> <{2}> ={3}= ={4}= ={5}= ={6}= ={7}= ={9}= ={10}= ={11}= ={12}= ={13}= ={14}= [rendered] split chunk (cache group: defaultVendors)
    > react-dom [0] ./example.js 2:0-22
  [37] (webpack)/node_modules/react-dom/lib/ReactDefaultInjection.js 3.3 KiB {8} [built]
  [44] (webpack)/node_modules/react-dom/lib/ReactErrorUtils.js 2.04 KiB {8} [built]
  [57] (webpack)/node_modules/react-dom/lib/ReactFeatureFlags.js 506 bytes {8} [built]
  [61] (webpack)/node_modules/react-dom/lib/ReactInstrumentation.js 479 bytes {8} [built]
 [101] (webpack)/node_modules/react-dom/lib/ReactEventEmitterMixin.js 836 bytes {8} [built]
 [108] (webpack)/node_modules/react-dom/lib/ReactDOMTextarea.js 6.19 KiB {8} [built]
 [111] (webpack)/node_modules/react-dom/lib/ReactInstanceMap.js 1.07 KiB {8} [built]
 [118] (webpack)/node_modules/react-dom/lib/ReactEmptyComponent.js 582 bytes {8} [built]
 [119] (webpack)/node_modules/react-dom/lib/ReactHostComponent.js 1.81 KiB {8} [built]
 [123] (webpack)/node_modules/react-dom/lib/ReactElementSymbol.js 500 bytes {8} [built]
 [132] (webpack)/node_modules/react-dom/lib/ReactDOMTreeTraversal.js 3.51 KiB {8} [built]
 [134] (webpack)/node_modules/react-dom/lib/ReactDefaultBatchingStrategy.js 1.72 KiB {8} [built]
 [135] (webpack)/node_modules/react-dom/lib/ReactEventListener.js 5.05 KiB {8} [built]
 [138] (webpack)/node_modules/react-dom/lib/ReactInjection.js 1.05 KiB {8} [built]
 [140] (webpack)/node_modules/react-dom/lib/ReactInputSelection.js 4.05 KiB {8} [built]
 [163] (webpack)/node_modules/react-dom/lib/ReactMarkupChecksum.js 1.32 KiB {8} [built]
chunk {9} 6aa84794d93da89a5d1a.js 48.5 KiB <{0}> <{1}> <{2}> ={3}= ={4}= ={5}= ={6}= ={7}= ={8}= ={10}= ={11}= ={12}= ={13}= ={14}= [rendered] split chunk (cache group: defaultVendors)
    > react-dom [0] ./example.js 2:0-22
  [40] (webpack)/node_modules/react-dom/lib/EventPropagators.js 4.86 KiB {9} [built]
  [41] (webpack)/node_modules/react-dom/lib/EventPluginHub.js 8.77 KiB {9} [built]
  [42] (webpack)/node_modules/react-dom/lib/EventPluginRegistry.js 9.4 KiB {9} [built]
  [43] (webpack)/node_modules/react-dom/lib/EventPluginUtils.js 7.64 KiB {9} [built]
  [48] (webpack)/node_modules/react-dom/lib/FallbackCompositionState.js 2.25 KiB {9} [built]
  [49] (webpack)/node_modules/react-dom/lib/PooledClass.js 3.16 KiB {9} [built]
  [73] (webpack)/node_modules/react-dom/lib/HTMLDOMPropertyConfig.js 6.32 KiB {9} [built]
 [104] (webpack)/node_modules/react-dom/lib/LinkedValueUtils.js 5 KiB {9} [built]
 [121] (webpack)/node_modules/react-dom/lib/KeyEscapeUtils.js 1.14 KiB {9} [built]
chunk {10} 20a9d2ff0c59034eeab4.js 48.2 KiB <{0}> <{1}> <{2}> ={3}= ={4}= ={5}= ={6}= ={7}= ={8}= ={9}= ={11}= ={12}= ={13}= ={14}= [rendered] split chunk (cache group: defaultVendors)
    > react-dom [0] ./example.js 2:0-22
  [45] (webpack)/node_modules/react-dom/lib/accumulateInto.js 1.54 KiB {10} [built]
  [51] (webpack)/node_modules/react-dom/lib/SyntheticCompositionEvent.js 977 bytes {10} [built]
  [52] (webpack)/node_modules/react-dom/lib/SyntheticEvent.js 9.02 KiB {10} [built]
  [53] (webpack)/node_modules/react-dom/lib/SyntheticInputEvent.js 967 bytes {10} [built]
  [62] (webpack)/node_modules/react-dom/lib/Transaction.js 9.21 KiB {10} [built]
  [69] (webpack)/node_modules/react-dom/lib/SyntheticMouseEvent.js 1.97 KiB {10} [built]
  [70] (webpack)/node_modules/react-dom/lib/SyntheticUIEvent.js 1.42 KiB {10} [built]
  [71] (webpack)/node_modules/react-dom/lib/ViewportMetrics.js 482 bytes {10} [built]
  [79] (webpack)/node_modules/react-dom/lib/createMicrosoftUnsafeLocalFunction.js 688 bytes {10} [built]
  [94] (webpack)/node_modules/react-dom/lib/dangerousStyleValue.js 2.87 KiB {10} [built]
 [149] (webpack)/node_modules/react-dom/lib/SimpleEventPlugin.js 7.67 KiB {10} [built]
 [150] (webpack)/node_modules/react-dom/lib/SyntheticAnimationEvent.js 1.06 KiB {10} [built]
 [151] (webpack)/node_modules/react-dom/lib/SyntheticClipboardEvent.js 1.02 KiB {10} [built]
 [152] (webpack)/node_modules/react-dom/lib/SyntheticFocusEvent.js 944 bytes {10} [built]
 [153] (webpack)/node_modules/react-dom/lib/SyntheticKeyboardEvent.js 2.52 KiB {10} [built]
 [156] (webpack)/node_modules/react-dom/lib/SyntheticDragEvent.js 949 bytes {10} [built]
 [157] (webpack)/node_modules/react-dom/lib/SyntheticTouchEvent.js 1.13 KiB {10} [built]
 [158] (webpack)/node_modules/react-dom/lib/SyntheticTransitionEvent.js 1.08 KiB {10} [built]
 [159] (webpack)/node_modules/react-dom/lib/SyntheticWheelEvent.js 1.76 KiB {10} [built]
 [164] (webpack)/node_modules/react-dom/lib/adler32.js 1.04 KiB {10} [built]
chunk {11} 747e8acda85d89f1d087.js 46.2 KiB <{0}> <{1}> <{2}> ={3}= ={4}= ={5}= ={6}= ={7}= ={8}= ={9}= ={10}= ={12}= ={13}= ={14}= [rendered] split chunk (cache group: defaultVendors)
    > react-dom [0] ./example.js 2:0-22
  [55] (webpack)/node_modules/react-dom/lib/ReactUpdates.js 9.12 KiB {11} [built]
  [58] (webpack)/node_modules/react-dom/lib/ReactReconciler.js 5.95 KiB {11} [built]
  [59] (webpack)/node_modules/react-dom/lib/ReactRef.js 2.38 KiB {11} [built]
 [127] (webpack)/node_modules/react-dom/lib/ReactServerRenderingTransaction.js 2.12 KiB {11} [built]
 [128] (webpack)/node_modules/react-dom/lib/ReactServerUpdateQueue.js 4.6 KiB {11} [built]
 [129] (webpack)/node_modules/react-dom/lib/ReactUpdateQueue.js 9.02 KiB {11} [built]
 [147] (webpack)/node_modules/react-dom/lib/SVGDOMPropertyConfig.js 7.03 KiB {11} [built]
 [148] (webpack)/node_modules/react-dom/lib/SelectEventPlugin.js 5.8 KiB {11} [built]
 [165] (webpack)/node_modules/react-dom/lib/ReactVersion.js 228 bytes {11} [built]
chunk {12} 0417e3e7b982e7cb0872.js 48.4 KiB <{0}> <{1}> <{2}> ={3}= ={4}= ={5}= ={6}= ={7}= ={8}= ={9}= ={10}= ={11}= ={13}= ={14}= [rendered] split chunk (cache group: defaultVendors)
    > react-dom [0] ./example.js 2:0-22
  [60] (webpack)/node_modules/react-dom/lib/ReactOwner.js 3.33 KiB {12} [built]
 [105] (webpack)/node_modules/react-dom/lib/ReactPropTypesSecret.js 320 bytes {12} [built]
 [109] (webpack)/node_modules/react-dom/lib/ReactMultiChild.js 14.1 KiB {12} [built]
 [115] (webpack)/node_modules/react-dom/lib/ReactNodeTypes.js 894 bytes {12} [built]
 [139] (webpack)/node_modules/react-dom/lib/ReactReconcileTransaction.js 5.02 KiB {12} [built]
 [160] (webpack)/node_modules/react-dom/lib/ReactMount.js 24.8 KiB {12} [built]
chunk {13} d67d405c10b9610feb93.js 54.2 KiB <{0}> <{1}> <{2}> ={3}= ={4}= ={5}= ={6}= ={7}= ={8}= ={9}= ={10}= ={11}= ={12}= ={14}= [rendered] split chunk (cache group: defaultVendors)
    > react-dom [0] ./example.js 2:0-22
  [74] (webpack)/node_modules/react-dom/lib/ReactComponentBrowserEnvironment.js 782 bytes {13} [built]
 [100] (webpack)/node_modules/react-dom/lib/ReactBrowserEventEmitter.js 12.1 KiB {13} [built]
 [110] (webpack)/node_modules/react-dom/lib/ReactComponentEnvironment.js 1.15 KiB {13} [built]
 [112] (webpack)/node_modules/react-dom/lib/ReactChildReconciler.js 5.84 KiB {13} [built]
 [114] (webpack)/node_modules/react-dom/lib/ReactCompositeComponent.js 34.3 KiB {13} [built]
chunk {14} cd88452689363fe7e337.js 24.9 KiB <{0}> <{1}> <{2}> ={3}= ={4}= ={5}= ={6}= ={7}= ={8}= ={9}= ={10}= ={11}= ={12}= ={13}= [rendered] split chunk (cache group: defaultVendors)
    > react-dom [0] ./example.js 2:0-22
 [120] (webpack)/node_modules/react/lib/getNextDebugID.js 315 bytes {14} [built]
 [125] (webpack)/node_modules/react/lib/ReactComponentTreeHook.js 11.4 KiB {14} [built]
 [130] (webpack)/node_modules/react-dom/lib/validateDOMNesting.js 13.2 KiB {14} [built]
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
                  Asset      Size  Chunks             Chunk Names
057b78fcff1ae757be9f.js  9.99 KiB   {995}  [emitted]
0c75a9ea4a4eb082d3a9.js  4.22 KiB   {608}  [emitted]
1a0089835178298637f3.js  10.5 KiB   {525}  [emitted]
1dc660b5c3757be63213.js  11.1 KiB   {396}  [emitted]
42ff50fdba6215173a13.js  10.2 KiB   {996}  [emitted]
5c07e2ad2c7b2e23ad63.js  11.1 KiB    {45}  [emitted]
6219e566cf830f19fad2.js   7.9 KiB   {140}  [emitted]
71b65e173dce7c4d4d95.js  10.6 KiB   {719}  [emitted]
720baa65158a12110425.js  13.1 KiB   {303}  [emitted]
844ae8c586e7d3b43667.js  8.16 KiB   {326}  [emitted]
8baf4417816f902972a5.js  5.89 KiB   {169}  [emitted]
9bd049a4e90493641b74.js  6.72 KiB   {640}  [emitted]
c36fd35e7b7ce94f5a99.js  10.1 KiB   {779}  [emitted]
cb24b316b0370979044e.js  12.4 KiB   {572}  [emitted]
ea5e235f5327949cd4fc.js    12 KiB   {506}  [emitted]
Entrypoint main = 9bd049a4e90493641b74.js 1dc660b5c3757be63213.js 8baf4417816f902972a5.js
chunk {45} 5c07e2ad2c7b2e23ad63.js 47.4 KiB <{169}> <{396}> <{640}> ={140}= ={303}= ={326}= ={506}= ={525}= ={572}= ={608}= ={719}= ={779}= ={995}= ={996}= [rendered] [recorded] aggressive splitted
    > react-dom [275] ./example.js 2:0-22
   [3] (webpack)/node_modules/fbjs/lib/getMarkupWrap.js 2.84 KiB {45} [built]
   [8] (webpack)/node_modules/fbjs/lib/createNodesFromMarkup.js 2.48 KiB {45} [built]
  [24] (webpack)/node_modules/fbjs/lib/focusNode.js 578 bytes {45} [built]
  [70] (webpack)/node_modules/fbjs/lib/getUnboundedScrollPosition.js 996 bytes {45} [built]
  [78] (webpack)/node_modules/react-dom/lib/CSSPropertyOperations.js 6.91 KiB {45} [built]
 [124] (webpack)/node_modules/react-dom/lib/ARIADOMPropertyConfig.js 1.65 KiB {45} [built]
 [151] (webpack)/node_modules/fbjs/lib/getActiveElement.js 912 bytes {45} [built]
 [242] (webpack)/node_modules/fbjs/lib/hyphenateStyleName.js 848 bytes {45} [built]
 [360] (webpack)/node_modules/react-dom/index.js 59 bytes {45} [built]
 [386] (webpack)/node_modules/fbjs/lib/shallowEqual.js 1.58 KiB {45} [built]
 [396] (webpack)/node_modules/react-dom/lib/CSSProperty.js 3.61 KiB {45} [built]
 [448] (webpack)/node_modules/fbjs/lib/containsNode.js 923 bytes {45} [built]
 [574] (webpack)/node_modules/react-dom/lib/AutoFocusUtils.js 477 bytes {45} [built]
 [655] (webpack)/node_modules/fbjs/lib/camelize.js 582 bytes {45} [built]
 [674] (webpack)/node_modules/react-dom/lib/BeforeInputEventPlugin.js 12.8 KiB {45} [built]
 [736] (webpack)/node_modules/fbjs/lib/memoizeStringOnly.js 572 bytes {45} [built]
 [738] (webpack)/node_modules/fbjs/lib/ExecutionEnvironment.js 935 bytes {45} [built]
 [742] (webpack)/node_modules/fbjs/lib/isNode.js 702 bytes {45} [built]
 [773] (webpack)/node_modules/fbjs/lib/createArrayFromMixed.js 3.89 KiB {45} [built]
 [776] (webpack)/node_modules/fbjs/lib/EventListener.js 2.2 KiB {45} [built]
 [827] (webpack)/node_modules/fbjs/lib/isTextNode.js 479 bytes {45} [built]
 [837] (webpack)/node_modules/fbjs/lib/camelizeStyleName.js 875 bytes {45} [built]
 [872] (webpack)/node_modules/fbjs/lib/hyphenate.js 674 bytes {45} [built]
chunk {140} 6219e566cf830f19fad2.js 48.4 KiB <{169}> <{396}> <{640}> ={45}= ={303}= ={326}= ={506}= ={525}= ={572}= ={608}= ={719}= ={779}= ={995}= ={996}= [rendered] [recorded] aggressive splitted
    > react-dom [275] ./example.js 2:0-22
  [74] (webpack)/node_modules/react-dom/lib/ReactNodeTypes.js 894 bytes {140} [built]
  [86] (webpack)/node_modules/react-dom/lib/ReactOwner.js 3.33 KiB {140} [built]
 [216] (webpack)/node_modules/react-dom/lib/ReactMount.js 24.8 KiB {140} [built]
 [302] (webpack)/node_modules/react-dom/lib/ReactPropTypesSecret.js 320 bytes {140} [built]
 [709] (webpack)/node_modules/react-dom/lib/ReactReconcileTransaction.js 5.02 KiB {140} [built]
 [829] (webpack)/node_modules/react-dom/lib/ReactMultiChild.js 14.1 KiB {140} [built]
chunk {169} 8baf4417816f902972a5.js 28.3 KiB (javascript) 4.85 KiB (runtime) ={396}= ={640}= >{45}< >{140}< >{303}< >{326}< >{506}< >{525}< >{572}< >{608}< >{719}< >{779}< >{995}< >{996}< [entry] [rendered]
    > ./example main
  [18] (webpack)/node_modules/react/lib/canDefineProperty.js 539 bytes {169} [built]
  [52] (webpack)/node_modules/react/lib/ReactElement.js 10.9 KiB {169} [built]
  [69] (webpack)/node_modules/react/lib/reactProdInvariant.js 1.08 KiB {169} [built]
  [71] (webpack)/node_modules/react/lib/ReactNoopUpdateQueue.js 3.16 KiB {169} [built]
 [275] ./example.js 42 bytes {169} [built]
 [339] (webpack)/node_modules/react/lib/createClass.js 566 bytes {169} [built]
 [408] (webpack)/node_modules/react/lib/traverseAllChildren.js 6.75 KiB {169} [built]
 [418] (webpack)/node_modules/react/lib/ReactElementSymbol.js 500 bytes {169} [built]
 [426] (webpack)/node_modules/react/lib/getIteratorFn.js 997 bytes {169} [built]
 [620] (webpack)/node_modules/react/react.js 56 bytes {169} [built]
 [716] (webpack)/node_modules/react/lib/onlyChild.js 1.19 KiB {169} [built]
 [816] (webpack)/node_modules/react/lib/lowPriorityWarning.js 2 KiB {169} [built]
 [895] (webpack)/node_modules/react/lib/ReactPropTypes.js 378 bytes {169} [built]
 [920] (webpack)/node_modules/react/lib/ReactVersion.js 228 bytes {169} [built]
     + 4 hidden chunk modules
chunk {303} 720baa65158a12110425.js 46.2 KiB <{169}> <{396}> <{640}> ={45}= ={140}= ={326}= ={506}= ={525}= ={572}= ={608}= ={719}= ={779}= ={995}= ={996}= [rendered] [recorded] aggressive splitted
    > react-dom [275] ./example.js 2:0-22
 [199] (webpack)/node_modules/react-dom/lib/ReactRef.js 2.38 KiB {303} [built]
 [327] (webpack)/node_modules/react-dom/lib/ReactUpdateQueue.js 9.02 KiB {303} [built]
 [381] (webpack)/node_modules/react-dom/lib/ReactUpdates.js 9.12 KiB {303} [built]
 [493] (webpack)/node_modules/react-dom/lib/SelectEventPlugin.js 5.8 KiB {303} [built]
 [550] (webpack)/node_modules/react-dom/lib/ReactVersion.js 228 bytes {303} [built]
 [589] (webpack)/node_modules/react-dom/lib/ReactServerRenderingTransaction.js 2.12 KiB {303} [built]
 [661] (webpack)/node_modules/react-dom/lib/ReactReconciler.js 5.95 KiB {303} [built]
 [931] (webpack)/node_modules/react-dom/lib/SVGDOMPropertyConfig.js 7.03 KiB {303} [built]
 [996] (webpack)/node_modules/react-dom/lib/ReactServerUpdateQueue.js 4.6 KiB {303} [built]
chunk {326} 844ae8c586e7d3b43667.js 34 KiB <{169}> <{396}> <{640}> ={45}= ={140}= ={303}= ={506}= ={525}= ={572}= ={608}= ={719}= ={779}= ={995}= ={996}= [rendered] [recorded] aggressive splitted
    > react-dom [275] ./example.js 2:0-22
 [163] (webpack)/node_modules/react-dom/lib/ReactDefaultBatchingStrategy.js 1.72 KiB {326} [built]
 [183] (webpack)/node_modules/react-dom/lib/ReactEventListener.js 5.05 KiB {326} [built]
 [232] (webpack)/node_modules/react-dom/lib/ReactDefaultInjection.js 3.3 KiB {326} [built]
 [240] (webpack)/node_modules/react-dom/lib/ReactEmptyComponent.js 582 bytes {326} [built]
 [244] (webpack)/node_modules/react-dom/lib/ReactInjection.js 1.05 KiB {326} [built]
 [313] (webpack)/node_modules/react-dom/lib/ReactInstrumentation.js 479 bytes {326} [built]
 [333] (webpack)/node_modules/react-dom/lib/ReactMarkupChecksum.js 1.32 KiB {326} [built]
 [348] (webpack)/node_modules/react-dom/lib/ReactDOMTreeTraversal.js 3.51 KiB {326} [built]
 [527] (webpack)/node_modules/react-dom/lib/ReactFeatureFlags.js 506 bytes {326} [built]
 [595] (webpack)/node_modules/react-dom/lib/ReactErrorUtils.js 2.04 KiB {326} [built]
 [653] (webpack)/node_modules/react-dom/lib/ReactHostComponent.js 1.81 KiB {326} [built]
 [688] (webpack)/node_modules/react-dom/lib/ReactEventEmitterMixin.js 836 bytes {326} [built]
 [714] (webpack)/node_modules/react-dom/lib/ReactInstanceMap.js 1.07 KiB {326} [built]
 [763] (webpack)/node_modules/react-dom/lib/ReactDOMTextarea.js 6.19 KiB {326} [built]
 [842] (webpack)/node_modules/react-dom/lib/ReactElementSymbol.js 500 bytes {326} [built]
 [956] (webpack)/node_modules/react-dom/lib/ReactInputSelection.js 4.05 KiB {326} [built]
chunk {396} 1dc660b5c3757be63213.js 45.7 KiB ={169}= ={640}= >{45}< >{140}< >{303}< >{326}< >{506}< >{525}< >{572}< >{608}< >{719}< >{779}< >{995}< >{996}< [initial] [rendered] [recorded] aggressive splitted
    > ./example main
  [35] (webpack)/node_modules/react/lib/ReactCurrentOwner.js 499 bytes {396} [built]
 [389] (webpack)/node_modules/react/lib/ReactChildren.js 5.92 KiB {396} [built]
 [405] (webpack)/node_modules/prop-types/factoryWithTypeCheckers.js 19.4 KiB {396} [built]
 [464] (webpack)/node_modules/react/lib/ReactBaseClasses.js 5.19 KiB {396} [built]
 [507] (webpack)/node_modules/react/lib/PooledClass.js 3.16 KiB {396} [built]
 [518] (webpack)/node_modules/react/lib/ReactDOMFactories.js 5.23 KiB {396} [built]
 [526] (webpack)/node_modules/react/lib/React.js 4.84 KiB {396} [built]
 [606] (webpack)/node_modules/react/lib/KeyEscapeUtils.js 1.14 KiB {396} [built]
 [977] (webpack)/node_modules/prop-types/lib/ReactPropTypesSecret.js 314 bytes {396} [built]
chunk {506} ea5e235f5327949cd4fc.js 48.5 KiB <{169}> <{396}> <{640}> ={45}= ={140}= ={303}= ={326}= ={525}= ={572}= ={608}= ={719}= ={779}= ={995}= ={996}= [rendered] [recorded] aggressive splitted
    > react-dom [275] ./example.js 2:0-22
  [30] (webpack)/node_modules/react-dom/lib/FallbackCompositionState.js 2.25 KiB {506} [built]
  [64] (webpack)/node_modules/react-dom/lib/HTMLDOMPropertyConfig.js 6.32 KiB {506} [built]
  [75] (webpack)/node_modules/react-dom/lib/EventPluginRegistry.js 9.4 KiB {506} [built]
 [141] (webpack)/node_modules/react-dom/lib/EventPluginUtils.js 7.64 KiB {506} [built]
 [226] (webpack)/node_modules/react-dom/lib/EventPropagators.js 4.86 KiB {506} [built]
 [730] (webpack)/node_modules/react-dom/lib/KeyEscapeUtils.js 1.14 KiB {506} [built]
 [777] (webpack)/node_modules/react-dom/lib/LinkedValueUtils.js 5 KiB {506} [built]
 [823] (webpack)/node_modules/react-dom/lib/PooledClass.js 3.16 KiB {506} [built]
 [986] (webpack)/node_modules/react-dom/lib/EventPluginHub.js 8.77 KiB {506} [built]
chunk {525} 1a0089835178298637f3.js 43.3 KiB <{169}> <{396}> <{640}> ={45}= ={140}= ={303}= ={326}= ={506}= ={572}= ={608}= ={719}= ={779}= ={995}= ={996}= [rendered] [recorded] aggressive splitted
    > react-dom [275] ./example.js 2:0-22
 [505] (webpack)/node_modules/react-dom/lib/ReactDOMComponent.js 38.1 KiB {525} [built]
 [950] (webpack)/node_modules/react-dom/lib/ReactDOM.js 4.93 KiB {525} [built]
 [998] (webpack)/node_modules/react-dom/lib/ReactDOMComponentFlags.js 307 bytes {525} [built]
chunk {572} cb24b316b0370979044e.js 54.2 KiB <{169}> <{396}> <{640}> ={45}= ={140}= ={303}= ={326}= ={506}= ={525}= ={608}= ={719}= ={779}= ={995}= ={996}= [rendered] [recorded] aggressive splitted
    > react-dom [275] ./example.js 2:0-22
 [106] (webpack)/node_modules/react-dom/lib/ReactBrowserEventEmitter.js 12.1 KiB {572} [built]
 [479] (webpack)/node_modules/react-dom/lib/ReactChildReconciler.js 5.84 KiB {572} [built]
 [501] (webpack)/node_modules/react-dom/lib/ReactComponentBrowserEnvironment.js 782 bytes {572} [built]
 [723] (webpack)/node_modules/react-dom/lib/ReactComponentEnvironment.js 1.15 KiB {572} [built]
 [992] (webpack)/node_modules/react-dom/lib/ReactCompositeComponent.js 34.3 KiB {572} [built]
chunk {608} 0c75a9ea4a4eb082d3a9.js 24.9 KiB <{169}> <{396}> <{640}> ={45}= ={140}= ={303}= ={326}= ={506}= ={525}= ={572}= ={719}= ={779}= ={995}= ={996}= [rendered]
    > react-dom [275] ./example.js 2:0-22
  [84] (webpack)/node_modules/react/lib/getNextDebugID.js 315 bytes {608} [built]
 [238] (webpack)/node_modules/react-dom/lib/validateDOMNesting.js 13.2 KiB {608} [built]
 [725] (webpack)/node_modules/react/lib/ReactComponentTreeHook.js 11.4 KiB {608} [built]
chunk {640} 9bd049a4e90493641b74.js 39.3 KiB ={169}= ={396}= >{45}< >{140}< >{303}< >{326}< >{506}< >{525}< >{572}< >{608}< >{719}< >{779}< >{995}< >{996}< [initial] [rendered] [recorded] aggressive splitted
    > ./example main
 [123] (webpack)/node_modules/prop-types/checkPropTypes.js 2.81 KiB {640} [built]
 [139] (webpack)/node_modules/prop-types/factory.js 768 bytes {640} [built]
 [152] (webpack)/node_modules/fbjs/lib/invariant.js 1.47 KiB {640} [built]
 [499] (webpack)/node_modules/object-assign/index.js 2.06 KiB {640} [built]
 [514] (webpack)/node_modules/fbjs/lib/warning.js 1.85 KiB {640} [built]
 [553] (webpack)/node_modules/create-react-class/factory.js 29.1 KiB {640} [built]
 [727] (webpack)/node_modules/fbjs/lib/emptyFunction.js 959 bytes {640} [built]
 [789] (webpack)/node_modules/fbjs/lib/emptyObject.js 332 bytes {640} [built]
chunk {719} 71b65e173dce7c4d4d95.js 45.9 KiB <{169}> <{396}> <{640}> ={45}= ={140}= ={303}= ={326}= ={506}= ={525}= ={572}= ={608}= ={779}= ={995}= ={996}= [rendered] [recorded] aggressive splitted
    > react-dom [275] ./example.js 2:0-22
 [317] (webpack)/node_modules/react-dom/lib/ChangeEventPlugin.js 10.4 KiB {719} [built]
 [395] (webpack)/node_modules/react-dom/lib/DOMLazyTree.js 3.51 KiB {719} [built]
 [416] (webpack)/node_modules/react-dom/lib/DOMNamespaces.js 383 bytes {719} [built]
 [513] (webpack)/node_modules/react-dom/lib/DOMChildrenOperations.js 7.42 KiB {719} [built]
 [529] (webpack)/node_modules/react-dom/lib/EnterLeaveEventPlugin.js 2.96 KiB {719} [built]
 [619] (webpack)/node_modules/react-dom/lib/DefaultEventPluginOrder.js 955 bytes {719} [built]
 [646] (webpack)/node_modules/react-dom/lib/CallbackQueue.js 2.97 KiB {719} [built]
 [731] (webpack)/node_modules/react-dom/lib/Danger.js 2.07 KiB {719} [built]
 [792] (webpack)/node_modules/react-dom/lib/DOMPropertyOperations.js 7.31 KiB {719} [built]
 [821] (webpack)/node_modules/react-dom/lib/DOMProperty.js 7.93 KiB {719} [built]
chunk {779} c36fd35e7b7ce94f5a99.js 44.4 KiB <{169}> <{396}> <{640}> ={45}= ={140}= ={303}= ={326}= ={506}= ={525}= ={572}= ={608}= ={719}= ={995}= ={996}= [rendered] [recorded] aggressive splitted
    > react-dom [275] ./example.js 2:0-22
  [38] (webpack)/node_modules/react-dom/lib/ReactDOMEmptyComponent.js 1.74 KiB {779} [built]
 [101] (webpack)/node_modules/react-dom/lib/ReactDOMTextComponent.js 5.56 KiB {779} [built]
 [273] (webpack)/node_modules/react-dom/lib/ReactDOMInput.js 12.7 KiB {779} [built]
 [355] (webpack)/node_modules/react-dom/lib/ReactDOMSelection.js 6.5 KiB {779} [built]
 [613] (webpack)/node_modules/react-dom/lib/ReactDOMSelect.js 6.53 KiB {779} [built]
 [626] (webpack)/node_modules/react-dom/lib/ReactDOMIDOperations.js 833 bytes {779} [built]
 [680] (webpack)/node_modules/react-dom/lib/ReactDOMFeatureFlags.js 317 bytes {779} [built]
 [699] (webpack)/node_modules/react-dom/lib/ReactDOMComponentTree.js 6 KiB {779} [built]
 [762] (webpack)/node_modules/react-dom/lib/ReactDOMContainerInfo.js 845 bytes {779} [built]
 [927] (webpack)/node_modules/react-dom/lib/ReactDOMOption.js 3.48 KiB {779} [built]
chunk {995} 057b78fcff1ae757be9f.js 48.2 KiB <{169}> <{396}> <{640}> ={45}= ={140}= ={303}= ={326}= ={506}= ={525}= ={572}= ={608}= ={719}= ={779}= ={996}= [rendered] [recorded] aggressive splitted
    > react-dom [275] ./example.js 2:0-22
  [26] (webpack)/node_modules/react-dom/lib/SyntheticAnimationEvent.js 1.06 KiB {995} [built]
  [31] (webpack)/node_modules/react-dom/lib/accumulateInto.js 1.54 KiB {995} [built]
  [76] (webpack)/node_modules/react-dom/lib/SyntheticTouchEvent.js 1.13 KiB {995} [built]
  [99] (webpack)/node_modules/react-dom/lib/SyntheticMouseEvent.js 1.97 KiB {995} [built]
 [126] (webpack)/node_modules/react-dom/lib/SyntheticTransitionEvent.js 1.08 KiB {995} [built]
 [127] (webpack)/node_modules/react-dom/lib/SyntheticInputEvent.js 967 bytes {995} [built]
 [133] (webpack)/node_modules/react-dom/lib/dangerousStyleValue.js 2.87 KiB {995} [built]
 [157] (webpack)/node_modules/react-dom/lib/SyntheticFocusEvent.js 944 bytes {995} [built]
 [162] (webpack)/node_modules/react-dom/lib/SyntheticUIEvent.js 1.42 KiB {995} [built]
 [236] (webpack)/node_modules/react-dom/lib/createMicrosoftUnsafeLocalFunction.js 688 bytes {995} [built]
 [365] (webpack)/node_modules/react-dom/lib/SyntheticClipboardEvent.js 1.02 KiB {995} [built]
 [375] (webpack)/node_modules/react-dom/lib/ViewportMetrics.js 482 bytes {995} [built]
 [378] (webpack)/node_modules/react-dom/lib/SyntheticEvent.js 9.02 KiB {995} [built]
 [512] (webpack)/node_modules/react-dom/lib/SyntheticWheelEvent.js 1.76 KiB {995} [built]
 [685] (webpack)/node_modules/react-dom/lib/Transaction.js 9.21 KiB {995} [built]
 [724] (webpack)/node_modules/react-dom/lib/adler32.js 1.04 KiB {995} [built]
 [737] (webpack)/node_modules/react-dom/lib/SyntheticKeyboardEvent.js 2.52 KiB {995} [built]
 [919] (webpack)/node_modules/react-dom/lib/SimpleEventPlugin.js 7.67 KiB {995} [built]
 [965] (webpack)/node_modules/react-dom/lib/SyntheticDragEvent.js 949 bytes {995} [built]
 [985] (webpack)/node_modules/react-dom/lib/SyntheticCompositionEvent.js 977 bytes {995} [built]
chunk {996} 42ff50fdba6215173a13.js 46.6 KiB <{169}> <{396}> <{640}> ={45}= ={140}= ={303}= ={326}= ={506}= ={525}= ={572}= ={608}= ={719}= ={779}= ={995}= [rendered] [recorded] aggressive splitted
    > react-dom [275] ./example.js 2:0-22
  [45] (webpack)/node_modules/react-dom/lib/shouldUpdateReactComponent.js 1.25 KiB {996} [built]
  [66] (webpack)/node_modules/react-dom/lib/getHostComponentFromComposite.js 618 bytes {996} [built]
 [255] (webpack)/node_modules/react-dom/lib/isEventSupported.js 1.77 KiB {996} [built]
 [340] (webpack)/node_modules/react-dom/lib/getNodeForCharacterOffset.js 1.46 KiB {996} [built]
 [406] (webpack)/node_modules/react-dom/lib/getEventTarget.js 888 bytes {996} [built]
 [438] (webpack)/node_modules/react-dom/lib/inputValueTracking.js 2.9 KiB {996} [built]
 [444] (webpack)/node_modules/react-dom/lib/flattenChildren.js 2.59 KiB {996} [built]
 [537] (webpack)/node_modules/react-dom/lib/getEventKey.js 2.68 KiB {996} [built]
 [568] (webpack)/node_modules/react-dom/lib/getVendorPrefixedEventName.js 2.68 KiB {996} [built]
 [583] (webpack)/node_modules/react-dom/lib/getIteratorFn.js 997 bytes {996} [built]
 [585] (webpack)/node_modules/react-dom/lib/isTextInputElement.js 895 bytes {996} [built]
 [608] (webpack)/node_modules/react-dom/lib/setTextContent.js 1.3 KiB {996} [built]
 [638] (webpack)/node_modules/react-dom/lib/instantiateReactComponent.js 4.82 KiB {996} [built]
 [642] (webpack)/node_modules/react-dom/lib/getTextContentAccessor.js 833 bytes {996} [built]
 [665] (webpack)/node_modules/react-dom/lib/getEventCharCode.js 1.35 KiB {996} [built]
 [708] (webpack)/node_modules/react-dom/lib/renderSubtreeIntoContainer.js 300 bytes {996} [built]
 [756] (webpack)/node_modules/react-dom/lib/findDOMNode.js 2.29 KiB {996} [built]
 [761] (webpack)/node_modules/react-dom/lib/escapeTextContentForBrowser.js 3.23 KiB {996} [built]
 [779] (webpack)/node_modules/react-dom/lib/forEachAccumulated.js 733 bytes {996} [built]
 [787] (webpack)/node_modules/react-dom/lib/traverseAllChildren.js 6.75 KiB {996} [built]
 [819] (webpack)/node_modules/react-dom/lib/getEventModifierState.js 1.08 KiB {996} [built]
 [877] (webpack)/node_modules/react-dom/lib/quoteAttributeValueForBrowser.js 578 bytes {996} [built]
 [888] (webpack)/node_modules/react-dom/lib/setInnerHTML.js 3.65 KiB {996} [built]
 [898] (webpack)/node_modules/react-dom/lib/reactProdInvariant.js 1.08 KiB {996} [built]
```

## Records

```
{
  "aggressiveSplits": [
    {
      "hash": "5bee88903a6b72649a35a68dfab6d07b",
      "id": 2,
      "modules": [
        "../../node_modules/create-react-class/factory.js",
        "../../node_modules/fbjs/lib/emptyFunction.js",
        "../../node_modules/fbjs/lib/emptyObject.js",
        "../../node_modules/fbjs/lib/invariant.js",
        "../../node_modules/fbjs/lib/warning.js",
        "../../node_modules/object-assign/index.js",
        "../../node_modules/prop-types/checkPropTypes.js",
        "../../node_modules/prop-types/factory.js"
      ],
      "size": 40275
    },
    {
      "hash": "861042764426921507e27d539a222322",
      "id": 1,
      "modules": [
        "../../node_modules/prop-types/factoryWithTypeCheckers.js",
        "../../node_modules/prop-types/lib/ReactPropTypesSecret.js",
        "../../node_modules/react/lib/KeyEscapeUtils.js",
        "../../node_modules/react/lib/PooledClass.js",
        "../../node_modules/react/lib/React.js",
        "../../node_modules/react/lib/ReactBaseClasses.js",
        "../../node_modules/react/lib/ReactChildren.js",
        "../../node_modules/react/lib/ReactCurrentOwner.js",
        "../../node_modules/react/lib/ReactDOMFactories.js"
      ],
      "size": 46762
    }
  ],
  "chunks": {
    "byName": {
    },
    "bySource": {
      "0 ./example.js react-dom": 3,
      "1 ./example.js react-dom": 7,
      "10 ./example.js react-dom": 6,
      "11 ./example.js react-dom": 14,
      "2 ./example.js react-dom": 9,
      "3 ./example.js react-dom": 13,
      "4 ./example.js react-dom": 4,
      "5 ./example.js react-dom": 5,
      "6 ./example.js react-dom": 8,
      "7 ./example.js react-dom": 12,
      "8 ./example.js react-dom": 11,
      "9 ./example.js react-dom": 10
    },
    "usedIds": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14
    ]
  },
  "modules": {
    "byIdentifier": {
      "../../node_modules/create-react-class/factory.js": 29,
      "../../node_modules/fbjs/lib/EventListener.js": 136,
      "../../node_modules/fbjs/lib/ExecutionEnvironment.js": 47,
      "../../node_modules/fbjs/lib/camelize.js": 93,
      "../../node_modules/fbjs/lib/camelizeStyleName.js": 92,
      "../../node_modules/fbjs/lib/containsNode.js": 143,
      "../../node_modules/fbjs/lib/createArrayFromMixed.js": 84,
      "../../node_modules/fbjs/lib/createNodesFromMarkup.js": 83,
      "../../node_modules/fbjs/lib/emptyFunction.js": 8,
      "../../node_modules/fbjs/lib/emptyObject.js": 10,
      "../../node_modules/fbjs/lib/focusNode.js": 89,
      "../../node_modules/fbjs/lib/getActiveElement.js": 146,
      "../../node_modules/fbjs/lib/getMarkupWrap.js": 85,
      "../../node_modules/fbjs/lib/getUnboundedScrollPosition.js": 137,
      "../../node_modules/fbjs/lib/hyphenate.js": 96,
      "../../node_modules/fbjs/lib/hyphenateStyleName.js": 95,
      "../../node_modules/fbjs/lib/invariant.js": 11,
      "../../node_modules/fbjs/lib/isNode.js": 145,
      "../../node_modules/fbjs/lib/isTextNode.js": 144,
      "../../node_modules/fbjs/lib/memoizeStringOnly.js": 97,
      "../../node_modules/fbjs/lib/shallowEqual.js": 116,
      "../../node_modules/fbjs/lib/warning.js": 7,
      "../../node_modules/object-assign/index.js": 3,
      "../../node_modules/prop-types/checkPropTypes.js": 26,
      "../../node_modules/prop-types/factory.js": 23,
      "../../node_modules/prop-types/factoryWithTypeCheckers.js": 24,
      "../../node_modules/prop-types/lib/ReactPropTypesSecret.js": 25,
      "../../node_modules/react-dom/index.js": 31,
      "../../node_modules/react-dom/lib/ARIADOMPropertyConfig.js": 38,
      "../../node_modules/react-dom/lib/AutoFocusUtils.js": 88,
      "../../node_modules/react-dom/lib/BeforeInputEventPlugin.js": 39,
      "../../node_modules/react-dom/lib/CSSProperty.js": 91,
      "../../node_modules/react-dom/lib/CSSPropertyOperations.js": 90,
      "../../node_modules/react-dom/lib/CallbackQueue.js": 56,
      "../../node_modules/react-dom/lib/ChangeEventPlugin.js": 54,
      "../../node_modules/react-dom/lib/DOMChildrenOperations.js": 75,
      "../../node_modules/react-dom/lib/DOMLazyTree.js": 76,
      "../../node_modules/react-dom/lib/DOMNamespaces.js": 77,
      "../../node_modules/react-dom/lib/DOMProperty.js": 35,
      "../../node_modules/react-dom/lib/DOMPropertyOperations.js": 98,
      "../../node_modules/react-dom/lib/Danger.js": 82,
      "../../node_modules/react-dom/lib/DefaultEventPluginOrder.js": 67,
      "../../node_modules/react-dom/lib/EnterLeaveEventPlugin.js": 68,
      "../../node_modules/react-dom/lib/EventPluginHub.js": 41,
      "../../node_modules/react-dom/lib/EventPluginRegistry.js": 42,
      "../../node_modules/react-dom/lib/EventPluginUtils.js": 43,
      "../../node_modules/react-dom/lib/EventPropagators.js": 40,
      "../../node_modules/react-dom/lib/FallbackCompositionState.js": 48,
      "../../node_modules/react-dom/lib/HTMLDOMPropertyConfig.js": 73,
      "../../node_modules/react-dom/lib/KeyEscapeUtils.js": 121,
      "../../node_modules/react-dom/lib/LinkedValueUtils.js": 104,
      "../../node_modules/react-dom/lib/PooledClass.js": 49,
      "../../node_modules/react-dom/lib/ReactBrowserEventEmitter.js": 100,
      "../../node_modules/react-dom/lib/ReactChildReconciler.js": 112,
      "../../node_modules/react-dom/lib/ReactComponentBrowserEnvironment.js": 74,
      "../../node_modules/react-dom/lib/ReactComponentEnvironment.js": 110,
      "../../node_modules/react-dom/lib/ReactCompositeComponent.js": 114,
      "../../node_modules/react-dom/lib/ReactDOM.js": 32,
      "../../node_modules/react-dom/lib/ReactDOMComponent.js": 87,
      "../../node_modules/react-dom/lib/ReactDOMComponentFlags.js": 36,
      "../../node_modules/react-dom/lib/ReactDOMComponentTree.js": 33,
      "../../node_modules/react-dom/lib/ReactDOMContainerInfo.js": 161,
      "../../node_modules/react-dom/lib/ReactDOMEmptyComponent.js": 131,
      "../../node_modules/react-dom/lib/ReactDOMFeatureFlags.js": 162,
      "../../node_modules/react-dom/lib/ReactDOMIDOperations.js": 86,
      "../../node_modules/react-dom/lib/ReactDOMInput.js": 103,
      "../../node_modules/react-dom/lib/ReactDOMOption.js": 106,
      "../../node_modules/react-dom/lib/ReactDOMSelect.js": 107,
      "../../node_modules/react-dom/lib/ReactDOMSelection.js": 141,
      "../../node_modules/react-dom/lib/ReactDOMTextComponent.js": 133,
      "../../node_modules/react-dom/lib/ReactDOMTextarea.js": 108,
      "../../node_modules/react-dom/lib/ReactDOMTreeTraversal.js": 132,
      "../../node_modules/react-dom/lib/ReactDefaultBatchingStrategy.js": 134,
      "../../node_modules/react-dom/lib/ReactDefaultInjection.js": 37,
      "../../node_modules/react-dom/lib/ReactElementSymbol.js": 123,
      "../../node_modules/react-dom/lib/ReactEmptyComponent.js": 118,
      "../../node_modules/react-dom/lib/ReactErrorUtils.js": 44,
      "../../node_modules/react-dom/lib/ReactEventEmitterMixin.js": 101,
      "../../node_modules/react-dom/lib/ReactEventListener.js": 135,
      "../../node_modules/react-dom/lib/ReactFeatureFlags.js": 57,
      "../../node_modules/react-dom/lib/ReactHostComponent.js": 119,
      "../../node_modules/react-dom/lib/ReactInjection.js": 138,
      "../../node_modules/react-dom/lib/ReactInputSelection.js": 140,
      "../../node_modules/react-dom/lib/ReactInstanceMap.js": 111,
      "../../node_modules/react-dom/lib/ReactInstrumentation.js": 61,
      "../../node_modules/react-dom/lib/ReactMarkupChecksum.js": 163,
      "../../node_modules/react-dom/lib/ReactMount.js": 160,
      "../../node_modules/react-dom/lib/ReactMultiChild.js": 109,
      "../../node_modules/react-dom/lib/ReactNodeTypes.js": 115,
      "../../node_modules/react-dom/lib/ReactOwner.js": 60,
      "../../node_modules/react-dom/lib/ReactPropTypesSecret.js": 105,
      "../../node_modules/react-dom/lib/ReactReconcileTransaction.js": 139,
      "../../node_modules/react-dom/lib/ReactReconciler.js": 58,
      "../../node_modules/react-dom/lib/ReactRef.js": 59,
      "../../node_modules/react-dom/lib/ReactServerRenderingTransaction.js": 127,
      "../../node_modules/react-dom/lib/ReactServerUpdateQueue.js": 128,
      "../../node_modules/react-dom/lib/ReactUpdateQueue.js": 129,
      "../../node_modules/react-dom/lib/ReactUpdates.js": 55,
      "../../node_modules/react-dom/lib/ReactVersion.js": 165,
      "../../node_modules/react-dom/lib/SVGDOMPropertyConfig.js": 147,
      "../../node_modules/react-dom/lib/SelectEventPlugin.js": 148,
      "../../node_modules/react-dom/lib/SimpleEventPlugin.js": 149,
      "../../node_modules/react-dom/lib/SyntheticAnimationEvent.js": 150,
      "../../node_modules/react-dom/lib/SyntheticClipboardEvent.js": 151,
      "../../node_modules/react-dom/lib/SyntheticCompositionEvent.js": 51,
      "../../node_modules/react-dom/lib/SyntheticDragEvent.js": 156,
      "../../node_modules/react-dom/lib/SyntheticEvent.js": 52,
      "../../node_modules/react-dom/lib/SyntheticFocusEvent.js": 152,
      "../../node_modules/react-dom/lib/SyntheticInputEvent.js": 53,
      "../../node_modules/react-dom/lib/SyntheticKeyboardEvent.js": 153,
      "../../node_modules/react-dom/lib/SyntheticMouseEvent.js": 69,
      "../../node_modules/react-dom/lib/SyntheticTouchEvent.js": 157,
      "../../node_modules/react-dom/lib/SyntheticTransitionEvent.js": 158,
      "../../node_modules/react-dom/lib/SyntheticUIEvent.js": 70,
      "../../node_modules/react-dom/lib/SyntheticWheelEvent.js": 159,
      "../../node_modules/react-dom/lib/Transaction.js": 62,
      "../../node_modules/react-dom/lib/ViewportMetrics.js": 71,
      "../../node_modules/react-dom/lib/accumulateInto.js": 45,
      "../../node_modules/react-dom/lib/adler32.js": 164,
      "../../node_modules/react-dom/lib/createMicrosoftUnsafeLocalFunction.js": 79,
      "../../node_modules/react-dom/lib/dangerousStyleValue.js": 94,
      "../../node_modules/react-dom/lib/escapeTextContentForBrowser.js": 81,
      "../../node_modules/react-dom/lib/findDOMNode.js": 166,
      "../../node_modules/react-dom/lib/flattenChildren.js": 126,
      "../../node_modules/react-dom/lib/forEachAccumulated.js": 46,
      "../../node_modules/react-dom/lib/getEventCharCode.js": 154,
      "../../node_modules/react-dom/lib/getEventKey.js": 155,
      "../../node_modules/react-dom/lib/getEventModifierState.js": 72,
      "../../node_modules/react-dom/lib/getEventTarget.js": 64,
      "../../node_modules/react-dom/lib/getHostComponentFromComposite.js": 167,
      "../../node_modules/react-dom/lib/getIteratorFn.js": 124,
      "../../node_modules/react-dom/lib/getNodeForCharacterOffset.js": 142,
      "../../node_modules/react-dom/lib/getTextContentAccessor.js": 50,
      "../../node_modules/react-dom/lib/getVendorPrefixedEventName.js": 102,
      "../../node_modules/react-dom/lib/inputValueTracking.js": 63,
      "../../node_modules/react-dom/lib/instantiateReactComponent.js": 113,
      "../../node_modules/react-dom/lib/isEventSupported.js": 65,
      "../../node_modules/react-dom/lib/isTextInputElement.js": 66,
      "../../node_modules/react-dom/lib/quoteAttributeValueForBrowser.js": 99,
      "../../node_modules/react-dom/lib/reactProdInvariant.js": 34,
      "../../node_modules/react-dom/lib/renderSubtreeIntoContainer.js": 168,
      "../../node_modules/react-dom/lib/setInnerHTML.js": 78,
      "../../node_modules/react-dom/lib/setTextContent.js": 80,
      "../../node_modules/react-dom/lib/shouldUpdateReactComponent.js": 117,
      "../../node_modules/react-dom/lib/traverseAllChildren.js": 122,
      "../../node_modules/react-dom/lib/validateDOMNesting.js": 130,
      "../../node_modules/react/lib/KeyEscapeUtils.js": 20,
      "../../node_modules/react/lib/PooledClass.js": 14,
      "../../node_modules/react/lib/React.js": 2,
      "../../node_modules/react/lib/ReactBaseClasses.js": 4,
      "../../node_modules/react/lib/ReactChildren.js": 13,
      "../../node_modules/react/lib/ReactComponentTreeHook.js": 125,
      "../../node_modules/react/lib/ReactCurrentOwner.js": 16,
      "../../node_modules/react/lib/ReactDOMFactories.js": 21,
      "../../node_modules/react/lib/ReactElement.js": 15,
      "../../node_modules/react/lib/ReactElementSymbol.js": 17,
      "../../node_modules/react/lib/ReactNoopUpdateQueue.js": 6,
      "../../node_modules/react/lib/ReactPropTypes.js": 22,
      "../../node_modules/react/lib/ReactVersion.js": 27,
      "../../node_modules/react/lib/canDefineProperty.js": 9,
      "../../node_modules/react/lib/createClass.js": 28,
      "../../node_modules/react/lib/getIteratorFn.js": 19,
      "../../node_modules/react/lib/getNextDebugID.js": 120,
      "../../node_modules/react/lib/lowPriorityWarning.js": 12,
      "../../node_modules/react/lib/onlyChild.js": 30,
      "../../node_modules/react/lib/reactProdInvariant.js": 5,
      "../../node_modules/react/lib/traverseAllChildren.js": 18,
      "../../node_modules/react/react.js": 1,
      "./example.js": 0
    },
    "usedIds": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      24,
      25,
      26,
      27,
      28,
      29,
      30,
      31,
      32,
      33,
      34,
      35,
      36,
      37,
      38,
      39,
      40,
      41,
      42,
      43,
      44,
      45,
      46,
      47,
      48,
      49,
      50,
      51,
      52,
      53,
      54,
      55,
      56,
      57,
      58,
      59,
      60,
      61,
      62,
      63,
      64,
      65,
      66,
      67,
      68,
      69,
      70,
      71,
      72,
      73,
      74,
      75,
      76,
      77,
      78,
      79,
      80,
      81,
      82,
      83,
      84,
      85,
      86,
      87,
      88,
      89,
      90,
      91,
      92,
      93,
      94,
      95,
      96,
      97,
      98,
      99,
      100,
      101,
      102,
      103,
      104,
      105,
      106,
      107,
      108,
      109,
      110,
      111,
      112,
      113,
      114,
      115,
      116,
      117,
      118,
      119,
      120,
      121,
      122,
      123,
      124,
      125,
      126,
      127,
      128,
      129,
      130,
      131,
      132,
      133,
      134,
      135,
      136,
      137,
      138,
      139,
      140,
      141,
      142,
      143,
      144,
      145,
      146,
      147,
      148,
      149,
      150,
      151,
      152,
      153,
      154,
      155,
      156,
      157,
      158,
      159,
      160,
      161,
      162,
      163,
      164,
      165,
      166,
      167,
      168
    ]
  }
}
```
