import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useStateWithAi, useSession } from '@bnbarak/reactai/react';
import { snapshotRegistry } from '@bnbarak/reactai/react';

// ─── Track library ────────────────────────────────────────────────────────────

const TRACKS = [
  { id: 1, title: 'Midnight Drive',  artist: 'Neon Pulse',    bpm: 128, genre: 'House'       },
  { id: 2, title: 'Solar Winds',     artist: 'Cosmic Beat',   bpm: 140, genre: 'Techno'      },
  { id: 3, title: 'Deep Current',    artist: 'Bass Theory',   bpm: 120, genre: 'Deep House'  },
  { id: 4, title: 'Electric Sky',    artist: 'Voltage',       bpm: 132, genre: 'Tech House'  },
  { id: 5, title: 'Night Protocol',  artist: 'Hex Grid',      bpm: 145, genre: 'Techno'      },
  { id: 6, title: 'Pulse Wave',      artist: 'Analog Dreams', bpm: 124, genre: 'House'       },
  { id: 7, title: 'Chromatic',       artist: 'Prism',         bpm: 136, genre: 'Progressive' },
  { id: 8, title: 'Submerge',        artist: 'Depth Charge',  bpm: 118, genre: 'Deep House'  },
];

const TRACK_COLORS = ['#e74c3c','#e67e22','#f1c40f','#2ecc71','#1abc9c','#3498db','#9b59b6','#e91e63'];

const BASS_FREQS = [110, 123, 98, 130, 82, 73, 92, 65]; // A2–C2 range per track

type BeatPattern = { kick: number[]; snare: number[]; hihat: number[]; bass: number[] };

const BEAT_PATTERNS: Record<string, BeatPattern> = {
  House:       { kick: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0], snare: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0], hihat: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0], bass: [1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0] },
  Techno:      { kick: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,1], snare: [0,0,0,0,1,0,1,0,0,0,0,0,1,0,0,0], hihat: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], bass: [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0] },
  'Deep House':{ kick: [1,0,0,1,0,0,1,0,1,0,0,1,0,0,1,0], snare: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0], hihat: [0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0], bass: [1,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0] },
  'Tech House':{ kick: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0], snare: [0,0,0,0,1,0,0,1,0,0,0,0,1,0,0,0], hihat: [1,0,1,1,1,0,1,0,1,0,1,1,1,0,1,0], bass: [1,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0] },
  Progressive: { kick: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0], snare: [0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0], hihat: [1,0,0,1,0,0,1,0,1,0,0,1,0,0,1,0], bass: [1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0] },
};

// ─── Audio synthesis ──────────────────────────────────────────────────────────

function playKick(ctx: AudioContext, out: AudioNode, time: number) {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.connect(env); env.connect(out);
  osc.frequency.setValueAtTime(120, time);
  osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.4);
  env.gain.setValueAtTime(1.8, time);
  env.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
  osc.start(time); osc.stop(time + 0.5);
}

function playSnare(ctx: AudioContext, out: AudioNode, time: number) {
  const len = Math.round(ctx.sampleRate * 0.15);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const env = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass'; filter.frequency.value = 1200; filter.Q.value = 0.5;
  src.connect(filter); filter.connect(env); env.connect(out);
  env.gain.setValueAtTime(0.7, time);
  env.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
  src.start(time); src.stop(time + 0.2);
}

function playHihat(ctx: AudioContext, out: AudioNode, time: number) {
  const len = Math.round(ctx.sampleRate * 0.04);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const env = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass'; filter.frequency.value = 8000;
  src.connect(filter); filter.connect(env); env.connect(out);
  env.gain.setValueAtTime(0.25, time);
  env.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
  src.start(time); src.stop(time + 0.08);
}

function playBass(ctx: AudioContext, out: AudioNode, time: number, freq: number) {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass'; filter.frequency.value = 400; filter.Q.value = 3;
  osc.type = 'sawtooth'; osc.frequency.value = freq;
  osc.connect(filter); filter.connect(env); env.connect(out);
  env.gain.setValueAtTime(0.8, time);
  env.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
  osc.start(time); osc.stop(time + 0.25);
}

