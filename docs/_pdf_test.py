from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.pdfgen import canvas
pdfmetrics.registerFont(UnicodeCIDFont('STSong-Light'))
out='/Users/cck108/Projects-EEG/EEG 2026 2/docs/_pdf_test.pdf'
c=canvas.Canvas(out)
c.setFont('STSong-Light', 16)
c.drawString(72, 780, 'NeuroFocus PDF Test 會展文件')
c.save()
print(out)
