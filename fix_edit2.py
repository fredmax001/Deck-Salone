#!/usr/bin/env python3
with open('/opt/deck-salone-v2/app/src/pages/AdminDashboard.tsx', 'r') as f:
    content = f.read()

# Fix Edit2 import - add after XIcon line
content = content.replace(
    '  Check, X as XIcon,',
    '  Check, X as XIcon, Edit2,'
)

with open('/opt/deck-salone-v2/app/src/pages/AdminDashboard.tsx', 'w') as f:
    f.write(content)
print('AdminDashboard Edit2 import fixed')
