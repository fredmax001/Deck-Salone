import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ListMusic, Play, X, Disc3 } from 'lucide-react';
import { useSet } from '@/hooks/useSets';

interface SetSummary {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  genre?: string;
  isPublic: boolean;
  createdAt: string;
  mixCount: number;
}

interface SetsTabProps {
  sets: SetSummary[];
}

export function SetsTab({ sets }: SetsTabProps) {
  const [expandedSetId, setExpandedSetId] = useState<string | null>(null);

  if (!sets || sets.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center py-20 text-text-muted"
      >
        <ListMusic size={48} className="mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">No sets yet</p>
        <p className="text-sm mt-2">Pro DJs can create curated playlists of their mixes.</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
    >
      {sets.map((set, i) => (
        <SetCard
          key={set.id}
          set={set}
          index={i}
          isExpanded={expandedSetId === set.id}
          onToggle={() => setExpandedSetId(expandedSetId === set.id ? null : set.id)}
        />
      ))}
    </motion.div>
  );
}

function SetCard({
  set,
  index,
  isExpanded,
  onToggle,
}: {
  set: SetSummary;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { data: setDetail, isLoading } = useSet(isExpanded ? set.id : undefined);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className="bg-[#111111] border border-[rgba(255,255,255,0.05)] rounded-2xl overflow-hidden hover:border-gold/30 transition-all duration-300"
    >
      <button
        onClick={onToggle}
        className="w-full text-left group"
      >
        <div className="relative aspect-[16/10] overflow-hidden">
          <img
            src={set.coverImage || '/mix-placeholder.jpg'}
            alt={set.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h4 className="font-display text-base font-semibold uppercase text-text-primary truncate">
              {set.title}
            </h4>
            {set.description && (
              <p className="mt-1 text-xs text-text-muted line-clamp-1">{set.description}</p>
            )}
            <div className="mt-2 flex items-center gap-3 text-xs text-text-muted">
              <span className="flex items-center gap-1">
                <Disc3 size={12} />
                {set.mixCount} {set.mixCount === 1 ? 'mix' : 'mixes'}
              </span>
              {set.genre && <span className="text-gold">{set.genre}</span>}
            </div>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden border-t border-[rgba(255,255,255,0.05)]"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-sm font-semibold text-text-primary">Tracks</h5>
                <button
                  onClick={onToggle}
                  className="p-1 rounded-full hover:bg-[#1E1E1E] text-text-muted"
                >
                  <X size={14} />
                </button>
              </div>

              {isLoading && (
                <div className="py-4 text-center text-text-muted text-sm">Loading tracks...</div>
              )}

              {!isLoading && setDetail?.items?.length === 0 && (
                <div className="py-4 text-center text-text-muted text-sm">This set is empty.</div>
              )}

              {!isLoading &&
                setDetail?.items?.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 py-2 border-b border-[rgba(255,255,255,0.03)] last:border-0"
                  >
                    <span className="text-xs text-text-muted w-4">{idx + 1}</span>
                    <img
                      src={item.mix.coverImage || '/mix-placeholder.jpg'}
                      alt={item.mix.title}
                      className="w-10 h-10 rounded object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary truncate">{item.mix.title}</p>
                      <p className="text-xs text-text-muted truncate">
                        {item.mix.dj?.stageName}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (item.mix.audioUrl) {
                          window.dispatchEvent(
                            new CustomEvent('play-mix', {
                              detail: {
                                track: item.mix,
                                queue: setDetail.items
                                  .filter((i) => i.mix.audioUrl)
                                  .map((i) => i.mix),
                              },
                            })
                          );
                        }
                      }}
                      disabled={!item.mix.audioUrl}
                      className="p-2 rounded-full bg-gold/10 text-gold hover:bg-gold/20 disabled:opacity-40"
                    >
                      <Play size={14} fill="currentColor" />
                    </button>
                  </div>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
