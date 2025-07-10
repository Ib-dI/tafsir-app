// components/Preview.tsx
'use client'

import { motion } from "framer-motion"

export default function Preview() {
  return (
    <section className="py-20 bg-slate-100 text-gray-900">
      <div className="max-w-6xl mx-auto px-4 text-center">
        <motion.h2
          className="text-3xl md:text-4xl font-bold mb-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Un aperçu de l’expérience
        </motion.h2>

        <motion.p
          className="text-gray-600 mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Interface claire, audio fluide, navigation intuitive.
        </motion.p>

        <motion.div
          className="relative mx-auto overflow-hidden rounded-xl border shadow-md bg-white"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.3 }}
        >
          {/* 🎨 Remplace cette image par une capture réelle plus tard */}
          <img
            src="/preview.png"
            alt="Aperçu interface tafsir"
            className="w-full h-auto"
          />
        </motion.div>
      </div>
    </section>
  )
}
