#!/usr/bin/env python3
import re

with open('/opt/deck-salone-v2/app/api/routes/moderator.ts', 'r') as f:
    content = f.read()

# 1. Add middleware to POST /playlists
content = content.replace(
    "router.post('/playlists', async (req: any, res: any) => {",
    "router.post('/playlists', uploadCover.single('coverImageFile'), async (req: any, res: any) => {"
)

# 2. Add file processing in POST handler
content = content.replace(
    """    const { title, description, coverImage, isFeatured, isPublished } = req.body;
    if (!title || title.trim() === '') {""",
    """    const { title, description, coverImage, isFeatured, isPublished } = req.body;
    let finalCoverImage = coverImage;
    if (req.file) {
      const ext = req.file.originalname.split('.').pop() || 'jpg';
      finalCoverImage = await uploadBuffer(req.file.buffer, 'covers', { contentType: req.file.mimetype, ext });
    }
    if (!title || title.trim() === '') {"""
)

# 3. Replace coverImage with finalCoverImage in POST create
content = content.replace(
    'coverImage: coverImage || null,',
    'coverImage: finalCoverImage || null,'
)

# 4. Add middleware to PUT /playlists/:id
content = content.replace(
    "router.put('/playlists/:id', async (req: any, res: any) => {",
    "router.put('/playlists/:id', uploadCover.single('coverImageFile'), async (req: any, res: any) => {"
)

# 5. Add file processing in PUT handler
put_old = """    const { title, description, coverImage, isFeatured, isPublished } = req.body;

    const existing = await prisma.officialPlaylist.findUnique({ where: { id } });"""
put_new = """    const { title, description, coverImage, isFeatured, isPublished } = req.body;
    let finalCoverImage = coverImage;
    if (req.file) {
      const ext = req.file.originalname.split('.').pop() || 'jpg';
      finalCoverImage = await uploadBuffer(req.file.buffer, 'covers', { contentType: req.file.mimetype, ext });
    }

    const existing = await prisma.officialPlaylist.findUnique({ where: { id } });"""
content = content.replace(put_old, put_new)

# 6. Replace coverImage with finalCoverImage in PUT update
content = content.replace(
    'if (coverImage !== undefined) updateData.coverImage = coverImage;',
    'if (finalCoverImage !== undefined) updateData.coverImage = finalCoverImage;'
)

with open('/opt/deck-salone-v2/app/api/routes/moderator.ts', 'w') as f:
    f.write(content)

print('moderator.ts updated')
