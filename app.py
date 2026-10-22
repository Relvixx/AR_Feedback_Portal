"""A&R internal feedback report generator, standard-library HTTP backend + ReportLab PDF.
Run: python app.py     Optional admin access: set PORTAL_PASSWORD environment variable.
Synthetic data only: generated values do not represent collected student feedback.
"""
import datetime as dt
import json
import os
import random
import re
import secrets
import sqlite3
import threading
import math
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO
from pathlib import Path
from urllib.parse import urlparse, unquote

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parent
DB = ROOT / 'data' / 'reports.db'
LOGO = ROOT / 'assets' / 'college_logo.png'
LOCK = threading.Lock()
SESSIONS = set()
PORTAL_PASSWORD = os.environ.get('PORTAL_PASSWORD', '').strip()

COLLEGE = "MET's Institute of Technology (P) B. Tech."
AFFILIATION = 'Affiliated to Dr. Babasaheb Ambedkar Technological University, Lonere.'
DEPARTMENT = 'Automation and Robotics'

QUESTIONS = [
    {'title': 'Communication Skills', 'options': ['Excellent', 'Good', 'Average'], 'best': [0, 1, 2]},
    {'title': 'Teaching Methodology', 'options': ['Excellent', 'Good', 'Average'], 'best': [0, 1, 2]},
    {'title': 'Syllabus Completion', 'options': ['Below 60%', '60% - 75%', '75% - 90%', '90% - 100%'], 'best': [3, 2, 1, 0]},
    {'title': 'Student Understanding', 'options': ['Excellent', 'Good', 'Average'], 'best': [0, 1, 2]},
    {'title': 'Class Engagement', 'options': ['Regularly on time', 'Sometime on time', 'Sometime late', 'Always late'], 'best': [0, 1, 2, 3]},
    {'title': 'Subject Knowledge', 'options': ['Excellent', 'Good', 'Average'], 'best': [0, 1, 2]},
    {'title': 'ICT Tools Usage', 'options': ['Always', 'Sometimes', 'Rarely', 'Never'], 'best': [0, 1, 2, 3]},
    {'title': 'Student Interaction', 'options': ['Always', 'Sometimes', 'Rarely', 'Never'], 'best': [0, 1, 2, 3]},
    {'title': 'Question Bank Guidance', 'options': ['Very effectively', 'Effectively', 'Somewhat effectively', 'Ineffectively'], 'best': [0, 1, 2, 3]},
    {'title': 'Question Bank Coverage', 'options': ['Yes, fully comprehensive', 'Mostly comprehensive', 'Somewhat comprehensive', 'Not comprehensive'], 'best': [0, 1, 2, 3]},
]
PALETTE = ['#2377AC', '#E6AC44', '#61A59D', '#C86F6A']

def option_color(question, index):
    rank=question['best'].index(index)
    return PALETTE[rank if len(question['options']) == 4 or rank < 2 else 3]


def init_db():
    DB.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB) as conn:
        conn.execute('''CREATE TABLE IF NOT EXISTS reports (
            id TEXT PRIMARY KEY, created_at TEXT NOT NULL,
            academic_year TEXT NOT NULL, semester INTEGER NOT NULL,
            subject_name TEXT NOT NULL, subject_code TEXT NOT NULL,
            faculty_name TEXT NOT NULL, respondent_count INTEGER NOT NULL,
            payload TEXT NOT NULL
        )''')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_year ON reports(academic_year,created_at)')


def make_counts(n, count):
    # Positive response preference. Sorted descending in best-to-worst order.
    if count == 3:
        base = [random.uniform(.59, .71), random.uniform(.23, .31), random.uniform(.045, .075)]
    else:
        base = [random.uniform(.53, .67), random.uniform(.23, .31), random.uniform(.075, .12), random.uniform(.012, .036)]
    s = sum(base)
    weights = [x/s for x in base]
    provisional = [int(w*n) for w in weights]
    missing = n - sum(provisional)
    leftover_order = sorted(range(count), key=lambda i: (weights[i]*n - provisional[i]), reverse=True)
    for i in leftover_order[:missing]:
        provisional[i] += 1
    return provisional


