import { PDFParse } from "pdf-parse";

export class DocumentLoader {
  /**
   * Extracts plain text from various document formats (PDF, Markdown, Text, Code, CSV, JSON).
   */
  static async extractText(buffer: Buffer, filename: string): Promise<string> {
    if (!buffer || buffer.length === 0) {
      throw new Error("File content buffer is empty.");
    }

    const ext = filename.toLowerCase().split(".").pop() || "";

    if (ext === "pdf") {
      let parser: InstanceType<typeof PDFParse> | null = null;
      try {
        parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        if (result && result.text && result.text.trim()) {
          return result.text.trim();
        }
        if (result && Array.isArray(result.pages) && result.pages.length > 0) {
          const pageTexts = result.pages
            .map((p: { text: string; num: number }) => `[Page ${p.num}]\n${p.text}`)
            .join("\n\n");
          if (pageTexts.trim()) return pageTexts.trim();
        }
        throw new Error("No readable text found in PDF document.");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`Failed to parse PDF file '${filename}': ${msg}`);
      } finally {
        if (parser && typeof parser.destroy === "function") {
          try {
            await parser.destroy();
          } catch {
            // ignore cleanup error
          }
        }
      }
    }

    // Textual file formats
    const textExtensions = new Set([
      "txt", "md", "csv", "json", "py", "js", "ts", "tsx", "jsx",
      "html", "css", "yaml", "yml", "sql", "sh", "env", "xml", "log"
    ]);

    if (textExtensions.has(ext)) {
      try {
        return buffer.toString("utf-8");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`Failed to decode text file '${filename}': ${msg}`);
      }
    }

    // Default fallback: Try UTF-8 decoding
    return buffer.toString("utf-8");
  }
}
