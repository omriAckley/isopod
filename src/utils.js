'use strict';

function each (obj, fn) {
  Object.keys(obj).forEach(function (k) {
    fn(k, obj[k]);
  });
};

function flags (r) {
  if (r.flags) return r.flags;
  return (r.ignoreCase ? 'i' : '') + (r.multiline ? 'm' : '') + (r.global ? 'g' : '') + (r.sticky ? 'y' : '');
};

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
allowedTypes.add('HostGlobal');

function baseTypeOf (thing) {
  return Object.prototype.toString.call(thing).slice(8,-1);
}

function isopodTypeOf (thing) {
  const type = specialTypes.has(thing) ? `${thing}` : hostGlobals.has(thing) ? 'HostGlobal' : baseTypeOf(thing);
  return allowedTypes.has(type) ? type : `Unsupported:${type}`; // TODO: consider throwing error for unsupported types
}

const parensPattern = /\(.+\)/;
function getSymbolString (sym) {
  return sym.toString().match(parensPattern)[0].slice(1,-1);
}

function hasNonNativeConstructor (obj) {
  return Object.prototype.hasOwnProperty.call(obj, 'constructor') && !nativeConstructors.has(obj.constructor);
}

function isSimple (thing) {
  return !specialTypes.has(thing) && !isRef(thing); 
}

function isRef (thing) {
  return typeof thing === 'symbol' || typeof thing === 'function' || typeof thing === 'object' && thing !== null;
}

function isPlainOrTypedArray (thing) {
  const type = baseTypeOf(thing);
  return type === 'Array' || typedArrayTypes.has(type);
}

const globalObject = (typeof global === 'object') ? global : window;

const hostGlobals = (function () {
  const globallyAccessible = new Map();
  const queue = [{
    value: globalObject,
    path: []
  }];
  while (queue.length) {
    const item = queue.shift();
    const obj = item.value;
    const path = item.path;
    if (globallyAccessible.has(obj)) continue;
    globallyAccessible.set(obj, path);
    for (let propertyName of Object.getOwnPropertyNames(obj).concat(['__proto__'])) {
      let child;
      try {child = obj[propertyName];}
      catch (e) {continue;}
      if (!isRef(child)) continue;
      queue.push({
        value: child,
        path: path.concat([propertyName])
      });
    }
  }
  return globallyAccessible;
})();

function hostObjFromPath (path) {
  try {
    return path.reduce(function (obj, key) {
      return obj[key];
    }, globalObject);
  } catch (e) {}
}

module.exports = {
  each,
  flags,
  bufferableTypes,
  specialTypes,
  nativePrototypes,
  isopodTypeOf,
  getSymbolString,
  hasNonNativeConstructor,
  isSimple,
  isPlainOrTypedArray,
  hostGlobals,
  hostObjFromPath
};