import csv
import json
from pathlib import Path
from typing import Dict, Any, List
from backend.app.core.exceptions import FileValidationError


def parse_document(file_path: Path) -> str:
    """Extracts raw text content across all supported document types."""
    if not file_path.exists():
        raise FileValidationError(f"File not found: {file_path}")

    ext = file_path.suffix.lower().lstrip(".")

    try:
        if ext in ("txt", "md", "py", "js", "ts", "json", "yaml", "yml", "css", "sql"):
            return file_path.read_text(encoding="utf-8", errors="replace")

        elif ext == "pdf":
            import pypdf
            reader = pypdf.PdfReader(str(file_path))
            pages_text = []
            for i, page in enumerate(reader.pages):
                text = page.extract_text() or ""
                if text.strip():
                    pages_text.append(f"--- Page {i + 1} ---\n{text.strip()}")
            return "\n\n".join(pages_text)

        elif ext == "docx":
            import docx
            doc = docx.Document(str(file_path))
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            for table in doc.tables:
                for row in table.rows:
                    row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                    if row_text:
                        paragraphs.append(row_text)
            return "\n\n".join(paragraphs)

        elif ext == "csv":
            lines = []
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                reader = csv.reader(f)
                for row in reader:
                    lines.append(", ".join(row))
            return "\n".join(lines)

        elif ext == "xlsx":
            import openpyxl
            wb = openpyxl.load_workbook(str(file_path), data_only=True)
            sheet_texts = []
            for sheet_name in wb.sheetnames:
                sheet = wb[sheet_name]
                rows_text = []
                for row in sheet.iter_rows(values_only=True):
                    row_vals = [str(v) for v in row if v is not None]
                    if row_vals:
                        rows_text.append(" | ".join(row_vals))
                if rows_text:
                    sheet_texts.append(f"--- Sheet: {sheet_name} ---\n" + "\n".join(rows_text))
            return "\n\n".join(sheet_texts)

        elif ext == "pptx":
            import pptx
            prs = pptx.Presentation(str(file_path))
            slides_text = []
            for i, slide in enumerate(prs.slides):
                slide_content = []
                for shape in slide.shapes:
                    if hasattr(shape, "text") and shape.text.strip():
                        slide_content.append(shape.text.strip())
                if slide_content:
                    slides_text.append(f"--- Slide {i + 1} ---\n" + "\n".join(slide_content))
            return "\n\n".join(slides_text)

        elif ext == "html":
            from bs4 import BeautifulSoup
            html_content = file_path.read_text(encoding="utf-8", errors="replace")
            soup = BeautifulSoup(html_content, "html.parser")
            return soup.get_text(separator="\n", strip=True)

        elif ext in ("png", "jpg", "jpeg", "webp", "gif", "bmp", "tiff", "tif", "svg", "ico", "avif", "heic", "heif", "raw"):
            size_kb = round(file_path.stat().st_size / 1024, 1)
            return f"[Visual Image Attachment: {file_path.name} | Format: {ext.upper()} | Size: {size_kb} KB | Path: {file_path}]"

        else:
            # Fallback text read
            return file_path.read_text(encoding="utf-8", errors="replace")

    except Exception as e:
        raise FileValidationError(f"Failed to parse document '{file_path.name}': {str(e)}")

