"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useState } from "react";

type GalleryImage = { id: string; url: string; alt: string; position: number };

export default function ListingGallery({ slug, images }: { slug: string; images: GalleryImage[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    if (activeIndex === null) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveIndex(null);
      if (event.key === "ArrowRight") setActiveIndex((index) => index === null ? null : (index + 1) % images.length);
      if (event.key === "ArrowLeft") setActiveIndex((index) => index === null ? null : (index - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [activeIndex, images.length]);

  const openImage = (index: number) => setActiveIndex(index);
  const mainImage = images[0];
  if (!mainImage) return <div className="listing-gallery-empty">Photos coming soon</div>;

  return (
    <>
      <div className={`listing-gallery gallery-count-${Math.min(images.length, 5)}`}>
        <button type="button" className="gallery-main" onClick={() => openImage(0)} aria-label="Open full-size photo">
          <motion.div className="gallery-main-image" layoutId={`listing-image-${slug}`}>
            <Image src={mainImage.url} alt={mainImage.alt} fill sizes="(max-width: 760px) 100vw, 65vw" />
          </motion.div>
        </button>
        {images.slice(1, 5).map((image, index) => (
          <button type="button" className={`gallery-tile gallery-tile-${index + 1}`} key={image.id} onClick={() => openImage(index + 1)} aria-label={`Open photo ${index + 2}`}>
            <Image src={image.url} alt={image.alt} fill sizes="(max-width: 760px) 45vw, 25vw" />
            {index === 3 && images.length > 5 && <span className="gallery-more">+{images.length - 5} photos</span>}
          </button>
        ))}
        <button type="button" className="gallery-all-button" onClick={() => openImage(0)}>View all {images.length} photos</button>
      </div>
      <AnimatePresence>
        {activeIndex !== null && (
          <motion.div className="lightbox" role="dialog" aria-modal="true" aria-label="Photo gallery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" className="lightbox-close" onClick={() => setActiveIndex(null)} aria-label="Close gallery"><X size={21} /></button>
            <button type="button" className="lightbox-prev" onClick={() => setActiveIndex((activeIndex - 1 + images.length) % images.length)} aria-label="Previous photo"><ChevronLeft size={24} /></button>
            <motion.div className="lightbox-image" layoutId={activeIndex === 0 ? `listing-image-${slug}` : undefined} key={images[activeIndex].id}>
              <Image src={images[activeIndex].url} alt={images[activeIndex].alt} fill sizes="100vw" />
            </motion.div>
            <button type="button" className="lightbox-next" onClick={() => setActiveIndex((activeIndex + 1) % images.length)} aria-label="Next photo"><ChevronRight size={24} /></button>
            <p className="lightbox-count">{activeIndex + 1} / {images.length}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
