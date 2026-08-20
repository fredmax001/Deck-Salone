#!/usr/bin/env python3

# Fix Feed.tsx imports
with open('/opt/deck-salone-v2/app/src/pages/Feed.tsx', 'r') as f:
    content = f.read()

# Add Play and Music to imports (Feed already has Music2, Headphones, etc.)
old_import = """import {
  Loader2,
  Music2,
  Headphones,
  Calendar,
  TrendingUp,
  Compass,
  MapPin,
  Clock,
  ListMusic,
} from 'lucide-react';"""

new_import = """import {
  Loader2,
  Music2,
  Headphones,
  Calendar,
  TrendingUp,
  Compass,
  MapPin,
  Clock,
  ListMusic,
  Play,
  Music,
} from 'lucide-react';"""

content = content.replace(old_import, new_import)

with open('/opt/deck-salone-v2/app/src/pages/Feed.tsx', 'w') as f:
    f.write(content)
print('Feed.tsx imports fixed')

# Fix OfficialPlaylistDetail.tsx - remove unused motion import
with open('/opt/deck-salone-v2/app/src/pages/OfficialPlaylistDetail.tsx', 'r') as f:
    content = f.read()

# Check if motion is actually used
if 'motion.' not in content and '<motion' not in content:
    content = content.replace("import { motion } from 'framer-motion';\n", "")
    # Or if on same line as other imports
    content = content.replace("import { motion } from 'framer-motion';", "")

with open('/opt/deck-salone-v2/app/src/pages/OfficialPlaylistDetail.tsx', 'w') as f:
    f.write(content)
print('OfficialPlaylistDetail.tsx motion import fixed')
