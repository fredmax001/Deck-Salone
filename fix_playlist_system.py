#!/usr/bin/env python3
"""
Comprehensive fix for the entire playlist system.
Files modified:
  1. app/api/routes/officialPlaylists.ts  — add audioUrl, duration to mix queries
  2. app/api/routes/moderator.ts          — add bulk add endpoint, fix imports
  3. app/src/pages/OfficialPlaylistDetail.tsx — handle missing audio gracefully
  4. app/src/pages/moderator/ModeratorPlaylists.tsx — multi-select, bulk add, keep modal open
"""

import re

# ============================================================
# FIX 1: officialPlaylists.ts — include audioUrl & duration
# ============================================================
with open('/opt/deck-salone-v2/app/api/routes/officialPlaylists.ts', 'r') as f:
    content = f.read()

# In GET / (list), the mix select is missing audioUrl and duration
old_list_mix = """mix: {
              select: {
                id: true,
                title: true,
                coverImage: true,
                genre: true,
                plays: true,
                dj: { select: { id: true, stageName: true, avatar: true } },
              },
            },"""
new_list_mix = """mix: {
              select: {
                id: true,
                title: true,
                coverImage: true,
                genre: true,
                plays: true,
                audioUrl: true,
                duration: true,
                isPublic: true,
                dj: { select: { id: true, stageName: true, avatar: true } },
              },
            },"""
content = content.replace(old_list_mix, new_list_mix)

# In GET /:slug (detail), the mix include is missing audioUrl and duration
old_detail_mix = """mix: {
              include: {
                dj: {
                  select: {
                    id: true,
                    stageName: true,
                    avatar: true,
                    city: true,
                    verified: true,
                    user: { select: { username: true } },
                  },
                },
              },
            },"""
new_detail_mix = """mix: {
              select: {
                id: true,
                title: true,
                coverImage: true,
                genre: true,
                plays: true,
                audioUrl: true,
                duration: true,
                isPublic: true,
                dj: {
                  select: {
                    id: true,
                    stageName: true,
                    avatar: true,
                    city: true,
                    verified: true,
                    user: { select: { username: true } },
                  },
                },
              },
            },"""
content = content.replace(old_detail_mix, new_detail_mix)

with open('/opt/deck-salone-v2/app/api/routes/officialPlaylists.ts', 'w') as f:
    f.write(content)

print('✅ officialPlaylists.ts updated — audioUrl & duration included')

# ============================================================
# FIX 2: moderator.ts — add bulk add endpoint
# ============================================================
with open('/opt/deck-salone-v2/app/api/routes/moderator.ts', 'r') as f:
    content = f.read()

# Add bulk endpoint right after the single-add endpoint
bulk_endpoint = '''
// Bulk add mixes to playlist
router.post('/playlists/:id/items/bulk', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { mixIds } = req.body;
    if (!Array.isArray(mixIds) || mixIds.length === 0) {
      return res.status(400).json({ success: false, error: 'mixIds array required' });
    }

    const playlist = await prisma.officialPlaylist.findUnique({ where: { id } });
    if (!playlist) return res.status(404).json({ success: false, error: 'Playlist not found' });

    const itemCount = await prisma.officialPlaylistItem.count({ where: { playlistId: id } });

    const createdItems = [];
    let position = itemCount + 1;

    for (const mixId of mixIds) {
      const mix = await prisma.mix.findUnique({ where: { id: mixId } });
      if (!mix) continue;

      const existing = await prisma.officialPlaylistItem.findUnique({
        where: { playlistId_mixId: { playlistId: id, mixId } },
      });
      if (existing) continue; // Skip duplicates

      const item = await prisma.officialPlaylistItem.create({
        data: {
          playlistId: id,
          mixId,
          position: position++,
        },
        include: {
          mix: { select: { id: true, title: true, coverImage: true, dj: { select: { stageName: true } } } },
        },
      });
      createdItems.push(item);
    }

    await createModeratorLog({
      moderatorId: req.user.id,
      moderatorName: req.user.name || req.user.email,
      action: 'BULK_ADD_MIXES_TO_PLAYLIST',
      targetType: 'PLAYLIST',
      targetId: id,
      targetName: `${createdItems.length} mixes -> ${playlist.title}`,
    });

    return res.json({ success: true, data: createdItems, count: createdItems.length });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});
'''

