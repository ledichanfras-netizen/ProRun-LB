import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Download, 
  Share2, 
  Image as ImageIcon, 
  Sparkles, 
  Layers, 
  Sun, 
  Moon, 
  Upload, 
  Sliders, 
  MapPin, 
  Check, 
  RefreshCw,
  Camera,
  Activity,
  Timer,
  TrendingUp,
  Heart,
  Flame,
  Crop
} from 'lucide-react';
import { RouteData } from '../utils/gpsUtils';
import { exportElementAsImage } from '../utils/exporter';
import { processLogoTransparency, convertGpsPointsToSvgPath, SvgRouteResult } from '../utils/socialCardUtils';
import { formatDuration } from '../utils/gpsUtils';
import { decodePolyline } from '../utils/gpsUtils';

export interface WorkoutShareData {
  title?: string;
  athleteName?: string;
  date?: string;
  distanceKm: number;
  durationSeconds: number;
  avgPace: string;
  elevationGainMeters?: number;
  avgHeartRate?: number;
  calories?: number;
  route?: RouteData | null;
  workoutType?: string;
}

interface WorkoutShareModalProps {
  data: WorkoutShareData;
  onClose: () => void;
}

type TextTheme = 'white' | 'black';
type BackgroundType = 'transparent' | 'photo' | 'dark' | 'light' | 'emerald';
type AspectRatio = 'story' | 'square' | 'portrait';
type LogoStyle = 'original' | 'white' | 'black' | 'emerald';

const PRESET_QUOTES = [
  { category: 'Conquistas 🏆', items: [
    'Meta Batida! 🎯',
    'Novo Recorde Pessoal (PR) ⚡',
    'Missão Cumprida com Sucesso! 🏆',
    'Mais um dia, mais uma vitória! 💪',
    'Superando meus próprios limites! 🚀',
    'Constância é a chave do sucesso! 🔑',
    'Cada km me aproxima da meta! 📈'
  ]},
  { category: 'Treinos 🏃‍♂️', items: [
    'Treino Pago com Sucesso! 👊',
    'Longão do Final de Semana 🏃‍♂️',
    'Tiros na Pista / Velocidade ⚡',
    'Treino de Ritmo e Limiar 🔥',
    'Rodagem Regenerativa Z2 🧘‍♂️',
    'Treino Concluído na Disciplina! ⏱️',
    'Foco no Plano do Coach Leandro ⚡'
  ]},
  { category: 'Motivação 🔥', items: [
    'Hoje foi na raça e no coração! ❤️',
    'O asfalto é meu templo! 🛣️',
    'Faça chuva ou faça sol! 🌧️☀️',
    'Mente blindada, corpo imparável! 🧠⚡',
    'Menos desculpas, mais quilômetros! 💥',
    'Correndo pela minha melhor versão! ✨',
    'A dor passa, a conquista fica! 🥇'
  ]}
];

