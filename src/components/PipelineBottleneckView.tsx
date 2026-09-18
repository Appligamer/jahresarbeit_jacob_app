import React, { useState } from 'react';
import { 
  Workflow, 
  Layers, 
  ArrowRight, 
  Eye, 
  GitFork, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Zap, 
  Play, 
  Plus, 
  Trash2, 
  Gauge, 
  ShieldAlert, 
  TrendingUp,
  Sliders,
  Sparkles,
  Inbox
} from 'lucide-react';
import type { 
  SorterSystemStatus, 
  PipelineBall, 
  BallPipelineStage 
} from '../types.ts';

interface PipelineBottleneckViewProps {
  status: SorterSystemStatus;
  onControl: (action: string, value?: unknown) => Promise<void>;
  onTriggerWave: (count: number, colorPattern?: 'mixed' | 'white' | 'orange') => Promise<void>;
  onEnqueueBall: (data?: { color?: 'white' | 'orange'; diameterMm?: number }) => Promise<void>;
  onClearQueue: () => Promise<void>;
}

export const PipelineBottleneckView: React.FC<PipelineBottleneckViewProps> = ({
  status,
  onControl,
  onTriggerWave,
  onEnqueueBall,
  onClearQueue
}) => {
  const [waveSize, setWaveSize] = useState<number>(5);
  const [waveColorPattern, setWaveColorPattern] = useState<'mixed' | 'white' | 'orange'>('mixed');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const pipeline = status.pipeline;
  const bottleneck = pipeline?.bottleneck;
  const activeWave = pipeline?.activeWave;
  const activeBalls = pipeline?.activeBalls || [];

  // Group active balls by stage
  const queuedBalls = activeBalls.filter(b => b.stage === 'queued');
  const transitBalls = activeBalls.filter(b => b.stage === 'transit');
  const measuringBalls = activeBalls.filter(b => b.stage === 'measuring');
  const divertingBalls = activeBalls.filter(b => b.stage === 'diverting');
  const inProgressBalls = activeBalls.filter(b => b.stage !== 'completed');
  const completedInWave = activeWave ? activeWave.completedCount : 0;

  const handleLaunchWave = async (count: number, pattern: 'mixed' | 'white' | 'orange') => {
    setIsSubmitting(true);
    try {
      await onTriggerWave(count, pattern);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSingleBall = async (color?: 'white' | 'orange') => {
    setIsSubmitting(true);
    try {
      await onEnqueueBall(color ? { color } : undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBottleneckBadge = (station: string) => {
    switch (station) {
      case 'feeder': return { label: 'Einlauftrichter & Zuführung', color: 'text-amber-700 bg-amber-100 border-amber-300' };
      case 'conveyor': return { label: 'Förderband (Transit)', color: 'text-blue-700 bg-blue-100 border-blue-300' };
      case 'sensor': return { label: 'TCS34725 Farbsensor-Strecke', color: 'text-purple-700 bg-purple-100 border-purple-300' };
      case 'servo': return { label: 'SG90 Sortierweiche', color: 'text-rose-700 bg-rose-100 border-rose-300' };
      default: return { label: 'Kein Engpass (Harmonisiert)', color: 'text-emerald-700 bg-emerald-100 border-emerald-300' };
    }
  };

  const bottleneckBadge = getBottleneckBadge(bottleneck?.bottleneckStation || 'none');

  return (
    <div className="space-y-6">
      {/* 1. TOP STATS BAR: Wave & Queue Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Active Wave Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <Workflow className="w-4 h-4 text-blue-600" />
              Aktuelle Welle
            </span>
            {activeWave && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeWave.status === 'active' ? 'bg-blue-100 text-blue-700 animate-pulse' : 'bg-slate-100 text-slate-600'
              }`}>
                {activeWave.status === 'active' ? 'Welle aktiv' : 'Welle beendet'}
              </span>
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight font-mono">
              {activeWave ? `Welle #${activeWave.number}` : 'Keine Welle'}
            </span>
            {activeWave && (
              <span className="text-xs text-slate-500">
                ({activeWave.ballCount} Bälle)
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            {activeWave 
              ? `Erkannt: ${new Date(activeWave.detectedAt).toLocaleTimeString('de-DE')}`
              : 'Wartet auf Eintreffen neuer Bälle'}
          </div>
        </div>

        {/* In Queue (Trichter) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <Inbox className="w-4 h-4 text-amber-600" />
              In Warteschlange (Trichter)
            </span>
            {queuedBalls.length >= 4 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 animate-bounce">
                Staugefahr!
              </span>
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-extrabold tracking-tight font-mono ${
              queuedBalls.length >= 4 ? 'text-rose-600' : 'text-slate-900'
            }`}>
              {queuedBalls.length}
            </span>
            <span className="text-xs text-slate-500">Bälle wartend</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Zulauf-Puffer am Feeder
          </div>
        </div>

        {/* In Progress (Auf der Strecke) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-indigo-600" />
              In Durchlauf (Progress)
            </span>
            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
              Band & Sensoren
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight font-mono">
              {inProgressBalls.length}
            </span>
            <span className="text-xs text-slate-500">Bälle im System</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {transitBalls.length} Band • {measuringBalls.length} Sensor • {divertingBalls.length} Weiche
          </div>
        </div>

        {/* Completed (Fertig im Container) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Fertig sortiert (Completed)
            </span>
            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
              Zielbehälter
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-600 tracking-tight font-mono">
              {completedInWave}
            </span>
            <span className="text-xs text-slate-500">
              {activeWave ? `/ ${activeWave.ballCount} dieser Welle` : 'Bälle'}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Gesamt seit Start: {status.totalBalls} Bälle
          </div>
        </div>
      </div>

      {/* 2. BOTTLENECK & CONGESTION ALERT BANNER */}
      {bottleneck && (
        <div className={`p-5 rounded-2xl border transition-all duration-300 ${
          bottleneck.status === 'congested'
            ? 'bg-rose-50/90 border-rose-300 shadow-sm'
            : bottleneck.status === 'warning'
            ? 'bg-amber-50/90 border-amber-300 shadow-sm'
            : 'bg-emerald-50/70 border-emerald-200'
        }`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className={`p-2.5 rounded-xl mt-0.5 ${
                bottleneck.status === 'congested'
                  ? 'bg-rose-600 text-white animate-pulse'
                  : bottleneck.status === 'warning'
                  ? 'bg-amber-500 text-white'
                  : 'bg-emerald-600 text-white'
              }`}>
                {bottleneck.status === 'congested' ? (
                  <ShieldAlert className="w-6 h-6" />
                ) : bottleneck.status === 'warning' ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <Sparkles className="w-6 h-6" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900">
                    {bottleneck.status === 'congested'
                      ? 'Stauung auf der Sortierstrecke erkannt!'
                      : bottleneck.status === 'warning'
                      ? 'Erhöhte Auslastung / Taktpufferung'
                      : 'Durchlauf-Pipeline optimal abgestimmt'}
                  </h3>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${bottleneckBadge.color}`}>
                    Engpass: {bottleneckBadge.label}
                  </span>
                </div>
                <p className="text-xs text-slate-700 mt-1 max-w-3xl leading-relaxed">
                  {bottleneck.recommendation}
                </p>
              </div>
            </div>

            {/* Congestion Gauge & Tuning Actions */}
            <div className="flex items-center gap-4 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-200">
              <div className="text-right">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Stau-Score
                </div>
                <div className={`text-xl font-extrabold font-mono ${
                  bottleneck.congestionScore > 60 ? 'text-rose-600' : bottleneck.congestionScore > 35 ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  {bottleneck.congestionScore}%
                </div>
              </div>

              {/* Quick tuning button based on bottleneck */}
              {bottleneck.bottleneckStation === 'feeder' && (
                <button
                  onClick={() => onControl('set_feeder_speed', Math.max(30, status.feederSpeed - 15))}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Feeder drosseln (-15%)</span>
                </button>
              )}

              {bottleneck.bottleneckStation === 'conveyor' && (
                <button
                  onClick={() => onControl('set_conveyor_speed', Math.min(100, status.conveyorSpeed + 15))}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Band beschleunigen (+15%)</span>
                </button>
              )}
            </div>
          </div>

          {/* Station Times Benchmark */}
          <div className="mt-4 pt-3 border-t border-slate-200/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white/70 p-2 rounded-lg border border-slate-200/50">
              <span className="text-slate-500 text-[10px] block">Feeder-Verweilzeit:</span>
              <span className="font-mono font-bold text-slate-800">{bottleneck.stationStats.feederQueueTimeMs} ms</span>
            </div>
            <div className="bg-white/70 p-2 rounded-lg border border-slate-200/50">
              <span className="text-slate-500 text-[10px] block">Band-Transitzeit:</span>
              <span className="font-mono font-bold text-slate-800">{bottleneck.stationStats.conveyorTransitTimeMs} ms</span>
            </div>
            <div className="bg-white/70 p-2 rounded-lg border border-slate-200/50">
              <span className="text-slate-500 text-[10px] block">TCS34725 Farbmessung:</span>
              <span className="font-mono font-bold text-slate-800">{bottleneck.stationStats.sensorMeasurementTimeMs} ms</span>
            </div>
            <div className="bg-white/70 p-2 rounded-lg border border-slate-200/50">
              <span className="text-slate-500 text-[10px] block">SG90 Weichenstellzeit:</span>
              <span className="font-mono font-bold text-slate-800">{bottleneck.stationStats.servoDivertTimeMs} ms</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. INTERACTIVE VISUAL PIPELINE STAGE FLOW */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Workflow className="w-4 h-4 text-blue-600" />
              Förderstrecken-Pipeline & Stationen
            </h2>
            <p className="text-xs text-slate-500">
              Visuelle Verfolgung jedes eintreffenden Balls von der Warteschlange bis zum Zielbehälter
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Streckenstatus:</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              status.state === 'running' 
                ? 'bg-emerald-100 text-emerald-700' 
                : status.state === 'paused' 
                ? 'bg-amber-100 text-amber-700' 
                : 'bg-slate-100 text-slate-700'
            }`}>
              {status.state === 'running' ? '● In Bewegung' : status.state === 'paused' ? '❚❚ Pausiert' : '○ Gestoppt'}
            </span>
          </div>
        </div>

        {/* Visual Pipeline Stations */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 pt-2">
          {/* Station 1: Trichter / Warteschlange */}
          <div className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
            queuedBalls.length > 0 ? 'bg-amber-50/40 border-amber-300' : 'bg-slate-50/60 border-slate-200'
          }`}>
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                <span className="flex items-center gap-1.5">
                  <Inbox className="w-4 h-4 text-amber-600" />
                  1. Trichter-Queue
                </span>
                <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-mono">
                  {queuedBalls.length} Ball
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">
                Warteschlange eintreffender Wellen vor der Vereinzelung.
              </p>

              {/* Ball Chips in Queue */}
              <div className="space-y-1.5 min-h-[90px]">
                {queuedBalls.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[11px] text-slate-400 italic py-4">
                    Keine Bälle wartend
                  </div>
                ) : (
                  queuedBalls.map((ball, idx) => (
                    <div 
                      key={ball.id} 
                      className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs text-xs animate-in fade-in"
                    >
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-3 h-3 rounded-full border border-slate-300 shadow-2xs" 
                          style={{ backgroundColor: ball.color === 'orange' ? '#f97316' : '#ffffff' }}
                        />
                        <span className="font-mono text-[11px] font-semibold text-slate-800">
                          #{idx + 1} {ball.color === 'orange' ? 'Orange' : 'Weiß'}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                        Wartet
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
              <span>Feeder-PWM:</span>
              <strong className="font-mono text-slate-700">{status.feederSpeed}%</strong>
            </div>
          </div>

          {/* Station 2: Förderband (Transit) */}
          <div className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
            transitBalls.length > 0 ? 'bg-blue-50/40 border-blue-300' : 'bg-slate-50/60 border-slate-200'
          }`}>
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                <span className="flex items-center gap-1.5">
                  <ArrowRight className="w-4 h-4 text-blue-600" />
                  2. Förderband
                </span>
                <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 text-[10px] font-mono">
                  {transitBalls.length} aktiv
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">
                Vereinzelung & Transport in Richtung Messstation.
              </p>

              {/* Ball Chips on Conveyor */}
              <div className="space-y-2 min-h-[90px]">
                {transitBalls.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[11px] text-slate-400 italic py-4">
                    Strecke frei
                  </div>
                ) : (
                  transitBalls.map((ball) => (
                    <div 
                      key={ball.id} 
                      className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs text-xs space-y-1 animate-in fade-in"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span 
                            className="w-2.5 h-2.5 rounded-full border border-slate-300" 
                            style={{ backgroundColor: ball.color === 'orange' ? '#f97316' : '#ffffff' }}
                          />
                          <span className="font-mono text-[11px] font-semibold text-slate-800">
                            {ball.color === 'orange' ? 'Orange' : 'Weiß'}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-blue-700">
                          {Math.round(ball.progressPercent)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-blue-600 h-full rounded-full transition-all duration-200" 
                          style={{ width: `${ball.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
              <span>Band-PWM:</span>
              <strong className="font-mono text-slate-700">{status.conveyorSpeed}%</strong>
            </div>
          </div>

          {/* Station 3: Farbsensor- & Prüfstation */}
          <div className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
            measuringBalls.length > 0 ? 'bg-purple-50/50 border-purple-300' : 'bg-slate-50/60 border-slate-200'
          }`}>
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                <span className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-purple-600" />
                  3. TCS34725 Sensor
                </span>
                <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 text-[10px] font-mono">
                  {measuringBalls.length > 0 ? 'Messung' : 'Bereit'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">
                Lichtschranke & Farberkennung (RGB & Güteprüfung).
              </p>

              {/* Ball chip in measuring */}
              <div className="space-y-2 min-h-[90px]">
                {measuringBalls.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[11px] text-slate-400 italic py-4">
                    Kein Ball im Messfenster
                  </div>
                ) : (
                  measuringBalls.map((ball) => (
                    <div 
                      key={ball.id} 
                      className="bg-white p-2 rounded-lg border border-purple-200 shadow-2xs text-xs space-y-1 animate-pulse"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-purple-900 text-[11px]">
                          Prüfung: {ball.color === 'orange' ? 'Orange' : 'Weiß'}
                        </span>
                        <span className="text-[10px] font-mono bg-purple-100 text-purple-800 px-1 rounded">
                          {ball.diameterMm} mm
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-purple-600 h-full rounded-full transition-all duration-200" 
                          style={{ width: `${ball.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
              <span>Lichtschranke:</span>
              <strong className={`font-mono ${status.telemetry.lightBarrierTripped ? 'text-purple-600' : 'text-slate-400'}`}>
                {status.telemetry.lightBarrierTripped ? 'UNTERBROCHEN' : 'Frei'}
              </strong>
            </div>
          </div>

          {/* Station 4: Sortierweiche SG90 */}
          <div className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
            divertingBalls.length > 0 ? 'bg-indigo-50/50 border-indigo-300' : 'bg-slate-50/60 border-slate-200'
          }`}>
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                <span className="flex items-center gap-1.5">
                  <GitFork className="w-4 h-4 text-indigo-600" />
                  4. SG90 Weiche
                </span>
                <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 text-[10px] font-mono">
                  {status.currentServoAngle}°
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">
                Servo schwenkt auf berechneten Zielbehälter.
              </p>

              {/* Ball chip in diverting */}
              <div className="space-y-2 min-h-[90px]">
                {divertingBalls.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[11px] text-slate-400 italic py-4">
                    Kein Ball an Weiche
                  </div>
                ) : (
                  divertingBalls.map((ball) => (
                    <div 
                      key={ball.id} 
                      className="bg-white p-2 rounded-lg border border-indigo-200 shadow-2xs text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-indigo-900 text-[11px] truncate">
                          ➔ {ball.targetContainerName || 'Zielbehälter'}
                        </span>
                        <span className="text-[10px] font-bold text-indigo-700">
                          {Math.round(ball.progressPercent)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-indigo-600 h-full rounded-full transition-all duration-200" 
                          style={{ width: `${ball.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
              <span>Servowinkel:</span>
              <strong className="font-mono text-slate-700">{status.currentServoAngle}°</strong>
            </div>
          </div>

          {/* Station 5: Zielbehälter (Sortiert / Completed) */}
          <div className="p-3.5 rounded-xl border bg-emerald-50/40 border-emerald-300 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  5. Zielbehälter
                </span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-mono">
                  Fertig
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">
                Ball liegt im Behälter, Zähler erhöht, Log gespeichert.
              </p>

              {/* Completed Mini Summary */}
              <div className="space-y-1.5 min-h-[90px] flex flex-col justify-center">
                <div className="bg-white p-2 rounded-lg border border-emerald-200 text-center shadow-2xs">
                  <div className="text-lg font-extrabold font-mono text-emerald-700">
                    {completedInWave} / {activeWave ? activeWave.ballCount : 0}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Bälle dieser Welle fertig
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
              <span>Erfolgsrate:</span>
              <strong className="font-mono text-emerald-700">100% erfasst</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 4. WAVE INJECTION & SIMULATION CONTROLS */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600" />
              Wellen-Generator & Stau-Simulation
            </h3>
            <p className="text-xs text-slate-500">
              Neue Bälle am Trichter einwerfen, um die Warteschlange, Wellen-Erkennung und Bottlenecks live zu testen
            </p>
          </div>

          {queuedBalls.length > 0 && (
            <button
              onClick={onClearQueue}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Warteschlange leeren</span>
            </button>
          )}
        </div>

        {/* Quick Launch Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* Action 1: Single Ball */}
          <div className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors space-y-2 bg-slate-50/50 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Einzelball einwerfen
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Trifft am Trichter ein und reiht sich in die Warteschlange ein.
              </p>
            </div>
            <div className="flex gap-1.5 pt-2">
              <button
                disabled={isSubmitting}
                onClick={() => handleSingleBall('white')}
                className="flex-1 py-1.5 px-2 rounded-lg bg-white border border-slate-200 hover:border-blue-400 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
              >
                ⚪ Weiß
              </button>
              <button
                disabled={isSubmitting}
                onClick={() => handleSingleBall('orange')}
                className="flex-1 py-1.5 px-2 rounded-lg bg-white border border-slate-200 hover:border-orange-400 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
              >
                🟠 Orange
              </button>
            </div>
          </div>

          {/* Action 2: Standard Wave (3-5 Balls) */}
          <div className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors space-y-2 bg-slate-50/50 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Workflow className="w-3.5 h-3.5 text-blue-600" />
                Normale Welle (5 Bälle)
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Erkennt eine neue Welle und arbeitet die Warteschlange kontinuierlich ab.
              </p>
            </div>
            <button
              disabled={isSubmitting}
              onClick={() => handleLaunchWave(5, 'mixed')}
              className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors"
            >
              Welle mit 5 Bällen starten
            </button>
          </div>

          {/* Action 3: Congestion / Traffic Jam Stress Test (10 Balls) */}
          <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                Stau-Stresstest (10 Bälle)
              </div>
              <p className="text-[11px] text-amber-700 mt-1">
                Füllt den Einlauftrichter schlagartig, um Staus und Engpässe zu demonstrieren.
              </p>
            </div>
            <button
              disabled={isSubmitting}
              onClick={() => handleLaunchWave(10, 'mixed')}
              className="w-full py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-2xs transition-colors"
            >
              ⚠️ Stau-Test (10 Bälle)
            </button>
          </div>

          {/* Action 4: Custom Wave Config */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-slate-600" />
                Individuelle Welle
              </div>
              <div className="flex items-center gap-2 mt-1">
                <select
                  value={waveSize}
                  onChange={(e) => setWaveSize(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 font-semibold"
                >
                  <option value={2}>2 Bälle</option>
                  <option value={4}>4 Bälle</option>
                  <option value={8}>8 Bälle</option>
                  <option value={15}>15 Bälle</option>
                </select>

                <select
                  value={waveColorPattern}
                  onChange={(e) => setWaveColorPattern(e.target.value as 'mixed' | 'white' | 'orange')}
                  className="bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 font-semibold"
                >
                  <option value="mixed">Gemischt</option>
                  <option value="white">Nur Weiß</option>
                  <option value="orange">Nur Orange</option>
                </select>
              </div>
            </div>
            <button
              disabled={isSubmitting}
              onClick={() => handleLaunchWave(waveSize, waveColorPattern)}
              className="w-full py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs transition-colors"
            >
              Welle aufgeben
            </button>
          </div>
        </div>

        {/* Start / Pause Reminder */}
        {status.state !== 'running' && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-3 text-xs text-blue-800">
            <span className="flex items-center gap-2">
              <Play className="w-4 h-4 text-blue-600" />
              <span>Die Sortieranlage ist aktuell pausiert. Bälle warten in der Warteschlange, bis der Antrieb gestartet wird.</span>
            </span>
            <button
              onClick={() => onControl('start')}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shrink-0 transition-colors"
            >
              Anlage starten ▶
            </button>
          </div>
        )}
      </div>

      {/* 5. RECENT WAVES ARCHIVE */}
      {pipeline?.recentWaves && pipeline.recentWaves.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-600" />
              Historie vorheriger Wellen
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {pipeline.recentWaves.length} Wellen abgeschlossen
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {pipeline.recentWaves.slice(0, 5).map((wave) => (
              <div key={wave.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-bold font-mono text-slate-800">
                    Welle #{wave.number}
                  </span>
                  <span className="text-slate-500">
                    {new Date(wave.detectedAt).toLocaleTimeString('de-DE')}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-slate-600">
                    <strong>{wave.completedCount}</strong> Bälle erfolgreich sortiert
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                    ✓ Abgeschlossen
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