function scheduleStep(ctx: AudioContext, out: AudioNode, step: number, time: number, pattern: BeatPattern, bassFreq: number) {
  if (pattern.kick[step])  playKick(ctx, out, time);
  if (pattern.snare[step]) playSnare(ctx, out, time);
  if (pattern.hihat[step]) playHihat(ctx, out, time);
  if (pattern.bass[step])  playBass(ctx, out, time, bassFreq);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const VuMeter = ({ playing, volume }: { playing: boolean; volume: number }) => {
  const [levels, setLevels] = useState<number[]>(Array(10).fill(0));
  useEffect(() => {
    if (!playing) { setLevels(Array(10).fill(0)); return; }
    const id = setInterval(() => {
      setLevels(Array(10).fill(0).map((_, i) => {
        const base = (volume / 100) * (1 - i / 10);
        return Math.random() < base + 0.15 ? 1 : 0;
      }));
    }, 100);
    return () => clearInterval(id);
  }, [playing, volume]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: 2, height: 72, width: 20 }}>
      {levels.map((lit, i) => {
        const col = i >= 8 ? '#e74c3c' : i >= 6 ? '#f39c12' : '#00e676';
        return <div key={i} style={{ height: 4, background: lit ? col : '#1a1a1a', borderRadius: 1, transition: 'background 0.08s' }} />;
      })}
    </div>
  );
};

