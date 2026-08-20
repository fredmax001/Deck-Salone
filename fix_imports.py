#!/usr/bin/env python3

# Fix Feed.tsx - add useEffect import
with open('/opt/deck-salone-v2/app/src/pages/Feed.tsx', 'r') as f:
    content = f.read()
content = content.replace("import { useState } from 'react';", "import { useState, useEffect } from 'react';")
with open('/opt/deck-salone-v2/app/src/pages/Feed.tsx', 'w') as f:
    f.write(content)
print('✅ Feed.tsx useEffect import fixed')

# Fix AdminDashboard.tsx - add ListMusic and Edit2 to imports
with open('/opt/deck-salone-v2/app/src/pages/AdminDashboard.tsx', 'r') as f:
    content = f.read()

# Find the lucide-react import block and add missing icons
old_import = """  Check, X as XIcon,
  Settings, Bell, AlertTriangle,"""
new_import = """  Check, X as XIcon, Edit2,
  Settings, Bell, AlertTriangle,"""
content = content.replace(old_import, new_import)

# Add ListMusic to imports if missing
old_import2 = "  Music, DollarSign, Calendar,"
new_import2 = "  Music, ListMusic, DollarSign, Calendar,"
content = content.replace(old_import2, new_import2)

with open('/opt/deck-salone-v2/app/src/pages/AdminDashboard.tsx', 'w') as f:
    f.write(content)
print('✅ AdminDashboard.tsx imports fixed')
