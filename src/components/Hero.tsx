'use client'

import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { ChevronDown } from "lucide-react"
import Link from "next/link"

export default function Hero() {
  return (
    <section className="relative flex flex-col items-center justify-center min-h-[80vh] px-4 text-center bg-slate-50 text-gray-900">
      {/* Contenu principal */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-3xl"
      >
        <h1 className="text-4xl md:text-5xl font-bold leading-tight text-gray-900">
          Apprends le Coran avec clarté et profondeur
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Écoute des tafsirs audio, lis le texte sacré, et comprends chaque verset à ton rythme.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/sourates">
            <Button size="lg" className="text-lg px-6 py-4 bg-blue-600 hover:bg-blue-700">
              Commencer maintenant
            </Button>
          </Link>
          <Button
            variant="ghost"
            className="text-blue-600 hover:underline"
            onClick={() => {
              const section = document.getElementById("features")
              if (section) section.scrollIntoView({ behavior: "smooth" })
            }}
          >
            En savoir plus
          </Button>
        </div>
      </motion.div>

      {/* Flèche vers le bas */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="absolute bottom-6 text-gray-400"
      >
        <ChevronDown size={28} />
      </motion.div>
    </section>
  )
}
