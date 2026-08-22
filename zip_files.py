import zipfile

with zipfile.ZipFile('source_code.zip', 'w') as z:
    z.write('solve.py')

print("Created dynamic source_code.zip containing solve.py.")
