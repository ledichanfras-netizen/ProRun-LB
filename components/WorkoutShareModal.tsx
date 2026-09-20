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
  initialPhotoUrl?: string;
  initialBackgroundType?: BackgroundType;
  autoOpenCamera?: boolean;
  rpe?: number;
}

interface WorkoutShareModalProps {
  data: WorkoutShareData;
  onClose: () => void;
}

type TextTheme = 'white' | 'black';
type BackgroundType = 'transparent' | 'photo' | 'dark' | 'light' | 'emerald';
type AspectRatio = 'story' | 'square' | 'portrait';
type LogoStyle = 'original' | 'white' | 'black' | 'emerald';

// Default dynamic running photo when user has not yet uploaded their own personal photo
const DEFAULT_SPORT_PHOTO = 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?q=80&w=1200&auto=format&fit=crop';

// Embedded athletic running SVG scene guaranteed to render offline or on network failure
const FALLBACK_SPORT_PHOTO_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23022c22"/><stop offset="50%" stop-color="%23090d16"/><stop offset="100%" stop-color="%23020617"/></linearGradient><radialGradient id="glow" cx="50%" cy="40%" r="50%"><stop offset="0%" stop-color="%2310b981" stop-opacity="0.25"/><stop offset="100%" stop-color="%2310b981" stop-opacity="0"/></radialGradient></defs><rect width="1080" height="1920" fill="url(%23bg)"/><circle cx="540" cy="760" r="420" fill="url(%23glow)"/><circle cx="540" cy="760" r="300" stroke="%2310b981" stroke-width="2" stroke-opacity="0.2" fill="none"/><circle cx="540" cy="760" r="180" stroke="%2310b981" stroke-width="2" stroke-opacity="0.3" fill="none"/><path d="M540 480 a 45 45 0 1 0 0.1 0 Z M480 560 l 80 -25 l 50 45 l 80 -15 l 10 35 l -90 15 l -40 -35 l -35 75 l 90 90 l 0 150 l -40 0 l 0 -125 l -85 -80 l -35 70 l 75 110 l -30 30 l -95 -130 l 40 -110 l -50 -45 l 15 -30 Z" fill="%2334d399" opacity="0.8"/></svg>`;

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
  const [backgroundType, setBackgroundType] = useState<BackgroundType>(data.initialBackgroundType || 'photo');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('story');
  const [logoStyle, setLogoStyle] = useState<LogoStyle>('original');
  const [activePhraseTab, setActivePhraseTab] = useState<number>(0);
  
  // Custom Background Photo State
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string | null>(data.initialPhotoUrl || null);
  const [photoBrightness, setPhotoBrightness] = useState<number>(90); // 0-100%
  const [photoDimOverlay, setPhotoDimOverlay] = useState<number>(30); // 0-100%
  const [photoBlur, setPhotoBlur] = useState<number>(0); // 0-10px
  const [photoSrc, setPhotoSrc] = useState<string>(data.initialPhotoUrl || DEFAULT_SPORT_PHOTO);

  // Synchronize photo source whenever a photo is uploaded or provided
  useEffect(() => {
    if (customPhotoUrl) {
      setPhotoSrc(customPhotoUrl);
    } else if (data.initialPhotoUrl) {
      setPhotoSrc(data.initialPhotoUrl);
    } else {
      setPhotoSrc(DEFAULT_SPORT_PHOTO);
    }
  }, [customPhotoUrl, data.initialPhotoUrl]);

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
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const cardElementId = 'activity-social-share-card';

  useEffect(() => {
    if (data.autoOpenCamera && cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  }, [data.autoOpenCamera]);

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
    // Reset input value so re-uploading the same file works properly
    e.target.value = '';
  };

  // Handle Export Download
  const handleDownload = async () => {
    setIsExporting(true);
    // Small delay to let export card render at full unscaled resolution
    await new Promise(r => setTimeout(r, 60));

    try {
      const isTransparent = backgroundType === 'transparent';
      const cleanTitle = (data.title || 'Treino').replace(/\s+/g, '_');
      const filename = `ProRun_${cleanTitle}_${data.distanceKm}km`;

      const result = await exportElementAsImage(cardElementId, filename, {
        format: 'png',
        transparent: isTransparent,
        scale: 3 // Ultra High Definition 3x for crisp social media rendering
      });

      if (!result.success) {
        throw new Error('Falha na renderização da imagem');
      }

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
    // Small delay to let export card render at full unscaled resolution
    await new Promise(r => setTimeout(r, 60));

    try {
      const isTransparent = backgroundType === 'transparent';
      const cleanTitle = (data.title || 'Treino').replace(/\s+/g, '_');
      const filename = `ProRun_${cleanTitle}_${data.distanceKm}km`;

      const result = await exportElementAsImage(cardElementId, filename, {
        format: 'png',
        transparent: isTransparent,
        scale: 2
      });

      if (!result.success || !result.blob) {
        throw new Error('Falha ao gerar blob de imagem para compartilhamento');
      }

      if (navigator.share) {
        const file = new File([result.blob], `${filename}.png`, { type: 'image/png' });
        await navigator.share({
          files: [file],
          title: `Treino ProRun - ${data.distanceKm}km`,
          text: `🏃‍♂️ ${data.distanceKm}km • Pace ${data.avgPace}/km • Tempo ${formatDuration(data.durationSeconds)}${data.avgHeartRate ? ` • FC média ${data.avgHeartRate} bpm` : ''}`
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

  // Get Aspect Ratio Container Classes (Scaled to fit comfortably on all screens with full photo in view)
  const getAspectRatioClasses = () => {
    switch (aspectRatio) {
      case 'story':
        return 'w-[250px] h-[444px] sm:w-[285px] sm:h-[506px] max-w-full'; // 9:16 Story
      case 'square':
        return 'w-[250px] h-[250px] sm:w-[285px] sm:h-[285px] max-w-full aspect-square'; // 1:1 Feed
      case 'portrait':
        return 'w-[250px] h-[312px] sm:w-[285px] sm:h-[356px] max-w-full'; // 4:5 Retrato
    }
  };

  const isDarkText = textTheme === 'black';

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-2 sm:p-4 overflow-y-auto" onClick={onClose}>
      <div className="share-studio-modal bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-2xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto pointer-events-auto relative" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-slate-950 shrink-0 relative z-30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white uppercase italic tracking-wider flex items-center gap-2">
                Postar Treino <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Foto & Card</span>
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">
                Personalize sua foto, dados e plano de fundo para compartilhar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Fechar Visualização"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BARRA SUPERIOR: STATUS & AÇÕES RÁPIDAS */}
        <div className="bg-slate-950 border-b border-white/10 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-2.5 shrink-0 relative z-20 shadow-md">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase italic tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              Card Oficial ProRun
            </span>
            <span className="text-[10px] text-slate-500">•</span>
            <span className="text-[11px] text-slate-400">
              <strong className="text-white uppercase">{aspectRatio === 'story' ? 'Story (9:16)' : aspectRatio === 'square' ? 'Feed (1:1)' : 'Retrato (4:5)'}</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={handleDownload}
            disabled={isExporting}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase italic flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
            title={backgroundType === 'transparent' ? 'Baixar Sticker PNG Transparente' : 'Baixar Imagem Final'}
          >
            {isExporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span>{backgroundType === 'transparent' ? 'Baixar PNG' : 'Baixar'}</span>
          </button>
        </div>

        {/* Content Body: Foto em Primeiro Plano no Topo e Botões de Edição na Parte de Baixo */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center gap-5">
          
          {/* FOTO EM PRIMEIRO PLANO: Card Live Preview Stage */}
          <div className="w-full flex flex-col items-center justify-center shrink-0">
            <div 
              className="share-card-stage p-2 sm:p-3 bg-slate-950/90 rounded-[2.2rem] border border-white/10 shadow-2xl relative flex flex-col items-center max-w-full overflow-visible transition-all"
            >
              {/* Universal transparency checkerboard pattern behind card when transparent is selected */}
              {backgroundType === 'transparent' && (
                <div 
                  className="absolute inset-4 rounded-[2rem] opacity-35 pointer-events-none"
                  style={{
                    backgroundImage: 'linear-gradient(45deg, #334155 25%, transparent 25%), linear-gradient(-45deg, #334155 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #334155 75%), linear-gradient(-45deg, transparent 75%, #334155 75%)',
                    backgroundSize: '16px 16px',
                    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px'
                  }}
                />
              )}

              {/* THE EXPORTABLE SOCIAL CARD */}
              <div 
                id={cardElementId}
                data-export-card="true"
                className={`relative overflow-hidden flex flex-col justify-between ${aspectRatio === 'square' ? 'p-3.5 sm:p-5' : 'p-5 sm:p-7'} transition-all duration-300 rounded-[2rem] select-none ${getAspectRatioClasses()}`}
                style={{
                  backgroundColor: backgroundType === 'transparent' 
                    ? 'transparent' 
                    : backgroundType === 'dark' 
                    ? '#090d16' 
                    : backgroundType === 'light' 
                    ? '#f8fafc' 
                    : backgroundType === 'emerald'
                    ? '#022c22'
                    : backgroundType === 'photo'
                    ? '#090d16'
                    : 'transparent'
                }}
              >
                {/* Background Photo: Always visible in foreground with fallback */}
                {backgroundType === 'photo' && (
                  <>
                    <img
                      src={photoSrc}
                      alt="Foto do Treino"
                      crossOrigin={photoSrc.startsWith('data:') ? undefined : 'anonymous'}
                      onError={() => {
                        if (photoSrc !== FALLBACK_SPORT_PHOTO_SVG) {
                          setPhotoSrc(FALLBACK_SPORT_PHOTO_SVG);
                        }
                      }}
                      className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
                      style={{
                        filter: `brightness(${photoBrightness}%) blur(${photoBlur}px)`
                      }}
                    />
                    {/* Dim Vignette Overlay */}
                    <div 
                      className="absolute inset-0 bg-black transition-opacity pointer-events-none"
                      style={{ opacity: photoDimOverlay / 100 }}
                    />
                    {/* Badge when default sports photo is active */}
                    {!customPhotoUrl && (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="absolute top-3 left-3 z-30 px-2.5 py-1 rounded-full bg-slate-950/85 backdrop-blur-md border border-emerald-500/50 text-emerald-300 text-[9px] font-black uppercase italic flex items-center gap-1.5 shadow-lg hover:bg-emerald-600 hover:text-white transition-all cursor-pointer select-none"
                        title="Toque para carregar sua foto"
                      >
                        <Camera className="w-3 h-3 text-emerald-400" />
                        <span>Foto Exemplo • Toque p/ Carregar</span>
                      </div>
                    )}
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
              <div className="relative z-10 flex items-start justify-between shrink-0">
                <div className="space-y-0.5">
                  <span 
                    className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest block italic transition-colors"
                    style={{
                      color: isDarkText ? '#000000' : '#ffffff',
                      textShadow: isDarkText ? '0 1px 2px rgba(255,255,255,0.95)' : '0 1px 3px rgba(0,0,0,0.95)'
                    }}
                  >
                    {data.athleteName || 'Atleta ProRun'}
                  </span>
                  <h3 
                    className={`font-black italic tracking-wide transition-colors ${aspectRatio === 'square' ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'}`}
                    style={{
                      color: isDarkText ? '#000000' : '#ffffff',
                      textShadow: isDarkText ? '0 1px 3px rgba(255,255,255,0.95)' : '0 2px 5px rgba(0,0,0,0.95)'
                    }}
                  >
                    {customTitle}
                  </h3>
                  <p 
                    className="text-[9px] font-bold uppercase tracking-wider transition-colors"
                    style={{
                      color: isDarkText ? '#000000' : '#f1f5f9',
                      textShadow: isDarkText ? '0 1px 2px rgba(255,255,255,0.9)' : '0 1px 2px rgba(0,0,0,0.9)'
                    }}
                  >
                    {data.date || new Date().toLocaleDateString('pt-BR')}
                  </p>
                </div>

                {/* Logo with 100% Transparent Background */}
                {showLogo && (
                  <div className="relative flex items-center justify-center shrink-0">
                    <img 
                      src={processedLogoUrl} 
                      alt="ProRun Logo"
                      crossOrigin="anonymous"
                      className={`object-contain filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)] transition-transform hover:scale-105 ${aspectRatio === 'square' ? 'w-10 h-10 sm:w-12 sm:h-12' : 'w-12 h-12 sm:w-14 sm:h-14'}`}
                    />
                  </div>
                )}
              </div>

              {/* CENTER: Vector GPS Route Track Silhouette */}
              {showRoute && svgRoute.pathData ? (
                <div className={`relative z-10 flex-1 min-h-0 flex items-center justify-center overflow-hidden ${aspectRatio === 'square' ? 'my-1' : 'my-3'}`}>
                  <svg 
                    viewBox={svgRoute.viewBox} 
                    className={`w-full h-full filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] ${aspectRatio === 'square' ? 'max-h-[85px] sm:max-h-[110px]' : 'max-h-[220px] sm:max-h-[260px]'}`}
                  >
                    {/* Shadow / Halo Line for Maximum Contrast */}
                    <path
                      d={svgRoute.pathData}
                      fill="none"
                      stroke={isDarkText ? '#ffffff' : 'rgba(0,0,0,0.7)'}
                      strokeWidth="9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Main High-Contrast Route Line (Black or White) */}
                    <path
                      d={svgRoute.pathData}
                      fill="none"
                      stroke={isDarkText ? '#000000' : '#ffffff'}
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
                        fill={isDarkText ? '#000000' : '#10b981'}
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
                        fill={isDarkText ? '#000000' : '#f59e0b'}
                        stroke="#ffffff"
                        strokeWidth="2.5"
                      />
                    )}
                  </svg>
                </div>
              ) : (
                <div className={`relative z-10 flex-1 min-h-0 flex items-center justify-center opacity-40 ${aspectRatio === 'square' ? 'my-1' : 'my-3'}`}>
                  <div 
                    className="p-3 rounded-2xl border border-dashed flex flex-col items-center justify-center text-center"
                    style={{
                      borderColor: isDarkText ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.4)',
                      color: isDarkText ? '#000000' : '#ffffff'
                    }}
                  >
                    <Activity className="w-6 h-6 mb-1" />
                    <span className="text-[9px] font-black uppercase tracking-wider">Atividade Registrada</span>
                  </div>
                </div>
              )}

              {/* BOTTOM: Performance Running Metrics */}
              <div className={`relative z-10 shrink-0 ${aspectRatio === 'square' ? 'space-y-1.5 pt-1' : 'space-y-3 pt-2'}`}>
                
                {/* Hero Distance */}
                <div 
                  className={`border-b ${aspectRatio === 'square' ? 'pb-1' : 'pb-2.5'}`} 
                  style={{ borderColor: isDarkText ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.25)' }}
                >
                  <span 
                    className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest block italic transition-colors"
                    style={{
                      color: isDarkText ? '#000000' : '#ffffff',
                      textShadow: isDarkText ? '0 1px 2px rgba(255,255,255,0.9)' : '0 1px 3px rgba(0,0,0,0.95)'
                    }}
                  >
                    Distância Total
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span 
                      className={`font-black italic tracking-tight transition-colors ${aspectRatio === 'square' ? 'text-3xl sm:text-4xl' : 'text-4xl sm:text-5xl'}`}
                      style={{
                        color: isDarkText ? '#000000' : '#ffffff',
                        textShadow: isDarkText ? '0 2px 4px rgba(255,255,255,0.95)' : '0 3px 8px rgba(0,0,0,0.95)'
                      }}
                    >
                      {data.distanceKm.toFixed(2)}
                    </span>
                    <span 
                      className={`font-black italic uppercase transition-colors ${aspectRatio === 'square' ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'}`}
                      style={{
                        color: isDarkText ? '#000000' : '#10b981',
                        textShadow: isDarkText ? '0 1px 2px rgba(255,255,255,0.9)' : '0 1px 3px rgba(0,0,0,0.95)'
                      }}
                    >
                      KM
                    </span>
                  </div>
                </div>

                {/* Sub-metrics 3-Column Grid */}
                <div className={`grid grid-cols-3 ${aspectRatio === 'square' ? 'gap-1.5 sm:gap-2' : 'gap-2 sm:gap-4'}`}>
                  {/* Pace */}
                  <div>
                    <span 
                      className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider block transition-colors"
                      style={{
                        color: isDarkText ? '#000000' : '#ffffff',
                        textShadow: isDarkText ? '0 1px 2px rgba(255,255,255,0.9)' : '0 1px 3px rgba(0,0,0,0.95)'
                      }}
                    >
                      Ritmo Médio
                    </span>
                    <p 
                      className={`font-black italic transition-colors ${aspectRatio === 'square' ? 'text-sm sm:text-base' : 'text-base sm:text-xl'}`}
                      style={{
                        color: isDarkText ? '#000000' : '#ffffff',
                        textShadow: isDarkText ? '0 1px 3px rgba(255,255,255,0.95)' : '0 2px 4px rgba(0,0,0,0.95)'
                      }}
                    >
                      {data.avgPace}<span className="text-[10px] font-bold">/km</span>
                    </p>
                  </div>

                  {/* Tempo */}
                  <div>
                    <span 
                      className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider block transition-colors"
                      style={{
                        color: isDarkText ? '#000000' : '#ffffff',
                        textShadow: isDarkText ? '0 1px 2px rgba(255,255,255,0.9)' : '0 1px 3px rgba(0,0,0,0.95)'
                      }}
                    >
                      Tempo
                    </span>
                    <p 
                      className={`font-black italic transition-colors ${aspectRatio === 'square' ? 'text-sm sm:text-base' : 'text-base sm:text-xl'}`}
                      style={{
                        color: isDarkText ? '#000000' : '#ffffff',
                        textShadow: isDarkText ? '0 1px 3px rgba(255,255,255,0.95)' : '0 2px 4px rgba(0,0,0,0.95)'
                      }}
                    >
                      {formatDuration(data.durationSeconds)}
                    </p>
                  </div>

                  {/* Altimetria / BPM */}
                  <div>
                    <span 
                      className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider block transition-colors"
                      style={{
                        color: isDarkText ? '#000000' : '#ffffff',
                        textShadow: isDarkText ? '0 1px 2px rgba(255,255,255,0.9)' : '0 1px 3px rgba(0,0,0,0.95)'
                      }}
                    >
                      {showElevation && data.elevationGainMeters ? 'Elevação' : 'Esforço'}
                    </span>
                    <p 
                      className={`font-black italic transition-colors ${aspectRatio === 'square' ? 'text-sm sm:text-base' : 'text-base sm:text-xl'}`}
                      style={{
                        color: isDarkText ? '#000000' : '#ffffff',
                        textShadow: isDarkText ? '0 1px 3px rgba(255,255,255,0.95)' : '0 2px 4px rgba(0,0,0,0.95)'
                      }}
                    >
                      {showElevation && data.elevationGainMeters 
                        ? `+${data.elevationGainMeters}m`
                        : data.rpe
                        ? `PSE ${data.rpe}/10`
                        : data.avgHeartRate 
                        ? `${data.avgHeartRate} bpm`
                        : 'PSE 10/10'}
                    </p>
                  </div>
                </div>

                {showHeartRate && data.avgHeartRate && (
                  <div
                    className="mt-2 flex items-center justify-center gap-1.5 border-t pt-1.5"
                    style={{ borderColor: isDarkText ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.2)' }}
                  >
                    <Heart
                      className={aspectRatio === 'square' ? 'w-3 h-3' : 'w-3.5 h-3.5'}
                      style={{ color: isDarkText ? '#e11d48' : '#fb7185' }}
                    />
                    <span
                      className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider"
                      style={{
                        color: isDarkText ? '#000000' : '#ffffff',
                        textShadow: isDarkText ? '0 1px 2px rgba(255,255,255,0.9)' : '0 1px 3px rgba(0,0,0,0.95)'
                      }}
                    >
                      Frequência cardíaca média
                    </span>
                    <strong
                      className={aspectRatio === 'square' ? 'text-xs' : 'text-sm'}
                      style={{
                        color: isDarkText ? '#e11d48' : '#fb7185',
                        textShadow: isDarkText ? '0 1px 2px rgba(255,255,255,0.9)' : '0 1px 3px rgba(0,0,0,0.95)'
                      }}
                    >
                      {data.avgHeartRate} bpm
                    </strong>
                  </div>
                )}

                {/* Footer Brand Watermark */}
                <div className="pt-1 sm:pt-1.5 pb-0.5 flex items-center justify-between shrink-0 leading-tight">
                  <span 
                    className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-colors"
                    style={{
                      color: isDarkText ? '#000000' : '#ffffff',
                      textShadow: isDarkText ? '0 1px 2px rgba(255,255,255,0.95)' : '0 1px 3px rgba(0,0,0,0.95)'
                    }}
                  >
                    ProRun LB
                  </span>
                  <span 
                    className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-colors"
                    style={{
                      color: isDarkText ? '#000000' : '#34d399',
                      textShadow: isDarkText ? '0 1px 2px rgba(255,255,255,0.95)' : '0 1px 3px rgba(0,0,0,0.95)'
                    }}
                  >
                    ⚡ COACH LEANDRO BARBOSA
                  </span>
                </div>
              </div>

            </div>
          </div>

            {/* Preview Status Pill & Quick Action Bar (Logo abaixo da Foto em Primeiro Plano) */}
            <div className="mt-3 flex flex-col items-center gap-2.5 w-full">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-300 bg-slate-900/80 px-3.5 py-1.5 rounded-full border border-white/10 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  {backgroundType === 'transparent' 
                    ? 'Fundo Transparente ativo (exporta sticker PNG sem fundo)' 
                    : backgroundType === 'photo' 
                    ? customPhotoUrl ? 'Sua Foto Personalizada ativa' : 'Foto Esportiva Padrão ativa' 
                    : 'Fundo Gradiente Estilizado'}
                </span>
              </div>

              {/* Botões Rápidos de Ação da Foto e Cor dos Dados */}
              <div className="flex flex-wrap items-center justify-center gap-2 w-full max-w-md">
                <button
                  type="button"
                  onClick={() => {
                    setBackgroundType('photo');
                    cameraInputRef.current?.click();
                  }}
                  className="py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-black uppercase italic flex items-center gap-1.5 cursor-pointer shadow-sm transition-all active:scale-95"
                  title="Tirar nova foto com a câmera"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Tirar Foto</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBackgroundType('photo');
                    fileInputRef.current?.click();
                  }}
                  className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-black uppercase italic flex items-center gap-1.5 cursor-pointer shadow-sm transition-all active:scale-95"
                  title="Escolher foto da galeria"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-teal-400" />
                  <span>Galeria</span>
                </button>

                {/* Seletor Rápido de Cor dos Dados (Branco / Preto) */}
                <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-xl border border-white/10 shadow-inner">
                  <span className="text-[10px] font-bold text-slate-400 pr-1 hidden sm:inline">Cor:</span>
                  <button
                    type="button"
                    onClick={() => setTextTheme('white')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase italic flex items-center gap-1 cursor-pointer select-none transition-all ${
                      textTheme === 'white' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                    title="Dados em Branco"
                  >
                    <span className="w-2 h-2 rounded-full bg-white border border-slate-900 inline-block" />
                    <span>Branco</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextTheme('black')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase italic flex items-center gap-1 cursor-pointer select-none transition-all ${
                      textTheme === 'black' ? 'bg-black text-white border border-white/30 shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                    title="Dados em Preto"
                  >
                    <span className="w-2 h-2 rounded-full bg-black border border-white inline-block" />
                    <span>Preto</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* BOTÕES DE EDIÇÃO NA PARTE DE BAIXO */}
          <div className="w-full max-w-xl space-y-4 pb-8">
            
            {/* 1. BACKGROUND & PHOTO STYLE SELECTOR */}
            <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-white/10">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-white uppercase italic tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" /> 1. Estilo do Fundo & Foto
                </label>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  {backgroundType === 'transparent' ? 'Sticker PNG' : backgroundType === 'photo' ? 'Sua Foto' : backgroundType === 'dark' ? 'Carbon Dark' : backgroundType === 'light' ? 'Modo Claro' : 'Modo Esmeralda'}
                </span>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setBackgroundType('transparent');
                    setTextTheme('white');
                  }}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center gap-1 transition-all cursor-pointer ${
                    backgroundType === 'transparent'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md ring-2 ring-emerald-500/30 font-bold'
                      : 'bg-slate-900/70 border-white/10 text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span className="text-[11px] font-black uppercase tracking-wider">Transparente</span>
                  <span className="text-[8px] text-slate-400">Sticker PNG</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBackgroundType('photo');
                    setTextTheme('white');
                    if (!customPhotoUrl) {
                      fileInputRef.current?.click();
                    }
                  }}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center gap-1 transition-all cursor-pointer ${
                    backgroundType === 'photo'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md ring-2 ring-emerald-500/30 font-bold'
                      : 'bg-slate-900/70 border-white/10 text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <ImageIcon className="w-4 h-4 text-emerald-400" />
                  <span className="text-[11px] font-black uppercase tracking-wider">Sua Foto</span>
                  <span className="text-[8px] text-slate-400">{customPhotoUrl ? 'Foto Carregada' : 'Inserir Foto'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBackgroundType('dark');
                    setTextTheme('white');
                  }}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center gap-1 transition-all cursor-pointer ${
                    backgroundType === 'dark'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md ring-2 ring-emerald-500/30 font-bold'
                      : 'bg-slate-900/70 border-white/10 text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Moon className="w-4 h-4 text-slate-300" />
                  <span className="text-[11px] font-black uppercase tracking-wider">Carbon Dark</span>
                  <span className="text-[8px] text-slate-400">Preto Fosco</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBackgroundType('light');
                    setTextTheme('black');
                  }}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center gap-1 transition-all cursor-pointer ${
                    backgroundType === 'light'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md ring-2 ring-emerald-500/30 font-bold'
                      : 'bg-slate-900/70 border-white/10 text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="text-[11px] font-black uppercase tracking-wider">Modo Claro</span>
                  <span className="text-[8px] text-slate-400">Branco & Prata</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBackgroundType('emerald');
                    setTextTheme('white');
                  }}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center gap-1 transition-all cursor-pointer ${
                    backgroundType === 'emerald'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md ring-2 ring-emerald-500/30 font-bold'
                      : 'bg-slate-900/70 border-white/10 text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span className="text-[11px] font-black uppercase tracking-wider">Esmeralda</span>
                  <span className="text-[8px] text-slate-400">Verde ProRun</span>
                </button>
              </div>

              {/* Hidden File & Camera Inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoUpload}
                className="hidden"
              />

              {/* Photo Source Actions (Tirar Foto ou Galeria) */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setBackgroundType('photo');
                    cameraInputRef.current?.click();
                  }}
                  className="py-2.5 px-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 flex items-center justify-center gap-1.5 text-xs font-black uppercase italic transition-all shadow-sm cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-emerald-400" />
                  <span>Tirar Foto</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBackgroundType('photo');
                    fileInputRef.current?.click();
                  }}
                  className="py-2.5 px-3 rounded-xl border border-white/15 bg-slate-900 hover:bg-white/10 text-slate-200 flex items-center justify-center gap-1.5 text-xs font-black uppercase italic transition-all cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4 text-teal-400" />
                  <span>Galeria</span>
                </button>
              </div>

              {/* Controls for Photo Background */}
              {backgroundType === 'photo' && (
                <div className="pt-3 border-t border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-emerald-400" /> Ajustes da Foto
                    </span>
                    <div className="flex items-center gap-2">
                      {customPhotoUrl && (
                        <button
                          type="button"
                          onClick={() => setCustomPhotoUrl(null)}
                          className="text-[10px] font-black text-rose-400 hover:text-rose-300 uppercase underline cursor-pointer"
                          title="Restaurar foto padrão de exemplo"
                        >
                          Restaurar Padrão
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="text-[10px] font-black text-emerald-400 hover:text-emerald-300 uppercase underline cursor-pointer"
                      >
                        Nova Foto
                      </button>
                      <span className="text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[10px] font-black text-slate-400 hover:text-slate-300 uppercase underline cursor-pointer"
                      >
                        Galeria
                      </button>
                    </div>
                  </div>

                  {/* Active Photo Status */}
                  <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-900/90 border border-white/5 text-[10px]">
                    <span className="text-slate-400">
                      Foto em uso: <strong className={customPhotoUrl ? "text-emerald-400" : "text-amber-400"}>
                        {customPhotoUrl ? "Sua Foto Pessoal" : "Foto Padrão de Corrida"}
                      </strong>
                    </span>
                    {!customPhotoUrl && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-emerald-400 font-black uppercase text-[9px] hover:underline cursor-pointer"
                      >
                        + Colocar Minha Foto
                      </button>
                    )}
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

            {/* 2. ASPECT RATIO / FORMAT */}
            <div className="space-y-2 bg-slate-950/60 p-4 rounded-2xl border border-white/10">
              <label className="text-xs font-black text-white uppercase italic tracking-wider flex items-center gap-1.5">
                <Crop className="w-3.5 h-3.5 text-emerald-400" /> 2. Formato de Exportação
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAspectRatio('story')}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    aspectRatio === 'story'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-[10px] font-black uppercase block">Story (9:16)</span>
                  <span className="text-[8px] text-slate-500">Instagram / Whats</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAspectRatio('square')}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    aspectRatio === 'square'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-[10px] font-black uppercase block">Feed (1:1)</span>
                  <span className="text-[8px] text-slate-500">Quadrado</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAspectRatio('portrait')}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    aspectRatio === 'portrait'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-[10px] font-black uppercase block">Retrato (4:5)</span>
                  <span className="text-[8px] text-slate-500">Feed Vertical</span>
                </button>
              </div>
            </div>

            {/* 3. TÍTULO, FRASES PRÉ-PRONTAS & LIVRE DESCRIÇÃO */}
            <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-white/10">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-white uppercase italic tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> 3. Título & Frases do Treino
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
                    <Download className="w-5 h-5" /> 
                    {backgroundType === 'transparent'
                      ? 'Baixar Sticker com Fundo Transparente (PNG)'
                      : backgroundType === 'photo'
                      ? 'Baixar Foto com Card (PNG)'
                      : 'Baixar Imagem em Alta Resolução (PNG)'}
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
