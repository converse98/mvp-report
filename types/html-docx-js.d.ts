declare module "html-docx-js/dist/html-docx" {
  export function asBlob(
    html: string,
    options?: { orientation?: "landscape" | "portrait" }
  ): Blob;

  export function asArrayBuffer(
    html: string,
    options?: { orientation?: "landscape" | "portrait" }
  ): ArrayBuffer;
}
