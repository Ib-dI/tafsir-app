"use client";

import {
  AnimatePresence,
  motion,
  useScroll,
  useTransform,
  Variants,
} from "framer-motion";
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
    ["rgba(251, 243, 228, 0.8)", "rgba(251, 243, 228, 0.95)"],
  );
  const headerShadow = useTransform(
    scrollY,
    [0, 100],
    ["0px 0px 0px rgba(0, 0, 0, 0)", "0px 4px 20px rgba(0, 0, 0, 0.08)"],
  );

  const navVariants: Variants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
      },
    },
  };

  const linkVariants: Variants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0 },
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
        className="top-0 right-0 left-0 z-50 border-b border-[#3D3226]/10 backdrop-blur-md"
      >
        <div className="container mx-auto px-2 py-4 md:px-4">
          <div className="flex items-center justify-between">
            {/* Logo + nom */}
            <Link href="/" className="group flex items-center gap-3">
              <motion.div
                initial={{ opacity: 0, scale: 0.8, rotate: -180 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 20,
                  delay: 0.1,
                }}
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
              >
                <Image
                  src="/fingerprint.webp"
                  alt="logo"
                  width={40}
                  height={40}
                  className="rounded-full ring-2 ring-[#3D3226]/15 transition-all duration-300 group-hover:ring-[#3D3226]/30"
                  priority
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 100,
                  damping: 15,
                  delay: 0.2,
                }}
              >
                <span className="text-2xl font-black text-[#3D3226]">
                  Tafsir
                </span>
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
                          className={`relative flex items-center gap-2 rounded-xl px-5 py-2.5 font-semibold transition-all duration-300 ${
                            isActive
                              ? "text-white"
                              : "text-[#3D3226]/70 hover:text-[#3D3226]"
                          }`}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="activeTab"
                              className="absolute inset-0 rounded-xl bg-[#d28820] shadow-sm"
                              transition={{
                                type: "spring",
                                stiffness: 300,
                                damping: 20,
                              }}
                            />
                          )}
                          <item.icon size={18} className="relative z-10" />
                          <span className="relative z-10">{item.label}</span>
                          {!isActive && (
                            <motion.div
                              className="absolute inset-0 rounded-xl bg-[#3D3226]/8 opacity-0 transition-opacity duration-300 hover:opacity-100"
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
              className="rounded-xl bg-[#3D3226]/8 p-2 transition-colors hover:bg-[#3D3226]/15 md:hidden"
            >
              {mobileMenuOpen ? (
                <X size={24} className="text-[#3D3226]" />
              ) : (
                <Menu size={24} className="text-[#3D3226]" />
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
        className="fixed top-[73px] right-0 left-0 z-40 overflow-hidden border-b border-[#3D3226]/10 bg-[#FBF3E4]/95 backdrop-blur-md md:hidden"
      >
        <nav className="container mx-auto px-2 py-4 md:px-4">
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
                  <Link
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <motion.div
                      whileTap={{ scale: 0.98 }}
                      className={`flex items-center gap-3 rounded-xl px-5 py-4 font-semibold transition-all duration-300 ${
                        isActive
                          ? "bg-[#d28820] text-white shadow-sm"
                          : "bg-[#3D3226]/5 text-[#3D3226]/70 hover:bg-[#3D3226]/10"
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
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 top-[73px] z-30 bg-black/20 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Spacer pour compenser le header fixe
      <div className="h-[73px]" /> */}
    </>
  );
}
