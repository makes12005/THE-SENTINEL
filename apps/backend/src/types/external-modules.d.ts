declare module 'pdf-parse' {
  function pdfParse(buffer: Buffer): Promise<{ text: string }>;
  export default pdfParse;
}

declare module 'tesseract.js' {
  export function recognize(
    image: Buffer | string,
    lang?: string
  ): Promise<{ data: { text: string } }>;
}
