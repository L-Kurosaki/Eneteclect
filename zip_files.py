import zipfile

with zipfile.ZipFile('source_code.zip', 'w') as z:
    z.write('solve.py')
    z.write('level1.json')

print("Created source_code.zip containing solve.py and level1.json.")
