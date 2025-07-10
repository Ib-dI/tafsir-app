// components/Features.tsx
'use client'

import { motion } from 'framer-motion'
import { Headphones, BookOpen, Smartphone } from 'lucide-react'

const features = [
  {
    icon: <Headphones className="w-8 h-8 text-blue-600" />,
    title: "Tafsir audio synchronisé",
    description: "Écoute et suis chaque verset avec un audio clair, lié au texte."
  },
  {
    icon: <BookOpen className="w-8 h-8 text-blue-600" />,
    title: "Texte sacré accessible",
    description: "Lis facilement le Coran et comprends mieux avec des explications simples."
  },
  {
    icon: <Smartphone className="w-8 h-8 text-blue-600" />,
    title: "Navigation mobile fluide",
    description: "Profite d’une expérience rapide et intuitive sur tous les appareils."
  },
]

export default function Features() {
  return (
    <section id="features" className="py-20 bg-white text-gray-900">
      <div className="max-w-5xl mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Pourquoi utiliser notre plateforme ?
        </h2>
        <p className="text-gray-600 mb-12">
          Une méthode simple, complète et immersive pour mieux comprendre le Coran.
        </p>

        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              className="p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition"
            >
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600 text-sm">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
