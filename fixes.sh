#!/bin/bash
set -e

cd /opt/deck-salone-v2

echo "=== Fix 1: AuthLayout logo already fixed via sed ==="

echo "=== Fix 2: Backend moderator.ts - add upload support ==="
BACKEND="app/api/routes/moderator.ts"

# Add imports after logger require
sed -i "s|const logger = require('../utils/logger');|const logger = require('../utils/logger');\nconst { uploadCover } = require('../utils/upload');\nconst { uploadBuffer } = require('../utils/storage');|" "$BACKEND"

# Update POST /playlists route
sed -i "s|router.post('/playlists', async (req: any, res: any) => {|router.post('/playlists', uploadCover.single('coverImageFile'), async (req: any, res: any) => {|" "$BACKEND"

# In POST handler, add file processing after extracting body vars
# Replace: const { title, description, coverImage, isFeatured, isPublished } = req.body;
# With: const { title, description, coverImage, isFeatured, isPublished } = req.body;
#       let finalCoverImage = coverImage;
#       if (req.file) { const ext = req.file.originalname.split('.').pop() || 'jpg'; finalCoverImage = await uploadBuffer(req.file.buffer, 'covers', { contentType: req.file.mimetype, ext }); }
sed -i "s|const { title, description, coverImage, isFeatured, isPublished } = req.body;|const { title, description, coverImage, isFeatured, isPublished } = req.body;\n    let finalCoverImage = coverImage;\n    if (req.file) {\n      const ext = req.file.originalname.split('.').pop() || 'jpg';\n      finalCoverImage = await uploadBuffer(req.file.buffer, 'covers', { contentType: req.file.mimetype, ext });\n    }|" "$BACKEND"

# Replace coverImage with finalCoverImage in POST create
sed -i "s|coverImage: coverImage || null,|coverImage: finalCoverImage || null,|" "$BACKEND"

# Update PUT /playlists/:id route
sed -i "s|router.put('/playlists/:id', async (req: any, res: any) => {|router.put('/playlists/:id', uploadCover.single('coverImageFile'), async (req: any, res: any) => {|" "$BACKEND"

# In PUT handler, add file processing after extracting body vars
sed -i "s|const { title, description, coverImage, isFeatured, isPublished } = req.body;|const { title, description, coverImage, isFeatured, isPublished } = req.body;\n    let finalCoverImage = coverImage;\n    if (req.file) {\n      const ext = req.file.originalname.split('.').pop() || 'jpg';\n      finalCoverImage = await uploadBuffer(req.file.buffer, 'covers', { contentType: req.file.mimetype, ext });\n    }|" "$BACKEND"

# Replace coverImage with finalCoverImage in PUT update
sed -i "s|if (coverImage !== undefined) updateData.coverImage = coverImage;|if (finalCoverImage !== undefined) updateData.coverImage = finalCoverImage;|" "$BACKEND"

echo "=== Fix 3: Frontend ModeratorPlaylists.tsx - add file upload ==="
cat > /tmp/moderator_playlists_patch.py << 'PYEOF'
import re

with open('app/src/pages/moderator/ModeratorPlaylists.tsx', 'r') as f:
    content = f.read()

# 1. Add Upload to imports
content = content.replace(
    'import {\n  ListMusic,\n  Plus,\n  Edit2,\n  Trash2,\n  Search,\n  Music,\n  Loader2,\n  X,\n} from \'lucide-react\';',
    'import {\n  ListMusic,\n  Plus,\n  Edit2,\n  Trash2,\n  Search,\n  Music,\n  Loader2,\n  X,\n  Upload,\n} from \'lucide-react\';'
)

# 2. Add coverFile and coverPreview state after coverImage state
content = content.replace(
    "const [coverImage, setCoverImage] = useState('');",
    "const [coverImage, setCoverImage] = useState('');\n  const [coverFile, setCoverFile] = useState<File | null>(null);\n  const [coverPreview, setCoverPreview] = useState('');"
)

# 3. Add handleCoverFileChange function before handleSavePlaylist
old_func = 'const handleSavePlaylist = async () => {'
new_func = '''const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleSavePlaylist = async () => {'''
content = content.replace(old_func, new_func)

# 4. Update handleSavePlaylist to use FormData when file present
old_save = '''  const handleSavePlaylist = async () => {
    if (!title.trim()) return;
    try {
      setSaving(true);
      if (isNew) {
        await api.post('/moderator/playlists', {
          title,
          description,
          coverImage,
          isFeatured,
          isPublished,
        });
      } else {
        await api.put(`/moderator/playlists/${editingPlaylist.id}`, {
          title,
          description,
          coverImage,
          isFeatured,
          isPublished,
        });
      }'''

new_save = '''  const handleSavePlaylist = async () => {
    if (!title.trim()) return;
    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description || '');
      formData.append('isFeatured', String(isFeatured));
      formData.append('isPublished', String(isPublished));
      if (coverFile) {
        formData.append('coverImageFile', coverFile);
      } else if (coverImage) {
        formData.append('coverImage', coverImage);
      }
      if (isNew) {
        await api.post('/moderator/playlists', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.put(`/moderator/playlists/${editingPlaylist.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }'''
content = content.replace(old_save, new_save)

