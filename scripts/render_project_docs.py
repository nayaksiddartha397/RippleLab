#!/usr/bin/env python3
"""Render RippleLab Markdown planning documents as polished PDFs."""

from __future__ import annotations

import html
import re
import sys
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "output" / "pdf"

INK = colors.HexColor("#172033")
MUTED = colors.HexColor("#5F6B7A")
TEAL = colors.HexColor("#087E8B")
TEAL_LIGHT = colors.HexColor("#E8F5F5")
BLUE = colors.HexColor("#2557A7")
GOLD = colors.HexColor("#E0A126")
PAPER = colors.HexColor("#FAFBFC")
LINE = colors.HexColor("#D9E0E8")


def inline_markup(text: str) -> str:
    """Convert the small Markdown subset used by the project documents."""
    escaped = html.escape(text.strip())
    escaped = re.sub(r"`([^`]+)`", r'<font name="Courier">\1</font>', escaped)
    escaped = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", escaped)
    escaped = re.sub(r"\[([^]]+)\]\(([^)]+)\)", r'<link href="\2" color="#2557A7">\1</link>', escaped)
    return escaped


def build_styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "Title",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=25,
            leading=29,
            textColor=INK,
            alignment=TA_LEFT,
            spaceAfter=8 * mm,
        ),
        "h1": ParagraphStyle(
            "H1",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=17,
            leading=21,
            textColor=INK,
            spaceBefore=6 * mm,
            spaceAfter=3 * mm,
            keepWithNext=True,
        ),
        "h2": ParagraphStyle(
            "H2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=13.5,
            leading=17,
            textColor=TEAL,
            spaceBefore=5 * mm,
            spaceAfter=2.5 * mm,
            keepWithNext=True,
        ),
        "h3": ParagraphStyle(
            "H3",
            parent=base["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=11.5,
            leading=14,
            textColor=BLUE,
            spaceBefore=4 * mm,
            spaceAfter=1.5 * mm,
            keepWithNext=True,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.3,
            leading=13.2,
            textColor=INK,
            spaceAfter=2.6 * mm,
        ),
        "meta": ParagraphStyle(
            "Meta",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.2,
            leading=13,
            textColor=MUTED,
            spaceAfter=1.5 * mm,
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.1,
            leading=12.7,
            textColor=INK,
            leftIndent=2 * mm,
        ),
        "code": ParagraphStyle(
            "Code",
            parent=base["Code"],
            fontName="Courier",
            fontSize=7.8,
            leading=10.3,
            textColor=INK,
            backColor=colors.HexColor("#F0F3F6"),
            borderColor=LINE,
            borderWidth=0.5,
            borderPadding=7,
            spaceBefore=2 * mm,
            spaceAfter=3 * mm,
        ),
        "table_header": ParagraphStyle(
            "TableHeader",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=7.8,
            leading=10,
            textColor=colors.white,
            alignment=TA_LEFT,
        ),
        "table_cell": ParagraphStyle(
            "TableCell",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=7.5,
            leading=9.8,
            textColor=INK,
        ),
    }


def header_footer(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(TEAL)
    canvas.rect(0, height - 7 * mm, width, 7 * mm, stroke=0, fill=1)
    canvas.setStrokeColor(LINE)
    canvas.line(18 * mm, 13 * mm, width - 18 * mm, 13 * mm)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 8.5 * mm, "RippleLab | Build documentation")
    canvas.drawRightString(width - 18 * mm, 8.5 * mm, f"Page {doc.page}")
    canvas.restoreState()


def parse_table(lines: list[str], styles) -> Table:
    rows = []
    for index, line in enumerate(lines):
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if index == 1 and all(re.fullmatch(r":?-{3,}:?", cell) for cell in cells):
            continue
        style = styles["table_header"] if not rows else styles["table_cell"]
        rows.append([Paragraph(inline_markup(cell), style) for cell in cells])
    col_count = max(len(row) for row in rows)
    available = A4[0] - 36 * mm
    widths = [available / col_count] * col_count
    table = Table(rows, colWidths=widths, repeatRows=1, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), TEAL),
                ("GRID", (0, 0), (-1, -1), 0.35, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PAPER]),
            ]
        )
    )
    return table


