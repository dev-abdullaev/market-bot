import { motion, useReducedMotion } from "framer-motion";
import { MapPin, Phone, Sparkles } from "lucide-react";

export function Hero({ store }) {
  const reduce = useReducedMotion();
  const banners = store?.showcase_config?.banner_images || [];

  return (
    <section className="relative overflow-hidden rounded-b-[28px] bg-gradient-to-br from-primary via-primary to-secondary text-white">
      {/* Ambient animated shapes — disabled under reduced-motion via CSS guard */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-16 -top-20 h-64 w-64 rounded-full bg-white/15 blur-2xl animate-blob-1" />
        <div className="absolute -right-10 top-10 h-56 w-56 rounded-full bg-accent/30 blur-2xl animate-blob-2" />
        <div className="absolute bottom-[-60px] left-1/3 h-48 w-48 rounded-full bg-secondary/40 blur-2xl animate-blob-1" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 pb-12 pt-10 sm:pt-14">
        <motion.span
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-700 backdrop-blur"
        >
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2.4} />
          Onlayn do'kon
        </motion.span>

        <div className="mt-4 flex items-center gap-4">
          {store?.logo_url ? (
            <motion.img
              src={store.logo_url}
              alt=""
              initial={reduce ? false : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="h-16 w-16 shrink-0 rounded-2xl bg-white/90 object-contain p-1.5 shadow-lift sm:h-20 sm:w-20"
            />
          ) : null}
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
            className="max-w-2xl text-balance font-display text-3xl font-800 leading-[1.1] sm:text-5xl"
          >
            {store?.name || "Bizning do'kon"}
          </motion.h1>
        </div>

        <motion.p
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12 }}
          className="mt-3 max-w-xl text-balance text-sm text-white/85 sm:text-base"
        >
          Eng yangi mahsulotlar, tez yetkazib berish va qulay narxlar. Savatga
          qo'shing — biz qolganini hal qilamiz.
        </motion.p>

        {(store?.address || store?.phone) && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.18 }}
            className="mt-5 flex flex-wrap gap-2"
          >
            {store?.address && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-xs font-600 backdrop-blur">
                <MapPin className="h-3.5 w-3.5" strokeWidth={2.2} />
                {store.address}
              </span>
            )}
            {store?.phone && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-xs font-600 backdrop-blur">
                <Phone className="h-3.5 w-3.5" strokeWidth={2.2} />
                {store.phone}
              </span>
            )}
          </motion.div>
        )}

        {banners.length > 0 && (
          <div className="mt-6 flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
            {banners.map((b, i) => (
              <motion.img
                key={i}
                src={b}
                alt=""
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.06 }}
                onError={(e) => (e.currentTarget.style.display = "none")}
                className="h-32 w-[80%] shrink-0 snap-center rounded-2xl object-cover shadow-lift sm:h-40 sm:w-[55%]"
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
