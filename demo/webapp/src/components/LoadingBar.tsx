import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLoading } from '../LoadingContext.js';

export const LoadingBar = () => {
  const { loading } = useLoading();

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: 1, scaleY: 1 }}
          exit={{ opacity: 0, scaleY: 0 }}
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: 5,
            overflow: 'hidden',
            zIndex: 9999,
            transformOrigin: 'bottom',
          }}
        >
          <motion.div
            animate={{ x: ['0%', '-50%'] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
            style={{
              width: '200%',
              height: '100%',
              background:
                'linear-gradient(90deg, #6d28d9, #8b5cf6, #a855f7, #c084fc, #ec4899, #c084fc, #a855f7, #8b5cf6, #6d28d9)',
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
