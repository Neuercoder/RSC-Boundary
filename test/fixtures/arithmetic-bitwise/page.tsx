import Client from "./Client";

const derived = (process.env.INTERNAL_VALUE * 2) - 1;
console.log(1 ^ process.env.INTERNAL_VALUE);
console.log(8 >>> 1);

export default function Page() {
  return <Client
    subtractLeft={process.env.INTERNAL_VALUE - 2}
    subtractRight={2 - process.env.INTERNAL_VALUE}
    subtractClean={8 - 2}
    multiplyLeft={process.env.INTERNAL_VALUE * 2}
    multiplyRight={2 * process.env.INTERNAL_VALUE}
    multiplyClean={8 * 2}
    divideLeft={process.env.INTERNAL_VALUE / 2}
    divideRight={2 / process.env.INTERNAL_VALUE}
    divideClean={8 / 2}
    remainderLeft={process.env.INTERNAL_VALUE % 2}
    remainderRight={2 % process.env.INTERNAL_VALUE}
    remainderClean={8 % 2}
    powerLeft={process.env.INTERNAL_VALUE ** 2}
    powerRight={2 ** process.env.INTERNAL_VALUE}
    powerClean={8 ** 2}
    leftShiftLeft={process.env.INTERNAL_VALUE << 2}
    leftShiftRight={2 << process.env.INTERNAL_VALUE}
    leftShiftClean={8 << 2}
    rightShiftLeft={process.env.INTERNAL_VALUE >> 2}
    rightShiftRight={2 >> process.env.INTERNAL_VALUE}
    rightShiftClean={8 >> 2}
    unsignedShiftLeft={process.env.INTERNAL_VALUE >>> 2}
    unsignedShiftRight={2 >>> process.env.INTERNAL_VALUE}
    unsignedShiftClean={8 >>> 2}
    andLeft={process.env.INTERNAL_VALUE & 2}
    andRight={2 & process.env.INTERNAL_VALUE}
    andClean={8 & 2}
    orLeft={process.env.INTERNAL_VALUE | 2}
    orRight={2 | process.env.INTERNAL_VALUE}
    orClean={8 | 2}
    xorLeft={process.env.INTERNAL_VALUE ^ 2}
    xorRight={2 ^ process.env.INTERNAL_VALUE}
    xorClean={8 ^ 2}
    derived={derived}
    nested={{ value: 2 * (process.env.INTERNAL_VALUE & 255) }}
    template={`value=${process.env.INTERNAL_VALUE / 2}`}
    cleanNested={{ value: (8 & 3) * 2 }}
    discarded={(process.env.INTERNAL_VALUE * 2, "public")}
  />;
}
