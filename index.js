(function () {

  'use strict';

  const exports = (module && module.exports) || (window.isopod = {});

  // utilities

  function each (obj, fn) {
    Object.keys(obj).forEach(function (k) {
      fn(k, obj[k]);
    });
  }

  // serialization

  function objectType (obj) {
    if (typeof obj === 'symbol') return 'Symbol';
    if (typeof obj === 'function') return 'Function';
    if (obj instanceof Set) return 'Set';
    if (obj instanceof Map) return 'Map';
    if (Array.isArray(obj)) return 'Array';
    return 'Object';
  }

  const parensPattern = /\(.+\)/;
  function getSymbolString (sym) {
    return sym.toString().match(parensPattern)[0].slice(1,-1);
  }

  const nativeConstructors = new Set([
    Object,
    Function,
    Set,
    Symbol,
    Array,
    Map
  ]);

  const nativePrototypes = new Set([
    Object.prototype,
    Function.prototype,
    Set.prototype,
    Symbol.prototype,
    Array.prototype,
    Map.prototype
  ]);

  exports.serialize = function (root) {
    const result = [];
    const map = new Map();
    function setValues (entry, obj) {
      const type = entry.type = objectType(obj);
      if (type === 'Symbol') {
        entry.source = getSymbolString(obj);
      } else if (type === 'Function') {
        entry.source = Function.prototype.toString.call(obj);
      } else if (type === 'Set') {
        entry.source = [];
        for (let elem of obj) {
          entry.source.push(assoc(elem));
        }
      } else if (type === 'Map') {
        entry.source = [];
        for (let kv of obj) {
          entry.source.push(kv.map(assoc));
        }
      } else if (type === 'Array') {
        entry.source = [];
        Array.prototype.forEach.call(obj, function (elem, idx) {
          entry.source[idx] = assoc(elem);
        });
      }
      entry.keys = {};
      const proto = Object.getPrototypeOf(obj);
      if (!nativePrototypes.has(proto)) {
        Object.defineProperty(entry.keys, '__proto__', {
          value: assoc(proto),
          enumerable: true
        });
      }
      if (Object.prototype.hasOwnProperty.call(obj, 'constructor') && !nativeConstructors.has(obj.constructor)) {
        entry.keys.constructor = assoc(obj.constructor);
      }
      each(obj, function (k, v) {
        if (!entry.source || !entry.source.hasOwnProperty(k)) {
          entry.keys[k] = assoc(v);
        }
      });
    }
    function assoc (thing) {
      if (map.has(thing)) {
        return [map.get(thing)];
      }
      if (thing instanceof Object || typeof thing === 'symbol') {
        const entry = {};
        const id = result.push(entry)-1;
        map.set(thing, id);
        setValues(entry, thing);
        return [id];
      }
      return thing;
    }
    assoc(root);
    return result;
  }

  // deserialization

  function typedFromRaw (raw) {
    if (raw.type === 'Symbol') {
      return Symbol(raw.source);
    } else if (raw.type === 'Function') {
      // TODO: alternative to eval
      return eval(`(${raw.source})`);
    } else if (raw.type === 'Set') {
      return new Set();
    } else if (raw.type === 'Map') {
      return new Map();
    } else if (raw.type === 'Array') {
      return [];
    } else if (raw.type === 'Object') {
      return {};
    }
  }

  function hydrateOne (obj, raw, refs) {
    function possibleRef (v) {
      return Array.isArray(v) ? refs[v[0]] : v;
    }
    if (raw.type === 'Set') {
      raw.source.forEach(function (elem) {
        obj.add(possibleRef(elem));
      });
    } else if (raw.type === 'Map') {
      raw.source.forEach(function ([k, v]) {
        obj.set(possibleRef(k), possibleRef(v));
      });
    } else if (raw.type === 'Array') {
      raw.source.forEach(function (elem) {
        obj.push(possibleRef(elem));
      });
    }
    each(raw.keys, function (k, v) {
      obj[k] = possibleRef(v);
    });
  }

  exports.deserialize = function (rawRoot) {
    const mapping = new Map();
    const refs = rawRoot.map(function (raw) {
      const typedObj = typedFromRaw(raw);
      mapping.set(typedObj, raw);
      return typedObj;
    });
    for (let [actual, raw] of mapping) {
      hydrateOne(actual, raw, refs);
    }
    return refs[0];
  }

})()
