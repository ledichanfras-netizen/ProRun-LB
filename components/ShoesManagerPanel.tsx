import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  Check,
  ChevronDown,
  ChevronUp,
  Edit3,
  Footprints,
  History,
  Plus,
  RotateCcw,
  Sparkles,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import type { Athlete, AthletePlan, RunningShoe, ShoeCategory } from '../types';
import {
  calculateShoeStats,
  formatShoeLabel,
  SHOE_BRAND_PRESETS,
  SHOE_CATEGORY_META,
  SHOE_COLOR_META,
} from '../utils/shoeUtils';
import { formatDistance } from '../utils/formatDistance';

interface ShoesManagerPanelProps {
  athlete: Athlete;
  plan?: AthletePlan | null;
  isLight?: boolean;
  onUpdateShoes: (shoes: RunningShoe[]) => Promise<void>;
}

const DEFAULT_MAX_KM_PRESETS = [500, 600, 700, 800];

export const ShoesManagerPanel: React.FC<ShoesManagerPanelProps> = ({
  athlete,
  plan,
  isLight = false,
  onUpdateShoes,
}) => {
  const shoes = athlete.shoes || [];

  const [showForm, setShowForm] = useState(false);
  const [editingShoeId, setEditingShoeId] = useState<string | null>(null);
  const [brand, setBrand] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ShoeCategory>('daily');
  const [initialKm, setInitialKm] = useState('0');
  const [maxKm, setMaxKm] = useState('600');
  const [color, setColor] = useState<NonNullable<RunningShoe['color']>>('emerald');
  const [isDefault, setIsDefault] = useState(false);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showRetired, setShowRetired] = useState(false);

  const shoeEntries = useMemo(() => {
    return shoes.map((shoe) => ({
      shoe,
      stats: calculateShoeStats(shoe, plan, athlete.archivedPlans),
    }));
  }, [shoes, plan, athlete.archivedPlans]);

  const activeEntries = useMemo(
    () => shoeEntries.filter((e) => !e.shoe.retired),
    [shoeEntries]
  );
  const retiredEntries = useMemo(
    () => shoeEntries.filter((e) => e.shoe.retired),
    [shoeEntries]
  );

  const totalActiveKm = useMemo(
    () => activeEntries.reduce((sum, e) => sum + e.stats.totalKm, 0),
    [activeEntries]
  );
  const alertCount = useMemo(
    () => activeEntries.filter((e) => e.stats.status !== 'ok').length,
    [activeEntries]
  );

  const openCreateForm = () => {
    setEditingShoeId(null);
    setBrand('');
    setName('');
    setCategory('daily');
    setInitialKm('0');
    setMaxKm('600');
    setColor('emerald');
    setIsDefault(activeEntries.length === 0);
    setNotes('');
    setFormError('');
    setShowForm(true);
  };

  const openEditForm = (shoe: RunningShoe) => {
    setEditingShoeId(shoe.id);
    setBrand(shoe.brand || '');
    setName(shoe.name || '');
    setCategory(shoe.category || 'daily');
    setInitialKm(String(shoe.initialKm ?? 0));
    setMaxKm(String(shoe.maxKm ?? 600));
    setColor(shoe.color || 'emerald');
    setIsDefault(Boolean(shoe.isDefault));
    setNotes(shoe.notes || '');
    setFormError('');
    setShowForm(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedBrand = brand.trim();
    const parsedInitial = Number(String(initialKm || '0').replace(',', '.'));
    const parsedMax = Number(String(maxKm || '600').replace(',', '.'));

    if (!trimmedName && !trimmedBrand) {
      setFormError('Informe pelo menos a marca ou modelo do tênis.');
      return;
    }
    if (!Number.isFinite(parsedInitial) || parsedInitial < 0) {
      setFormError('Informe uma quilometragem inicial válida (0 ou maior).');
      return;
    }
    if (!Number.isFinite(parsedMax) || parsedMax < 50) {
      setFormError('A meta de vida útil deve ser de pelo menos 50 km.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const now = new Date().toISOString();
      const targetId = editingShoeId || `shoe_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      let updatedList: RunningShoe[];
      if (editingShoeId) {
        updatedList = shoes.map((s) => {
          if (s.id === editingShoeId) {
            return {
              ...s,
              brand: trimmedBrand,
              name: trimmedName || trimmedBrand,
              category,
              initialKm: parsedInitial,
              maxKm: parsedMax,
              color,
              isDefault,
              notes: notes.trim() || undefined,
              alertedLevel: parsedMax > (s.maxKm || 0) ? undefined : s.alertedLevel,
            };
          }
          return isDefault ? { ...s, isDefault: false } : s;
        });
      } else {
        const newShoe: RunningShoe = {
          id: targetId,
          brand: trimmedBrand,
          name: trimmedName || trimmedBrand,
          category,
          initialKm: parsedInitial,
          maxKm: parsedMax,
          color,
          isDefault: isDefault || activeEntries.length === 0,
          retired: false,
          notes: notes.trim() || undefined,
          createdAt: now,
        };
        updatedList = [
          ...(newShoe.isDefault ? shoes.map((s) => ({ ...s, isDefault: false })) : shoes),
          newShoe,
        ];
      }

      await onUpdateShoes(updatedList);
      setShowForm(false);
      setEditingShoeId(null);
    } catch (err: any) {
      setFormError(err?.message || 'Erro ao salvar tênis. Verifique a conexão.');
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (shoeId: string) => {
    const updated = shoes.map((s) => ({
      ...s,
      isDefault: s.id === shoeId,
    }));
    await onUpdateShoes(updated);
  };

  const handleToggleRetire = async (shoeId: string) => {
    const target = shoes.find((s) => s.id === shoeId);
    if (!target) return;
    const retiring = !target.retired;
    const updated = shoes.map((s) => {
      if (s.id !== shoeId) return s;
      return {
        ...s,
        retired: retiring,
        retiredAt: retiring ? new Date().toISOString() : undefined,
        isDefault: retiring ? false : s.isDefault,
      };
    });
    // If the retired shoe was default, promote another active shoe if any
    if (retiring && !updated.some((s) => !s.retired && s.isDefault)) {
      const firstActive = updated.find((s) => !s.retired);
      if (firstActive) firstActive.isDefault = true;
    }
    await onUpdateShoes(updated);
  };

  const handleDelete = async (shoeId: string) => {
    const updated = shoes.filter((s) => s.id !== shoeId);
    if (updated.length > 0 && !updated.some((s) => !s.retired && s.isDefault)) {
      const firstActive = updated.find((s) => !s.retired);
      if (firstActive) firstActive.isDefault = true;
    }
    await onUpdateShoes(updated);
    setConfirmDeleteId(null);
  };

  const cardBg = isLight
    ? 'bg-white border-slate-200 text-slate-900 shadow-sm'
    : 'bg-slate-900 border-slate-800 text-white shadow-xl';

  return (
    <div className="space-y-5 animate-fade-in px-2">
      {/* Header + Resumo */}
      <div className={`rounded-[2.2rem] border p-5 sm:p-6 space-y-5 ${cardBg}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/15 text-emerald-500 border border-emerald-500/25 rounded-2xl shrink-0">
              <Footprints className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black uppercase italic tracking-tight">
                Garagem de Tênis &amp; Rotação
              </h3>
              <p className={`text-[11px] font-medium mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Cadastre vários pares, intercale nos treinos e acompanhe o desgaste automático em km.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            className="px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase italic tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98] cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Tênis</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <div
            className={`p-3 rounded-2xl border text-center ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5'
            }`}
          >
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
              Pares Ativos
            </span>
            <span className="text-base sm:text-lg font-black font-mono text-emerald-500">
              {activeEntries.length}
            </span>
          </div>
          <div
            className={`p-3 rounded-2xl border text-center ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5'
            }`}
          >
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
              KM Totais (Ativos)
            </span>
            <span className="text-base sm:text-lg font-black font-mono">
              {formatDistance(totalActiveKm)}
            </span>
          </div>
          <div
            className={`p-3 rounded-2xl border text-center ${
              alertCount > 0
                ? 'bg-amber-500/10 border-amber-500/30'
                : isLight
                ? 'bg-slate-50 border-slate-200'
                : 'bg-white/5 border-white/5'
            }`}
          >
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
              Alertas de Troca
            </span>
            <span
              className={`text-base sm:text-lg font-black font-mono ${
                alertCount > 0 ? 'text-amber-400' : 'text-emerald-500'
              }`}
            >
              {alertCount}
            </span>
          </div>
        </div>
      </div>

      {/* Formulário de Cadastro / Edição */}
      {showForm && (
        <form
          onSubmit={handleSaveForm}
          className={`rounded-[2.2rem] border p-5 sm:p-6 space-y-5 animate-fade-in ${cardBg}`}
        >
          <div className="flex items-center justify-between border-b pb-3 border-emerald-500/15">
            <h4 className="text-sm font-black uppercase italic tracking-tight">
              {editingShoeId ? 'Editar Tênis' : 'Novo Tênis de Corrida'}
            </h4>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className={`p-1.5 rounded-xl transition-colors ${
                isLight ? 'text-slate-400 hover:bg-slate-100' : 'text-slate-400 hover:bg-white/10'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Presets de Marca */}
          <div className="space-y-2">
            <label className="pro-label block">Marca</label>
            <div className="flex flex-wrap gap-1.5">
              {SHOE_BRAND_PRESETS.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBrand(b)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                    brand.toLowerCase() === b.toLowerCase()
                      ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                      : isLight
                      ? 'bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-400'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:border-white/25'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
            <input
              type="text"
              className="pro-input w-full text-sm"
              placeholder="Ou digite a marca (Ex: Olympikus, Asics, Nike...)"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="pro-label block">Modelo / Apelido</label>
              <input
                type="text"
                className="pro-input w-full text-sm"
                placeholder="Ex: Corre 4, Novablast 4, Vaporfly 3"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="pro-label block">KM Já Rodados (Antes do App)</label>
              <input
                type="text"
                inputMode="decimal"
                className="pro-input w-full text-sm font-mono"
                placeholder="0"
                value={initialKm}
                onChange={(e) => setInitialKm(e.target.value)}
              />
            </div>
          </div>

          {/* Categoria / Rotação Inteligente */}
          <div className="space-y-2">
            <label className="pro-label flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              <span>Perfil de Uso (Sugestão Automática por Treino)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {(Object.keys(SHOE_CATEGORY_META) as ShoeCategory[]).map((catKey) => {
                const meta = SHOE_CATEGORY_META[catKey];
                const selected = category === catKey;
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setCategory(catKey)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      selected
                        ? isLight
                          ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                          : 'bg-emerald-500/15 border-emerald-500 ring-2 ring-emerald-500/20'
                        : isLight
                        ? 'bg-slate-50 border-slate-200 hover:border-emerald-300'
                        : 'bg-white/5 border-white/10 hover:border-white/25'
                    }`}
                  >
                    <span className="text-xs font-black uppercase italic block">
                      {meta.label}
                    </span>
                    <span
                      className={`text-[10px] leading-snug block mt-1 ${
                        isLight ? 'text-slate-600' : 'text-slate-400'
                      }`}
                    >
                      {meta.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Meta de Vida Útil + Cor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="pro-label block">Meta de Vida Útil (KM)</label>
              <div className="flex flex-wrap gap-1.5">
                {DEFAULT_MAX_KM_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setMaxKm(String(preset))}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-black font-mono border transition-all cursor-pointer ${
                      Number(maxKm) === preset
                        ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                        : isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-700'
                        : 'bg-white/5 border-white/10 text-slate-300'
                    }`}
                  >
                    {preset} km
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={50}
                max={5000}
                className="pro-input w-full text-sm font-mono"
                value={maxKm}
                onChange={(e) => setMaxKm(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="pro-label block">Cor de Identificação</label>
              <div className="flex items-center gap-2 pt-1">
                {(Object.keys(SHOE_COLOR_META) as NonNullable<RunningShoe['color']>[]).map(
                  (cKey) => {
                    const cMeta = SHOE_COLOR_META[cKey];
                    return (
                      <button
                        key={cKey}
                        type="button"
                        onClick={() => setColor(cKey)}
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                          color === cKey
                            ? 'border-white ring-2 ring-emerald-500 scale-105'
                            : isLight
                            ? 'border-slate-200 bg-slate-50'
                            : 'border-white/10 bg-white/5'
                        }`}
                        title={cMeta.label}
                      >
                        <span className={`w-4 h-4 rounded-full ${cMeta.dotClass}`} />
                      </button>
                    );
                  }
                )}
              </div>

              <label className="flex items-center gap-2.5 pt-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded"
                />
                <span className="text-xs font-bold">
                  Definir como tênis padrão para novos treinos
                </span>
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="pro-label block">Observações (Opcional)</label>
            <input
              type="text"
              className="pro-input w-full text-xs"
              placeholder="Ex: Numeração 41, uso preferencial no asfalto..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {formError && (
            <p className="text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/25 rounded-xl p-3">
              {formError}
            </p>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => setShowForm(false)}
              className={`px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer ${
                isLight ? 'bg-slate-100 text-slate-700' : 'bg-white/5 text-slate-300'
              }`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase italic tracking-wider flex items-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{saving ? 'Salvando...' : editingShoeId ? 'Salvar Alterações' : 'Cadastrar Tênis'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Lista de Tênis Ativos */}
      {activeEntries.length === 0 && !showForm ? (
        <div className={`rounded-[2.2rem] border p-8 sm:p-10 text-center space-y-4 ${cardBg}`}>
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto text-emerald-500">
            <Footprints className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h4 className="text-sm font-black uppercase italic">Sua garagem ainda está vazia</h4>
            <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Cadastre seus tênis de corrida para intercalar entre rodagens, treinos rápidos e provas, somando automaticamente a quilometragem de cada par.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateForm}
            className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase italic tracking-wider inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Meu Primeiro Tênis</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {activeEntries.map(({ shoe, stats }) => {
            const colorMeta = SHOE_COLOR_META[shoe.color || 'emerald'] || SHOE_COLOR_META.emerald;
            const catMeta = SHOE_CATEGORY_META[shoe.category] || SHOE_CATEGORY_META.daily;
            const barWidth = Math.min(100, Math.max(0, stats.usagePercent));
            const barColor =
              stats.status === 'replace'
                ? 'bg-rose-500'
                : stats.status === 'warning'
                ? 'bg-amber-500'
                : 'bg-emerald-500';
            const isExpanded = expandedHistoryId === shoe.id;

            return (
              <div
                key={shoe.id}
                className={`rounded-[2.2rem] border p-5 sm:p-6 space-y-4 transition-all ${cardBg}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`w-3 h-3 rounded-full shrink-0 ${colorMeta.dotClass}`} />
                      <h4 className="text-base font-black uppercase italic tracking-tight">
                        {formatShoeLabel(shoe)}
                      </h4>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${catMeta.badgeClass}`}
                      >
                        {catMeta.shortLabel}
                      </span>
                      {shoe.isDefault && (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                          <Star className="w-2.5 h-2.5 fill-current" /> Padrão
                        </span>
                      )}
                    </div>
                    {shoe.notes && (
                      <p className={`text-[11px] italic ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        {shoe.notes}
                      </p>
                    )}
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <div className="text-xl font-black font-mono italic text-emerald-500 leading-none">
                      {formatDistance(stats.totalKm)} <span className="text-xs">km</span>
                    </div>
                    <span className={`text-[10px] font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      de {shoe.maxKm} km ({stats.usagePercent}%) • {stats.workoutsCount}{' '}
                      {stats.workoutsCount === 1 ? 'treino' : 'treinos'}
                    </span>
                  </div>
                </div>

                {/* Barra de Progresso de Vida Útil */}
                <div className="space-y-1.5">
                  <div
                    className={`w-full h-3 rounded-full overflow-hidden ${
                      isLight ? 'bg-slate-100' : 'bg-slate-800'
                    }`}
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>
                      {shoe.initialKm > 0
                        ? `Inicial: ${formatDistance(shoe.initialKm)} km + No app: ${formatDistance(stats.appKm)} km`
                        : `Registrado no app: ${formatDistance(stats.appKm)} km`}
                    </span>
                    <span
                      className={
                        stats.status === 'replace'
                          ? 'text-rose-400 font-black'
                          : stats.status === 'warning'
                          ? 'text-amber-400 font-black'
                          : isLight
                          ? 'text-slate-600'
                          : 'text-slate-300'
                      }
                    >
                      {stats.status === 'replace'
                        ? 'Meta atingida!'
                        : `Restam ${formatDistance(stats.remainingKm)} km`}
                    </span>
                  </div>
                </div>

                {/* Alerta de Desgaste */}
                {stats.status !== 'ok' && (
                  <div
                    className={`p-3 rounded-2xl border flex items-center gap-2.5 text-xs font-bold ${
                      stats.status === 'replace'
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      {stats.status === 'replace'
                        ? `Este tênis atingiu ${stats.usagePercent}% da vida útil recomendada (${shoe.maxKm} km). Avalie aposentar este par para evitar sobrecarga articular.`
                        : `Atenção: desgaste em ${stats.usagePercent}%. Planeje a transição gradual para um novo par nos próximos ${formatDistance(stats.remainingKm)} km.`}
                    </span>
                  </div>
                )}

                {/* Ações do Tênis */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setExpandedHistoryId(isExpanded ? null : shoe.id)}
                    className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border cursor-pointer transition-all ${
                      isLight
                        ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200'
                    }`}
                  >
                    <History className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Histórico ({stats.workoutsCount})</span>
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {!shoe.isDefault && (
                    <button
                      type="button"
                      onClick={() => void handleSetDefault(shoe.id)}
                      className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border cursor-pointer transition-all ${
                        isLight
                          ? 'bg-slate-50 hover:bg-emerald-50 border-slate-200 text-slate-700'
                          : 'bg-white/5 hover:bg-emerald-500/15 border-white/10 text-slate-200'
                      }`}
                    >
                      <Star className="w-3.5 h-3.5 text-amber-400" />
                      <span>Tornar Padrão</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => openEditForm(shoe)}
                    className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border cursor-pointer transition-all ${
                      isLight
                        ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                    <span>Editar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleToggleRetire(shoe.id)}
                    className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border cursor-pointer transition-all ${
                      isLight
                        ? 'bg-slate-50 hover:bg-amber-50 border-slate-200 text-slate-700'
                        : 'bg-white/5 hover:bg-amber-500/15 border-white/10 text-slate-200'
                    }`}
                  >
                    <Archive className="w-3.5 h-3.5 text-amber-400" />
                    <span>Aposentar</span>
                  </button>

                  {confirmDeleteId === shoe.id ? (
                    <div className="flex items-center gap-1.5 ml-auto">
                      <button
                        type="button"
                        onClick={() => void handleDelete(shoe.id)}
                        className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black uppercase cursor-pointer"
                      >
                        Confirmar Exclusão
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2.5 py-2 rounded-xl bg-slate-700 text-slate-200 text-[10px] font-bold uppercase cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(shoe.id)}
                      className="px-2.5 py-2 rounded-xl text-rose-400 hover:bg-rose-500/15 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ml-auto cursor-pointer transition-all"
                      title="Excluir tênis"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Histórico Expandido */}
                {isExpanded && (
                  <div
                    className={`p-3.5 rounded-2xl border space-y-2 max-h-60 overflow-y-auto custom-scrollbar ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-white/5'
                    }`}
                  >
                    {stats.activities.length === 0 ? (
                      <p className="text-[11px] text-slate-400 text-center py-2">
                        Nenhum treino registrado com este tênis ainda.
                      </p>
                    ) : (
                      stats.activities.map((act) => (
                        <div
                          key={act.id}
                          className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border text-xs ${
                            isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/5'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="font-black uppercase italic text-[11px] truncate">
                              {act.title}
                              {act.isFreeRun && (
                                <span className="ml-1.5 text-[9px] text-emerald-400 not-italic">
                                  (Corrida Livre)
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {act.date ? act.date.split('-').reverse().join('/') : '--'}
                              {act.duration ? ` • ${act.duration}` : ''}
                            </p>
                          </div>
                          <span className="font-mono font-black text-emerald-500 shrink-0">
                            +{formatDistance(act.distanceKm)} km
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tênis Aposentados */}
      {retiredEntries.length > 0 && (
        <div className={`rounded-[2.2rem] border p-5 space-y-3 ${cardBg}`}>
          <button
            type="button"
            onClick={() => setShowRetired(!showRetired)}
            className="w-full flex items-center justify-between text-xs font-black uppercase italic tracking-wider cursor-pointer"
          >
            <span className="flex items-center gap-2 text-slate-400">
              <Archive className="w-4 h-4" />
              Tênis Aposentados ({retiredEntries.length})
            </span>
            {showRetired ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showRetired && (
            <div className="space-y-2.5 pt-2">
              {retiredEntries.map(({ shoe, stats }) => (
                <div
                  key={shoe.id}
                  className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5'
                  }`}
                >
                  <div>
                    <p className="text-xs font-black uppercase italic">
                      {formatShoeLabel(shoe)}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Total acumulado: <strong className="font-mono">{formatDistance(stats.totalKm)} km</strong> ({stats.workoutsCount} treinos)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleToggleRetire(shoe.id)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" /> Reativar
                    </button>
                    {confirmDeleteId === shoe.id ? (
                      <button
                        type="button"
                        onClick={() => void handleDelete(shoe.id)}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-[10px] font-black uppercase cursor-pointer"
                      >
                        Confirmar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(shoe.id)}
                        className="p-1.5 rounded-xl text-rose-400 hover:bg-rose-500/15 cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
