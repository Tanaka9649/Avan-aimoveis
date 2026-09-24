declare module "heic-decode" {
  type DecodedImage = { width: number; height: number; data: Uint8ClampedArray };
  function decode(input: { buffer: Uint8Array }): Promise<DecodedImage>;
  export default decode;
}