const Vinyl = ({ playing, trackId }: { playing: boolean; trackId: number }) => {
  const color = TRACK_COLORS[(trackId - 1) % TRACK_COLORS.length];
  return (
    <div style={{
      width: 148, height: 148, borderRadius: '50%', flexShrink: 0,
      background: 'conic-gradient(#181818 0deg,#232323 20deg,#181818 40deg,#242424 60deg,#181818 80deg,#222 100deg,#181818 120deg,#232323 140deg,#181818 160deg,#222 180deg,#181818 200deg,#242424 220deg,#181818 240deg,#222 260deg,#181818 280deg,#232323 300deg,#181818 320deg,#222 340deg,#181818 360deg)',
      boxShadow: playing ? `0 0 20px ${color}55` : '0 4px 12px #00000099',
      display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
      animation: playing ? 'vinyl-spin 1.8s linear infinite' : 'none',
      transition: 'box-shadow 0.5s',
    }}>
      {[120, 100, 80].map(s => (
        <div key={s} style={{ position: 'absolute', width: s, height: s, borderRadius: '50%', border: '1px solid #2a2a2a' }} />
      ))}
      <div style={{ width: 46, height: 46, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5)' }}>
        <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#0d0d0d' }} />
      </div>
    </div>
  );
};

const Deck = ({ side, trackId, playing, volume }: { side: 'A' | 'B'; trackId: number; playing: boolean; volume: number }) => {
  const track = TRACKS.find(t => t.id === trackId) ?? TRACKS[0];
  const color = TRACK_COLORS[(trackId - 1) % TRACK_COLORS.length];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '18px 14px', background: '#0d0d0d', border: `1px solid ${playing ? '#222' : '#181818'}`, borderRadius: 4, width: 210 }}>
      <div style={{ alignSelf: 'stretch', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: playing ? color : '#333', fontWeight: 'bold' }}>DECK {side}</span>
        <span style={{ fontFamily: 'monospace', fontSize: 9, color: playing ? '#00e676' : '#2a2a2a' }}>{playing ? '▶ PLAYING' : '■ STOPPED'}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Vinyl playing={playing} trackId={trackId} />
        <VuMeter playing={playing} volume={volume} />
      </div>
      <div style={{ alignSelf: 'stretch', borderTop: '1px solid #181818', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#ddd', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.title}</div>
        <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#555' }}>{track.artist}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 9, color: color }}>{track.genre}</span>
          <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#444' }}>{track.bpm} BPM</span>
        </div>
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

interface PatchEntry { time: string; fields: string }

export const DjPage = () => {
  const { sessionId, serverUrl } = useSession();

  const [djState, , djRef] = useStateWithAi(
    'AI DJ mixing board — two decks and a crossfader mixer. The AI controls everything autonomously.',
    {
      deckATrackId: 1,
      deckAPlaying: true,
      deckBTrackId: 2,
      deckBPlaying: false,
      crossfader: 0,
      volumeA: 80,
      volumeB: 80,
      djNote: 'Warming up the decks…',
    },
  );

  const s = djState as {
    deckATrackId: number; deckAPlaying: boolean;
    deckBTrackId: number; deckBPlaying: boolean;
    crossfader: number; volumeA: number; volumeB: number; djNote: string;
  };

  // ── Audio engine ─────────────────────────────────────────────────────────
  const [audioOn, setAudioOn] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const gainARef = useRef<GainNode | null>(null);
  const gainBRef = useRef<GainNode | null>(null);
  const schedulerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepARef = useRef(0); const nextTimeARef = useRef(0);
  const stepBRef = useRef(0); const nextTimeBRef = useRef(0);
  const stateRef = useRef(s);

  useEffect(() => { stateRef.current = s; }, [s]);

  // Update gain nodes when crossfader / volumes change
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx || !gainARef.current || !gainBRef.current) return;
    const xf = s.crossfader / 100;
    const gA = Math.cos(xf * Math.PI / 2) * (s.volumeA / 100);
    const gB = Math.sin(xf * Math.PI / 2) * (s.volumeB / 100);
    gainARef.current.gain.setTargetAtTime(gA, ctx.currentTime, 0.05);
    gainBRef.current.gain.setTargetAtTime(gB, ctx.currentTime, 0.05);
  }, [s.crossfader, s.volumeA, s.volumeB]);

  // Reset beat position when a track changes so it starts from beat 1
  useEffect(() => { stepARef.current = 0; nextTimeARef.current = ctxRef.current?.currentTime ?? 0; }, [s.deckATrackId]);
  useEffect(() => { stepBRef.current = 0; nextTimeBRef.current = ctxRef.current?.currentTime ?? 0; }, [s.deckBTrackId]);
  useEffect(() => { if (s.deckAPlaying) nextTimeARef.current = ctxRef.current?.currentTime ?? 0; }, [s.deckAPlaying]);
  useEffect(() => { if (s.deckBPlaying) nextTimeBRef.current = ctxRef.current?.currentTime ?? 0; }, [s.deckBPlaying]);

  const startAudio = useCallback(() => {
    const ctx = new AudioContext();
    ctxRef.current = ctx;

    const gA = ctx.createGain(); gA.gain.value = stateRef.current.volumeA / 100;
    const gB = ctx.createGain(); gB.gain.value = 0;
    gainARef.current = gA; gainBRef.current = gB;
    gA.connect(ctx.destination); gB.connect(ctx.destination);

    nextTimeARef.current = ctx.currentTime;
    nextTimeBRef.current = ctx.currentTime;

    const tick = () => {
      const cur = stateRef.current;

      if (cur.deckAPlaying) {
        const track = TRACKS.find(t => t.id === cur.deckATrackId) ?? TRACKS[0];
        const stepTime = 60 / (track.bpm * 4);
        const pattern = BEAT_PATTERNS[track.genre] ?? BEAT_PATTERNS['House'];
        const freq = BASS_FREQS[track.id - 1];
        while (nextTimeARef.current < ctx.currentTime + 0.12) {
          scheduleStep(ctx, gA, stepARef.current, nextTimeARef.current, pattern, freq);
          stepARef.current = (stepARef.current + 1) % 16;
          nextTimeARef.current += stepTime;
        }
      }

      if (cur.deckBPlaying) {
        const track = TRACKS.find(t => t.id === cur.deckBTrackId) ?? TRACKS[0];
        const stepTime = 60 / (track.bpm * 4);
        const pattern = BEAT_PATTERNS[track.genre] ?? BEAT_PATTERNS['House'];
        const freq = BASS_FREQS[track.id - 1];
        while (nextTimeBRef.current < ctx.currentTime + 0.12) {
          scheduleStep(ctx, gB, stepBRef.current, nextTimeBRef.current, pattern, freq);
          stepBRef.current = (stepBRef.current + 1) % 16;
          nextTimeBRef.current += stepTime;
        }
      }

      schedulerRef.current = setTimeout(tick, 25);
    };
    tick();
    setAudioOn(true);
  }, []);

  useEffect(() => () => {
    if (schedulerRef.current) clearTimeout(schedulerRef.current);
    ctxRef.current?.close();
  }, []);

  // ── Patch activity log ───────────────────────────────────────────────────
  const [patchLog, setPatchLog] = useState<PatchEntry[]>([]);
  const prevStateRef = useRef(s);

  useEffect(() => {
    const prev = prevStateRef.current as Record<string, unknown>;
    const curr = s as unknown as Record<string, unknown>;
    const changed = Object.keys(curr).filter(k => prev[k] !== curr[k]);
    if (changed.length > 0) {
      const fields = changed.map(k => {
        const v = curr[k];
        return `${k}=${typeof v === 'string' ? `"${v}"` : v}`;
      }).join('  ');
      const time = new Date().toLocaleTimeString('en-US', { hour12: false });
      setPatchLog(log => [{ time, fields }, ...log].slice(0, 30));
    }
    prevStateRef.current = s;
  }, [s]);

  // ── Autonomous AI loop ───────────────────────────────────────────────────
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const callAi = useCallback(async () => {
    if (!sessionId) return;
    const snapshot = snapshotRegistry.getAll();
    const trackList = TRACKS.map(t => `${t.id}=${t.title}(${t.bpm}bpm,${t.genre})`).join(',');
    const deckATrack = TRACKS.find(t => t.id === s.deckATrackId);
    const deckBTrack = TRACKS.find(t => t.id === s.deckBTrackId);
    const prompt =
      `You are an autonomous AI DJ. Available tracks: ${trackList}. ` +
      `Deck A: "${deckATrack?.title}" ${s.deckAPlaying ? 'PLAYING' : 'STOPPED'}. ` +
      `Deck B: "${deckBTrack?.title}" ${s.deckBPlaying ? 'PLAYING' : 'STOPPED'}. ` +
      `Crossfader: ${s.crossfader} (0=full A, 100=full B). VolumeA: ${s.volumeA}. VolumeB: ${s.volumeB}. ` +
      `Make a creative DJ decision — blend decks, transition tracks, build energy, or drop. ` +
      `Patch any of: deckATrackId(1-8), deckAPlaying(bool), deckBTrackId(1-8), deckBPlaying(bool), ` +
      `crossfader(0-100), volumeA(0-100), volumeB(0-100), djNote(string). ` +
      `Never leave both decks stopped. Make smooth transitions.`;
    await fetch(`${serverUrl}/ai/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, prompt, snapshot, currentUrl: window.location.href }),
    });
  }, [sessionId, serverUrl, s]);

  const callAiRef = useRef(callAi);
  useEffect(() => { callAiRef.current = callAi; }, [callAi]);

  const scheduleAiCall = useCallback(() => {
    const delay = 7000 + Math.random() * 6000;
    aiTimerRef.current = setTimeout(async () => {
      await callAiRef.current();
      scheduleAiCall();
    }, delay);
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    aiTimerRef.current = setTimeout(async () => {
      await callAiRef.current();
      scheduleAiCall();
    }, 2000);
    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current); };
  }, [sessionId, scheduleAiCall]);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div ref={djRef as React.Ref<HTMLDivElement>} style={{ padding: 24, background: '#080808', minHeight: '100%', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <style>{`@keyframes vinyl-spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 'bold', letterSpacing: 4, color: '#eee' }}>AI DJ</span>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#00e676', boxShadow: '0 0 6px #00e676' }} />
        <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#333' }}>AUTONOMOUS</span>
        <div style={{ flex: 1 }} />
        {!audioOn ? (
          <button
            onClick={startAudio}
            style={{ padding: '5px 14px', border: '1px solid #00e676', background: 'transparent', color: '#00e676', fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, cursor: 'pointer', borderRadius: 2 }}
          >
            ▶ ENABLE AUDIO
          </button>
        ) : (
          <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#00e67688', letterSpacing: 2 }}>♫ AUDIO ON</span>
        )}
      </div>

      {/* Decks + Mixer */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <Deck side="A" trackId={s.deckATrackId} playing={s.deckAPlaying} volume={s.volumeA} />

        {/* Mixer column */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '16px 12px', background: '#0d0d0d', border: '1px solid #181818', borderRadius: 4, alignSelf: 'stretch', justifyContent: 'center', minWidth: 100 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 8, letterSpacing: 3, color: '#2a2a2a' }}>MIXER</span>

          {/* Volume faders */}
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end' }}>
            {([['A', s.volumeA], ['B', s.volumeB]] as [string, number][]).map(([lbl, vol]) => (
              <div key={lbl} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 8, color: '#333' }}>{vol}</span>
                <div style={{ position: 'relative', width: 10, height: 72 }}>
                  <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, background: '#181818', transform: 'translateX(-50%)' }} />
                  <div style={{ position: 'absolute', left: 0, right: 0, height: 8, top: `${100 - vol}%`, background: '#aaa', border: '1px solid #555', borderRadius: 1, transition: 'top 0.4s' }} />
                </div>
                <span style={{ fontFamily: 'monospace', fontSize: 8, color: '#333', letterSpacing: 1 }}>{lbl}</span>
              </div>
            ))}
          </div>

          {/* Crossfader */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 7, letterSpacing: 1, color: '#2a2a2a' }}>XFADE</span>
            <div style={{ position: 'relative', width: 80, height: 16 }}>
              <div style={{ position: 'absolute', top: '50%', left: 4, right: 4, height: 2, background: '#1e1e1e', transform: 'translateY(-50%)', borderRadius: 1 }} />
              <div style={{
                position: 'absolute', top: '50%', left: `calc(${s.crossfader}% * 0.75)`,
                transform: 'translate(-50%, -50%)', width: 16, height: 16,
                background: '#ccc', border: '1px solid #555', borderRadius: 2,
                transition: 'left 0.4s ease',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: 80 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 7, color: s.crossfader < 40 ? '#00e676' : '#2a2a2a' }}>A</span>
              <span style={{ fontFamily: 'monospace', fontSize: 7, color: s.crossfader > 60 ? '#00e676' : '#2a2a2a' }}>B</span>
            </div>
          </div>
        </div>

        <Deck side="B" trackId={s.deckBTrackId} playing={s.deckBPlaying} volume={s.volumeB} />
      </div>

      {/* AI note */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4, borderTop: '1px solid #141414' }}>
        <span style={{ fontFamily: 'monospace', fontSize: 8, color: '#00e676', letterSpacing: 2, flexShrink: 0 }}>♫ AI</span>
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#555', fontStyle: 'italic' }}>{s.djNote}</span>
      </div>

      {/* Patch activity log */}
      <div style={{ borderTop: '1px solid #111', paddingTop: 12 }}>
        <div style={{ fontFamily: 'monospace', fontSize: 8, letterSpacing: 2, color: '#282828', marginBottom: 8 }}>AI PATCH STREAM</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 120, overflowY: 'auto' }}>
          {patchLog.length === 0 ? (
            <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#222' }}>waiting for AI…</span>
          ) : patchLog.map((entry, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
              <span style={{ fontFamily: 'monospace', fontSize: 8, color: '#333', flexShrink: 0 }}>{entry.time}</span>
              <span style={{ fontFamily: 'monospace', fontSize: 9, color: i === 0 ? '#00e676' : '#3a3a3a' }}>{entry.fields}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Track library */}
      <div style={{ borderTop: '1px solid #111', paddingTop: 12 }}>
        <div style={{ fontFamily: 'monospace', fontSize: 8, letterSpacing: 2, color: '#282828', marginBottom: 8 }}>LIBRARY</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {TRACKS.map(t => {
            const onA = s.deckATrackId === t.id, onB = s.deckBTrackId === t.id;
            const color = TRACK_COLORS[(t.id - 1) % TRACK_COLORS.length];
            return (
              <div key={t.id} style={{ padding: '4px 10px', border: `1px solid ${onA || onB ? color : '#181818'}`, borderRadius: 2, background: onA || onB ? `${color}0d` : 'transparent', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: onA || onB ? color : '#222' }} />
                <div>
                  <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#bbb' }}>{t.title}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 8, color: '#3a3a3a' }}>{t.bpm} · {t.genre}</div>
                </div>
                {onA && <span style={{ fontFamily: 'monospace', fontSize: 7, color: color }}>A</span>}
                {onB && <span style={{ fontFamily: 'monospace', fontSize: 7, color: color }}>B</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
