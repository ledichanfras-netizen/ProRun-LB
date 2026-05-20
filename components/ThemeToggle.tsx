import React from 'react';
import { Moon, SunMedium } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Alternar tema"
      className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white transition-all duration-200 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
    >
      {isDark ? (
        <SunMedium className="w-4 h-4 text-amber-300" />
      ) : (
        <Moon className="w-4 h-4 text-slate-100" />
      )}
    </button>
  );
};

export default ThemeToggle;