def make_report(data):
    year = str(data.get('academic_year', '')).strip()
    subject = str(data.get('subject_name', '')).strip()
    code = str(data.get('subject_code', '')).strip()
    faculty = str(data.get('faculty_name', '')).strip()
    try:
        sem = int(data.get('semester', 0))
    except (TypeError, ValueError):
        raise ValueError('Please select a valid semester.')
    if not re.fullmatch(r'\d{4}-\d{2,4}', year):
        raise ValueError('Academic year should look like 2022-23.')
    left, right = year.split('-')
    if int(right) != (int(left)+1) % (100 if len(right)==2 else 10000):
        raise ValueError('Academic year should be consecutive, e.g. 2022-23.')
    if not 1 <= sem <= 8:
        raise ValueError('Semester must be between I and VIII.')
    for label, v in [('Subject name', subject), ('Subject code', code), ('Faculty name', faculty)]:
        if not v or len(v) > 120 or '\n' in v or '\r' in v:
            raise ValueError(f'{label} is required and must be at most 120 characters.')
    n = random.randint(42, 85)
    questions = []
    for q in QUESTIONS:
        ranked = make_counts(n, len(q['options']))
        counts = [0]*len(ranked)
        for position, index in enumerate(q['best']):
            counts[index] = ranked[position]
        questions.append({'title': q['title'], 'options': list(q['options']), 'best': list(q['best']), 'counts': counts})
    payload = {
        'id': secrets.token_hex(8), 'created_at': dt.datetime.now().astimezone().isoformat(timespec='seconds'),
        'academic_year': year, 'department': DEPARTMENT, 'semester': sem,
        'subject_name': subject, 'subject_code': code, 'faculty_name': faculty,
        'respondent_count': n, 'questions': questions,
        'generation_method': 'automated', 'data_origin': 'system-generated; no student survey was conducted',
    }
    with LOCK, sqlite3.connect(DB) as conn:
        conn.execute('INSERT INTO reports VALUES (?,?,?,?,?,?,?,?,?)', (
            payload['id'], payload['created_at'], year, sem, subject, code, faculty, n, json.dumps(payload)))
    return payload


def get_report(report_id):
    with sqlite3.connect(DB) as conn:
        row = conn.execute('SELECT payload FROM reports WHERE id=?', (report_id,)).fetchone()
    return json.loads(row[0]) if row else None


def list_reports():
    with sqlite3.connect(DB) as conn:
        rows = conn.execute('SELECT id,created_at,academic_year,semester,subject_name,subject_code,faculty_name,respondent_count FROM reports ORDER BY created_at DESC LIMIT 300').fetchall()
    keys = ['id','created_at','academic_year','semester','subject_name','subject_code','faculty_name','respondent_count']
    return [dict(zip(keys,row)) for row in rows]


def text_fit(pdf, text, x, y, max_width, font='Helvetica', font_size=10):
    text = str(text)
    while pdf.stringWidth(text, font, font_size) > max_width and len(text)>4:
        text = text[:-5] + '...'
    pdf.setFont(font, font_size)
    pdf.drawString(x, y, text)


def pdf_chart(pdf, q, x, top, width, height, n, number):
    # Border and title.
    pdf.setStrokeColor(colors.HexColor('#E0E6EC'))
    pdf.setFillColor(colors.white)
    pdf.roundRect(x, top-height, width, height, 6, fill=1, stroke=1)
    pdf.setFillColor(colors.black)
    text_fit(pdf, f'{number:02d}. {q["title"]}', x+12, top-18, width-24, 'Helvetica-Bold', 10)

    cx = x + width/2
    cy = top - 96
    radius = 48
    amounts = q['counts']
    opts = q['options']
    start = 90
    labels = []

    for idx, amount in enumerate(amounts):
        if amount == 0:
            continue
        extent = 360 * amount / n
        pdf.setFillColor(colors.HexColor(option_color(q, idx)))
        pdf.setStrokeColor(colors.white)
        pdf.setLineWidth(.8)
        pdf.wedge(cx-radius, cy-radius, cx+radius, cy+radius, start, extent, fill=1, stroke=1)

        mid = start + extent/2
        rad = math.radians(mid)
        ex = cx + radius * math.cos(rad)
        ey = cy + radius * math.sin(rad)
        ox = cx + (radius + 8) * math.cos(rad)
        oy = cy + (radius + 8) * math.sin(rad)
        labels.append({
            'idx': idx,
            'option': opts[idx],
            'value': amount,
            'pct': amount / n * 100,
            'side': 'right' if math.cos(rad) >= 0 else 'left',
            'edge': (ex, ey),
            'outer': (ox, oy),
            'target_y': oy,
        })
        start += extent

    top_limit = top - 46
    bottom_limit = top - height + 34
    min_gap = 16

    for side in ('left', 'right'):
        subset = [item for item in labels if item['side'] == side]
        subset.sort(key=lambda item: item['target_y'], reverse=True)
        prev = top_limit + 1000
        for item in subset:
            y = min(item['target_y'], prev - min_gap)
            y = max(y, bottom_limit)
            item['target_y'] = y
            prev = y
        if subset:
            overflow = subset[-1]['target_y'] - bottom_limit
            if overflow < 0:
                for item in subset:
                    item['target_y'] -= overflow

    pdf.setStrokeColor(colors.HexColor('#8E99A4'))
    pdf.setLineWidth(.75)
    for item in labels:
        ex, ey = item['edge']
        ox, oy = item['outer']
        ty = item['target_y']
        if item['side'] == 'right':
            line_end = x + width - 18
            text_x = ox + 14
            anchor_right = False
        else:
            line_end = x + 18
            text_x = ox - 14
            anchor_right = True
        pdf.line(ex, ey, ox, oy)
        pdf.line(ox, oy, line_end, ty)
        pdf.setFillColor(colors.black)
        pdf.setFont('Helvetica', 7.4)
        label = item['option']
        if anchor_right:
            while pdf.stringWidth(label, 'Helvetica', 7.4) > max(10, text_x - (x + 8)) and len(label) > 4:
                label = label[:-4] + '...'
            pdf.drawRightString(text_x, ty + 2, label)
            pdf.setFont('Helvetica', 7.0)
            pdf.setFillColor(colors.HexColor('#555555'))
            pdf.drawRightString(text_x, ty - 8, f'{item["pct"]:.1f}%')
        else:
            text_fit(pdf, label, text_x, ty + 2, x + width - text_x - 8, 'Helvetica', 7.4)
            pdf.setFont('Helvetica', 7.0)
            pdf.setFillColor(colors.HexColor('#555555'))
            pdf.drawString(text_x, ty - 8, f'{item["pct"]:.1f}%')

    pdf.setFillColor(colors.black)
    pdf.setFont('Helvetica', 7.2)
    pdf.drawString(x+12, top-height+10, f'Total: {n}')


