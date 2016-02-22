(function () {

  // TODO: serialzation/deserialization for: Promise, Date, Generator, Proxy, TypedArray
  // TODO: working with native functions (e.g. setTimeout)

  'use strict';

  const glob = (typeof global === 'object') ? global : window;
  const exports = (typeof module === 'object' && typeof module.exports === 'object') ? module.exports : (glob.isopod = {});

  // ---------------
  // -- UTILITIES --
  // ---------------

  function each (obj, fn) {
    Object.keys(obj).forEach(function (k) {
      fn(k, obj[k]);
    });
  }

  function flags (r) {
    if (r.flags) return r.flags;
    return (r.ignoreCase ? 'i' : '') + (r.multiline ? 'm' : '') + (r.global ? 'g' : '') + (r.sticky ? 'y' : '');
  }

  // -------------------
  // -- SERIALIZATION --
  // -------------------

  function isSpecial (thing) {
    return thing === undefined || thing === null || Number.isNaN(thing) || thing === Infinity || thing === -Infinity;
  }

  function baseTypeOf (thing) {
    return Object.prototype.toString.call(thing).slice(8,-1);
  }

  const allowedTypes = new Set(['Boolean', 'Number', 'Object', 'Array', 'Function', 'RegExp', 'Error', 'Symbol', 'Set', 'Map', 'null', 'undefined', 'NaN', 'Infinity', '-Infinity']);

  function isopodTypeOf (thing) {
    const type = isSpecial(thing) ? `${thing}` : baseTypeOf(thing);
    return allowedTypes.has(type) ? type : 'Unsupported'; // TODO: consider throwing error for unsupported types
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
    Map,
    RegExp,
    Error
  ]);
  const nativePrototypes = new Set();
  nativeConstructors.forEach(function (constructor) {
    nativePrototypes.add(constructor.prototype);
  });

  function hasNonNativeConstructor (obj) {
    return Object.prototype.hasOwnProperty.call(obj, 'constructor') && !nativeConstructors.has(obj.constructor);
  }

  // TODO: better name
  function isRef (thing) {
    return thing instanceof Object || typeof thing === 'symbol' || isSpecial(thing); 
  }

  // given some object or primitive, convert it into a format that will retain all its details when stringified
  exports.serialize = function (root) {

    // deal with trivial case
    if (!isRef(root)) return root;

    // the serialized result will be an array of "dehydrated" objects
    const serialized = [];
    // the idCache keeps track of any objects (or symbols) that have been seen already
    const idCache = new Map();

    // incorporate an object (or symbol) into the cache and return the seed of a dehydrated stand-in
    function assoc (original) {
      const dehydrated = {};
      // the id represents the location of the dehydrated object in the root serialized array
      const id = serialized.push(dehydrated)-1;
      idCache.set(original, id);
      return dehydrated;
    }

    // catch-all to obtain various meaningful "source" values from native Object types
    function sourceValueFrom (original, type) {
      // objects and special values don't have a "source"
      if (type === 'Object' || isSpecial(original)) return;
      switch (type) {
        // a symbol's source is the string used to construct it
        case 'Symbol': return getSymbolString(original);
        // a function's source is its source string
        case 'Function': return Function.prototype.toString.call(original);
        case 'RegExp': return [original.source, flags(original)];
        case 'Error':
          return {
            message: Object.prototype.hasOwnProperty.call(original, 'message') ? original.message : undefined,
            stack: original.stack
          };
      }
      // all other possibilities will involve a source that is an array
      const source = [];
      switch (type) {
        case 'Set':
          // a set's source is an array of the set elements
          Set.prototype.forEach.call(original, function (elem) {
            source.push(dehydrate(elem));
          });
          break;
        case 'Map':
          // a map's source is an array of key-value pair arrays
          Map.prototype.forEach.call(original, function (v, k) {
            source.push([k,v].map(dehydrate));
          });
          break;
        case 'Array':
          // an array's source is an array copy of its elements
          Array.prototype.forEach.call(original, function (elem, idx) {
            source[idx] = dehydrate(elem);
          });
          break;
      }
      return source;
    }

    // return any keys in the original not accounted for in the source
    function cloneKeys (original, source) {
      // special values do not have keys
      if (isSpecial(original)) return;
      const clone = {};
      const proto = Object.getPrototypeOf(original);
      // include original's __proto__ when cloning it, if it's non-native
      if (!nativePrototypes.has(proto)) {
        Object.defineProperty(clone, '__proto__', {
          value: dehydrate(proto),
          enumerable: true // ensure that it will show up as a result of stringification
        });
      }
      // include the original's constructor if it has one
      if (hasNonNativeConstructor(original)) {
        const constructor = original.constructor;
        if (constructor instanceof Object && constructor.prototype === original) {
          clone.constructor = dehydrate(constructor);
        }
      }
      // include all keys in original not yet accounted for by the source
      each(original, function (k, v) {
        // make sure not to double include numerical array keys already in the source
        if (source && Array.isArray(original) && source.hasOwnProperty(k)) return;
        clone[k] = dehydrate(v);
      });
      return clone;
    }

    // convert something into a rehydratable format
    function dehydrate (thing) {
      // non-refs (i.e. something that is neither a symbol, an object, nor a special value) remain themselves
      if (!isRef(thing)) return thing;
      if (!idCache.has(thing)) {
        // incorporate the object into the cache
        const dehydrated = assoc(thing);
        // set its type (helps streamline deserialization)
        dehydrated.type = isopodTypeOf(thing);
        // set its "source" value (helps streamline deserialization)
        dehydrated.source = sourceValueFrom(thing, dehydrated.type);
        // set any additional keys not included in the source
        dehydrated.keys = cloneKeys(thing, dehydrated.source);
      }
      // objects are replaced with the id representing their location in the root serialized array (helps streamline deserialization)
      return [idCache.get(thing)]
    }

    // kick off the recursive process of dehydrating everything in the original
    dehydrate(root);
    
    return serialized;

  };

  // ---------------------
  // -- DESERIALIZATION --
  // ---------------------

  // convert a dehydrated object back into something of the correct type
  function typedFromDehydrated (dehydrated) {
    switch (dehydrated.type) {
      case 'Symbol': return Symbol(dehydrated.source);
      case 'Function': return eval(`(${dehydrated.source})`); // TODO: alternative to eval
      case 'Set': return new Set();
      case 'Map': return new Map();
      case 'Array': return [];
      case 'RegExp': return new RegExp(dehydrated.source[0], dehydrated.source[1]);
      case 'Error':
        const err = Error(dehydrated.source.message);
        if (dehydrated.source.stack) {
          Object.defineProperty(err, 'stack', {
            value: dehydrated.source.stack,
            enumerable: false
          });
        }
        return err;
      case 'Object': return {};
      case 'null': return null;
      case 'undefined': return undefined;
      case 'NaN': return NaN;
      case 'Infinity': return Infinity;
      case '-Infinity': return -Infinity;
    }
  }

  // use the dehydrated format to populate an empty object of the correct type
  function hydrateOne (hydrated, dehydrated, refs) {
    // special values need no further hydration
    if (isSpecial(hydrated)) return;
    // account for any objects that are duplicate references
    function possibleRef (v) {
      return Array.isArray(v) ? refs[v[0]] : v;
    }
    switch (dehydrated.type) {
      case 'Set':
        // a set incorporates its source array as elements
        dehydrated.source.forEach(function (elem) {
          hydrated.add(possibleRef(elem));
        });
        break;
      case 'Map':
        // a map incorporates its source array as key-value entries
        dehydrated.source.forEach(function (mapEntry) {
          const k = mapEntry[0]; // TODO: could replace with destructuring
          const v = mapEntry[1]; // TODO: could replace with destructuring
          hydrated.set(possibleRef(k), possibleRef(v));
        });
        break;
      case 'Array':
        // an array incorporates its source array as elements
        dehydrated.source.forEach(function (elem) {
          hydrated.push(possibleRef(elem));
        });
        break;
    }
    // incorporate any additional keys from the dehydrated object
    each(dehydrated.keys, function (k, v) {
      if (k === 'constructor') {
        Object.defineProperty(hydrated, 'constructor', {
          value: possibleRef(v),
          enumerable: false
        });
      } else {
        hydrated[k] = possibleRef(v);
      }
    });
  }

  // convert a serialized thing into a fully imbued clone of the original, i.e. the one that got serialized in the first place
  exports.deserialize = function (serialized) {
    // if the base serialized root is not an array it is simply a primitive value
    if (!Array.isArray(serialized)) return serialized;
    // the mapping corresponds the being-hydrated and dehydrated versions of the data
    const mapping = new Map();
    // hold references to the being-hydrated objects
    const refs = serialized.map(function (dehydrated) {
      const typedObj = typedFromDehydrated(dehydrated);
      mapping.set(typedObj, dehydrated);
      return typedObj;
    });
    // imbue each empty (but properly typed) object with all its glorious details
    for (let mapEntry of mapping) {
      const typedObj = mapEntry[0]; // TODO: could replace with destructuring
      const dehydrated = mapEntry[1]; // TODO: could replace with destructuring
      hydrateOne(typedObj, dehydrated, refs);
    }
    // the first ref is now a clone of the base object that was originally serialized
    return refs[0];
  };

})();
