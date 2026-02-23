import React from 'react'
import { motion } from 'motion/react'
import { useStateWithAi } from '@bnbarak/reactai/react'

type Mood = 'energetic' | 'chill' | 'happy' | 'sad' | 'focused'

interface MoodConfig {
  colors: string[]
  speed: number
}

const MOOD_CONFIGS: Record<Mood, MoodConfig> = {
  energetic: { colors: ['#ff1744', '#ff5722', '#ff9800', '#ff1744', '#f44336'], speed: 0.3 },
  chill:     { colors: ['#1565c0', '#1976d2', '#42a5f5', '#90caf9', '#1565c0'], speed: 1.2 },
  happy:     { colors: ['#f9a825', '#fdd835', '#ffee58', '#f9a825', '#fbc02d'], speed: 0.5 },
  sad:       { colors: ['#616161', '#757575', '#9e9e9e', '#616161', '#424242'], speed: 1.8 },
  focused:   { colors: ['#1b5e20', '#2e7d32', '#43a047', '#66bb6a', '#1b5e20'], speed: 0.8 },
}

const BAR_BASE_HEIGHTS = [55, 80, 40, 95, 60, 75, 35, 90, 50, 70, 45, 85, 62, 78, 42, 92, 58, 68, 38, 88, 54, 72]

export const MusicPage = () => {
  const [player, , playerRef] = useStateWithAi(
    'Music player state',
    {
      trackName: 'Neon Drift',
      artist: 'Synthwave Collective',
      album: 'Electric Horizons',
      progress: 42,
      volume: 68,
      isPlaying: true,
      mood: 'energetic' as Mood,
    },
    { mood: ['energetic', 'chill', 'happy', 'sad', 'focused'] },
  )

  const [playlist, , playlistRef] = useStateWithAi(
    'Music player playlist',
    {
      currentTrackIndex: 0,
      tracks: [
        { title: 'Neon Drift',        artist: 'Synthwave Collective', duration: '3:42' },
        { title: 'Midnight Protocol', artist: 'Synthwave Collective', duration: '4:17' },
        { title: 'Electric Pulse',    artist: 'Vapor Dreams',         duration: '3:55' },
        { title: 'City of Glass',     artist: 'Vapor Dreams',         duration: '5:03' },
        { title: 'Retrograde',        artist: 'Neon Phantom',         duration: '4:28' },
      ],
    },
  )

  const mood = (player.mood as Mood) ?? 'energetic'
  const moodCfg = MOOD_CONFIGS[mood]
  const isPlaying = Boolean(player.isPlaying)
  const volume = Number(player.volume)
  const progress = Number(player.progress)
  const currentIndex = Number(playlist.currentTrackIndex)
  const tracks = playlist.tracks as Array<{ title: string; artist: string; duration: string }>

  return (
    <div style={{ padding: 32, fontFamily: 'monospace', maxWidth: 700 }}>
      <h2 style={{ margin: '0 0 32px', fontSize: 20, fontWeight: 'bold', letterSpacing: -0.5 }}>
        Music Player
      </h2>

      <div
        ref={playerRef as React.RefObject<HTMLDivElement>}
        style={{ border: '2px solid black', padding: 28, marginBottom: 24 }}
      >
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 4 }}>{String(player.trackName)}</div>
          <div style={{ fontSize: 13, color: '#666' }}>
            {String(player.artist)} — {String(player.album)}
          </div>
        </div>

        <div
          key={mood}
          style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80, marginBottom: 24 }}
        >
          {BAR_BASE_HEIGHTS.map((peak, i) => {
            const trough = Math.max(4, peak * 0.25)
            return (
              <motion.div
                key={i}
                animate={{ height: isPlaying ? [peak, trough, peak] : 4 }}
                transition={{
                  duration: moodCfg.speed,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: (i % 5) * moodCfg.speed * 0.15,
                }}
                style={{
                  width: 8,
                  background: moodCfg.colors[i % moodCfg.colors.length],
                  borderRadius: 2,
                  alignSelf: 'flex-end',
                  flexShrink: 0,
                }}
              />
            )
          })}
        </div>

        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              height: 4,
              background: '#eee',
              position: 'relative',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${progress}%`,
                background: 'black',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#888', marginTop: 4 }}>
            <span>{Math.floor((progress / 100) * 222)}s</span>
            <span>3:42</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                border: '2px solid black',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                cursor: 'pointer',
                background: isPlaying ? 'black' : 'white',
                color: isPlaying ? 'white' : 'black',
              }}
            >
              {isPlaying ? '⏸' : '▶'}
            </div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: 1,
                textTransform: 'uppercase',
                padding: '4px 10px',
                border: '1px solid black',
                background: '#f0f0f0',
              }}
            >
              {mood}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#888' }}>Vol</span>
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              readOnly
              style={{ width: 80, cursor: 'default' }}
            />
            <span style={{ fontSize: 12, minWidth: 28 }}>{volume}</span>
          </div>
        </div>
      </div>

      <div ref={playlistRef as React.RefObject<HTMLDivElement>}>
        <div style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: '#888', marginBottom: 12 }}>
          Playlist
        </div>
        {tracks.map((track, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 14px',
              borderBottom: '1px solid #eee',
              background: i === currentIndex ? '#f8f8f8' : 'white',
              fontWeight: i === currentIndex ? 'bold' : 'normal',
              borderLeft: i === currentIndex ? '3px solid black' : '3px solid transparent',
            }}
          >
            <div>
              <span style={{ fontSize: 11, color: '#aaa', marginRight: 12 }}>{i + 1}</span>
              <span style={{ fontSize: 13 }}>{track.title}</span>
              <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>— {track.artist}</span>
            </div>
            <span style={{ fontSize: 12, color: '#888' }}>{track.duration}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
