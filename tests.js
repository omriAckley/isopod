'use strict';

const isopod = require('.');
const chai = require('chai');
const expect = chai.expect;
const areDeeplyEquivalentOnly = require('./tests-utility');
chai.Assertion.addMethod('deeplyEquivalent', function (expected) {
  const equivalent = areDeeplyEquivalentOnly(this._obj, expected);
  const bool = !chai.util.flag(this, 'negate');
  new chai.Assertion(equivalent).to.equal(bool);
});

describe('cloning across transport', function () {

  function simulateTransport (thing) {
    return JSON.parse(JSON.stringify(thing));
  }

  function simulateTransportCloning (thing) {
    const serialized = isopod.serialize(thing);
    const transported = simulateTransport(serialized);
    return isopod.deserialize(transported);
  }

  describe('for primitives', function () {

    it('includes numbers', function () {
      const original = 5;
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.equal(original);
    });

    it('includes booleans', function () {
      const original = true;
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.equal(original);
    });

    it('includes strings', function () {
      const original = 'some words and stuff';
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.equal(original);
    });

    it('includes null', function () {
      const original = null;
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.equal(original);
    });

    it('includes undefined', function () {
      const original = undefined;
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.equal(original);
    });

    it('includes NaN', function () {
      const original = NaN;
      const remoteClone = simulateTransportCloning(original);
      expect(Number.isNaN(remoteClone)).to.equal(true);
    });

    it('includes infinity', function () {
      const original = Infinity;
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.equal(original);
    });

    it('includes negative infinity', function () {
      const original = -Infinity;
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.equal(original);
    });

  });

  describe('for standard objects', function () {

    it('includes plain objects', function () {
      const original = {a: 'do', b: 're', c: 'me', d: 1, e: 2, f: 3};
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.be.deeplyEquivalent(original);
    });

    it('includes arrays', function () {
      const original = ['do', 're', 'me', 1, 2, 3];
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.be.deeplyEquivalent(original);
    });

    it('includes functions', function () {
      const original = function (x, y) {
        return x + y;
      };
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.be.deeplyEquivalent(original);
    });

    it('includes regular expressions', function () {
      const original = /[abcdef]/igm;
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.be.deeplyEquivalent(original);
    });

    it('includes errors', function () {
      const original = new Error('SOS');
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.be.deeplyEquivalent(original);
    });

    it('includes dates', function () {
      const original = new Date();
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.be.deeplyEquivalent(original);
    });

    it('includes symbols', function () {
      const original = Symbol('fluff');
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.be.deeplyEquivalent(original);
    });

    it('includes sets', function () {
      const original = new Set(['do', 're', 'me', 1, 2, 3]);
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.be.deeplyEquivalent(original);
    });

    it('includes maps', function () {
      const original = new Map([[{a: 'do'}, 1], ['re', {b: 2}], [3, 'me']]);
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.be.deeplyEquivalent(original);
    });

    it('includes array buffers', function () {
      const original = new ArrayBuffer(5);
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.be.deeplyEquivalent(original);
    });

    it('includes typed arrays', function () {
      [Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array]
      .forEach(function (typedArrayConstructor) {
        const original = new typedArrayConstructor(1);
        original[0] = 123;
        const remoteClone = simulateTransportCloning(original);
        expect(remoteClone).to.be.deeplyEquivalent(original);
      });
    });

    it('includes data views', function () {
      const original = new DataView(new ArrayBuffer(1));
      original.setInt8(0,456);
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.be.deeplyEquivalent(original);
    });

    it('includes host globals', function () {
      const original = setTimeout;
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.be.deeplyEquivalent(original);
    });

    it('includes arbitrary combinations of the above', function () {
      const original = {
        a: [{b: 'do', 1: new Date()}, 're', new Map([['beep', [10,20,30]], [[Symbol('foo'), 'baz'], 'boop']])],
        b: function (x) {return x + 100},
        c: /^http:\/\/.*/g,
        d: Symbol('words'),
        e: 'me',
        f: new Set([Symbol('things'), ['fa', new Set([{x: 'y'}]), 1], 'so', 2, new Error('BAM!')], new DataView(new ArrayBuffer(10))),
        g: new Map([[{la: 3}, {te: /[aeio]+/i}], [new Set(['and', 'but', 'of']), 4]]),
        h: [null, Infinity, undefined, NaN, -Infinity],
        i: new ArrayBuffer(3),
        j: [Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array]
          .map(function (typedArrayConstructor) {
            const instance = new typedArrayConstructor(1);
            instance[0] = 123456;
            return instance;
          }),
        k: setTimeout
      };
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.be.deeplyEquivalent(original);
    });

  });

  describe('for objects with repeated references', function () {

    it('includes circular objects', function () {
      const original = {};
      original.circle = original;
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.be.deeplyEquivalent(original);
    });

    it('includes objects containing multiple identical symbols', function () {
      const sym = Symbol('foo');
      const original = {
        a: sym,
        b: [sym, sym]
      };
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.be.deeplyEquivalent(original);
    });

    it('includes objects containing multiple identical references', function () {
      const inner = {};
      const original = {
        a: inner,
        b: [inner, inner]
      };
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.be.deeplyEquivalent(original);
    });

    it('includes typed arrays that share the same array buffer', function () {
      const buffer = new ArrayBuffer(8);
      const original = {
        u8: new Uint8Array(buffer),
        u16: new Uint16Array(buffer),
        u32: new Uint32Array(buffer),
        f64: new Float64Array(buffer)
      };
      original.f64[0] = 123456789;
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.be.deeplyEquivalent(original);
    });

  });

  describe('for non-plain objects with assigned keys', function () {

    var keys;
    beforeEach(function () {
      keys = {
        a: null,
        b: undefined,
        c: false,
        d: 123,
        e: NaN,
        f: Infinity,
        g: -Infinity,
        h: 'abcd',
        i: Symbol('foo'),
        j: /\d+/igm,
        k: new Error(),
        l: {},
        m: [],
        n: function () {},
        o: new Date(),
        p: new Set(),
        q: new Map(),
        r: new ArrayBuffer(),
        s: new Uint8Array(),
        t: new DataView(new ArrayBuffer()),
        u: setTimeout
      };
    })

    it('includes arrays', function () {
      const original = [];
      Object.assign(original, keys);
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.be.deeplyEquivalent(original);
    });

    it('includes functions', function () {
      const original = function () {};
      Object.assign(original, keys);
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.be.deeplyEquivalent(original);
    });

    it('includes regular expressions', function () {
      const original = new RegExp();
      Object.assign(original, keys);
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.be.deeplyEquivalent(original);
    });

    it('includes errors', function () {
      const original = new Error();
      Object.assign(original, keys);
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.be.deeplyEquivalent(original);
    });

    it('includes dates', function () {
      const original = new Date();
      Object.assign(original, keys);
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.be.deeplyEquivalent(original);
    });

    it('includes sets', function () {
      const original = new Set();
      Object.assign(original, keys);
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.be.deeplyEquivalent(original);
    });

    it('includes maps', function () {
      const original = new Map();
      Object.assign(original, keys);
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.be.deeplyEquivalent(original);
    });

    it('includes array buffers', function () {
      const original = new ArrayBuffer();
      Object.assign(original, keys);
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.be.deeplyEquivalent(original);
    });

    it('includes typed arrays', function () {
      [Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array]
      .forEach(function (typedArrayConstructor) {
        const original = new typedArrayConstructor(1);
        original[0] = 987654321;
        Object.assign(original, keys);
        const remoteClone = simulateTransportCloning(original);
        expect(remoteClone).to.be.deeplyEquivalent(original);
      });
    });

    it('includes data views', function () {
      const original = new DataView(new ArrayBuffer(1));
      original.setInt8(0,789);
      Object.assign(original, keys);
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.be.deeplyEquivalent(original);
    });

  });

  describe('for objects with non-standard prototypes', function () {

    var otherProto;
    beforeEach(function () {
      otherProto = {
        a: 'string',
        b: 1337,
        c: true,
        d: Symbol('symbol'),
        e: {key: 'value'},
        f: ['element'],
        g: function (foo) {return foo * 2},
        h: /regex/ig,
        i: new Set(),
        j: new Map(),
        k: undefined,
        l: NaN,
        m: null,
        n: Infinity,
        o: -Infinity,
        p: new Error('boo'),
        q: new Date(),
        r: new ArrayBuffer(1),
        s: new Uint8Array([9,8,7]),
        t: new DataView(new ArrayBuffer(2)),
        u: setTimeout
      };
    });

    it('includes plain objects', function () {
      const original = Object.create(otherProto);
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.be.deeplyEquivalent(original);
    });

    it('includes arrays', function () {
      const original = [];
      Object.setPrototypeOf(original, otherProto);
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.be.deeplyEquivalent(original);
    });

    it('includes functions', function () {
      const original = function () {};
      Object.setPrototypeOf(original, otherProto);
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.be.deeplyEquivalent(original);
    });

    it('includes regular expressions', function () {
      const original = new RegExp();
      Object.setPrototypeOf(original, otherProto);
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.be.deeplyEquivalent(original);
    });

    it('includes errors', function () {
      const original = new Error();
      Object.setPrototypeOf(original, otherProto);
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.be.deeplyEquivalent(original);
    });

    it('includes dates', function () {
      const original = new Date();
      Object.setPrototypeOf(original, otherProto);
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.be.deeplyEquivalent(original);
    });

    it('includes sets', function () {
      const original = new Set();
      Object.setPrototypeOf(original, otherProto);
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.be.deeplyEquivalent(original);
    });

    it('includes maps', function () {
      const original = new Map();
      Object.setPrototypeOf(original, otherProto);
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.be.deeplyEquivalent(original);
    });

    it('includes array buffers', function () {
      const original = new ArrayBuffer();
      Object.setPrototypeOf(original, otherProto);
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.be.deeplyEquivalent(original);
    });

    it('includes typed arrays', function () {
      [Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array]
      .forEach(function (typedArrayConstructor) {
        const original = new typedArrayConstructor(1);
        Object.setPrototypeOf(original, otherProto);
        const remoteClone = simulateTransportCloning(original);
        expect(remoteClone).to.be.deeplyEquivalent(original);
      });
    });

    it('includes data views', function () {
      const original = new DataView(new ArrayBuffer(1));
      original.setInt8(0,321);
      Object.setPrototypeOf(original, otherProto);
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.be.deeplyEquivalent(original);
    });

    it('incorporates non-standard constructors', function () {
      function Thing (name) {
        this.name = name;
      }
      const original = new Thing('fizzle');
      const remoteClone = simulateTransportCloning(original);
      expect(remoteClone).to.be.deeplyEquivalent(original);
      expect(remoteClone.constructor).to.be.deeplyEquivalent(Thing);
    });

  });

});