#!/usr/bin/env python3
"""
Redesign playlist pages to match MixHub card design:
  1. Feed.tsx Playlists tab — card grid with hover effects, gold accents
  2. OfficialPlaylists.tsx — match MixHub card style with motion animations
  3. OfficialPlaylistDetail.tsx — improved tracklist design
"""

import re

# ============================================================
# FIX 1: Feed.tsx — redesign Playlists tab as card grid
# ============================================================
with open('/opt/deck-salone-v2/app/src/pages/Feed.tsx', 'r') as f:
    content = f.read()

# Add motion import if missing
if 'motion' not in content.split('from')[0] or 'AnimatePresence' not in content:
    content = content.replace(
        "import { motion, AnimatePresence } from 'framer-motion';",
        "import { motion, AnimatePresence } from 'framer-motion';\nimport { getMediaUrl } from '@/lib/api';"
    )

# Replace the playlists case with proper card grid design
old_playlists = """      case 'playlists':
        return playlistsLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-gold animate-spin" />
          </div>
        ) : playlists.length === 0 ? (
          <p className="text-center text-sm text-text-muted py-12">No official playlists yet.</p>
        ) : (
          <div className="space-y-3">
            {playlists.map((pl: any) => (
              <Link key={pl.id} to={`/playlist/${pl.slug}`} className="group">
                <div className="flex items-center gap-3.5 rounded-2xl bg-black-surface border border-dark-gray hover:border-gold/40 p-3.5 transition-all">
                  <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-gold/20">
                    {pl.coverImage ? (
                      <img src={pl.coverImage.startsWith('http') ? pl.coverImage : `/uploads/${pl.coverImage}`} alt={pl.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gold/20 to-black-surface">
                        <ListMusic className="w-6 h-6 text-gold" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-text-primary group-hover:text-gold transition-colors truncate">{pl.title}</h3>
                    <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{pl.description || 'Official Deck Salone curated playlist.'}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border border-white/10 text-text-secondary">
                        {pl._count?.items || pl.items?.length || 0} Mixes
                      </span>
                      {pl.isFeatured && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-gold/20 text-gold border border-gold/30">
                          ⭐ Featured
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        );"""

new_playlists = """      case 'playlists':
        return playlistsLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-gold animate-spin" />
          </div>
        ) : playlists.length === 0 ? (
          <p className="text-center text-sm text-text-muted py-12">No official playlists yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {playlists.map((pl: any, idx: number) => (
              <motion.div
                key={pl.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06, duration: 0.4 }}
                className="group"
              >
                <Link to={`/playlist/${pl.slug}`}>
                  <div className="relative overflow-hidden rounded-xl bg-black-elevated border border-white/5 hover:border-gold/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
                    {/* Cover Art */}
                    <div className="relative aspect-video overflow-hidden">
                      {pl.coverImage ? (
                        <img
                          src={getMediaUrl(pl.coverImage)}
                          alt={pl.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gold/20 via-black-surface to-black-elevated">
                          <ListMusic className="w-12 h-12 text-gold mb-2" />
                          <span className="text-[10px] text-gold font-bold tracking-widest uppercase">Deck Salone Official</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                      {/* Featured Badge */}
                      {pl.isFeatured && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-gold text-black text-[10px] font-bold rounded-full shadow-lg">
                          ⭐ FEATURED
                        </div>
                      )}

                      {/* Play Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="w-12 h-12 rounded-full bg-gold-gradient flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                          <Play className="w-5 h-5 text-black ml-0.5" />
                        </div>
                      </div>

                      {/* Mix Count Badge */}
                      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-0.5 bg-black/70 backdrop-blur-sm rounded-full border border-white/10">
                        <Music className="w-3 h-3 text-gold" />
                        <span className="text-[10px] font-bold text-white">{pl._count?.items || pl.items?.length || 0} Mixes</span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3.5">
                      <h3 className="font-display text-sm font-bold uppercase text-white group-hover:text-gold transition-colors truncate">
                        {pl.title}
                      </h3>
                      <p className="text-xs text-text-secondary line-clamp-1 mt-1">
                        {pl.description || 'Official Deck Salone curated playlist.'}
                      </p>
                      <div className="mt-2.5 flex items-center justify-between">
                        <span className="inline-block px-2 py-0.5 text-[10px] font-medium text-gold border border-gold/30 rounded-full">
                          Official Playlist
                        </span>
                        <span className="text-[10px] text-text-muted font-mono">
                          {pl.items?.length > 0 ? `${pl.items.length} tracks` : 'Empty'}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        );"""