def render_pdf(report):
    out=BytesIO()
    pdf=canvas.Canvas(out,pagesize=A4,pageCompression=1)
    W,H=A4
    def header(page):
        pdf.setFillColor(colors.HexColor('#16324C'))
        pdf.rect(0,H-9,W,9,stroke=0,fill=1)
        if LOGO.exists():
            pdf.drawImage(ImageReader(str(LOGO)),37,H-80,width=124,height=46,mask='auto',preserveAspectRatio=True,anchor='c')
        pdf.setFillColor(colors.HexColor('#C00000'))
        pdf.setFont('Helvetica-Bold',11)
        pdf.drawCentredString(368,H-40,COLLEGE)
        pdf.setFillColor(colors.black)
        pdf.setFont('Helvetica',8.2)
        pdf.drawCentredString(368,H-55,AFFILIATION)
        pdf.setStrokeColor(colors.HexColor('#CEDAE4'))
        pdf.line(34,H-90,W-34,H-90)
        pdf.setFont('Helvetica-Bold',10)
        pdf.setFillColor(colors.black)
        pdf.drawCentredString(W/2,H-109, 'Department of Automation and Robotics')
        pdf.setFont('Helvetica',9)
        pdf.drawCentredString(W/2,H-124,f'End Semester Feedback  |  A.Y. {report["academic_year"]}')
        pdf.setFillColor(colors.HexColor('#F4F7FA'))
        pdf.roundRect(34,H-197,W-68,59,6,stroke=0,fill=1)
        pdf.setFillColor(colors.black)
        pdf.setFont('Helvetica',8.4)
        text_fit(pdf, f'SUBJECT CODE  {report["subject_code"]}',47,H-155,225,'Helvetica-Bold',8.5)
        text_fit(pdf, f'SEMESTER  {report["semester"]}',310,H-155,190,'Helvetica-Bold',8.5)
        text_fit(pdf, f'SUBJECT  {report["subject_name"]}',47,H-174,245,'Helvetica',8.8)
        text_fit(pdf, f'FACULTY  {report["faculty_name"]}',310,H-174,237,'Helvetica',8.8)
        pdf.setStrokeColor(colors.HexColor('#CEDAE4'))
        pdf.line(34,37,W-34,37)
        pdf.setFillColor(colors.HexColor('#7A8998'))
        pdf.setFont('Helvetica',7)
        # Context of generated data is retained on the exported document.
        pdf.drawString(34,25,'Internal working report  |  System-generated figures; not collected student responses')
        pdf.drawRightString(W-34,25, f'Page {page} of 2')
    positions=[(34,H-215),(301,H-215),(34,H-396),(301,H-396),(34,H-577),(301,H-577)]
    for p in range(2):
        header(p+1)
        for i in range(p*6,min(p*6+6,len(report['questions']))):
            x, y = positions[i%6]
            pdf_chart(pdf, report['questions'][i], x,y,260,170,report['respondent_count'],i+1)
        if p==1:
            pdf.setFillColor(colors.HexColor('#1D354A'))
            pdf.setFont('Helvetica-Bold',9.5)
            pdf.drawString(39,H-590,'REMARKS')
            pdf.setFont('Helvetica',9)
            pdf.setFillColor(colors.black)
            pdf.drawString(40,H-620,'Remark Subject Teacher:')
            pdf.setStrokeColor(colors.HexColor('#ABB9C5'))
            pdf.line(40,H-642,W-40,H-642)
            pdf.drawString(40,H-673,'Remark HoD:')
            pdf.line(40,H-695,W-40,H-695)
        pdf.showPage()
    pdf.save()
    return out.getvalue()


