(function () {

  // TODO: serialzation/deserialization for: Promise, Generator, Proxy
  // TODO: working with native functions (e.g. setTimeout)

  'use strict';

  const globalObject = (typeof global === 'object') ? global : window;
  const exports = (typeof module === 'object' && typeof module.exports === 'object') ? module.exports : (globalObject.isopod = {});

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

  const typedArrayConstructors = new Set([
    Int8Array,
    Uint8Array,
    Uint8ClampedArray,
    Int16Array,
    Uint16Array,
    Int32Array,
    Uint32Array,
    Float32Array,
    Float64Array
  ]);

  const typedArrayTypes = new Set();
  typedArrayConstructors.forEach(function (constructor) {
    typedArrayTypes.add(constructor.name);
  });

  const bufferableConstructors = new Set([
    DataView
  ]);
  typedArrayConstructors.forEach(function (constructor) {
    bufferableConstructors.add(constructor);
  });

  const bufferableTypes = new Map();
  bufferableConstructors.forEach(function (constructor) {
    bufferableTypes.set(constructor.name, constructor);
  });

  const specialTypes = new Set([
    undefined,
    null,
    NaN,
    Infinity,
    -Infinity
  ]);

  const nativeConstructors = new Set([
    Boolean,
    Number,
    Object,
    Function,
    Set,
    Symbol,
    Array,
    Map,
    RegExp,
    Error,
    ArrayBuffer,
    Date
  ]);
  bufferableConstructors.forEach(function (constructor) {
    nativeConstructors.add(constructor);
  });

  const nativePrototypes = new Set();
  nativeConstructors.forEach(function (constructor) {
    nativePrototypes.add(constructor.prototype);
  });

  const allowedTypes = new Set();
  nativeConstructors.forEach(function (constructor) {
    allowedTypes.add(constructor.name);
  });
  specialTypes.forEach(function (specialType) {
    allowedTypes.add(`${specialType}`);
  });

  function baseTypeOf (thing) {
    return Object.prototype.toString.call(thing).slice(8,-1);
  }

  function isopodTypeOf (thing) {
    const type = specialTypes.has(thing) ? `${thing}` : baseTypeOf(thing);
    return allowedTypes.has(type) ? type : 'Unsupported'; // TODO: consider throwing error for unsupported types
  }

  const parensPattern = /\(.+\)/;
  function getSymbolString (sym) {
    return sym.toString().match(parensPattern)[0].slice(1,-1);
  }

  function hasNonNativeConstructor (obj) {
    return Object.prototype.hasOwnProperty.call(obj, 'constructor') && !nativeConstructors.has(obj.constructor);
  }

  // TODO: better name
  function isRef (thing) {
    return thing instanceof Object || typeof thing === 'symbol' || specialTypes.has(thing); 
  }

  function isPlainOrTypedArray (thing) {
    const type = baseTypeOf(thing);
    return type === 'Array' || typedArrayTypes.has(type);
  }

  // function getTypedArrayBuffer (typedArray) {
  //   // in case a typed array has a non-standard prototype
  //   const currentProto = Object.getPrototypeOf(typedArray);
  //   const originalProto = bufferableTypes.get(isopodTypeOf(typedArray)).prototype;
  //   // temporarily change prototype back to original
  //   Object.setPrototypeOf(typedArray, originalProto);
  //   // grab buffer off of it
  //   const buffer = typedArray.buffer;
  //   // change back to assigned prototype
  //   Object.setPrototypeOf(typedArray, currentProto);
  //   return buffer;
  // }

  function bufferableSource (bufferable) {
    // in case a bufferable has a non-standard prototype
    const currentProto = Object.getPrototypeOf(bufferable);
    const originalProto = bufferableTypes.get(isopodTypeOf(bufferable)).prototype;
    // temporarily change prototype back to original
    Object.setPrototypeOf(bufferable, originalProto);
    // a bufferable's source contains its buffer, the byteOffset, and the length
    const source = {
      buffer: bufferable.buffer,
      byteOffset: bufferable.byteOffset,
      length: bufferable.length
    };
    // change back to assigned prototype
    Object.setPrototypeOf(bufferable, currentProto);
    return source;
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
      if (type === 'Object' || specialTypes.has(original)) return;
      if (bufferableTypes.has(type)) {
        // make sure to attach the buffer by reference
        const source = bufferableSource(original);
        source.buffer = dehydrate(source.buffer);
        return source;
      }
      switch (type) {
        // a symbol's source is the string used to construct it
        case 'Symbol': return getSymbolString(original);
        // a function's source is its source string
        case 'Function': return Function.prototype.toString.call(original);
        case 'RegExp': return [original.source, flags(original)];
        case 'Error': {
          return {
            message: Object.prototype.hasOwnProperty.call(original, 'message') ? original.message : undefined,
            stack: original.stack
          };
        }
        // an array's source is an array copy of its elements
        case 'Array': return Array.prototype.map.call(original, dehydrate);
        case 'Set': {
          // a set's source is an array of the set elements
          const source = [];
          Set.prototype.forEach.call(original, function (elem) {
            source.push(dehydrate(elem));
          });
          return source;
        }
        case 'Map': {
          // a map's source is an array of key-value pair arrays
          const source = [];
          Map.prototype.forEach.call(original, function (v, k) {
            source.push([k,v].map(dehydrate));
          });
          return source;
        }
        // an array buffer's source is its Uint8Array representation
        case 'ArrayBuffer': return Array.prototype.slice.call(new Uint8Array(original));
        case 'Date': return Date.prototype.valueOf.call(original);
      }
    }

    // return any keys in the original not accounted for in the source
    function cloneKeys (original, source) {
      // special values do not have keys
      if (specialTypes.has(original)) return;
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
        if (source && isPlainOrTypedArray(original) && !Number.isNaN(Number(k))) return;
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
      case 'Error': {
        const err = Error(dehydrated.source.message);
        if (dehydrated.source.stack) {
          Object.defineProperty(err, 'stack', {
            value: dehydrated.source.stack,
            enumerable: false
          });
        }
        return err;
      }
      case 'Object': return {};
      case 'null': return null;
      case 'undefined': return undefined;
      case 'NaN': return NaN;
      case 'Infinity': return Infinity;
      case '-Infinity': return -Infinity;
      case 'ArrayBuffer': return new Uint8Array(dehydrated.source).buffer;
      case 'Date': return new Date(dehydrated.source);
    }
  }

  // use the dehydrated format to populate an empty object of the correct type
  function hydrateOne (hydrated, dehydrated, refs) {
    // special values need no further hydration
    if (specialTypes.has(hydrated)) return;
    // account for any objects that are duplicate references
    function possibleRef (v) {
      return Array.isArray(v) ? refs[v[0]] : v;
    }
    switch (dehydrated.type) {
      case 'Set': {
        // a set incorporates its source array as elements
        dehydrated.source.forEach(function (elem) {
          hydrated.add(possibleRef(elem));
        });
        break;
      }
      case 'Map': {
        // a map incorporates its source array as key-value entries
        dehydrated.source.forEach(function (mapEntry) {
          const k = mapEntry[0]; // TODO: could replace with destructuring
          const v = mapEntry[1]; // TODO: could replace with destructuring
          hydrated.set(possibleRef(k), possibleRef(v));
        });
        break;
      }
      case 'Array': {
        // an array incorporates its source array as elements
        dehydrated.source.forEach(function (elem) {
          hydrated.push(possibleRef(elem));
        });
        break;
      }
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
    // stores bufferables to get to after the first pass
    const todoBufferables = new Map();
    // hold references to the being-hydrated objects
    const refs = serialized.map(function (dehydrated, index) {
      if (bufferableTypes.has(dehydrated.type)) {
        // will need the dehydrated version and index in refs array for later use
        todoBufferables.set(dehydrated, index);
      } else {
        const emptyHydrated = typedFromDehydrated(dehydrated);
        mapping.set(dehydrated, emptyHydrated);
        return emptyHydrated;
      }
    });
    // bufferables cannot be constructed as empty and filled in later, they need their underlying buffer at construction time, which we only have access to after the first pass
    todoBufferables.forEach(function (index, dehydrated) {
      const constructor = bufferableTypes.get(dehydrated.type);
      const buffer = refs[dehydrated.source.buffer[0]];
      const byteOffset = dehydrated.source.byteOffset;
      const length = dehydrated.source.length;
      const bufferable = new constructor(buffer, byteOffset, length);
      // attach properly typed reference at that index
      refs[index] = bufferable;
      // include properly typed reference to be further enriched in the final hydration step
      mapping.set(dehydrated, bufferable);
    });
    // final pass, imbue each empty (but properly typed) object with all its glorious details
    mapping.forEach(function (emptyHydrated, dehydrated) {
      hydrateOne(emptyHydrated, dehydrated, refs);
    });
    // the first ref is now a clone of the base object that was originally serialized
    return refs[0];
  };

})();
