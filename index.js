(function () {

  'use strict';

  const glob = (typeof global === 'object') ? global : window;
  const exports = (typeof module === 'object' && typeof module.exports === 'object') ? module.exports : (glob.isopod = {});

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

  function hasNonNativeConstructor (obj) {
    return Object.prototype.hasOwnProperty.call(obj, 'constructor') && !nativeConstructors.has(obj.constructor);
  }

  const nativePrototypes = new Set([
    Object.prototype,
    Function.prototype,
    Set.prototype,
    Symbol.prototype,
    Array.prototype,
    Map.prototype
  ]);

  exports.serialize = function (root) {

    if (!(root instanceof Object) && typeof root !== 'symbol') return root;

    const serialized = [];
    const map = new Map();

    function assoc (original) {
      const dehydrated = {};
      const id = serialized.push(dehydrated)-1;
      map.set(original, id);
      return dehydrated;
    }

    function sourceValueFrom (original, type) {
      if (type === 'Object') return;
      if (type === 'Symbol') {
        return getSymbolString(original);
      } else if (type === 'Function') {
        return Function.prototype.toString.call(original);
      }
      const source = [];
      if (type === 'Set') {
        for (let elem of original) {
          source.push(dehydrate(elem));
        }
      } else if (type === 'Map') {
        for (let kv of original) {
          source.push(kv.map(dehydrate));
        }
      } else if (type === 'Array') {
        Array.prototype.forEach.call(original, function (elem, idx) {
          source[idx] = dehydrate(elem);
        });
      }
      return source;
    }

    function cloneKeys (original, source) {
      const clone = {};
      const proto = Object.getPrototypeOf(original);
      if (!nativePrototypes.has(proto)) {
        Object.defineProperty(clone, '__proto__', {
          value: dehydrate(proto),
          enumerable: true
        });
      }
      if (hasNonNativeConstructor(obj)) {
        clone.constructor = dehydrate(original.constructor);
      }
      each(original, function (k, v) {
        if (!source || !source.hasOwnProperty(k)) {
          clone[k] = dehydrate(v);
        }
      });
      return clone;
    }

    function dehydrate (thing) {
      if (!(thing instanceof Object) && typeof thing !== 'symbol') return thing;
      if (!map.has(thing)) {
        const dehydrated = assoc(thing);
        dehydrated.type = objectType(thing);
        dehydrated.source = sourceValueFrom(thing, dehydrated.type);
        dehydrated.keys = cloneKeys(thing, dehydrated.source);
      }
      return [map.get(thing)]
    }

    dehydrate(root);
    
    return serialized;

  };

  // deserialization

  function typedFromDehydrated (dehydrated) {
    if (dehydrated.type === 'Symbol') {
      return Symbol(dehydrated.source);
    } else if (dehydrated.type === 'Function') {
      // TODO: alternative to eval
      return eval(`(${dehydrated.source})`);
    } else if (dehydrated.type === 'Set') {
      return new Set();
    } else if (dehydrated.type === 'Map') {
      return new Map();
    } else if (dehydrated.type === 'Array') {
      return [];
    } else if (dehydrated.type === 'Object') {
      return {};
    }
  }

  function hydrateOne (hydrated, dehydrated, refs) {
    function possibleRef (v) {
      return Array.isArray(v) ? refs[v[0]] : v;
    }
    if (dehydrated.type === 'Set') {
      dehydrated.source.forEach(function (elem) {
        hydrated.add(possibleRef(elem));
      });
    } else if (dehydrated.type === 'Map') {
      dehydrated.source.forEach(function (mapEntry) {
        const k = mapEntry[0]; // TODO: could replace with destructuring
        const v = mapEntry[1]; // TODO: could replace with destructuring
        hydrated.set(possibleRef(k), possibleRef(v));
      });
    } else if (dehydrated.type === 'Array') {
      dehydrated.source.forEach(function (elem) {
        hydrated.push(possibleRef(elem));
      });
    }
    each(dehydrated.keys, function (k, v) {
      hydrated[k] = possibleRef(v);
    });
  }

  exports.deserialize = function (serialized) {
    const mapping = new Map();
    const refs = serialized.map(function (dehydrated) {
      const typedObj = typedFromDehydrated(dehydrated);
      mapping.set(typedObj, dehydrated);
      return typedObj;
    });
    for (let mapEntry of mapping) {
      const typedObj = mapEntry[0]; // TODO: could replace with destructuring
      const dehydrated = mapEntry[1]; // TODO: could replace with destructuring
      hydrateOne(typedObj, dehydrated, refs);
    }
    return refs[0];
  };

})();