# 5. Reset coverFile/coverPreview when opening create/edit
old_open_create = "const handleOpenCreate = () => {\n    setIsNew(true);\n    setEditingPlaylist({});\n    setTitle('');\n    setDescription('');\n    setCoverImage('');\n    setIsFeatured(false);\n    setIsPublished(true);\n  };"
new_open_create = "const handleOpenCreate = () => {\n    setIsNew(true);\n    setEditingPlaylist({});\n    setTitle('');\n    setDescription('');\n    setCoverImage('');\n    setCoverFile(null);\n    setCoverPreview('');\n    setIsFeatured(false);\n    setIsPublished(true);\n  };"
content = content.replace(old_open_create, new_open_create)

old_open_edit = "const handleOpenEdit = (pl: any) => {\n    setIsNew(false);\n    setEditingPlaylist(pl);\n    setTitle(pl.title || '');\n    setDescription(pl.description || '');\n    setCoverImage(pl.coverImage || '');\n    setIsFeatured(Boolean(pl.isFeatured));\n    setIsPublished(pl.isPublished !== false);\n  };"
new_open_edit = "const handleOpenEdit = (pl: any) => {\n    setIsNew(false);\n    setEditingPlaylist(pl);\n    setTitle(pl.title || '');\n    setDescription(pl.description || '');\n    setCoverImage(pl.coverImage || '');\n    setCoverFile(null);\n    setCoverPreview(pl.coverImage ? getMediaUrl(pl.coverImage) : '');\n    setIsFeatured(Boolean(pl.isFeatured));\n    setIsPublished(pl.isPublished !== false);\n  };"
content = content.replace(old_open_edit, new_open_edit)

# 6. Replace cover image URL input with file upload + URL option
old_input = '''            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">
                Cover Image URL (optional)
              </label>
              <Input
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="/uploads/playlist-cover.jpg"
                className="bg-black-surface border-dark-gray text-xs text-white"
              />
            </div>'''

new_input = '''            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">Cover Image</label>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <label className="flex-1 cursor-pointer bg-black-surface border border-dashed border-gold/40 hover:border-gold rounded-lg p-2.5 text-center transition-colors flex items-center justify-center gap-2 text-xs text-gold">
                    <Upload className="w-4 h-4" />
                    <span>{coverFile ? coverFile.name : 'Upload Image'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverFileChange}
                      className="hidden"
                    />
                  </label>
                  {coverPreview && (
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-gold flex-shrink-0">
                      <img src={coverPreview} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-text-muted text-center">OR enter image URL:</p>
                <Input
                  value={coverImage}
                  onChange={(e) => {
                    setCoverImage(e.target.value);
                    if (e.target.value) setCoverPreview(e.target.value);
                  }}
                  placeholder="https://..."
                  className="bg-black-surface border-dark-gray text-xs text-white"
                />
              </div>
            </div>'''
content = content.replace(old_input, new_input)

# 7. Increase mix picker limit from 20 to 50
content = content.replace('params: { search: query, limit: 20, page },', 'params: { search: query, limit: 50, page },')

with open('app/src/pages/moderator/ModeratorPlaylists.tsx', 'w') as f:
    f.write(content)

print('ModeratorPlaylists.tsx updated')
PYEOF
python3 /tmp/moderator_playlists_patch.py

echo "=== Fix 4: OfficialPlaylists.tsx - add error handling ==="
cat > /tmp/official_playlists_patch.py << 'PYEOF'
with open('app/src/pages/OfficialPlaylists.tsx', 'r') as f:
    content = f.read()

# Add error state
content = content.replace(
    "const [loading, setLoading] = useState(true);\n  const [playlists, setPlaylists] = useState<any[]>([]);",
    "const [loading, setLoading] = useState(true);\n  const [playlists, setPlaylists] = useState<any[]>([]);\n  const [error, setError] = useState('');"
)

# Update fetchPlaylists to handle errors
old_fetch = '''  const fetchPlaylists = async () => {
    try {
      setLoading(true);
      const res = await api.get('/official-playlists');
      if (res.data.success) {
        setPlaylists(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load official playlists', err);
    } finally {
      setLoading(false);
    }
  };'''

new_fetch = '''  const fetchPlaylists = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/official-playlists');
      if (res.data.success) {
        setPlaylists(res.data.data);
      } else {
        setError('Failed to load playlists');
      }
    } catch (err: any) {
      console.error('Failed to load official playlists', err);
      setError(err?.response?.data?.error || 'Failed to load playlists. Please try again.');
    } finally {
      setLoading(false);
    }
  };'''
content = content.replace(old_fetch, new_fetch)

# Add error display before playlist grid
old_grid = '''      {/* Playlist Grid */}
      {loading ? ('''
new_grid = '''      {/* Playlist Grid */}
      {error && (
        <Card className="bg-red-950/30 border-red-800/50 p-6 text-center">
          <p className="text-sm text-red-300">{error}</p>
          <button
            onClick={fetchPlaylists}
            className="mt-3 text-xs text-gold hover:underline"
          >
            Retry
          </button>
        </Card>
      )}
      {loading ? ('''
content = content.replace(old_grid, new_grid)

with open('app/src/pages/OfficialPlaylists.tsx', 'w') as f:
    f.write(content)

print('OfficialPlaylists.tsx updated')
PYEOF
python3 /tmp/official_playlists_patch.py

echo "=== All fixes applied ==="