# Insert after the single-add endpoint (before remove endpoint)
insert_marker = "// Remove item from playlist"
content = content.replace(insert_marker, bulk_endpoint + "\n" + insert_marker)

with open('/opt/deck-salone-v2/app/api/routes/moderator.ts', 'w') as f:
    f.write(content)

print('✅ moderator.ts updated — bulk add endpoint added')

# ============================================================
# FIX 3: OfficialPlaylistDetail.tsx — handle missing audio
# ============================================================
with open('/opt/deck-salone-v2/app/src/pages/OfficialPlaylistDetail.tsx', 'r') as f:
    content = f.read()

# Replace handlePlayTrack to guard against missing audioUrl
old_play = '''  const handlePlayTrack = (mix: any) => {
    if (!mix) return;
    play({
      id: mix.id,
      title: mix.title,
      dj: mix.dj?.stageName || 'DJ',
      duration: mix.duration || 0,
      cover: getMediaUrl(mix.coverImage) || '',
      genre: mix.genre || '',
      audioUrl: getMediaUrl(mix.audioUrl) || '',
    });
  };'''

new_play = '''  const handlePlayTrack = (mix: any) => {
    if (!mix) return;
    if (!mix.audioUrl) {
      alert('This mix is not available for playback.');
      return;
    }
    play({
      id: mix.id,
      title: mix.title,
      dj: mix.dj?.stageName || 'DJ',
      duration: mix.duration || 0,
      cover: getMediaUrl(mix.coverImage) || '',
      genre: mix.genre || '',
      audioUrl: getMediaUrl(mix.audioUrl) || '',
    });
  };'''
content = content.replace(old_play, new_play)

# Replace tracklist item rendering to handle null mix gracefully and show unavailable state
old_item_render = '''          playlist.items?.map((item: any, index: number) => {
            const mix = item.mix;
            if (!mix) return null;
            return (
              <Card
                key={item.id}
                onClick={() => handlePlayTrack(mix)}
                className="bg-black-elevated border-dark-gray hover:border-gold/50 p-3.5 sm:p-4 rounded-xl flex items-center justify-between gap-4 cursor-pointer transition group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span className="text-xs font-bold text-text-muted group-hover:text-gold w-5 text-center shrink-0">
                    #{index + 1}
                  </span>

                  <img
                    src={getMediaUrl(mix.coverImage) || '/placeholder-mix.jpg'}
                    alt={mix.title}
                    className="w-12 h-12 rounded-lg object-cover border border-dark-gray shrink-0"
                  />

                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white group-hover:text-gold transition truncate">
                      {mix.title}
                    </h3>
                    <p className="text-xs text-text-secondary truncate">
                      by <span className="text-white font-medium">{mix.dj?.stageName}</span> •{' '}
                      <span className="text-gold">{mix.genre}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-text-muted hidden sm:inline">▶ {mix.plays || 0}</span>
                  <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-gold group-hover:bg-gold group-hover:text-black transition">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                </div>
              </Card>
            );
          })'''

