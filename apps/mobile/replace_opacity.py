import os, re

count = 0
for root, dirs, files in os.walk('lib'):
    for file in files:
        if file.endswith('.dart'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            new_content, n = re.subn(r'\.withOpacity\(([^)]+)\)', r'.withValues(alpha: \1)', content)
            if n > 0:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                count += n
                print(f'Replaced {n} occurrences in {path}')
print(f'Total replacements: {count}')
