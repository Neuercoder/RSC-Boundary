import Card from "./card";

export default function Page() {
  const value = process.env.API_SECRET as unknown as number;
  const derived = (value * 2) - 1;
  return <Card
    subtractLeft={value - 2}
    subtractRight={2 - value}
    subtractClean={4 - 2}
    multiplyLeft={value * 2}
    multiplyRight={2 * value}
    multiplyClean={4 * 2}
    divideLeft={value / 2}
    divideRight={2 / value}
    divideClean={4 / 2}
    remainderLeft={value % 2}
    remainderRight={2 % value}
    remainderClean={4 % 2}
    powerLeft={value ** 2}
    powerRight={2 ** value}
    powerClean={4 ** 2}
    leftShiftLeft={value << 2}
    leftShiftRight={2 << value}
    leftShiftClean={4 << 2}
    rightShiftLeft={value >> 2}
    rightShiftRight={2 >> value}
    rightShiftClean={4 >> 2}
    unsignedShiftLeft={value >>> 2}
    unsignedShiftRight={2 >>> value}
    unsignedShiftClean={4 >>> 2}
    bitAndLeft={value & 2}
    bitAndRight={2 & value}
    bitAndClean={4 & 2}
    bitOrLeft={value | 2}
    bitOrRight={2 | value}
    bitOrClean={4 | 2}
    bitXorLeft={value ^ 2}
    bitXorRight={2 ^ value}
    bitXorClean={4 ^ 2}
    nested={derived}
  />;
}
