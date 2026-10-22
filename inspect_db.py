import sqlite3
conn = sqlite3.connect('data/reports.db')
cursor = conn.cursor()
cursor.execute('SELECT sql FROM sqlite_master WHERE type="table"')
print('Tables:')
for row in cursor.fetchall():
    print(row[0])
print()
cursor.execute('SELECT * FROM reports LIMIT 5')
print('Sample reports:')
for row in cursor.fetchall():
    print(row)
conn.close()