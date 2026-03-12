import mammoth from "mammoth";
import { readFile } from "fs/promises";
import path from "path";

export async function extractText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  const buffer = await readFile(filePath);

  switch (ext) {
    case ".pdf": {
      const pdfParse = (await import("pdf-parse")).default;
      const data = await pdfParse(buffer);
      return data.text;
    }
    case ".docx": {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    case ".txt": {
      return buffer.toString("utf-8");
    }
    default:
      throw new Error(`Tipo de archivo no soportado para extraccion: ${ext}`);
  }
}
