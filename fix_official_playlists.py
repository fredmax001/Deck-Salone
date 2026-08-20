#!/usr/bin/env python3

with open('/opt/deck-salone-v2/app/src/pages/OfficialPlaylists.tsx', 'r') as f:
    content = f.read()

# Add error state
content = content.replace(
    "const [loading, setLoading] = useState(true);\n  const [playlists, setPlaylists] = useState<any[]>([]);",
    "const [loading, setLoading] = useState(true);\n  const [playlists, setPlaylists] = useState<any[]>([]);\n  const [error, setError] = useState('');"
)

# Update fetchPlaylists to handle errors
old_fetch = """  const fetchPlaylists = async () => {
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
  };"""

new_fetch = """  const fetchPlaylists = async () => {
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
  };"""
content = content.replace(old_fetch, new_fetch)

# Add error display before playlist grid
old_grid = "      {/* Playlist Grid */}\n      {loading ? ("
new_grid = """      {/* Playlist Grid */}
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
      {loading ? ("""
content = content.replace(old_grid, new_grid)

with open('/opt/deck-salone-v2/app/src/pages/OfficialPlaylists.tsx', 'w') as f:
    f.write(content)

print('OfficialPlaylists.tsx updated')