new_item_render = '''          playlist.items?.map((item: any, index: number) => {
            const mix = item.mix;
            if (!mix) return null;
            const canPlay = Boolean(mix.audioUrl);
            return (
              <Card
                key={item.id}
                onClick={() => canPlay && handlePlayTrack(mix)}
                className={`bg-black-elevated border-dark-gray hover:border-gold/50 p-3.5 sm:p-4 rounded-xl flex items-center justify-between gap-4 transition group ${canPlay ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span className="text-xs font-bold text-text-muted group-hover:text-gold w-5 text-center shrink-0">
                    #{index + 1}
                  </span>

                  <img
                    src={getMediaUrl(mix.coverImage) || '/placeholder-mix.jpg'}
                    alt={mix.title}
                    className="w-12 h-12 rounded-lg object-cover border border-dark-gray shrink-0"
                  />

                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white group-hover:text-gold transition truncate">
                      {mix.title}
                    </h3>
                    <p className="text-xs text-text-secondary truncate">
                      by <span className="text-white font-medium">{mix.dj?.stageName}</span> •{' '}
                      <span className="text-gold">{mix.genre}</span>
                      {!canPlay && <span className="text-red-400 ml-2">(Unavailable)</span>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-text-muted hidden sm:inline">▶ {mix.plays || 0}</span>
                  {canPlay ? (
                    <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-gold group-hover:bg-gold group-hover:text-black transition">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-red-900/30 border border-red-800/40 flex items-center justify-center text-red-400">
                      <span className="text-[10px] font-bold">!</span>
                    </div>
                  )}
                </div>
              </Card>
            );
          })'''
content = content.replace(old_item_render, new_item_render)

with open('/opt/deck-salone-v2/app/src/pages/OfficialPlaylistDetail.tsx', 'w') as f:
    f.write(content)

print('✅ OfficialPlaylistDetail.tsx updated — graceful missing audio handling')

# ============================================================
# FIX 4: ModeratorPlaylists.tsx — multi-select bulk add
# ============================================================
with open('/opt/deck-salone-v2/app/src/pages/moderator/ModeratorPlaylists.tsx', 'r') as f:
    content = f.read()

# 1. Add CheckSquare icon to imports
content = content.replace(
    "import {\n  ListMusic,\n  Plus,\n  Edit2,\n  Trash2,\n  Search,\n  Music,\n  Loader2,\n  X,\n  Upload,\n} from 'lucide-react';",
    "import {\n  ListMusic,\n  Plus,\n  Edit2,\n  Trash2,\n  Search,\n  Music,\n  Loader2,\n  X,\n  Upload,\n  CheckSquare,\n  Square,\n} from 'lucide-react';"
)

# 2. Add selectedMixIds state after mixTotal
content = content.replace(
    "const [mixTotal, setMixTotal] = useState(0);",
    "const [mixTotal, setMixTotal] = useState(0);\n  const [selectedMixIds, setSelectedMixIds] = useState<Set<string>>(new Set());\n  const [addingBulk, setAddingBulk] = useState(false);"
)

# 3. Replace handleAddMixToPlaylist with bulk-aware version
old_add_single = '''  const handleAddMixToPlaylist = async (mixId: string) => {
    if (!mixPickerPlaylist) return;
    try {
      await api.post(`/moderator/playlists/${mixPickerPlaylist.id}/items`, { mixId });
      fetchPlaylists();
      setMixPickerPlaylist(null);
    } catch (err) {
      console.error('Failed to add mix to playlist', err);
    }
  };'''