export const WorkoutShareModal: React.FC<WorkoutShareModalProps> = ({ data, onClose }) => {
  // Theme and Styling State
  const [textTheme, setTextTheme] = useState<TextTheme>('white');
  const [backgroundType, setBackgroundType] = useState<BackgroundType>('transparent');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('story');
  const [logoStyle, setLogoStyle] = useState<LogoStyle>('white');
  const [activePhraseTab, setActivePhraseTab] = useState<number>(0);
  
  // Custom Background Photo State
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string | null>(null);
  const [photoBrightness, setPhotoBrightness] = useState<number>(85); // 0-100%
  const [photoDimOverlay, setPhotoDimOverlay] = useState<number>(35); // 0-100%
  const [photoBlur, setPhotoBlur] = useState<number>(0); // 0-10px

  // Metric toggles and overrides
  const [showRoute, setShowRoute] = useState<boolean>(true);
  const [showElevation, setShowElevation] = useState<boolean>(true);
  const [showHeartRate, setShowHeartRate] = useState<boolean>(true);
  const [showLogo, setShowLogo] = useState<boolean>(true);
  const [customTitle, setCustomTitle] = useState<string>(data.title || data.workoutType || 'Treino Concluído');

  // Processed Logo with transparent background (no black box)
  const [processedLogoUrl, setProcessedLogoUrl] = useState<string>('/logo.png');
  const [isProcessingLogo, setIsProcessingLogo] = useState<boolean>(false);

  // Export State
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardElementId = 'activity-social-share-card';

  // Extract points from route
  const points: [number, number][] = React.useMemo(() => {
    if (!data.route) return [];
    if (data.route.points && data.route.points.length > 0) return data.route.points;
    if (data.route.polyline) return decodePolyline(data.route.polyline);
    return [];
  }, [data.route]);

  // Generate SVG Route
  const svgRoute: SvgRouteResult = React.useMemo(() => {
    return convertGpsPointsToSvgPath(points, 450, 450, 36);
  }, [points]);

  // Effect to process the logo and strip out black background
  useEffect(() => {
    let isMounted = true;
    setIsProcessingLogo(true);
    
    processLogoTransparency('/logo.png?v=11', logoStyle).then((transparentDataUrl) => {
      if (isMounted) {
        setProcessedLogoUrl(transparentDataUrl);
        setIsProcessingLogo(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [logoStyle]);

  // Handle Photo Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCustomPhotoUrl(event.target.result as string);
        setBackgroundType('photo');
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Export Download
  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const isTransparent = backgroundType === 'transparent';
      const cleanTitle = (data.title || 'Treino').replace(/\s+/g, '_');
      const filename = `ProRun_${cleanTitle}_${data.distanceKm}km`;

      await exportElementAsImage(cardElementId, filename, {
        format: 'png',
        transparent: isTransparent,
        scale: 3 // Ultra High Definition 3x for crisp social media rendering
      });

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (e) {
      console.error('Falha ao exportar:', e);
      alert('Não foi possível gerar a imagem. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Mobile Native Share
  const handleNativeShare = async () => {
    setIsExporting(true);
    try {
      const isTransparent = backgroundType === 'transparent';
      const cleanTitle = (data.title || 'Treino').replace(/\s+/g, '_');
      const filename = `ProRun_${cleanTitle}_${data.distanceKm}km`;

      const result = await exportElementAsImage(cardElementId, filename, {
        format: 'png',
        transparent: isTransparent,
        scale: 2
      });

      if (result.blob && navigator.share) {
        const file = new File([result.blob], `${filename}.png`, { type: 'image/png' });
        await navigator.share({
          files: [file],
          title: `Treino ProRun - ${data.distanceKm}km`,
          text: `🏃‍♂️ ${data.distanceKm}km • Pace ${data.avgPace}/km • Tempo ${formatDuration(data.durationSeconds)}`
        });
      } else {
        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 3000);
      }
    } catch (e) {
      console.log('Share canceled or not supported');
    } finally {
      setIsExporting(false);
    }
  };

  // Get Aspect Ratio Container Classes
  const getAspectRatioClasses = () => {
    switch (aspectRatio) {
      case 'story':
        return 'w-[320px] h-[568px] sm:w-[360px] sm:h-[640px]'; // 9:16
      case 'square':
        return 'w-[320px] h-[320px] sm:w-[400px] sm:h-[400px]'; // 1:1
      case 'portrait':
        return 'w-[320px] h-[400px] sm:w-[360px] sm:h-[450px]'; // 4:5
    }
  };

  const isDarkText = textTheme === 'black';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-2 sm:p-6 overflow-y-auto pt-4 sm:pt-6" onClick={onClose}>
      <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between bg-slate-950/60 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white uppercase italic tracking-wider flex items-center gap-2">
                Card de Atividade <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Social</span>
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">
                Gere e compartilhe seu treino em alta resolução para stories ou posts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Fechar Visualização"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body (2 Columns: Preview vs Customizer) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left / Center Column: Card Live Preview */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center p-3 sm:p-6 bg-slate-950/60 rounded-[2rem] border border-white/5 relative min-h-[480px]">
            
            {/* Checkerboard backdrop indicator for transparent export */}
            {backgroundType === 'transparent' && (
              <div className="absolute inset-4 rounded-[1.8rem] opacity-20 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
            )}

            {/* THE EXPORTABLE SOCIAL CARD */}
            <div 
              id={cardElementId}
              className={`relative overflow-hidden flex flex-col justify-between p-6 sm:p-8 transition-all duration-300 rounded-[2rem] select-none ${getAspectRatioClasses()}`}
              style={{
                backgroundColor: backgroundType === 'transparent' 
                  ? 'transparent' 
                  : backgroundType === 'dark' 
                  ? '#090d16' 
                  : backgroundType === 'light' 
                  ? '#f8fafc' 
                  : backgroundType === 'emerald'
                  ? '#022c22'
                  : 'transparent'
              }}
            >
              {/* Background Photo (If chosen) */}
              {backgroundType === 'photo' && customPhotoUrl && (
                <>
                  <img
                    src={customPhotoUrl}
                    alt="Background"
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{
                      filter: `brightness(${photoBrightness}%) blur(${photoBlur}px)`
                    }}
                    crossOrigin="anonymous"
                  />
                  {/* Dim Vignette Overlay */}
                  <div 
                    className="absolute inset-0 bg-black transition-opacity"
                    style={{ opacity: photoDimOverlay / 100 }}
                  />
                </>
              )}

              {/* Gradient Subtle Accent Backgrounds */}
              {backgroundType === 'dark' && (
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-black pointer-events-none" />
              )}
              {backgroundType === 'light' && (
                <div className="absolute inset-0 bg-gradient-to-b from-slate-100 via-white to-slate-200 pointer-events-none" />
              )}
              {backgroundType === 'emerald' && (
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-950 via-slate-950 to-emerald-950/90 pointer-events-none" />
              )}

              {/* TOP HEADER: Logo & Athlete Info */}
              <div className="relative z-10 flex items-start justify-between">
                <div className="space-y-0.5">
                  <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-widest block italic ${isDarkText ? 'text-slate-700' : 'text-emerald-400 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]'}`}>
                    {data.athleteName || 'Atleta ProRun'}
                  </span>
                  <h3 className={`text-sm sm:text-base font-black italic tracking-wide ${isDarkText ? 'text-slate-900' : 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'}`}>
                    {customTitle}
                  </h3>
                  <p className={`text-[9px] font-semibold uppercase tracking-wider ${isDarkText ? 'text-slate-500' : 'text-slate-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]'}`}>
                    {data.date || new Date().toLocaleDateString('pt-BR')}
                  </p>
                </div>

                {/* Logo with 100% Transparent Background */}
                {showLogo && (
                  <div className="relative flex items-center justify-center">
                    <img 
                      src={processedLogoUrl}
                      alt="ProRun Logo"
                      className="w-12 h-12 sm:w-14 sm:h-14 object-contain filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)] transition-transform hover:scale-105"
                      crossOrigin="anonymous"
                    />
                  </div>
                )}
              </div>

              {/* CENTER: Vector GPS Route Track Silhouette */}
              {showRoute && svgRoute.pathData ? (
                <div className="relative z-10 flex-1 my-3 flex items-center justify-center overflow-hidden">
                  <svg 
                    viewBox={svgRoute.viewBox} 
                    className="w-full h-full max-h-[220px] sm:max-h-[260px] filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
                  >
                    {/* Shadow / Glow Line */}
                    <path
                      d={svgRoute.pathData}
                      fill="none"
                      stroke={isDarkText ? 'rgba(0,0,0,0.15)' : 'rgba(16,185,129,0.35)'}
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Main High-Contrast Route Line */}
                    <path
                      d={svgRoute.pathData}
                      fill="none"
                      stroke={isDarkText ? '#0f172a' : '#10b981'}
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Start Marker */}
                    {svgRoute.startPoint && (
                      <circle
                        cx={svgRoute.startPoint.x}
                        cy={svgRoute.startPoint.y}
                        r="6"
                        fill="#10b981"
                        stroke="#ffffff"
                        strokeWidth="2.5"
                      />
                    )}
                    {/* Finish Marker */}
                    {svgRoute.finishPoint && (
                      <circle
                        cx={svgRoute.finishPoint.x}
                        cy={svgRoute.finishPoint.y}
                        r="6"
                        fill="#f59e0b"
                        stroke="#ffffff"
                        strokeWidth="2.5"
                      />
                    )}
                  </svg>
                </div>
              ) : (
                <div className="relative z-10 flex-1 my-3 flex items-center justify-center opacity-40">
                  <div className={`p-4 rounded-3xl border border-dashed flex flex-col items-center justify-center text-center ${isDarkText ? 'border-slate-400 text-slate-600' : 'border-white/30 text-white'}`}>
                    <Activity className="w-8 h-8 mb-1" />
                    <span className="text-[10px] font-black uppercase tracking-wider">Atividade Registrada</span>
                  </div>
                </div>
              )}

              {/* BOTTOM: Performance Running Metrics (Strava-Inspired High Impact Grid) */}
              <div className="relative z-10 space-y-3 pt-2">
                
                {/* Hero Distance */}
                <div className="border-b pb-2.5" style={{ borderColor: isDarkText ? 'rgba(15,23,42,0.15)' : 'rgba(255,255,255,0.2)' }}>
                  <span className={`text-[10px] font-black uppercase tracking-widest block italic ${isDarkText ? 'text-slate-600' : 'text-slate-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]'}`}>
                    Distância Total
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-4xl sm:text-5xl font-black italic tracking-tight ${isDarkText ? 'text-slate-950 font-black' : 'text-white font-black drop-shadow-[0_3px_8px_rgba(0,0,0,0.8)]'}`}>
                      {data.distanceKm.toFixed(2)}
                    </span>
                    <span className={`text-lg sm:text-xl font-black italic uppercase ${isDarkText ? 'text-slate-700' : 'text-emerald-400 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]'}`}>
                      KM
                    </span>
                  </div>
                </div>

                {/* Sub-metrics 3-Column Grid */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  {/* Pace */}
                  <div>
                    <span className={`text-[9px] font-black uppercase tracking-wider block ${isDarkText ? 'text-slate-600' : 'text-slate-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]'}`}>
                      Ritmo Médio
                    </span>
                    <p className={`text-base sm:text-xl font-black italic ${isDarkText ? 'text-slate-900' : 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'}`}>
                      {data.avgPace}<span className="text-[10px] font-bold">/km</span>
                    </p>
                  </div>

                  {/* Tempo */}
                  <div>
                    <span className={`text-[9px] font-black uppercase tracking-wider block ${isDarkText ? 'text-slate-600' : 'text-slate-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]'}`}>
                      Tempo
                    </span>
                    <p className={`text-base sm:text-xl font-black italic ${isDarkText ? 'text-slate-900' : 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'}`}>
                      {formatDuration(data.durationSeconds)}
                    </p>
                  </div>

                  {/* Altimetria / BPM */}
                  <div>
                    <span className={`text-[9px] font-black uppercase tracking-wider block ${isDarkText ? 'text-slate-600' : 'text-slate-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]'}`}>
                      {showElevation && data.elevationGainMeters ? 'Elevação' : 'Esforço'}
                    </span>
                    <p className={`text-base sm:text-xl font-black italic ${isDarkText ? 'text-slate-900' : 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'}`}>
                      {showElevation && data.elevationGainMeters 
                        ? `+${data.elevationGainMeters}m`
                        : data.avgHeartRate 
                        ? `${data.avgHeartRate} bpm`
                        : '100%'}
                    </p>
                  </div>
                </div>

                {/* Footer Brand Watermark */}
                <div className="pt-1 flex items-center justify-between">
                  <span className={`text-[8px] font-black uppercase tracking-widest ${isDarkText ? 'text-slate-500' : 'text-white/60 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]'}`}>
                    PRORUN • PERFORMANCE HUMANA
                  </span>
                  <span className={`text-[8px] font-black uppercase tracking-widest ${isDarkText ? 'text-emerald-700' : 'text-emerald-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]'}`}>
                    ⚡ COACH LEANDRO BARBOSA
                  </span>
                </div>
              </div>

            </div>

            {/* Preview Status Pill */}
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {backgroundType === 'transparent' 
                  ? 'Fundo Transparente (Exporta como sticker/PNG)' 
                  : backgroundType === 'photo' 
                  ? 'Foto Personalizada com Overlay' 
                  : 'Fundo Gradiente Estilizado'}
              </span>
            </div>
          </div>

          {/* Right Column: Customization Controls */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* 1. TEXT COLOR (PRETO OU BRANCO) */}
            <div className="space-y-2 bg-slate-950/40 p-4 rounded-2xl border border-white/5">
              <label className="text-xs font-black text-white uppercase italic tracking-wider flex items-center justify-between">
                <span>1. Cor dos Dados & Texto</span>
                <span className="text-[10px] text-emerald-400 lowercase font-mono">({textTheme})</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTextTheme('white')}
                  className={`py-3 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-black uppercase italic transition-all ${
                    textTheme === 'white'
                      ? 'bg-white text-slate-950 border-white shadow-lg'
                      : 'bg-slate-900/60 text-slate-300 border-white/10 hover:bg-white/5'
                  }`}
                >
                  <Moon className="w-4 h-4 text-slate-950 fill-current" /> Branco (Fotos Escuras)
                </button>
                <button
                  type="button"
                  onClick={() => setTextTheme('black')}
                  className={`py-3 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-black uppercase italic transition-all ${
                    textTheme === 'black'
                      ? 'bg-slate-950 text-white border-white/30 shadow-lg ring-2 ring-emerald-500'
                      : 'bg-slate-900/60 text-slate-300 border-white/10 hover:bg-white/5'
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-400" /> Preto (Fotos Claras)
                </button>
              </div>
            </div>

            {/* 2. BACKGROUND STYLE SELECTOR */}
            <div className="space-y-2 bg-slate-950/40 p-4 rounded-2xl border border-white/5">
              <label className="text-xs font-black text-white uppercase italic tracking-wider block">
                2. Estilo do Fundo
              </label>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setBackgroundType('transparent')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center gap-1 transition-all ${
                    backgroundType === 'transparent'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md'
                      : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Transparente</span>
                  <span className="text-[8px] text-slate-500">Sticker PNG</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!customPhotoUrl) {
                      fileInputRef.current?.click();
                    } else {
                      setBackgroundType('photo');
                    }
                  }}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center gap-1 transition-all ${
                    backgroundType === 'photo'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md'
                      : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Sua Foto</span>
                  <span className="text-[8px] text-slate-500">{customPhotoUrl ? 'Carregada' : 'Upload'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBackgroundType('dark')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center gap-1 transition-all ${
                    backgroundType === 'dark'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md'
                      : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <Moon className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Carbon Dark</span>
                  <span className="text-[8px] text-slate-500">Preto Fosco</span>
                </button>
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />

              {/* Controls for Uploaded Photo */}
              {backgroundType === 'photo' && customPhotoUrl && (
                <div className="pt-3 border-t border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-emerald-400" /> Ajustes da Foto
                    </span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[10px] font-black text-emerald-400 hover:text-emerald-300 uppercase underline"
                    >
                      Trocar Foto
                    </button>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Escurecer Fundo (Contraste do Texto)</span>
                      <span className="font-mono text-emerald-400">{photoDimOverlay}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="85"
                      value={photoDimOverlay}
                      onChange={(e) => setPhotoDimOverlay(Number(e.target.value))}
                      className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Brilho da Imagem</span>
                      <span className="font-mono text-emerald-400">{photoBrightness}%</span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="140"
                      value={photoBrightness}
                      onChange={(e) => setPhotoBrightness(Number(e.target.value))}
                      className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 3. LOGO TRANSPARENCY & STYLE */}
            <div className="space-y-2 bg-slate-950/40 p-4 rounded-2xl border border-white/5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-white uppercase italic tracking-wider flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> 3. Minha Logo (Sem Fundo Preto)
                </label>
                <button
                  type="button"
                  onClick={() => setShowLogo(!showLogo)}
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border transition-all ${
                    showLogo ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-white/5 text-slate-500 border-white/10'
                  }`}
                >
                  {showLogo ? 'Exibindo' : 'Oculta'}
                </button>
              </div>

              {showLogo && (
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setLogoStyle('original')}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      logoStyle === 'original'
                        ? 'bg-emerald-500/20 border-emerald-500 text-white'
                        : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase block">Original</span>
                    <span className="text-[8px] text-slate-500">Transparente</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLogoStyle('white')}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      logoStyle === 'white'
                        ? 'bg-emerald-500/20 border-emerald-500 text-white'
                        : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase block">Branca</span>
                    <span className="text-[8px] text-slate-500">Luminosa</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLogoStyle('black')}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      logoStyle === 'black'
                        ? 'bg-emerald-500/20 border-emerald-500 text-white'
                        : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase block">Preta</span>
                    <span className="text-[8px] text-slate-500">Dark Minimal</span>
                  </button>
                </div>
              )}
            </div>

            {/* 4. ASPECT RATIO / FORMAT */}
            <div className="space-y-2 bg-slate-950/40 p-4 rounded-2xl border border-white/5">
              <label className="text-xs font-black text-white uppercase italic tracking-wider flex items-center gap-1.5">
                <Crop className="w-3.5 h-3.5 text-emerald-400" /> 4. Formato de Exportação
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAspectRatio('story')}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    aspectRatio === 'story'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-[10px] font-black uppercase block">Story (9:16)</span>
                  <span className="text-[8px] text-slate-500">Instagram / Whats</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAspectRatio('square')}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    aspectRatio === 'square'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-[10px] font-black uppercase block">Feed (1:1)</span>
                  <span className="text-[8px] text-slate-500">Quadrado</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAspectRatio('portrait')}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    aspectRatio === 'portrait'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-[10px] font-black uppercase block">Retrato (4:5)</span>
                  <span className="text-[8px] text-slate-500">Feed Vertical</span>
                </button>
              </div>
            </div>

            {/* 5. TÍTULO, FRASES PRÉ-PRONTAS & LIVRE DESCRIÇÃO */}
            <div className="space-y-3 bg-slate-950/40 p-4 rounded-2xl border border-white/5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-white uppercase italic tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> 5. Título & Frases do Treino
                </label>
                {customTitle !== (data.title || data.workoutType || 'Treino Concluído') && (
                  <button
                    type="button"
                    onClick={() => setCustomTitle(data.title || data.workoutType || 'Treino Concluído')}
                    className="text-[9px] font-black text-slate-400 hover:text-white uppercase transition-colors"
                  >
                    Restaurar Padrão
                  </button>
                )}
              </div>

              {/* Categorias de Frases */}
              <div className="flex gap-1 border-b border-white/5 pb-2 overflow-x-auto no-scrollbar">
                {PRESET_QUOTES.map((category, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActivePhraseTab(idx)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black whitespace-nowrap transition-all ${
                      activePhraseTab === idx
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    {category.category}
                  </button>
                ))}
              </div>

              {/* Grid de Frases Rápidas Clicáveis */}
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                {PRESET_QUOTES[activePhraseTab]?.items.map((phrase, pIdx) => {
                  const isSelected = customTitle === phrase;
                  return (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => setCustomTitle(phrase)}
                      className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md font-black ring-2 ring-emerald-400/40'
                          : 'bg-slate-900/80 text-slate-300 border-white/10 hover:border-emerald-500/40 hover:text-white'
                      }`}
                    >
                      {phrase}
                    </button>
                  );
                })}
              </div>

              {/* Campo de Livre Descrição / Edição */}
              <div className="pt-2 border-t border-white/5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Livre Descrição / Digitação
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">
                    {customTitle.length}/60
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={60}
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Digite sua frase ou conquista personalizada..."
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 pr-8"
                  />
                  {customTitle && (
                    <button
                      type="button"
                      onClick={() => setCustomTitle('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={handleDownload}
                disabled={isExporting}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 text-sm uppercase italic tracking-wider shadow-lg shadow-emerald-600/30 transition-all active:scale-[0.98] cursor-pointer"
              >
                {isExporting ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : exportSuccess ? (
                  <>
                    <Check className="w-5 h-5 text-white" /> Imagem Salva com Sucesso!
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" /> Baixar Imagem em Alta Resolução (PNG)
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleNativeShare}
                disabled={isExporting}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 text-xs uppercase italic tracking-wider transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-emerald-400" /> Compartilhar Direto (Stories / WhatsApp)
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>,
    document.body
  );
};
