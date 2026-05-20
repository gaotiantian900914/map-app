import re, os

files = [
    'src/utils.js',
    'src/storage-service.js', 
    'src/category-service.js',
    'src/marker-service.js',
    'src/map-service.js',
    'src/search-service.js',
    'src/search-history-service.js',
    'src/ui-service.js',
    'src/main.js',
]

base = 'e:/HFmast/map-app'

for fname in files:
    fpath = os.path.join(base, fname)
    try:
        with open(fpath, 'r', encoding='utf-8') as fh:
            content = fh.read()
        
        braces = 0
        brackets = 0
        parens = 0
        in_string = False
        string_char = ''
        escape_next = False
        
        for i, c in enumerate(content):
            if escape_next:
                escape_next = False
                continue
            if c == '\\':
                escape_next = True
                continue
            if in_string:
                if c == string_char:
                    in_string = False
                continue
            if c in ('"', "'"):
                in_string = True
                string_char = c
                continue
            if c == '{': braces += 1
            elif c == '}': braces -= 1
            elif c == '[': brackets += 1
            elif c == ']': brackets -= 1
            elif c == '(': parens += 1
            elif c == ')': parens -= 1
            
            if braces < 0 or brackets < 0 or parens < 0:
                print('ERROR: Unmatched closing at char %d in %s' % (i, fname))
                break
        
        lines = content.split('\n')
        name = fname.split('/')[-1]
        
        if braces != 0:
            print('ERROR: Unmatched braces (%d) in %s' % (braces, name))
        elif brackets != 0:
            print('ERROR: Unmatched brackets (%d) in %s' % (brackets, name))
        elif parens != 0:
            print('ERROR: Unmatched parens (%d) in %s' % (parens, name))
        else:
            print('OK: %s (%d lines)' % (name, len(lines)))
        
        # Check imports
        for ln, line in enumerate(lines, 1):
            m = re.search(r"import\s+.*from\s+'([^']+)'", line)
            if m:
                imp = m.group(1)
                if imp.startswith('./') and not imp.startswith('http'):
                    imp_path = os.path.join(base, 'src', imp.replace('./', ''))
                    if not os.path.exists(imp_path):
                        print('  WARNING: Line %d imports missing file: %s' % (ln, imp))
                        
    except Exception as e:
        print('ERROR reading %s: %s' % (fname, str(e)))

print('\n--- Checking HTML files ---')
for hfile in ['index.html', 'add-marker.html']:
    fpath = os.path.join(base, hfile)
    with open(fpath, 'r', encoding='utf-8') as fh:
        content = fh.read()
    lines = content.split('\n')
    
    # Check script src references
    for ln, line in enumerate(lines, 1):
        m = re.search(r'src="([^"]+\.js[^"]*)"', line)
        if m:
            ref = m.group(1)
            if not ref.startswith('http') and not ref.startswith('https://'):
                ref_path = os.path.join(base, ref)
                if os.path.exists(ref_path):
                    print('OK: %s line %d references %s (exists)' % (hfile, ln, ref))
                else:
                    print('ERROR: %s line %d references %s (MISSING!)' % (hfile, ln, ref))
    
    # Check import from in inline scripts
    for ln, line in enumerate(lines, 1):
        m = re.search(r"from\s+'([^']+\.js[^']*)'", line)
        if m:
            ref = m.group(1)
            if not ref.startswith('http'):
                ref_path = os.path.join(base, ref)
                if os.path.exists(ref_path):
                    print('OK: %s line %d imports %s (exists)' % (hfile, ln, ref))
                else:
                    print('ERROR: %s line %d imports %s (MISSING!)' % (hfile, ln, ref))

print('\nDone!')
