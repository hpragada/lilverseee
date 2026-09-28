import React, { useState, useMemo } from 'react';
import {
  Heart,
  Copy,
  Check,
  Trash2,
  Search,
  Plus,
  X,
  ExternalLink,
  Sparkles,
  Bookmark,
} from 'lucide-react';
import { FlirtFavorite, FlirtCategory, FlirtLine } from '../../types';
import { FLIRT_CATEGORIES } from '../../data/flirtLines';
import { useApp } from '../../context/AppContext';

interface FlirtFavoritesListProps {
  onSelectFavorite: (favorite: FlirtFavorite) => void;
  onShowToast: (message: string) => void;
  onTriggerBurst: () => void;
}

export const FlirtFavoritesList: React.FC<FlirtFavoritesListProps> = ({
  onSelectFavorite,
  onShowToast,
  onTriggerBurst,
}) => {
  const { flirtFavorites, removeFlirtFavorite, addFlirtFavorite } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FlirtCategory>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isAddingCustom, setIsAddingCustom] = useState(false);

  // Custom Line Form state
  const [customText, setCustomText] = useState('');
  const [customCategory, setCustomCategory] = useState<Exclude<FlirtCategory, 'all'>>('romantic');
  const [customEmoji, setCustomEmoji] = useState('💕');
  const [customNote, setCustomNote] = useState('');

  // Filter and search favorites
  const filteredFavorites = useMemo(() => {
    return flirtFavorites.filter((fav) => {
      const matchesCategory =
        selectedCategory === 'all' || fav.category === selectedCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        fav.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (fav.customNote && fav.customNote.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [flirtFavorites, selectedCategory, searchQuery]);

  const handleCopy = async (fav: FlirtFavorite, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(fav.text);
      setCopiedId(fav.id);
      onShowToast('Copied to clipboard 💕');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      onShowToast('Could not access clipboard');
    }
  };

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeFlirtFavorite(id);
    onShowToast('Removed from favorites');
  };

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customText.trim();
    if (!trimmed) return;

    const customLine: FlirtLine = {
      id: `custom-${Date.now()}`,
      text: trimmed,
      category: customCategory,
      emoji: customEmoji,
      tag: 'My Custom Note',
    };

    addFlirtFavorite(customLine, customNote.trim() || undefined);
    onTriggerBurst();
    onShowToast('Saved your custom flirty line 💕');

    // Reset form
    setCustomText('');
    setCustomNote('');
    setIsAddingCustom(false);
  };

  const EMOJI_OPTIONS = ['💕', '🌹', '😉', '🔥', '🧸', '✨', '💋', '🍯', '🌙', '🧀'];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Top Bar: Search, Category Filter, and Add Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#999999]" />
          <input
            type="text"
            placeholder="Search saved favorites..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#141414] border border-[#292929] text-sm text-[#F5F5F5] placeholder-[#999999]/60 focus:outline-none focus:border-[#C0C0C0]/50 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999999] hover:text-[#F5F5F5] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Add Custom Line Button */}
        <button
          onClick={() => setIsAddingCustom(true)}
          className="min-h-[42px] px-4 py-2 rounded-xl bg-[#141414] hover:bg-[#1C1C1C] border border-[#292929] text-[#C0C0C0] text-xs font-light flex items-center justify-center gap-2 transition-all hover:scale-[1.02] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Custom Line</span>
        </button>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {FLIRT_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const count =
            cat.id === 'all'
              ? flirtFavorites.length
              : flirtFavorites.filter((f) => f.category === cat.id).length;

          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`min-h-[34px] px-3 py-1 rounded-full text-xs font-light whitespace-nowrap flex items-center gap-1.5 border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#1A1A1A] border-[#C0C0C0]/50 text-[#F5F5F5] shadow-sm'
                  : 'bg-[#0D0D0D] border-[#292929] text-[#999999] hover:text-[#F5F5F5]'
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
              <span className="text-[10px] opacity-70 px-1 py-0.2 rounded-full bg-black/40 text-[#999999]">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Add Custom Line Modal / Sheet */}
      {isAddingCustom && (
        <div className="p-5 sm:p-6 rounded-2xl bg-[#0D0D0D] border border-[#292929] shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-[#292929] pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C0C0C0]" />
              <h3 className="text-sm font-normal text-[#F5F5F5]">
                Create Your Own Flirty Line 💕
              </h3>
            </div>
            <button
              onClick={() => setIsAddingCustom(false)}
              className="text-[#999999] hover:text-[#F5F5F5] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSaveCustom} className="space-y-4">
            <div>
              <label className="text-xs text-[#999999] font-light block mb-1">
                Your Line or Message
              </label>
              <textarea
                required
                rows={3}
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Write something sweet, funny, or cheeky..."
                className="w-full p-3 rounded-xl bg-[#141414] border border-[#292929] text-sm text-[#F5F5F5] placeholder-[#999999]/60 focus:outline-none focus:border-[#C0C0C0]/50 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[#999999] font-light block mb-1">
                  Category
                </label>
                <select
                  value={customCategory}
                  onChange={(e) =>
                    setCustomCategory(e.target.value as Exclude<FlirtCategory, 'all'>)
                  }
                  className="w-full p-2.5 rounded-xl bg-[#141414] border border-[#292929] text-xs text-[#F5F5F5] focus:outline-none focus:border-[#C0C0C0]/50 cursor-pointer"
                >
                  <option value="romantic">Romantic 🌹</option>
                  <option value="teasing">Teasing 😉</option>
                  <option value="funny">Funny 😂</option>
                  <option value="caring">Caring 🧸</option>
                  <option value="cheesy">Cheesy 🧀</option>
                  <option value="spicy">Spicy 🔥</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-[#999999] font-light block mb-1">
                  Select Icon Emoji
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {EMOJI_OPTIONS.map((emo) => (
                    <button
                      key={emo}
                      type="button"
                      onClick={() => setCustomEmoji(emo)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm border transition-all cursor-pointer ${
                        customEmoji === emo
                          ? 'border-[#C0C0C0]/60 bg-[#1A1A1A] scale-110'
                          : 'border-[#292929] bg-[#141414] hover:bg-[#1C1C1C]'
                      }`}
                    >
                      {emo}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs text-[#999999] font-light block mb-1">
                Personal Note / Context (Optional)
              </label>
              <input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="e.g. Sent on our anniversary date"
                className="w-full p-2.5 rounded-xl bg-[#141414] border border-[#292929] text-xs text-[#F5F5F5] placeholder-[#999999]/60 focus:outline-none focus:border-[#C0C0C0]/50"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingCustom(false)}
                className="min-h-[38px] px-4 rounded-xl border border-[#292929] text-xs font-light text-[#999999] hover:text-[#F5F5F5] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[38px] px-5 rounded-xl bg-gradient-to-r from-[#C0C0C0] via-[#E8E8E8] to-[#A8A8A8] text-black text-xs font-semibold shadow-sm hover:opacity-95 transition-all cursor-pointer"
              >
                Save Line 💕
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Favorites Grid / List */}
      {filteredFavorites.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#0D0D0D] border border-[#292929] space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#141414] border border-[#292929] flex items-center justify-center text-[#C0C0C0] mx-auto">
            <Heart className="w-6 h-6 fill-[#C0C0C0]/20" />
          </div>
          <h3 className="text-sm font-normal text-[#F5F5F5]">
            {searchQuery
              ? 'No matching lines found'
              : flirtFavorites.length === 0
              ? 'No saved favorites yet'
              : 'No lines in this category'}
          </h3>
          <p className="text-xs text-[#999999] font-light max-w-sm mx-auto">
            {flirtFavorites.length === 0
              ? 'Click the heart 💕 icon on any card in the deck to save your favorite flirty lines here forever.'
              : 'Try clearing your search or picking another category filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredFavorites.map((fav) => {
            const catMeta =
              FLIRT_CATEGORIES.find((c) => c.id === fav.category) || FLIRT_CATEGORIES[0];
            const isCopied = copiedId === fav.id;

            return (
              <div
                key={fav.id}
                onClick={() => onSelectFavorite(fav)}
                className="p-5 rounded-2xl bg-[#0D0D0D] border border-[#292929] hover:border-[#C0C0C0]/40 transition-all flex flex-col justify-between space-y-4 group cursor-pointer hover:shadow-lg relative overflow-hidden"
              >
                {/* Category & Date Header */}
                <div className="flex items-center justify-between text-xs">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-light border ${catMeta.badgeColor}`}
                  >
                    <span>{fav.emoji}</span>
                    <span>{catMeta.label}</span>
                  </span>

                  <span className="text-[10px] text-[#999999] font-light">
                    {new Date(fav.savedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                {/* Line Text */}
                <p className="text-sm font-light text-[#F5F5F5] leading-relaxed group-hover:text-white transition-colors">
                  “{fav.text}”
                </p>

                {/* Optional Note */}
                {fav.customNote && (
                  <p className="text-[11px] text-[#C0C0C0] font-light italic bg-[#141414] px-2.5 py-1 rounded-lg border border-[#292929]">
                    Note: {fav.customNote}
                  </p>
                )}

                {/* Action Buttons Row */}
                <div className="flex items-center justify-between pt-2 border-t border-[#292929]">
                  <button
                    onClick={(e) => handleCopy(fav, e)}
                    className="min-h-[34px] px-3 py-1 rounded-lg bg-[#141414] hover:bg-[#1C1C1C] border border-[#292929] text-xs font-light text-[#F5F5F5] flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#999999]" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onSelectFavorite(fav)}
                      title="View in main card"
                      className="min-h-[34px] px-2.5 rounded-lg text-xs font-light text-[#C0C0C0] hover:bg-[#141414] flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>Open in Deck</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>

                    <button
                      onClick={(e) => handleRemove(fav.id, e)}
                      title="Remove from favorites"
                      className="min-h-[34px] min-w-[34px] rounded-lg flex items-center justify-center text-[#999999] hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
