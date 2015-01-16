/**
 * @author "Evgeny Reznichenko" <kusakyky@gmail.com>
 */

var Template = require('./Template');

module.exports = JsonpErrorHandlingTemplatePlugin;

function JsonpErrorHandlingTemplatePlugin() {
}

JsonpErrorHandlingTemplatePlugin.prototype.constructor = JsonpErrorHandlingTemplatePlugin;

JsonpErrorHandlingTemplatePlugin.prototype.apply = function (mainTemplate) {

    mainTemplate.plugin("local-vars", function(source, chunk, hash) {
        if(chunk.chunks.length > 0) {
            return this.asString([
                source,
                "// object to store chunk load error",
                "var chunkLoadErrors = {};",
                ""
            ]);
        }
        return source;
    });
    mainTemplate.plugin("require-ensure", function(_, chunk, hash) {
        var filename = this.outputOptions.filename || "bundle.js";
        var chunkFilename = this.outputOptions.chunkFilename || "[id]." + filename;
        var chunkMaps = chunk.getChunkMaps();
        return this.asString([
            "// \"0\" is the signal for \"already loaded\"",
            "// \"-1\" is the signal for \"chunk load error\"",
            "if(installedChunks[chunkId] === 0 || installedChunks[chunkId] === -1)",
            this.indent("return callback.call(null, chunkLoadErrors[chunkId], " + this.requireFn + ");"),
            "",
            "// an array means \"currently loading\".",
            "if(installedChunks[chunkId] !== undefined) {",
            this.indent("installedChunks[chunkId].push(callback);"),
            "} else {",
            this.indent([
                "// start chunk loading",
                "installedChunks[chunkId] = [callback];",
                "var head = document.getElementsByTagName('head')[0];",
                "var script = document.createElement('script');",
                "script.type = 'text/javascript';",
                "script.charset = 'utf-8';",
                "script.async = true;",
                "script.src = " + this.requireFn + ".p + " +
                this.applyPluginsWaterfall("asset-path", JSON.stringify(chunkFilename), {
                    hash: "\" + " + this.renderCurrentHashCode(hash) + " + \"",
                    hashWithLength: function(length) {
                        return "\" + " + this.renderCurrentHashCode(hash, length) + " + \"";
                    }.bind(this),
                    chunk: {
                        id: "\" + chunkId + \"",
                        hash: "\" + " + JSON.stringify(chunkMaps.hash) + "[chunkId] + \"",
                        hashWithLength: function(length) {
                            var shortChunkHashMap = {};
                            Object.keys(chunkMaps.hash).forEach(function(chunkId) {
                                if(typeof chunkMaps.hash[chunkId] === "string")
                                    shortChunkHashMap[chunkId] = chunkMaps.hash[chunkId].substr(0, length);
                            });
                            return "\" + " + JSON.stringify(shortChunkHashMap) + "[chunkId] + \"";
                        },
                        name: "\" + (" + JSON.stringify(chunkMaps.name) + "[chunkId]||chunkId) + \""
                    }
                }) + ";",
                "setupScriptLoadErrorHandler(script, chunkId);",
                "head.appendChild(script);"
            ]),
            "}"
        ]);
    });
    mainTemplate.plugin("bootstrap", function(source, chunk, hash) {
        if(chunk.chunks.length > 0) {
            var jsonpFunction = this.outputOptions.jsonpFunction || Template.toIdentifier("webpackJsonp" + (this.outputOptions.library || "")),
                jsonpLoadTimeout = this.outputOptions.jsonpLoadTimeout || 60 * 1000;
            return this.asString([
                "",
                "// install a JSONP callback for chunk loading",
                "var parentJsonpFunction = window[" + JSON.stringify(jsonpFunction) + "];",
                "window[" + JSON.stringify(jsonpFunction) + "] = function webpackJsonpCallback(chunkIds, moreModules) {",
                this.indent([
                    '// add "moreModules" to the modules object,',
                    '// then flag all "chunkIds" as loaded and fire callback',
                    "var moduleId, chunkId, i = 0, callbacks = [];",
                    "for(;i < chunkIds.length; i++) {",
                    this.indent([
                        "chunkId = chunkIds[i];",
                        "if(installedChunks[chunkId])",
                        this.indent("callbacks.push.apply(callbacks, installedChunks[chunkId]);"),
                        "installedChunks[chunkId] = 0;"
                    ]),
                    "}",
                    "for(moduleId in moreModules) {",
                    this.indent(this.renderAddModule(hash, chunk, "moduleId", "moreModules[moduleId]")),
                    "}",
                    "if(parentJsonpFunction) parentJsonpFunction(chunkIds, moreModules);",
                    "while(callbacks.length)",
                    this.indent("callbacks.shift().call(null, null, " + this.requireFn + ");"),
                    (this.entryPointInChildren(chunk) ? [
                        "if(moreModules[0]) {",
                        this.indent([
                            "installedModules[0] = 0;",
                            "return " + this.requireFn + "(0);"
                        ]),
                        "}"
                    ] : "")
                ]),
                "};",
                "",
                "// setupScriptLoadErrorHandler",
                "function setupScriptLoadErrorHandler(script, chunkId) {",
                this.indent([
                    "var timeoutId;",
                    "var done = false;",
                    "",
                    "function end(error) {",
                    this.indent([
                        "script.onerror = script.onload = script.onreadystatechange = null;",
                        "clearTimeout(timeoutId);",
                        "if (done) return;",
                        this.indent([
                            "if (error) {",
                            this.indent([
                                "installedChunks[chunkId] === -1;",
                                "chunkLoadErrors[chunkId] = error;",
                                "var callbacks = installedChunks[chunkId];",
                                "delete installedChunks[chunkId];",
                                "",
                                "if (callbacks) while(callbacks.length) {",
                                this.indent([
                                    "callbacks.shift().call(null, chunkLoadErrors[chunkId], " + this.requireFn + ");"
                                ]),
                                "}"
                            ]),
                            "}",
                            "done = true;"
                        ]),
                        "}",
                        "",
                        "script.onload = script.onreadystatechange = function() {",
                        this.indent([
                            "var readyState = this.readyState;",
                            "if (!readyState || readyState === \"loaded\" || readyState === \"complete\") {",
                            this.indent([
                                "end();"
                            ]),
                            "}"
                        ]),
                        "};",
                        "",
                        "script.onerror = function () {",
                        this.indent([
                            "end(new Error(\"failed load chunk file: \" + script.src));"
                        ]),
                        "};",
                        "",
                        "timeoutId = setTimeout(function () {",
                        this.indent([
                            "end(new Error(\"timeout on load chunk file: \" + script.src));"
                        ]),
                        "}, " + jsonpLoadTimeout + ");"
                    ])
                ]),
                "}",
                ""
            ]);
        }
        return source;
    });
};
