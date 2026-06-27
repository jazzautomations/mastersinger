import { useRef, useEffect, useState, useCallback } from 'react';
import { useStore } from '../store/store';
import { usePitchDetection } from '../audio/usePitchDetection';
import { t } from '../i18n/strings';
import { midiToCents } from '../services/theoryService';

type RecState = 'idle' | 'camera' | 'recording' | 'done';

export function Recorder() {
  const { profile } = useStore();
  const lang = profile.settings.language;
  const a4 = profile.settings.a4;
  const micSensitivity = profile.settings.micSensitivity ?? 0.5;
  const noiseGate = profile.settings.noiseGate ?? 0.02;

  const pitch = usePitchDetection({ a4, record: false, bufferSize: 8192, minConfidence: 0.30, micSensitivity, noiseGate });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animRef = useRef<number>(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [state, setState] = useState<RecState>('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoUrlRef = useRef<string | null>(null);

  // ── Start camera ──
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false, // mic handled by usePitchDetection
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      await pitch.start();
      setState('camera');
    } catch (e: any) {
      setCameraError(e.message || t(lang, 'recorder.noCamera'));
    }
  }, [lang, pitch]);

  // ── Canvas render loop ──
  useEffect(() => {
    if (state !== 'camera' && state !== 'recording') return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    const draw = () => {
      // Camera feed (mirrored)
      ctx.save();
      ctx.translate(W, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, W, H);
      ctx.restore();

      // Dark overlay top/bottom
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, 'rgba(0,0,0,0.6)');
      grad.addColorStop(0.15, 'rgba(0,0,0,0)');
      grad.addColorStop(0.85, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.7)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      const frame = pitch.currentFrame;
      const isVoiced = frame && frame.confidence > 0.25 && frame.frequency > 50;

      // Logo (top-left)
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = `bold ${Math.round(W * 0.035)}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText('🎤 MasterSinger', W * 0.04, H * 0.06);

      // Timer (top-right)
      if (state === 'recording') {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(W * 0.92, H * 0.05, W * 0.012, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.textAlign = 'right';
        ctx.fillText(formatTime(elapsed), W * 0.96, H * 0.065);
      }

      // Note name (center)
      if (isVoiced && frame) {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#a78bfa';
        ctx.shadowBlur = 20;
        ctx.font = `900 ${Math.round(W * 0.14)}px Inter, system-ui, sans-serif`;
        ctx.fillText(frame.noteName, W / 2, H * 0.48);
        ctx.shadowBlur = 0;

        // Cents
        const cents = midiToCents(frame.midi);
        const centsStr = cents > 0 ? `+${cents.toFixed(0)}` : cents.toFixed(0);
        ctx.font = `bold ${Math.round(W * 0.04)}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = Math.abs(cents) < 10 ? '#4ade80' : Math.abs(cents) < 25 ? '#facc15' : '#f87171';
        ctx.fillText(`${centsStr} cents`, W / 2, H * 0.56);

        // Frequency
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = `${Math.round(W * 0.025)}px Inter, system-ui, sans-serif`;
        ctx.fillText(`${frame.frequency.toFixed(1)} Hz`, W / 2, H * 0.62);

        // Pitch bar (horizontal indicator)
        const barW = W * 0.5;
        const barX = (W - barW) / 2;
        const barY = H * 0.68;
        const barH = H * 0.008;

        // Background
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        roundRect(ctx, barX, barY, barW, barH, barH / 2);
        ctx.fill();

        // Indicator dot
        const normalizedCents = Math.max(-50, Math.min(50, cents)) / 50;
        const dotX = barX + barW / 2 + normalizedCents * (barW / 2);
        ctx.fillStyle = Math.abs(cents) < 10 ? '#4ade80' : Math.abs(cents) < 25 ? '#facc15' : '#f87171';
        ctx.beginPath();
        ctx.arc(dotX, barY + barH / 2, barH * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Center line
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(barX + barW / 2 - 1, barY - barH, 2, barH * 3);
      } else {
        // No signal
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = `${Math.round(W * 0.035)}px Inter, system-ui, sans-serif`;
        ctx.fillText('🎤', W / 2, H * 0.5);
        ctx.font = `${Math.round(W * 0.025)}px Inter, system-ui, sans-serif`;
        ctx.fillText(lang === 'pt-BR' ? 'Cante pra ver a nota' : 'Sing to see the note', W / 2, H * 0.56);
      }

      // "Gravando..." indicator
      if (state === 'recording') {
        ctx.fillStyle = '#ef4444';
        ctx.font = `bold ${Math.round(W * 0.02)}px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(t(lang, 'recorder.recording'), W / 2, H * 0.94);
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [state, pitch.currentFrame, elapsed, lang, a4]);

  // ── Timer ──
  useEffect(() => {
    if (state !== 'recording') return;
    const start = Date.now();
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 200);
    return () => clearInterval(iv);
  }, [state]);

  // ── Start recording ──
  const startRecording = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Canvas video stream
    const canvasStream = canvas.captureStream(30);

    // Reuse mic stream from usePitchDetection (no second getUserMedia)
    const micStream = pitch.micStream;
    if (micStream) {
      const micTrack = micStream.getAudioTracks()[0];
      if (micTrack) canvasStream.addTrack(micTrack);
    }
    recordStream(canvasStream);
  }, [pitch.micStream, lang]);

  const recordStream = (stream: MediaStream) => {
    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType });
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      setVideoBlob(blob);
      const url = URL.createObjectURL(blob);
      videoUrlRef.current = url;
      setVideoUrl(url);
      setState('done');
    };

    recorder.start(100);
    setState('recording');
    setElapsed(0);
  };

  // ── Stop recording ──
  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    }
  }, []);

  // ── Share / Download ──
  const share = useCallback(async () => {
    if (!videoBlob) return;
    const file = new File([videoBlob], 'mastersinger-video.webm', { type: 'video/webm' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'MasterSinger' });
    } else {
      download();
    }
  }, [videoBlob]);

  const download = useCallback(() => {
    if (!videoUrl) return;
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = 'mastersinger-video.webm';
    a.click();
  }, [videoUrl]);

  // ── Retake ──
  const retake = useCallback(() => {
    const url = videoUrlRef.current;
    if (url) URL.revokeObjectURL(url);
    videoUrlRef.current = null;
    setVideoUrl(null);
    setVideoBlob(null);
    setElapsed(0);
    setState('camera');
  }, []);

  // ── Cleanup ──
  useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.state === 'recording') {
        recorderRef.current.stop();
      }
      pitch.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
      const url = videoUrlRef.current;
      if (url) URL.revokeObjectURL(url);
    };
  }, []);

  // ── IDLE: show start screen ──
  if (state === 'idle') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md card p-8 space-y-6 text-center">
          <div className="text-6xl ring-pop">🎬</div>
          <div>
            <h1 className="text-2xl font-black display tracking-tight">{t(lang, 'recorder.title')}</h1>
            <p className="text-sm text-slate-400 mt-2">{t(lang, 'recorder.desc')}</p>
          </div>
          {cameraError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-xl p-3">{cameraError}</div>
          )}
          <button onClick={startCamera} className="btn-primary w-full text-sm py-3">
            {t(lang, 'recorder.start')}
          </button>
        </div>
      </div>
    );
  }

  // ── DONE: show preview ──
  if (state === 'done' && videoUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <video src={videoUrl} controls className="w-full rounded-2xl" />
          <div className="text-center text-sm text-green-400 font-bold">{t(lang, 'recorder.done')}</div>
          <div className="flex gap-3">
            <button onClick={share} className="btn-primary flex-1 text-sm py-3">
              {t(lang, 'recorder.share')}
            </button>
            <button onClick={download} className="btn-ghost flex-1 text-sm py-3">
              {t(lang, 'recorder.download')}
            </button>
          </div>
          <button onClick={retake} className="w-full text-xs text-slate-500 hover:text-slate-300 transition-all">
            {t(lang, 'recorder.retake')}
          </button>
        </div>
      </div>
    );
  }

  // ── CAMERA / RECORDING: canvas + video ──
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-0">
      <video ref={videoRef} className="hidden" playsInline muted />
      <canvas
        ref={canvasRef}
        width={720}
        height={1280}
        className="w-full max-h-[80vh] object-contain rounded-2xl"
      />
      <div className="fixed bottom-0 left-0 right-0 p-6 flex items-center justify-center gap-4 z-10"
           style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
        {state === 'camera' ? (
          <button onClick={startRecording}
                  className="w-20 h-20 rounded-full bg-red-500 border-4 border-white shadow-lg shadow-red-500/30 active:scale-95 transition-transform">
            <div className="w-16 h-16 rounded-full bg-red-500 mx-auto" />
          </button>
        ) : (
          <button onClick={stopRecording}
                  className="w-20 h-20 rounded-full bg-white border-4 border-red-500 shadow-lg active:scale-95 transition-transform flex items-center justify-center">
            <div className="w-8 h-8 rounded-sm bg-red-500" />
          </button>
        )}
      </div>
    </div>
  );
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
