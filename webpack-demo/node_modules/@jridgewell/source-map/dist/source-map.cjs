'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var traceMapping = require('@jridgewell/trace-mapping');
var genMapping = require('@jridgewell/gen-mapping');

class SourceMapConsumer {
    constructor(map, mapUrl) {
        const trace = (this._map = new traceMapping.AnyMap(map, mapUrl));
        this.file = trace.file;
        this.names = trace.names;
        this.sourceRoot = trace.sourceRoot;
        this.sources = trace.resolvedSources;
        this.sourcesContent = trace.sourcesContent;
        this.version = trace.version;
    }
    static fromSourceMap(map, mapUrl) {
        // This is more performant if we receive
        // a @jridgewell/source-map SourceMapGenerator
        if (map.toDecodedMap) {
            return new SourceMapConsumer(map.toDecodedMap(), mapUrl);
        }
        // This is a fallback for `source-map` and `source-map-js`
        return new SourceMapConsumer(map.toJSON(), mapUrl);
    }
    get mappings() {
        return traceMapping.encodedMappings(this._map);
    }
    originalPositionFor(needle) {
        return traceMapping.originalPositionFor(this._map, needle);
    }
    generatedPositionFor(originalPosition) {
        return traceMapping.generatedPositionFor(this._map, originalPosition);
    }
    allGeneratedPositionsFor(originalPosition) {
        return traceMapping.allGeneratedPositionsFor(this._map, originalPosition);
    }
    hasContentsOfAllSources() {
        if (!this.sourcesContent || this.sourcesContent.length !== this.sources.length) {
            return false;
        }
        for (const content of this.sourcesContent) {
            if (content == null) {
                return false;
            }
        }
        return true;
    }
    sourceContentFor(source, nullOnMissing) {
        const sourceContent = traceMapping.sourceContentFor(this._map, source);
        if (sourceContent != null) {
            return sourceContent;
        }
        if (nullOnMissing) {
            return null;
        }
        throw new Error(`"${source}" is not in the SourceMap.`);
    }
    eachMapping(callback, context /*, order?: number*/) {
        // order is ignored as @jridgewell/trace-map doesn't implement it
        traceMapping.eachMapping(this._map, context ? callback.bind(context) : callback);
    }
    destroy() {
        // noop.
    }
}
class SourceMapGenerator {
    constructor(opts) {
        // TODO :: should this be duck-typed ?
        this._map = opts instanceof genMapping.GenMapping ? opts : new genMapping.GenMapping(opts);
    }
    static fromSourceMap(consumer) {
        return new SourceMapGenerator(genMapping.fromMap(consumer));
    }
    addMapping(mapping) {
        genMapping.maybeAddMapping(this._map, mapping);
    }
    setSourceContent(source, content) {
        genMapping.setSourceContent(this._map, source, content);
    }
    toJSON() {
        return genMapping.toEncodedMap(this._map);
    }
    toString() {
        return JSON.stringify(this.toJSON());
    }
    toDecodedMap() {
        return genMapping.toDecodedMap(this._map);
    }
}

exports.SourceMapConsumer = SourceMapConsumer;
exports.SourceMapGenerator = SourceMapGenerator;
//# sourceMappingURL=source-map.cjs.map