content = content.replace(old_playlists, new_playlists)

# Add getMediaUrl import if not present
if 'import { getMediaUrl }' not in content:
    content = content.replace(
        "import { api } from '@/lib/api';",
        "import { api, getMediaUrl } from '@/lib/api';"
    )

with open('/opt/deck-salone-v2/app/src/pages/Feed.tsx', 'w') as f:
    f.write(content)

print('✅ Feed.tsx Playlists tab redesigned as card grid')

# ============================================================
# FIX 2: OfficialPlaylists.tsx — match MixHub design
# ============================================================
with open('/opt/deck-salone-v2/app/src/pages/OfficialPlaylists.tsx', 'r') as f:
    content = f.read()

# Add motion import
content = content.replace(
    "import { useEffect, useState } from 'react';",
    "import { useEffect, useState } from 'react';\nimport { motion } from 'framer-motion';"
)

# Redesign the entire grid
old_grid = """      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {playlists.map((pl) => (
            <Link key={pl.id} to={`/playlist/${pl.slug}`}>
              <Card className="bg-black-elevated border-dark-gray hover:border-gold/60 p-4 transition-all duration-300 group flex flex-col justify-between h-full">
                <div className="space-y-3">
                  {/* Playlist Cover Art */}
                  <div className="relative aspect-video rounded-xl bg-black-surface border border-dark-gray overflow-hidden">
                    {pl.coverImage ? (
                      <img
                        src={getMediaUrl(pl.coverImage)}
                        alt={pl.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gold/20 via-black-surface to-black-elevated">
                        <ListMusic className="w-10 h-10 text-gold mb-1" />
                        <span className="text-[10px] text-gold font-bold tracking-widest uppercase">
                          Deck Salone Official
                        </span>
                      </div>
                    )}

                    {pl.isFeatured && (
                      <Badge className="absolute top-2 left-2 bg-gold text-black font-bold text-[10px]">
                        ⭐ FEATURED
                      </Badge>
                    )}

                    <button
                      onClick={(e) => handleQuickPlay(e, pl)}
                      title="Play this playlist"
                      className="absolute bottom-2 right-2 bg-black/80 hover:bg-gold hover:text-black backdrop-blur-md text-gold p-2.5 rounded-full opacity-0 group-hover:opacity-100 transition duration-300 shadow-lg hover:scale-110"
                    >
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </button>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-gold transition">
                      {pl.title}
                    </h3>
                    <p className="text-xs text-text-secondary line-clamp-2 mt-1">
                      {pl.description || 'Official Deck Salone curated playlist.'}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-dark-gray/60 flex items-center justify-between text-xs text-text-muted mt-4">
                  <span className="flex items-center gap-1">
                    <Music className="w-3.5 h-3.5 text-gold" />
                    {pl._count?.items || pl.items?.length || 0} Mixes
                  </span>
                  <span className="text-gold font-semibold text-[11px] flex items-center gap-1">
                    Official Playlist →
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}"""

new_grid = """      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {playlists.map((pl, idx) => (
            <motion.div
              key={pl.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06, duration: 0.4 }}
              className="group"
            >
              <Link to={`/playlist/${pl.slug}`}>
                <div className="relative overflow-hidden rounded-xl bg-black-elevated border border-white/5 hover:border-gold/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)] h-full flex flex-col">
                  {/* Cover Art */}
                  <div className="relative aspect-video overflow-hidden">
                    {pl.coverImage ? (
                      <img
                        src={getMediaUrl(pl.coverImage)}
                        alt={pl.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gold/20 via-black-surface to-black-elevated">
                        <ListMusic className="w-12 h-12 text-gold mb-2" />
                        <span className="text-[10px] text-gold font-bold tracking-widest uppercase">Deck Salone Official</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Featured Badge */}
                    {pl.isFeatured && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 bg-gold text-black text-[10px] font-bold rounded-full shadow-lg">
                        ⭐ FEATURED
                      </div>
                    )}

                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div
                        onClick={(e) => handleQuickPlay(e, pl)}
                        className="w-12 h-12 rounded-full bg-gold-gradient flex items-center justify-center hover:scale-110 transition-transform shadow-lg cursor-pointer"
                      >
                        <Play className="w-5 h-5 text-black ml-0.5" />
                      </div>
                    </div>

                    {/* Mix Count */}
                    <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-0.5 bg-black/70 backdrop-blur-sm rounded-full border border-white/10">
                      <Music className="w-3 h-3 text-gold" />
                      <span className="text-[10px] font-bold text-white">{pl._count?.items || pl.items?.length || 0} Mixes</span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-display text-sm font-bold uppercase text-white group-hover:text-gold transition-colors truncate">
                        {pl.title}
                      </h3>
                      <p className="text-xs text-text-secondary line-clamp-2 mt-1">
                        {pl.description || 'Official Deck Salone curated playlist.'}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="inline-block px-2 py-0.5 text-[10px] font-medium text-gold border border-gold/30 rounded-full">
                        Official Playlist
                      </span>
                      <span className="text-[10px] text-text-muted font-mono">
                        {pl.items?.length > 0 ? `${pl.items.length} tracks` : 'Empty'}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}"""

