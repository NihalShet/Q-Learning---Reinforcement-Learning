/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Video,
  Upload,
  Sparkles,
  Camera,
  Download,
  AlertCircle,
  Play,
  RotateCcw,
} from 'lucide-react';

interface VideoAnimatorProps {
  onCaptureSimulationCanvas?: () => string | null;
}

export const VideoAnimator: React.FC<VideoAnimatorProps> = ({
  onCaptureSimulationCanvas,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/png');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [prompt, setPrompt] = useState<string>(
    'Cinematic aerial video of this urban traffic intersection as signal lights change from red to green and vehicles smoothly accelerate along asphalt lanes.'
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generationTimeSec, setGenerationTimeSec] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const timerRef = useRef<any>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageMime(file.type || 'image/png');
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
      setGeneratedVideoUrl(null);
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
  };

  const handleCaptureCanvas = () => {
    if (!onCaptureSimulationCanvas) return;
    const dataUrl = onCaptureSimulationCanvas();
    if (dataUrl) {
      setImagePreview(dataUrl);
      setImageMime('image/png');
      setGeneratedVideoUrl(null);
      setErrorMsg(null);
    }
  };

  const handleGenerateVideo = async () => {
    if (!imagePreview || isGenerating) return;

    setIsGenerating(true);
    setErrorMsg(null);
    setGeneratedVideoUrl(null);
    setGenerationTimeSec(0);

    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      setGenerationTimeSec(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    try {
      const response = await fetch('/api/video/animate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imagePreview,
          mimeType: imageMime,
          prompt,
          aspectRatio,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${response.status}: Failed to generate video.`);
      }

      const data = await response.json();
      if (!data.videoUrl) {
        throw new Error('No video URL was returned from the server.');
      }

      setGeneratedVideoUrl(data.videoUrl);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred while generating video with gemini-omni-1.1-flash.');
    } finally {
      clearInterval(timerRef.current);
      setIsGenerating(false);
    }
  };

  const presetPrompts = [
    'Cars and delivery vans accelerating forward smoothly as the traffic light turns green, aerial cinematic drone view',
    'An emergency ambulance with flashing red and blue lights navigates through clearing intersection traffic at dusk',
    'Time-lapse of bustling urban intersection with neon vehicle light trails and dynamic traffic signal shifts',
    'Smooth cinematic tracking shot following a yellow city transit bus turning through the intersection',
  ];

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-2">
        <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
          <Video className="w-4 h-4" />
          <span>Image-to-Video Animation · Powered by gemini-omni-1.1-flash</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Upload any photo of an urban street or intersection—or instantly capture a snapshot of your live 2D simulation canvas—and animate it into a video using the Gemini Interactions API.
        </p>
      </div>

      {/* Main Grid: Upload & Controls on Left, Video Output on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Image Source & Config */}
        <div className="lg:col-span-6 space-y-4">
          {/* Image Upload / Capture Deck */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">1. Select Reference Image</h3>

            {/* Action Buttons: Upload or Snap Canvas */}
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Photo</span>
              </button>

              <button
                onClick={handleCaptureCanvas}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-700/60 rounded-lg transition-colors cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Capture Simulation Frame</span>
              </button>
            </div>

            {/* Image Preview Area */}
            <div className="relative w-full h-56 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Reference Preview"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center p-6 space-y-2 text-slate-500">
                  <Camera className="w-8 h-8 mx-auto stroke-1" />
                  <p className="text-xs">No image selected yet.</p>
                  <p className="text-[11px] text-slate-600">
                    Upload an intersection photo or click &quot;Capture Simulation Frame&quot; above.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Aspect Ratio & Motion Prompt Config */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">2. Video Configuration</h3>

            {/* Aspect Ratio Selector (Mandatory: 16:9 or 9:16) */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 block font-medium">Aspect Ratio</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAspectRatio('16:9')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                    aspectRatio === '16:9'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  16:9 Landscape (Desktop & Cinematic)
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatio('9:16')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                    aspectRatio === '9:16'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  9:16 Portrait (Mobile & Corridor)
                </button>
              </div>
            </div>

            {/* Motion Prompt */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 block font-medium">Motion & Animation Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                placeholder="Describe how the vehicles, lights, and camera should move..."
              />
            </div>

            {/* Preset Suggestions */}
            <div className="space-y-1">
              <span className="text-[11px] text-slate-400">Preset Prompt Suggestions:</span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {presetPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPrompt(p)}
                    className="text-[10px] px-2 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 hover:text-white transition-colors cursor-pointer truncate max-w-full"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleGenerateVideo}
              disabled={!imagePreview || isGenerating}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 rounded-lg transition-colors cursor-pointer shadow-md"
            >
              {isGenerating ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>Generating Video with Omni Flash ({generationTimeSec}s elapsed)...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Animate Image into Video (gemini-omni-1.1-flash)</span>
                </>
              )}
            </button>

            {errorMsg && (
              <div className="flex items-start gap-2 p-3 bg-rose-950/40 border border-rose-800/60 rounded-lg text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold">Video Generation Notice</div>
                  <div className="text-[11px] text-rose-300">{errorMsg}</div>
                  <div className="text-[11px] text-slate-400 pt-1">
                    Tip: Model <code className="text-cyan-400">gemini-omni-1.1-flash</code> requires a paid tier API key configured in AI Studio under <strong>Settings &gt; Secrets &gt; GEMINI_API_KEY</strong>.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Generated Video Output Player */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4 h-full flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">3. Generated Video Player</h3>
              {generatedVideoUrl && (
                <a
                  href={generatedVideoUrl}
                  download="traffic_animation_omni.mp4"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-300 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/60 rounded-lg transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download MP4</span>
                </a>
              )}
            </div>

            {/* Player Container */}
            <div className="flex-1 min-h-[380px] bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center overflow-hidden p-2">
              {isGenerating ? (
                <div className="text-center p-8 space-y-3">
                  <div className="w-12 h-12 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mx-auto" />
                  <div className="text-xs font-semibold text-white">
                    Rendering Video with gemini-omni-1.1-flash...
                  </div>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Synthesizing multi-frame video with temporal coherence and dynamic physical motion. This typically takes 30–60 seconds.
                  </p>
                  <div className="text-xs font-mono text-cyan-400 tabular-nums">
                    Elapsed: {generationTimeSec}s
                  </div>
                </div>
              ) : generatedVideoUrl ? (
                <div className="w-full h-full flex items-center justify-center">
                  <video
                    src={generatedVideoUrl}
                    controls
                    autoPlay
                    loop
                    playsInline
                    className={`rounded-lg max-h-[460px] object-contain shadow-2xl ${
                      aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-[16/9]'
                    }`}
                  />
                </div>
              ) : (
                <div className="text-center p-8 space-y-2 text-slate-500">
                  <Video className="w-10 h-10 mx-auto stroke-1" />
                  <p className="text-xs">Generated video will appear here.</p>
                  <p className="text-[11px] text-slate-600">
                    Upload an image, configure your motion prompt, and hit Animate.
                  </p>
                </div>
              )}
            </div>

            {generatedVideoUrl && (
              <div className="text-xs text-slate-400 flex items-center justify-between font-mono pt-2 border-t border-slate-800/80">
                <span>Model: gemini-omni-1.1-flash</span>
                <span>Format: {aspectRatio} · 720p · 5s</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