new_add_handlers = '''  const handleToggleMixSelection = (mixId: string) => {
    setSelectedMixIds((prev) => {
      const next = new Set(prev);
      if (next.has(mixId)) next.delete(mixId);
      else next.add(mixId);
      return next;
    });
  };

  const handleAddSingleMix = async (mixId: string) => {
    if (!mixPickerPlaylist) return;
    try {
      await api.post(`/moderator/playlists/${mixPickerPlaylist.id}/items`, { mixId });
      fetchPlaylists();
      // Refresh available mixes to remove the added one
      setAvailableMixes((prev) => prev.filter((m) => m.id !== mixId));
      setMixTotal((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to add mix to playlist', err);
    }
  };

  const handleAddSelectedMixes = async () => {
    if (!mixPickerPlaylist || selectedMixIds.size === 0) return;
    try {
      setAddingBulk(true);
      const res = await api.post(`/moderator/playlists/${mixPickerPlaylist.id}/items/bulk`, {
        mixIds: Array.from(selectedMixIds),
      });
      if (res.data.success) {
        fetchPlaylists();
        setSelectedMixIds(new Set());
        // Remove added mixes from available list
        const addedIds = new Set(res.data.data.map((item: any) => item.mixId));
        setAvailableMixes((prev) => prev.filter((m) => !addedIds.has(m.id)));
        setMixTotal((prev) => Math.max(0, prev - res.data.count));
      }
    } catch (err) {
      console.error('Failed to bulk add mixes', err);
    } finally {
      setAddingBulk(false);
    }
  };

  const handleCloseMixPicker = () => {
    setMixPickerPlaylist(null);
    setSelectedMixIds(new Set());
    setSearchMixQuery('');
  };'''
content = content.replace(old_add_single, new_add_handlers)

# 4. Update handleOpenMixPicker to reset selectedMixIds
content = content.replace(
    "const handleOpenMixPicker = async (pl: any) => {\n    setMixPickerPlaylist(pl);\n    setSearchMixQuery('');\n    setMixPage(1);\n    setMixTotal(0);\n    fetchAvailableMixes('', 1, true);\n  };",
    "const handleOpenMixPicker = async (pl: any) => {\n    setMixPickerPlaylist(pl);\n    setSearchMixQuery('');\n    setMixPage(1);\n    setMixTotal(0);\n    setSelectedMixIds(new Set());\n    fetchAvailableMixes('', 1, true);\n  };"
)

# 5. Replace the Add Mix Picker Modal with multi-select version
old_picker_modal = '''      {/* Add Mix Picker Modal */}
      <Dialog open={Boolean(mixPickerPlaylist)} onOpenChange={() => setMixPickerPlaylist(null)}>
        <DialogContent className="bg-black-elevated border-dark-gray text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gold text-base font-bold">
              <Plus className="w-5 h-5" />
              Add Mix to "{mixPickerPlaylist?.title}"
            </DialogTitle>
            <DialogDescription className="text-xs text-text-secondary">
              Search published mixes to add them to this official playlist.
              {mixTotal > 0 && (
                <span className="block mt-1 text-gold">
                  Showing {availableMixes.length} of {mixTotal} mixes
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="relative">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search mix by title, genre, or DJ name..."
                value={searchMixQuery}
                onChange={(e) => handleSearchMixChange(e.target.value)}
                className="pl-9 bg-black-surface border-dark-gray text-xs text-white"
              />
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {searchingMixes ? (
                <div className="py-8 text-center">
                  <Loader2 className="w-6 h-6 text-gold animate-spin mx-auto" />
                </div>
              ) : availableMixes.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-6">No mixes matched your search</p>
              ) : (
                <>
                  {availableMixes.map((mix) => (
                    <div
                      key={mix.id}
                      className="flex items-center justify-between bg-black-surface p-2.5 rounded-lg border border-dark-gray hover:border-gold/40"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={getMediaUrl(mix.coverImage) || '/placeholder-mix.jpg'}
                          alt={mix.title}
                          className="w-9 h-9 rounded object-cover border border-dark-gray"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{mix.title}</p>
                          <p className="text-[10px] text-text-muted truncate">
                            {mix.dj?.stageName} • <span className="text-gold">{mix.genre}</span>
                          </p>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleAddMixToPlaylist(mix.id)}
                        className="bg-gold text-black hover:bg-gold-light text-xs font-semibold h-7 px-3 shrink-0"
                      >
                        + Add
                      </Button>
                    </div>
                  ))}

                  {hasMoreMixes && (
                    <div className="py-3 text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleLoadMoreMixes}
                        disabled={loadingMoreMixes}
                        className="border-gold/40 text-gold hover:bg-gold/10 text-xs"
                      >
                        {loadingMoreMixes ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        Load More Mixes ({mixTotal - availableMixes.length} remaining)
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>'''

