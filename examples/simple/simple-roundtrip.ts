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
