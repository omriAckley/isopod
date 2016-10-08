[![Coverage Status](https://coveralls.io/repos/github/omriBernstein/isopod/badge.svg?branch=master)](https://coveralls.io/github/omriBernstein/isopod?branch=master)

# About

Have you ever wanted to clone an object (including all its methods and prototyped goodness) from one Javascript runtime to another?

This library will, you know, do that.

# Getting started

When using it in node.js, you could:

```bash
npm install isopod
```

...and from your node source code do:

```js
const isopod = require('isopod');
```

When using from the browser, download it, then in your html include a `<script>` pointing to the correct file. The script will make `isopod` a global variable.

For example you might run:

```bash
npm install isopod
``` 

...and then you might put this in your html (assuming the `node_modules` directory is statically served to the client):

```html
<script src="/isopod/dist/isopod.min.js"></script>
```

...and now `isopod` would be a global variable available to any subsequent client scripts.

The module includes a TypeScript declaration file. You don't need to install it separately. Simply

```TypeScript
import * as isopod from "isopod";

class Greeter {
  constructor(
    private myName: string
  ) {}

  greet(name: string): void {
    console.log(`${this.myName} says: Hello ${name}`);
  }
}

let greeter = new Greeter('Spock');
greeter.greet('Scotty');

// serialize
let greeterSer: any = isopod.serialize(greeter);
let greeterJson: string = JSON.stringify(greeterSer);

// deserialize
let greeter1Ser: any = JSON.parse(greeterJson);
let greeter1: Greeter = isopod.deserialize<Greeter>(greeter1Ser);

greeter1.greet('Jean-Luc');
``` 

Compile with:
```bash
tsc simple-roundtrip.ts
```

And run:
```bash
node simple-roundtrip.js
```

Output:
```bash
Spock says: Hello Scotty
Spock says: Hello Jean-Luc
```

# What does it include?

`isopod` has but two methods: `serialize` and `deserialize`.

# Why would I use it?

Normally when you send some Javascript data from one program (e.g. your server) to another (e.g. your client) it loses "richness". Functions, regular expressions, circular objects, objects with non-standard prototypes—all of these things *would not* normally transfer over.

One way to think about why this happens is that any data that gets sent somewhere else by your Javascript program will (basically) need to get converted into a string, and is generally converted back into data (parsed) on the receiving end. Commonly the sender will `JSON.stringify` the data and the receiver will `JSON.parse` the incoming string.

This means that Javascript objects get converted into JSON strings, which are only natively equipped to represent plain objects, plain arrays, strings, numbers, booleans, and null.

`isopod.serialize` converts anything more complex than that into a plain object so that it can be stringified. Importantly this plain, "dehydrated", object still contains all the information necessary to reconstruct the details of the original. As such, when parsed on the other end, we should get a clone of the dehydrated object. `isopod.deserialize` can "rehydrate" this into a clone of the original.

Any change that occurs to the cloned object **will not** affect the original and vice-versa. Those objects exist in different runtimes and cannot directly affect each other. If you want automated synchronization, `isopod` is not that, though you could build something like that "on top" of it.

With `isopod` you can remotely clone:

* Plain objects, arrays, strings, numbers, booleans, and null (these are no different than what you can do *without* `isopod`)
* `undefined`, ±`Infinity`, and `NaN`
* Functions (but not [closures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures), nor [bound](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind) functions)
* Regular expressions
* Errors
* Dates
* Symbols
* Sets
* Maps
* Anything with a non-standard prototype
* Anything with circular or duplicate references to the same object or symbol
* Array buffers / typed arrays / data views

Note that cloning will exclude non-enumerable properties (except for the `.constructor` property—this in order to clone prototypes effectively). Here's a not-necessarily complete list of what you might not *yet* be able to clone:

* Promises¹
* Generators
* Proxies

¹ The plan is never to support cloning promises—it involves cloning too much hairy state for a non-obvious use case. If you're looking to resolve any values on an object, you could do so and then pass the result to `isopod.serialize`. Check out [bluebird's `Promise.props`](http://bluebirdjs.com/docs/api/promise.props.html) or even [promise-resolve-deep](https://www.npmjs.com/package/promise-resolve-deep) for help resolving inside an object.

# How would I use it?

Install and include `isopod` into both environments: client and server, one iframe and another iframe, [tessel](https://tessel.io/) and [electron](http://electron.atom.io/) app—whatever two Javascript runtimes you want to clone data between.

Then for any data you'd like to "richly clone", just before sending it across call `isopod.serialize` on it. Just after parsing the data on the other end call `isopod.deserialize` on it.

For example, you might have an [express](http://expressjs.com/) route handler on your node server that looks like:

```js
...
// an example of some data that is sufficiently complex
function Thing (names) {
  this.self = this;
  this.names = new Set(names);
}
Thing.prototype.jump = function () {
  this.state = 'jumping';
};
const thing = new Thing(['robert', 'bob', 'rob']);
...
app.get('/thing', function (req, res, next) {
  const serialized = isopod.serialize(thing);
  res.json(serialized);
});
...
```

And an AJAX request on your client that looks like:

```js
...
fetch('/thing')
.then(function (response) {
  return response.json();
})
.then(function (jsonObj) {
  const deserialized = isopod.deserialize(jsonObj);
  // should now be able to do the following
  deserialized.names.has('bob'); // => true
  deserialized.jump();
  console.log(deserialized.state); // 'jumping'
  console.log(deserialized.self === deserialized); // true
});
...
```

For something more concrete, you can find runnable examples in the examples folder.

# Similar libraries

* [serialize-javascript](https://www.npmjs.com/package/serialize-javascript)
* [serialijse](https://www.npmjs.com/package/serialijse)
* [node-serialize](https://www.npmjs.com/package/node-serialize)
* [lave](https://www.npmjs.com/package/lave)
* [picklejs](https://www.npmjs.com/package/picklejs)
* [serialization](https://www.npmjs.com/package/serialization)
* [unserializable](https://www.npmjs.com/package/unserializable)

# Contributing

Pull requests / issues / comments / hate mail welcome!

If you'd like to run the tests, download this repo, open a terminal, navigate to it, then run:

```bash
npm install
```

...and once that's done:

```bash
npm test
```
