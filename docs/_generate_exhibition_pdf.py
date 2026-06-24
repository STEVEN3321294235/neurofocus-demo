from pathlib import Path
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.pagesizes import A4
from reportlab.lib.enums import TA_LEFT
from reportlab.lib import colors

src = Path('/Users/cck108/Projects-EEG/EEG 2026 2/docs/EXHIBITION_READINESS_REPORT_2026-06-24.md')
out = src.with_suffix('.pdf')
text = src.read_text(encoding='utf-8')

pdfmetrics.registerFont(UnicodeCIDFont('STSong-Light'))
styles = getSampleStyleSheet()
base = ParagraphStyle('BaseCJK', parent=styles['BodyText'], fontName='STSong-Light', fontSize=10.5, leading=15, textColor=colors.black, alignment=TA_LEFT)
heading = ParagraphStyle('HeadingCJK', parent=styles['Heading1'from pathlib import Path