class Handler(BaseHTTPRequestHandler):
    server_version='ARFeedbackPortal/1.0'
    def log_message(self, format, *args):
        print('[portal]',format%args)
    def send_bytes(self, raw, mime='application/octet-stream', status=200, extra=None):
        self.send_response(status)
        self.send_header('Content-Type',mime)
        self.send_header('Content-Length',str(len(raw)))
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Frame-Options','DENY')
        for k,v in (extra or {}).items():self.send_header(k,v)
        self.end_headers()
        self.wfile.write(raw)
    def json_result(self, value, status=200, extra=None):
        self.send_bytes(json.dumps(value,ensure_ascii=False).encode(), 'application/json; charset=utf-8',status,extra)
    def get_cookie(self):
        c=SimpleCookie()
        try:c.load(self.headers.get('Cookie',''))
        except Exception:return None
        return c['ar_session'].value if 'ar_session' in c else None
    def authorized(self):return not PORTAL_PASSWORD or self.get_cookie() in SESSIONS
    def parse_body(self):
        if int(self.headers.get('Content-Length','0'))>20000:raise ValueError('Request too large.')
        raw=self.rfile.read(int(self.headers.get('Content-Length','0')))
        return json.loads(raw.decode('utf-8'))
    def deny(self):self.json_result({'error':'Please log in.'},401)
    def do_GET(self):
        path=urlparse(self.path).path
        if path=='/':
            return self.send_bytes((ROOT/'index.html').read_bytes(),'text/html; charset=utf-8')
        if path=='/assets/college_logo.png':
            return self.send_bytes(LOGO.read_bytes(),'image/png')
        if path=='/api/config':
            return self.json_result({'auth_required':bool(PORTAL_PASSWORD),'authenticated':self.authorized(),'college':COLLEGE,'affiliation':AFFILIATION,'department':DEPARTMENT,'questions':QUESTIONS})
        if not self.authorized():return self.deny()
        if path=='/api/reports':return self.json_result(list_reports())
        if re.fullmatch('/api/report/[a-f0-9]{16}',path):
            item=get_report(path.rsplit('/',1)[-1]);return self.json_result(item) if item else self.json_result({'error':'Report not found'},404)
        if re.fullmatch('/api/report/[a-f0-9]{16}/pdf',path):
            report_id=path.split('/')[3];item=get_report(report_id)
            if not item:return self.json_result({'error':'Report not found'},404)
            raw=render_pdf(item)
            safe=re.sub(r'[^a-zA-Z0-9_-]+','_',item['subject_code'])
            return self.send_bytes(raw,'application/pdf',extra={'Content-Disposition':f'attachment; filename="Feedback_{safe}_{item["academic_year"]}.pdf"'})
        self.send_error(404,'Not Found')
    def do_POST(self):
        path=urlparse(self.path).path
        try:
            data=self.parse_body()
            if path=='/api/login':
                if not PORTAL_PASSWORD:return self.json_result({'ok':True})
                if not secrets.compare_digest(str(data.get('password','')),PORTAL_PASSWORD):return self.json_result({'error':'Incorrect password'},401)
                token=secrets.token_urlsafe(32)
                SESSIONS.add(token)
                return self.json_result({'ok':True},extra={'Set-Cookie':f'ar_session={token}; HttpOnly; SameSite=Strict; Path=/'})
            if not self.authorized():return self.deny()
            if path=='/api/report':return self.json_result(make_report(data),201)
            if re.fullmatch('/api/report/[a-f0-9]{16}/regenerate',path):
                old=get_report(path.split('/')[3])
                if not old:return self.json_result({'error':'Report not found'},404)
                return self.json_result(make_report(old),201)
            return self.json_result({'error':'Unknown operation'},404)
        except (ValueError, TypeError, json.JSONDecodeError) as e:
            return self.json_result({'error':str(e)},400)
        except Exception as e:
            print('ERROR',repr(e));return self.json_result({'error':'Unexpected server error.'},500)

if __name__=='__main__':
    init_db()
    port=int(os.environ.get('PORT','8765'))
    print(f'\nA&R Feedback Portal: http://127.0.0.1:{port}')
    if not PORTAL_PASSWORD:
        print('Note: Admin password is not set. Use only on your own device, or set PORTAL_PASSWORD.')
    print('Use Ctrl+C to stop.\n')
    ThreadingHTTPServer(('127.0.0.1',port),Handler).serve_forever()
