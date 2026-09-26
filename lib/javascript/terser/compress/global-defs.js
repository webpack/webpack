// Vendored from terser v5.51.2, BSD-2-Clause:
// https://github.com/terser/terser/blob/v5.51.2/lib/compress/global-defs.js
// Held to terser's output rather than to webpack's types.
// @ts-nocheck

/*
  Copyright 2012-2018 (c) Mihai Bazon <mihai.bazon@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions
  are met:

      * Redistributions of source code must retain the above
        copyright notice, this list of conditions and the following
        disclaimer.

      * Redistributions in binary form must reproduce the above
        copyright notice, this list of conditions and the following
        disclaimer in the documentation and/or other materials
        provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDER “AS IS” AND ANY
  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
  PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER BE
  LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY,
  OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
  PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
  THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
  TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF
  THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
  SUCH DAMAGE.
*/

"use strict";

const {
    AST_Array,
    AST_Chain,
    AST_Constant,
    AST_Dot,
    AST_ImportMeta,
    AST_Node,
    AST_Object,
    AST_ObjectKeyVal,
    AST_PropAccess,
    AST_SymbolDeclaration,
    AST_SymbolRef,
    AST_Toplevel,
    TreeTransformer,
} = require("../ast.js");
const { make_node, noop, HOP } = require("../utils/index.js");
const { make_node_from_constant } = require("./common.js");
const { is_lhs } = require("./inference.js");

(function(def_find_defs) {
    function to_node(value, orig) {
        if (value instanceof AST_Node) {
            if (!(value instanceof AST_Constant)) {
                // Value may be a function, an array including functions and even a complex assign / block expression,
                // so it should never be shared in different places.
                // Otherwise wrong information may be used in the compression phase
                value = value.clone(true);
            }
            return make_node(value.CTOR, orig, value);
        }
        if (Array.isArray(value)) return make_node(AST_Array, orig, {
            elements: value.map(function(value) {
                return to_node(value, orig);
            })
        });
        if (value && typeof value == "object") {
            var props = [];
            for (var key in value) if (HOP(value, key)) {
                props.push(make_node(AST_ObjectKeyVal, orig, {
                    key: key,
                    value: to_node(value[key], orig)
                }));
            }
            return make_node(AST_Object, orig, {
                properties: props
            });
        }
        return make_node_from_constant(value, orig);
    }

    AST_Toplevel.DEFMETHOD("resolve_defines", function(compressor) {
        if (!compressor.option("global_defs")) return this;
        this.figure_out_scope({ ie8: compressor.option("ie8") });
        return this.transform(new TreeTransformer(function(node) {
            var def = node._find_defs(compressor, "");
            if (!def) return;
            var level = 0, child = node, parent;
            while (parent = this.parent(level++)) {
                if (!(parent instanceof AST_PropAccess)) break;
                if (parent.expression !== child) break;
                child = parent;
            }
            if (is_lhs(child, parent)) {
                return;
            }
            return def;
        }));
    });
    def_find_defs(AST_Node, noop);
    def_find_defs(AST_Chain, function(compressor, suffix) {
        return this.expression._find_defs(compressor, suffix);
    });
    def_find_defs(AST_Dot, function(compressor, suffix) {
        return this.expression._find_defs(compressor, "." + this.property + suffix);
    });
    def_find_defs(AST_SymbolDeclaration, function() {
        if (!this.global()) return;
    });
    def_find_defs(AST_SymbolRef, function(compressor, suffix) {
        if (!this.global()) return;
        var defines = compressor.option("global_defs");
        var name = this.name + suffix;
        if (HOP(defines, name)) return to_node(defines[name], this);
    });
    def_find_defs(AST_ImportMeta, function(compressor, suffix) {
        var defines = compressor.option("global_defs");
        var name = "import.meta" + suffix;
        if (HOP(defines, name)) return to_node(defines[name], this);
    });
})(function(node, func) {
    node.DEFMETHOD("_find_defs", func);
});


