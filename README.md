# A&R Feedback Report Portal

A simple local single-admin web portal based on the uploaded Excel workbook structure. Academic year, semester, subject name/code, and faculty are entered once; 10 charts are generated automatically and saved as a consistent snapshot; PDFs are exported in A4 with **6 pie charts on page 1** (2 columns × 3 rows) and **4 pie charts, remarks on page 2**.

## Run on Windows

1. Install Python 3.10 or newer, if it is not already installed.
2. Open Command Prompt in this folder.
3. Install the sole extra package:

   ```powershell
   py -m pip install reportlab
   ```

4. Optional, but recommended for an admin password:

   ```powershell
   set PORTAL_PASSWORD=YourStrongPasswordHere
   ```

5. Start the portal:

   ```powershell
   py app.py
   ```

6. Open **http://127.0.0.1:8765** in your browser.

### macOS / Linux

```bash
python3 -m pip install reportlab
export PORTAL_PASSWORD='YourStrongPasswordHere'
python3 app.py
```

Then visit http://127.0.0.1:8765.

## Features

- Single-admin workspace with optional password.
- Prefilled department: **Automation and Robotics**.
- Inputs: academic year, semester, subject name, subject code, and faculty.
- College header and logo extracted from the reference workbook.
- The same **10 parameters** and original response options; `Class Engagement` preserved from the workbook (its options describe faculty punctuality).
- Automatically generated positively skewed values, including the reverse-ordered syllabus options.
- Every question sums to the same report-level respondent count (unlike the original workbook).
- Each report is saved into `data/reports.db`, allowing later retrieval and repeat PDF download.
- Regenerate makes a **new saved version**, leaving the earlier report unchanged.
- A4 PDF, two pages, 6 charts / 4 charts; includes empty Subject Teacher and HoD remarks.
- Offline after Python and ReportLab are installed. No hosted database or API required.

## Data clarity

The values are generated internally. They are **not actual responses collected from students**. That is retained in report provenance; the portal does not claim a student survey occurred. If college feedback has to be used as evidence of actual collection, real source responses must be obtained and used.

## Security and storage

- The service binds to **127.0.0.1** only, so it is accessible only from that computer.
- Set `PORTAL_PASSWORD` before starting to enable access control.
- Reports are stored locally in `data/reports.db`. Back up this file to retain reports.
- No student identities or student data are stored.
- There is no external cloud deployment or multi-user management in this first version.

## Structure

```text
AR_Feedback_Portal/
  app.py                  # HTTP API, weighted generation, SQLite, PDF creation
  index.html              # Browser UI, SVG charts and archive
  assets/college_logo.png # Extracted from the reference Excel workbook
  data/                   # Created SQLite database after first run
  README.md
```
