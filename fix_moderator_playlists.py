#!/usr/bin/env python3

with open('/opt/deck-salone-v2/app/src/pages/moderator/ModeratorPlaylists.tsx', 'r') as f:
    content = f.read()

# 1. Add Upload to imports
content = content.replace(
    "import {\n  ListMusic,\n  Plus,\n  Edit2,\n  Trash2,\n  Search,\n  Music,\n  Loader2,\n  X,\n} from 'lucide-react';",
    "import {\n  ListMusic,\n  Plus,\n  Edit2,\n  Trash2,\n  Search,\n  Music,\n  Loader2,\n  X,\n  Upload,\n} from 'lucide-react';"
)

# 2. Add coverFile and coverPreview state after coverImage state
content = content.replace(
    "const [coverImage, setCoverImage] = useState('');",
    "const [coverImage, setCoverImage] = useState('');\n  const [coverFile, setCoverFile] = useState<File | null>(null);\n  const [coverPreview, setCoverPreview] = useState('');"
)

# 3. Add handleCoverFileChange function before handleSavePlaylist
old_func = "  const handleSavePlaylist = async () => {"
new_func = """  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleSavePlaylist = async () => {"""
content = content.replace(old_func, new_func)

# 4. Update handleSavePlaylist to use FormData when file present
old_save = """  const handleSavePlaylist = async () => {
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
      }"""

new_save = """  const handleSavePlaylist = async () => {
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
      }"""
content = content.replace(old_save, new_save)

# 5. Reset coverFile/coverPreview when opening create/edit
old_open_create = """  const handleOpenCreate = () => {
    setIsNew(true);
    setEditingPlaylist({});
    setTitle('');
    setDescription('');
    setCoverImage('');
    setIsFeatured(false);
    setIsPublished(true);
  };"""
new_open_create = """  const handleOpenCreate = () => {
    setIsNew(true);
    setEditingPlaylist({});
    setTitle('');
    setDescription('');
    setCoverImage('');
    setCoverFile(null);
    setCoverPreview('');
    setIsFeatured(false);
    setIsPublished(true);
  };"""
content = content.replace(old_open_create, new_open_create)

old_open_edit = """  const handleOpenEdit = (pl: any) => {
    setIsNew(false);
    setEditingPlaylist(pl);
    setTitle(pl.title || '');
    setDescription(pl.description || '');
    setCoverImage(pl.coverImage || '');
    setIsFeatured(Boolean(pl.isFeatured));
    setIsPublished(pl.isPublished !== false);
  };"""
new_open_edit = """  const handleOpenEdit = (pl: any) => {
    setIsNew(false);
    setEditingPlaylist(pl);
    setTitle(pl.title || '');
    setDescription(pl.description || '');
    setCoverImage(pl.coverImage || '');
    setCoverFile(null);
    setCoverPreview(pl.coverImage ? getMediaUrl(pl.coverImage) : '');
    setIsFeatured(Boolean(pl.isFeatured));
    setIsPublished(pl.isPublished !== false);
  };"""
content = content.replace(old_open_edit, new_open_edit)

# 6. Replace cover image URL input with file upload + URL option
old_input = """            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">
                Cover Image URL (optional)
              </label>
              <Input
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="/uploads/playlist-cover.jpg"
                className="bg-black-surface border-dark-gray text-xs text-white"
              />
            </div>"""

new_input = """            <div>
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
            </div>"""
content = content.replace(old_input, new_input)

# 7. Increase mix picker limit from 20 to 50
content = content.replace(
    'params: { search: query, limit: 20, page },',
    'params: { search: query, limit: 50, page },'
)

with open('/opt/deck-salone-v2/app/src/pages/moderator/ModeratorPlaylists.tsx', 'w') as f:
    f.write(content)

print('ModeratorPlaylists.tsx updated')
