'use client'

import { motion, useScroll, useTransform, Variants } from "framer-motion";
import { Home, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SouratesIcon } from "./icons/SouratesIcon";

export default function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const { scrollY } = useScroll();
  const headerBackground = useTransform(
    scrollY,
    [0, 100],
    ["rgba(255, 255, 255, 0.8)", "rgba(255, 255, 255, 0.95)"]
  );
  const headerShadow = useTransform(
    scrollY,
    [0, 100],
    ["0px 0px 0px rgba(0, 0, 0, 0)", "0px 4px 20px rgba(0, 0, 0, 0.08)"]
  );

  const navVariants : Variants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
      }
    }
  };

  const linkVariants : Variants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0 }
  };

  const navItems = [
    { href: "/", label: "Accueil", icon: Home },
    { href: "/sourates", label: "Sourates", icon: SouratesIcon },
  ];

  return (
    <>
      <motion.header
        initial="hidden"
        animate="visible"
        variants={navVariants}
        style={{
          backgroundColor: headerBackground,
          boxShadow: headerShadow,
        }}
        className="top-0 left-0 right-0 z-50 backdrop-blur-md border-b border-gray-200/50"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo + nom */}
            <Link href="/" className="flex items-center gap-3 group">
              <motion.div
                initial={{ opacity: 0, scale: 0.8, rotate: -180 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full blur-md opacity-0 group-hover:opacity-50 transition-opacity duration-300" />
                <Image
                  src="/fingerprint.webp"
                  alt="logo"
                  width={40}
                  height={40}
                  className="rounded-full relative z-10 ring-2 ring-gray-200 group-hover:ring-blue-400 transition-all duration-300"
                  priority
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.2 }}
              >
                <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-blue-900 to-gray-900">
                  Tafsir
                </span>
                <div className="h-1 w-0 group-hover:w-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 rounded-full" />
              </motion.div>
            </Link>

            {/* Navigation Desktop */}
            <nav className="hidden md:block">
              <motion.ul
                className="flex items-center gap-2"
                variants={navVariants}
                transition={{ staggerChildren: 0.1 }}
              >
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <motion.li key={item.href} variants={linkVariants}>
                      <Link href={item.href}>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 ${
                            isActive
                              ? "text-white"
                              : "text-gray-700 hover:text-blue-600"
                          }`}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="activeTab"
                              className="absolute inset-0 bg-gradient-to-r from-[#f28d00] via-[#f08800] to-[#e83d13] rounded-xl shadow-sm"
                              transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            />
                          )}
                          <item.icon size={18} className="relative z-10" />
                          <span className="relative z-10">{item.label}</span>
                          {!isActive && (
                            <motion.div
                              className="absolute inset-0 bg-gray-100 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300"
                              whileHover={{ scale: 1 }}
                            />
                          )}
                        </motion.div>
                      </Link>
                    </motion.li>
                  );
                })}
              </motion.ul>
            </nav>

            {/* Bouton Menu Mobile */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              {mobileMenuOpen ? (
                <X size={24} className="text-gray-700" />
              ) : (
                <Menu size={24} className="text-gray-700" />
              )}
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* Menu Mobile */}
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{
          opacity: mobileMenuOpen ? 1 : 0,
          height: mobileMenuOpen ? "auto" : 0,
        }}
        transition={{ duration: 0.3 }}
        className="md:hidden fixed top-[73px] left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 overflow-hidden"
      >
        <nav className="container mx-auto px-4 py-4">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <motion.li
                  key={item.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Link href={item.href} onClick={() => setMobileMenuOpen(false)}>
                    <motion.div
                      whileTap={{ scale: 0.98 }}
                      className={`flex items-center gap-3 px-5 py-4 rounded-xl font-semibold transition-all duration-300 ${
                        isActive
                          ? "bg-gradient-to-r from-[#f28d00] via-[#f08800] to-[#e83d13] text-white shadow-sm"
                          : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <item.icon size={20} />
                      <span>{item.label}</span>
                    </motion.div>
                  </Link>
                </motion.li>
              );
            })}
          </ul>
        </nav>
      </motion.div>

      {/* Overlay pour fermer le menu mobile */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setMobileMenuOpen(false)}
          className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-30 top-[73px]"
        />
      )}

      {/* Spacer pour compenser le header fixe
      <div className="h-[73px]" /> */}
    </>
  )
}