content = content.replace(old_grid, new_grid)

with open('/opt/deck-salone-v2/app/src/pages/OfficialPlaylists.tsx', 'w') as f:
    f.write(content)

print('✅ OfficialPlaylists.tsx redesigned to match MixHub cards')

# ============================================================
# FIX 3: OfficialPlaylistDetail.tsx — improve tracklist design
# ============================================================
with open('/opt/deck-salone-v2/app/src/pages/OfficialPlaylistDetail.tsx', 'r') as f:
    content = f.read()

# Add motion import
content = content.replace(
    "import { useEffect, useState } from 'react';",
    "import { useEffect, useState } from 'react';\nimport { motion } from 'framer-motion';"
)

# Improve tracklist item rendering
old_tracklist = """        {playlist.items?.length === 0 ? (
          <Card className="bg-black-elevated border-dark-gray p-8 text-center text-xs text-text-muted">
            No mixes added to this playlist yet.
          </Card>
        ) : (
          playlist.items?.map((item: any, index: number) => {
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
          })
        )}"""

new_tracklist = """        {playlist.items?.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-black-elevated p-8 text-center text-xs text-text-muted">
            No mixes added to this playlist yet.
          </div>
        ) : (
          <div className="space-y-2">
            {playlist.items?.map((item: any, index: number) => {
              const mix = item.mix;
              if (!mix) return null;
              const canPlay = Boolean(mix.audioUrl);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04, duration: 0.3 }}
                >
                  <div
                    onClick={() => canPlay && handlePlayTrack(mix)}
                    className={`bg-black-elevated border border-white/5 hover:border-gold/40 p-3 sm:p-3.5 rounded-xl flex items-center justify-between gap-4 transition-all duration-200 group ${canPlay ? 'cursor-pointer hover:bg-white/[0.02]' : 'opacity-50 cursor-not-allowed'}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-bold text-text-muted group-hover:text-gold w-5 text-center shrink-0 font-mono">
                        {index + 1}
                      </span>

                      <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-white/5 group-hover:border-gold/30 transition-colors">
                        <img
                          src={getMediaUrl(mix.coverImage) || '/placeholder-mix.jpg'}
                          alt={mix.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {canPlay && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="w-4 h-4 text-gold fill-gold" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-white group-hover:text-gold transition-colors truncate">
                          {mix.title}
                        </h3>
                        <p className="text-xs text-text-secondary truncate mt-0.5">
                          <span className="text-white font-medium">{mix.dj?.stageName}</span>
                          <span className="mx-1.5 text-text-muted">|</span>
                          <span className="text-gold">{mix.genre}</span>
                          {!canPlay && <span className="text-red-400 ml-2">(Unavailable)</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[10px] text-text-muted hidden sm:inline font-mono">▶ {mix.plays || 0}</span>
                      {canPlay ? (
                        <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-gold group-hover:bg-gold group-hover:text-black transition-all duration-200">
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-red-900/30 border border-red-800/40 flex items-center justify-center text-red-400">
                          <span className="text-[10px] font-bold">!</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}"""

content = content.replace(old_tracklist, new_tracklist)

with open('/opt/deck-salone-v2/app/src/pages/OfficialPlaylistDetail.tsx', 'w') as f:
    f.write(content)

print('✅ OfficialPlaylistDetail.tsx tracklist improved')

print('')
print('🎉 ALL PLAYLIST DESIGN FIXES APPLIED')
