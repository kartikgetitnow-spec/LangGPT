from io import BytesIO
from pypdf import PdfReader
from typing import List, Dict, Any

class DocumentLoader:
    @staticmethod
    def extract_text(file_bytes: bytes, filename: str) -> str:
        """
        Extracts plain text from various file formats.
        """
        ext = filename.lower().split(".")[-1]

        if ext == "pdf":
            try:
                reader = PdfReader(BytesIO(file_bytes))
                text_pages = []
                for i, page in enumerate(reader.pages):
                    page_text = page.extract_text()
                    if page_text:
                        text_pages.append(f"[Page {i + 1}]\n{page_text}")
                return "\n\n".join(text_pages)
            except Exception as e:
                raise ValueError(f"Failed to parse PDF {filename}: {str(e)}")

        elif ext in ["txt", "md", "csv", "json", "py", "js", "ts", "html", "css", "yaml", "yml"]:
            try:
                return file_bytes.decode("utf-8", errors="replace")
            except Exception as e:
                raise ValueError(f"Failed to parse text file {filename}: {str(e)}")

        else:
            # Fallback to UTF-8 decoding with replacement
            return file_bytes.decode("utf-8", errors="ignore")
