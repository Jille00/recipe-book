/**
 * The browser build of libheif-js ships without types for its ES module entry.
 * This declares only the small surface lib/image/decode-heic.ts uses.
 */
declare module "libheif-js/libheif-wasm/libheif-bundle.mjs" {
  interface HeifImage {
    get_width(): number;
    get_height(): number;
    /** Decodes into `target`, applying the image's rotation and mirroring. */
    display(target: ImageData, callback: (result: ImageData | null) => void): void;
    free?(): void;
  }

  interface LibHeif {
    HeifDecoder: new () => { decode(data: Uint8Array): HeifImage[] };
  }

  /** Creates the decoder. The WebAssembly is embedded, so this is synchronous. */
  const createLibHeif: (options?: Record<string, unknown>) => LibHeif;
  export default createLibHeif;
}
