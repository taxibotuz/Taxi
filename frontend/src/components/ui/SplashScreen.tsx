import { motion } from 'framer-motion';
import { useTranslation } from '../../i18n';

export default function SplashScreen() {
  const { t } = useTranslation();
  return (
    <div className="h-full w-full flex items-center justify-center bg-[#0a0a1a]">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 mx-auto mb-6 rounded-full border-2 border-primary-500 border-t-transparent"
        />
        <h1 className="text-3xl font-bold text-white mb-2">{t('auth_taxigo')}</h1>
        <p className="text-gray-400 text-sm">{t('splash_loading')}</p>
      </motion.div>
    </div>
  );
}