new_picker_modal = '''      {/* Add Mix Picker Modal */}
      <Dialog open={Boolean(mixPickerPlaylist)} onOpenChange={handleCloseMixPicker}>
        <DialogContent className="bg-black-elevated border-dark-gray text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gold text-base font-bold">
              <Plus className="w-5 h-5" />
              Add Mixes to "{mixPickerPlaylist?.title}"
            </DialogTitle>
            <DialogDescription className="text-xs text-text-secondary">
              Search and select mixes to add. Click the checkbox to select multiple, then "Add Selected".
              {mixTotal > 0 && (
                <span className="block mt-1 text-gold">
                  Showing {availableMixes.length} of {mixTotal} mixes
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="relative">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search mix by title, genre, or DJ name..."
                value={searchMixQuery}
                onChange={(e) => handleSearchMixChange(e.target.value)}
                className="pl-9 bg-black-surface border-dark-gray text-xs text-white"
              />
            </div>

            {selectedMixIds.size > 0 && (
              <div className="flex items-center justify-between bg-gold/10 border border-gold/30 rounded-lg px-3 py-2">
                <span className="text-xs text-gold font-semibold">{selectedMixIds.size} mix(es) selected</span>
                <Button
                  size="sm"
                  onClick={handleAddSelectedMixes}
                  disabled={addingBulk}
                  className="bg-gold text-black hover:bg-gold-light text-xs font-semibold h-7 px-3"
                >
                  {addingBulk ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
                  Add Selected
                </Button>
              </div>
            )}

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {searchingMixes ? (
                <div className="py-8 text-center">
                  <Loader2 className="w-6 h-6 text-gold animate-spin mx-auto" />
                </div>
              ) : availableMixes.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-6">No mixes matched your search</p>
              ) : (
                <>
                  {availableMixes.map((mix) => {
                    const isSelected = selectedMixIds.has(mix.id);
                    return (
                      <div
                        key={mix.id}
                        className={`flex items-center justify-between bg-black-surface p-2.5 rounded-lg border transition ${isSelected ? 'border-gold/60 bg-gold/5' : 'border-dark-gray hover:border-gold/40'}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            onClick={() => handleToggleMixSelection(mix.id)}
                            className="shrink-0 text-gold hover:text-gold-light"
                          >
                            {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-text-muted" />}
                          </button>
                          <img
                            src={getMediaUrl(mix.coverImage) || '/placeholder-mix.jpg'}
                            alt={mix.title}
                            className="w-9 h-9 rounded object-cover border border-dark-gray"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{mix.title}</p>
                            <p className="text-[10px] text-text-muted truncate">
                              {mix.dj?.stageName} • <span className="text-gold">{mix.genre}</span>
                            </p>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => handleAddSingleMix(mix.id)}
                          className="bg-gold text-black hover:bg-gold-light text-xs font-semibold h-7 px-2.5 shrink-0"
                        >
                          + Add
                        </Button>
                      </div>
                    );
                  })}

                  {hasMoreMixes && (
                    <div className="py-3 text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleLoadMoreMixes}
                        disabled={loadingMoreMixes}
                        className="border-gold/40 text-gold hover:bg-gold/10 text-xs"
                      >
                        {loadingMoreMixes ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        Load More Mixes ({mixTotal - availableMixes.length} remaining)
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>'''

content = content.replace(old_picker_modal, new_picker_modal)

# 6. Also update handleRemoveMixFromPlaylist to not have a trailing semicolon issue
# (no change needed, it's fine)

with open('/opt/deck-salone-v2/app/src/pages/moderator/ModeratorPlaylists.tsx', 'w') as f:
    f.write(content)

print('✅ ModeratorPlaylists.tsx updated — multi-select bulk add')

print('')
print('🎉 ALL PLAYLIST FIXES APPLIED')
