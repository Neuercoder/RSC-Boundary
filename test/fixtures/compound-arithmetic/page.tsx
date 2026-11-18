import Client from "./Client";

let addStored = 8;
addStored += process.env.INTERNAL_VALUE;
let addLeft = process.env.INTERNAL_VALUE;
let addRight = 8;
let addClean = 8;
let addDiscarded = 8;
let subtractStored = 8;
subtractStored -= process.env.INTERNAL_VALUE;
let subtractLeft = process.env.INTERNAL_VALUE;
let subtractRight = 8;
let subtractClean = 8;
let subtractDiscarded = 8;
let multiplyStored = 8;
multiplyStored *= process.env.INTERNAL_VALUE;
let multiplyLeft = process.env.INTERNAL_VALUE;
let multiplyRight = 8;
let multiplyClean = 8;
let multiplyDiscarded = 8;
let divideStored = 8;
divideStored /= process.env.INTERNAL_VALUE;
let divideLeft = process.env.INTERNAL_VALUE;
let divideRight = 8;
let divideClean = 8;
let divideDiscarded = 8;
let remainderStored = 8;
remainderStored %= process.env.INTERNAL_VALUE;
let remainderLeft = process.env.INTERNAL_VALUE;
let remainderRight = 8;
let remainderClean = 8;
let remainderDiscarded = 8;
let powerStored = 8;
powerStored **= process.env.INTERNAL_VALUE;
let powerLeft = process.env.INTERNAL_VALUE;
let powerRight = 8;
let powerClean = 8;
let powerDiscarded = 8;
let leftShiftStored = 8;
leftShiftStored <<= process.env.INTERNAL_VALUE;
let leftShiftLeft = process.env.INTERNAL_VALUE;
let leftShiftRight = 8;
let leftShiftClean = 8;
let leftShiftDiscarded = 8;
let rightShiftStored = 8;
rightShiftStored >>= process.env.INTERNAL_VALUE;
let rightShiftLeft = process.env.INTERNAL_VALUE;
let rightShiftRight = 8;
let rightShiftClean = 8;
let rightShiftDiscarded = 8;
let unsignedShiftStored = 8;
unsignedShiftStored >>>= process.env.INTERNAL_VALUE;
let unsignedShiftLeft = process.env.INTERNAL_VALUE;
let unsignedShiftRight = 8;
let unsignedShiftClean = 8;
let unsignedShiftDiscarded = 8;
let andStored = 8;
andStored &= process.env.INTERNAL_VALUE;
let andLeft = process.env.INTERNAL_VALUE;
let andRight = 8;
let andClean = 8;
let andDiscarded = 8;
let orStored = 8;
orStored |= process.env.INTERNAL_VALUE;
let orLeft = process.env.INTERNAL_VALUE;
let orRight = 8;
let orClean = 8;
let orDiscarded = 8;
let xorStored = 8;
xorStored ^= process.env.INTERNAL_VALUE;
let xorLeft = process.env.INTERNAL_VALUE;
let xorRight = 8;
let xorClean = 8;
let xorDiscarded = 8;

const holder = { value: 8 };
holder.value *= process.env.INTERNAL_VALUE;
const values = [8];
values[0] ^= process.env.INTERNAL_VALUE;
let derived = 8;
const result = { value: (derived /= process.env.INTERNAL_VALUE) };
let logged = 8;
console.log(logged <<= process.env.INTERNAL_VALUE);
let publicValue = 8;
console.log(publicValue *= 2);

export default function Page() {
  return <Client
    addStored={addStored}
    addLeft={addLeft += 2}
    addRight={addRight += process.env.INTERNAL_VALUE}
    addClean={addClean += 2}
    addDiscarded={(addDiscarded += process.env.INTERNAL_VALUE, "public")}
    subtractStored={subtractStored}
    subtractLeft={subtractLeft -= 2}
    subtractRight={subtractRight -= process.env.INTERNAL_VALUE}
    subtractClean={subtractClean -= 2}
    subtractDiscarded={(subtractDiscarded -= process.env.INTERNAL_VALUE, "public")}
    multiplyStored={multiplyStored}
    multiplyLeft={multiplyLeft *= 2}
    multiplyRight={multiplyRight *= process.env.INTERNAL_VALUE}
    multiplyClean={multiplyClean *= 2}
    multiplyDiscarded={(multiplyDiscarded *= process.env.INTERNAL_VALUE, "public")}
    divideStored={divideStored}
    divideLeft={divideLeft /= 2}
    divideRight={divideRight /= process.env.INTERNAL_VALUE}
    divideClean={divideClean /= 2}
    divideDiscarded={(divideDiscarded /= process.env.INTERNAL_VALUE, "public")}
    remainderStored={remainderStored}
    remainderLeft={remainderLeft %= 2}
    remainderRight={remainderRight %= process.env.INTERNAL_VALUE}
    remainderClean={remainderClean %= 2}
    remainderDiscarded={(remainderDiscarded %= process.env.INTERNAL_VALUE, "public")}
    powerStored={powerStored}
    powerLeft={powerLeft **= 2}
    powerRight={powerRight **= process.env.INTERNAL_VALUE}
    powerClean={powerClean **= 2}
    powerDiscarded={(powerDiscarded **= process.env.INTERNAL_VALUE, "public")}
    leftShiftStored={leftShiftStored}
    leftShiftLeft={leftShiftLeft <<= 2}
    leftShiftRight={leftShiftRight <<= process.env.INTERNAL_VALUE}
    leftShiftClean={leftShiftClean <<= 2}
    leftShiftDiscarded={(leftShiftDiscarded <<= process.env.INTERNAL_VALUE, "public")}
    rightShiftStored={rightShiftStored}
    rightShiftLeft={rightShiftLeft >>= 2}
    rightShiftRight={rightShiftRight >>= process.env.INTERNAL_VALUE}
    rightShiftClean={rightShiftClean >>= 2}
    rightShiftDiscarded={(rightShiftDiscarded >>= process.env.INTERNAL_VALUE, "public")}
    unsignedShiftStored={unsignedShiftStored}
    unsignedShiftLeft={unsignedShiftLeft >>>= 2}
    unsignedShiftRight={unsignedShiftRight >>>= process.env.INTERNAL_VALUE}
    unsignedShiftClean={unsignedShiftClean >>>= 2}
    unsignedShiftDiscarded={(unsignedShiftDiscarded >>>= process.env.INTERNAL_VALUE, "public")}
    andStored={andStored}
    andLeft={andLeft &= 2}
    andRight={andRight &= process.env.INTERNAL_VALUE}
    andClean={andClean &= 2}
    andDiscarded={(andDiscarded &= process.env.INTERNAL_VALUE, "public")}
    orStored={orStored}
    orLeft={orLeft |= 2}
    orRight={orRight |= process.env.INTERNAL_VALUE}
    orClean={orClean |= 2}
    orDiscarded={(orDiscarded |= process.env.INTERNAL_VALUE, "public")}
    xorStored={xorStored}
    xorLeft={xorLeft ^= 2}
    xorRight={xorRight ^= process.env.INTERNAL_VALUE}
    xorClean={xorClean ^= 2}
    xorDiscarded={(xorDiscarded ^= process.env.INTERNAL_VALUE, "public")}
    property={holder.value}
    element={values[0]}
    nested={result}
  />;
}