def markdown_flowables(source: Path, styles):
    lines = source.read_text(encoding="utf-8").splitlines()
    story = []
    bullets: list[str] = []
    code_lines: list[str] = []
    in_code = False
    first_heading = True
    index = 0

    def flush_bullets():
        nonlocal bullets
        if bullets:
            items = [ListItem(Paragraph(inline_markup(x), styles["bullet"]), leftIndent=4 * mm) for x in bullets]
            story.append(ListFlowable(items, bulletType="bullet", start="circle", leftIndent=6 * mm, bulletFontSize=6))
            story.append(Spacer(1, 2 * mm))
            bullets = []

    while index < len(lines):
        raw = lines[index]
        stripped = raw.strip()

        if stripped.startswith("```"):
            if in_code:
                story.append(Paragraph("<br/>".join(html.escape(x).replace(" ", "&nbsp;") for x in code_lines), styles["code"]))
                code_lines = []
                in_code = False
            else:
                flush_bullets()
                in_code = True
            index += 1
            continue
        if in_code:
            code_lines.append(raw)
            index += 1
            continue
        if stripped.startswith("|") and index + 1 < len(lines) and lines[index + 1].strip().startswith("|"):
            flush_bullets()
            table_lines = []
            while index < len(lines) and lines[index].strip().startswith("|"):
                table_lines.append(lines[index])
                index += 1
            story.append(parse_table(table_lines, styles))
            story.append(Spacer(1, 3 * mm))
            continue
        if stripped.startswith("- "):
            bullets.append(stripped[2:])
            index += 1
            continue

        flush_bullets()
        if not stripped:
            index += 1
            continue
        if stripped.startswith("# "):
            if not first_heading:
                story.append(PageBreak())
            story.append(Paragraph(inline_markup(stripped[2:]), styles["title"]))
            story.append(HRFlowable(width="100%", thickness=2, color=GOLD, spaceAfter=5 * mm))
            first_heading = False
        elif stripped.startswith("## "):
            story.append(Paragraph(inline_markup(stripped[3:]), styles["h1"]))
        elif stripped.startswith("### "):
            story.append(Paragraph(inline_markup(stripped[4:]), styles["h2"]))
        elif stripped.startswith("#### "):
            story.append(Paragraph(inline_markup(stripped[5:]), styles["h3"]))
        elif re.match(r"^\d+\. ", stripped):
            story.append(Paragraph(inline_markup(stripped), styles["body"]))
        elif stripped.startswith("**") and ":**" in stripped:
            story.append(Paragraph(inline_markup(stripped), styles["meta"]))
        else:
            story.append(Paragraph(inline_markup(stripped), styles["body"]))
        index += 1

    flush_bullets()
    return story


def render(source: Path, destination: Path):
    styles = build_styles()
    doc = SimpleDocTemplate(
        str(destination),
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=17 * mm,
        bottomMargin=18 * mm,
        title=source.stem.replace("_", " ").title(),
        author="RippleLab Project",
        subject="RippleLab project delivery documentation",
    )
    story = markdown_flowables(source, styles)
    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)


def main() -> int:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    documents = {
        ROOT / "docs" / "RIPPLELAB_30_DAY_PLAN.md": OUTPUT_DIR / "RippleLab_30_Day_MVP_Plan.pdf",
        ROOT / "docs" / "DAILY_PROGRESS_REPORT_TEMPLATE.md": OUTPUT_DIR / "RippleLab_Daily_Progress_Report_Template.pdf",
    }
    reports_dir = ROOT / "docs" / "reports"
    if reports_dir.exists():
        for source in sorted(reports_dir.glob("RippleLab_Day_*_Progress_Report.md")):
            documents[source] = OUTPUT_DIR / f"{source.stem}.pdf"
    for source, destination in documents.items():
        if not source.exists():
            raise FileNotFoundError(source)
        render(source, destination)
        print(destination)
    return 0


if __name__ == "__main__":
    sys.exit(main())
