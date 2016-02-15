'use strict';

const isopod = require('.');
const chai = require('chai');
const expect = chai.expect;
const areDeeplyEquivalentOnly = require('./tests-utility');
chai.Assertion.addMethod('deeplyEquivalent', function (expected) {
  const equivalent = areDeeplyEquivalentOnly(this._obj, expected);
  new chai.Assertion(equivalent).to.equal(true);
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

  it('works for numbers', function () {
    const original = 5;
    const remoteClone = simulateTransportCloning(original);
    expect(remoteClone).to.equal(original);
  });

  it('works for booleans', function () {
    const original = true;
    const remoteClone = simulateTransportCloning(original);
    expect(remoteClone).to.equal(original);
  });

  it('works for strings', function () {
    const original = 'some words and stuff';
    const remoteClone = simulateTransportCloning(original);
    expect(remoteClone).to.equal(original);
  });

  it('works for plain objects', function () {
    const original = {a: 'do', b: 're', c: 'me', d: 1, e: 2, f: 3};
    const remoteClone = simulateTransportCloning(original);
    expect(remoteClone).to.be.deeplyEquivalent(original);
  });

  it('works for plain arrays', function () {
    const original = ['do', 're', 'me', 1, 2, 3];
    const remoteClone = simulateTransportCloning(original);
    expect(remoteClone).to.be.deeplyEquivalent(original);
  });

  it('works for plain functions', function () {
    const original = function (x, y) {
      return x + y;
    };
    const remoteClone = simulateTransportCloning(original);
    expect(remoteClone).to.be.deeplyEquivalent(original);
  });

  it('works for plain regular expressions', function () {
    const original = /[abcdef]/igm;
    const remoteClone = simulateTransportCloning(original);
    expect(remoteClone).to.be.deeplyEquivalent(original);
  });

  it('works for plain symbols', function () {
    const original = Symbol('fluff');
    const remoteClone = simulateTransportCloning(original);
    expect(remoteClone).to.be.deeplyEquivalent(original);
  });

  it('works for plain sets', function () {
    const original = new Set(['do', 're', 'me', 1, 2, 3]);
    const remoteClone = simulateTransportCloning(original);
    expect(remoteClone).to.be.deeplyEquivalent(original);
  });

  it('works for plain maps', function () {
    const original = new Map([[{a: 'do'}, 1], ['re', {b: 2}], [3, 'me']]);
    const remoteClone = simulateTransportCloning(original);
    expect(remoteClone).to.be.deeplyEquivalent(original);
  });

  it('works for arbitrary combinations of the above', function () {
    const original = {
      a: [{b: 'do'}, 're', new Map([['beep', [10,20,30]], [[Symbol('foo'), 'baz'], 'boop']])],
      b: function (x) {return x + 100},
      c: /^http:\/\/.*/g,
      d: Symbol('words'),
      e: 'me',
      f: new Set([Symbol('things'), ['fa', new Set([{x: 'y'}]), 1], 'so', 2]),
      g: new Map([[{la: 3}, {te: /[aeio]+/i}], [new Set(['and', 'but', 'of']), 4]])
    };
    const remoteClone = simulateTransportCloning(original);
    expect(remoteClone).to.be.deeplyEquivalent(original);
  });

  it('works for circular objects', function () {
    const original = {};
    original.circle = original;
    const remoteClone = simulateTransportCloning(original);
    expect(remoteClone).to.be.deeplyEquivalent(original);
  });

  it('works for objects containing multiple identical symbols', function () {
    const sym = Symbol('foo');
    const original = {
      a: sym,
      b: sym,
      c: [sym, sym]
    };
    const remoteClone = simulateTransportCloning(original);
    expect(remoteClone).to.be.deeplyEquivalent(original);
  });

  it('works for objects containing multiple identical references');

  it('works for arrays with extra keys');
  it('works for function with extra keys');
  it('works for regular expressions with extra keys');
  it('works for sets with extra keys');
  it('works for maps with extra keys');

  it('works for objects with non-standard prototypes');
  it('works for arrays with non-standard prototypes');
  it('works for functions with non-standard prototypes');
  it('works for regular expressions with non-standard prototypes');
  it('works for sets with non-standard prototypes');
  it('works for maps with non-standard prototypes');

  it('includes non-standard constructors');

});