import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const SplashScreen: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2800); // Tempo ideal para percepção de marca sem frustrar o usuário

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            scale: 1.1,
            filter: 'blur(20px)',
            transition: { duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] }
          }}
          className="fixed inset-0 z-[9999] bg-[#020617] flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Background Effects */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-900 rounded-full blur-[120px]" />
          </div>

          <div className="relative z-10 flex flex-col items-center">
            {/* Logo Animation */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: 1, 
                opacity: 1,
                transition: { 
                  duration: 1, 
                  ease: "easeOut" 
                } 
              }}
              className="relative"
            >
              <img 
                src="/prorunlb_pwa_512.png" 
                alt="ProRun LB Logo" 
                className="w-32 h-32 md:w-40 md:h-40 object-contain drop-shadow-[0_0_30px_rgba(16,185,129,0.3)]"
              />
              
              {/* Pulse Ring */}
              <motion.div 
                animate={{ 
                  scale: [1, 1.5],
                  opacity: [0.5, 0]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeOut"
                }}
                className="absolute inset-0 border-2 border-emerald-500 rounded-full"
              />
            </motion.div>

            {/* Title & Slogan */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="mt-8 text-center"
            >
              <h1 className="text-4xl md:text-5xl font-black text-white italic tracking-tighter uppercase leading-none">
                ProRun <span className="text-emerald-500">LB</span>
              </h1>
              <p className="text-emerald-500/60 font-bold uppercase tracking-[0.3em] text-[10px] mt-2">
                Performance Integrada
              </p>
            </motion.div>

            {/* Loading Bar */}
            <div className="mt-12 w-48 h-[2px] bg-white/10 rounded-full overflow-hidden relative">
              <motion.div
                initial={{ left: '-100%' }}
                animate={{ left: '100%' }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  ease: "linear"
                }}
                className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"
              />
            </div>
          </div>

          {/* Bottom Branding */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="absolute bottom-12 flex items-center gap-2"
          >
            <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-white/30 text-[9px] font-black uppercase tracking-widest">
              AI Powered Training System
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
