"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Lenis from "lenis";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Headphones,
  Heart,
  MapPin,
  Menu,
  Minus,
  Plus,
  Search,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import UserMenu from "@/components/user-menu";
import NaturalSearch from "@/components/natural-search";
import VibeQuiz from "@/components/vibe-quiz";

const slides = [
  {
    image:
      "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=2400&q=88",
    location: "Coorg, Karnataka",
    note: "A slower kind of morning",
  },
  {
    image:
      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=2400&q=88",
    location: "Chikmagalur, Karnataka",
    note: "Wake up where coffee grows",
  },
  {
    image:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2400&q=88",
    location: "Sakleshpur, Karnataka",
    note: "Somewhere the hills go quiet",
  },
  {
    image:
      "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=2400&q=88",
    location: "Gokarna, Karnataka",
    note: "Let the day find its own pace",
  },
  {
    image:
      "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=2400&q=88",
    location: "Kodagu, Karnataka",
    note: "A little cabin, a lot of sky",
  },
  {
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=2400&q=88",
    location: "Udupi, Karnataka",
    note: "Find your way back to wonder",
  },
];

const destinations = [
  {
    name: "Coorg",
    subtitle: "Coffee, clouds & quiet trails",
    count: "24 stays",
    image:
      "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=1000&q=82",
  },
  {
    name: "The coast",
    subtitle: "Salt air, slower days",
    count: "18 stays",
    image:
      "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1000&q=82",
  },
  {
    name: "Western Ghats",
    subtitle: "Rain-washed and wonderfully wild",
    count: "12 stays",
    image:
      "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1000&q=82",
  },
];

const vibes = [
  { value: "MOUNTAINS", label: "Mountains" },
  { value: "BEACH", label: "Beach" },
  { value: "HERITAGE", label: "Heritage" },
  { value: "FARM", label: "Farm" },
  { value: "FOREST", label: "Forest" },
];

type FeaturedCollection = {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string | null;
  listings: Array<{ listing: { slug: string; title: string; city: string; images: Array<{ url: string }> } }>;
};

function getTimeMood() {
  const hour = new Date().getHours();
  if (hour < 10) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function LandingPage() {
  const prefersReducedMotion = useReducedMotion();
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeVibe, setActiveVibe] = useState<string | null>(null);
  const [guests, setGuests] = useState(2);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [audioUnavailable, setAudioUnavailable] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [timeMood, setTimeMood] = useState("Find your somewhere");
  const [featuredCollections, setFeaturedCollections] = useState<FeaturedCollection[]>([]);
  const audioContext = useRef<AudioContext | null>(null);
  const ambienceSource = useRef<AudioBufferSourceNode | null>(null);
  const ambienceGain = useRef<GainNode | null>(null);

  useEffect(() => {
    setTimeMood(getTimeMood());
    const lenis = prefersReducedMotion ? null : new Lenis({ autoRaf: true, smoothWheel: true });
    let timer: number | undefined;
    const updateVisibility = () => {
      if (document.hidden || prefersReducedMotion) {
        if (timer !== undefined) window.clearInterval(timer);
        timer = undefined;
        lenis?.stop();
        return;
      }
      lenis?.start();
      if (timer === undefined) timer = window.setInterval(() => setActiveSlide((current) => (current + 1) % slides.length), 7000);
    };
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    void fetch("/api/collections/featured")
      .then(async (response) => {
        if (!response.ok) throw new Error("Featured collections could not be loaded.");
        const result: { collections?: FeaturedCollection[] } = await response.json();
        setFeaturedCollections(result.collections ?? []);
      })
      .catch((error: unknown) => console.error("Could not load featured collections:", error));
    return () => {
      if (timer !== undefined) window.clearInterval(timer);
      document.removeEventListener("visibilitychange", updateVisibility);
      lenis?.destroy();
      ambienceSource.current?.stop();
      void audioContext.current?.close();
    };
  }, [prefersReducedMotion]);

  useEffect(() => {
    const pauseAudioWhenHidden = () => {
      if (document.hidden) void audioContext.current?.suspend();
      else if (audioEnabled) void audioContext.current?.resume();
    };
    document.addEventListener("visibilitychange", pauseAudioWhenHidden);
    return () => document.removeEventListener("visibilitychange", pauseAudioWhenHidden);
  }, [audioEnabled]);

  function toggleSoundscape() {
    if (audioEnabled) {
      const currentContext = audioContext.current;
      if (!currentContext) {
        setAudioEnabled(false);
        return;
      }
      ambienceGain.current?.gain.setTargetAtTime(0, currentContext.currentTime, 0.15);
      window.setTimeout(() => {
        ambienceSource.current?.stop();
        void audioContext.current?.close();
        ambienceSource.current = null;
        ambienceGain.current = null;
        audioContext.current = null;
      }, 500);
      setAudioEnabled(false);
      return;
    }

    const AudioContextConstructor = window.AudioContext;
    if (!AudioContextConstructor) {
      setAudioUnavailable(true);
      return;
    }

    const context = new AudioContextConstructor();
    const buffer = context.createBuffer(1, context.sampleRate * 4, context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < channel.length; index += 1) {
      channel[index] = (Math.random() * 2 - 1) * 0.22;
    }

    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    source.loop = true;
    filter.type = "lowpass";
    filter.frequency.value = 520;
    gain.gain.value = 0;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    source.start();
    gain.gain.setTargetAtTime(0.035, context.currentTime, 0.6);
    audioContext.current = context;
    ambienceSource.current = source;
    ambienceGain.current = gain;
    setAudioUnavailable(false);
    setAudioEnabled(true);
  }

  return (
    <main>
      <section className="hero" aria-label="Discover locally loved homestays">
        <div className="hero-media" aria-hidden="true">
          <AnimatePresence initial={false}>
            <motion.div
              key={activeSlide}
              className="hero-image"
              initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 1.08 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ opacity: { duration: 1.5 }, scale: { duration: 8, ease: "linear" } }}
            >
              <Image
                src={slides[activeSlide].image}
                alt=""
                fill
                priority={activeSlide === 0}
                sizes="100vw"
                className="cover-image"
              />
            </motion.div>
          </AnimatePresence>
          <div className="hero-shade" />
          <div className="grain" />
          <div className="ambient ambient-one" />
          <div className="ambient ambient-two" />
        </div>

        <header className="site-header">
          <a className="brand" href="#" aria-label="Namma Stay home">
            <span className="brand-mark">n</span>
            <span className="brand-name">namma<span>stay</span></span>
          </a>
          <nav className={menuOpen ? "main-nav nav-open" : "main-nav"} aria-label="Main navigation">
            <a href="#destinations" onClick={() => setMenuOpen(false)}>Explore</a>
            <a href="#experiences" onClick={() => setMenuOpen(false)}>Experiences</a>
            <a href="#our-way" onClick={() => setMenuOpen(false)}>Our way</a>
            <a className="nav-host-mobile" href="/become-a-host" onClick={() => setMenuOpen(false)}>Become a host</a>
          </nav>
          <div className="header-actions">
            <a className="host-link" href="#host">Become a host <ArrowUpRight size={14} /></a>
            <UserMenu />
            <button
              className="menu-toggle"
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </header>

        <div className="hero-content">
          <motion.div
            className="hero-copy"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: prefersReducedMotion ? 0 : 0.14, delayChildren: 0.2 } },
            }}
          >
            <motion.p className="eyebrow hero-eyebrow" variants={riseIn}>
              <span className="eyebrow-line" /> A more local kind of away
            </motion.p>
            <motion.h1 variants={riseIn}>
              Don&apos;t just visit.
              <br />
              <em>Belong.</em>
            </motion.h1>
            <motion.p className="hero-subtitle" variants={riseIn}>
              The kind of places you find through a friend.
              <br className="desktop-break" /> The kind of people you remember long after.
            </motion.p>
            <motion.div className="hero-buttons" variants={riseIn}>
              <a className="button button-light" href="#destinations">
                Find your stay <ArrowRight size={16} />
              </a>
              <button
                type="button"
                className={audioEnabled ? "sound-button sound-on" : "sound-button"}
                aria-pressed={audioEnabled}
                onClick={toggleSoundscape}
              >
                <span className="sound-icon"><Headphones size={16} /></span>
                {audioEnabled ? "Sound on" : audioUnavailable ? "Sound unavailable" : "Sound off"}
                <span className="sound-bars" aria-hidden="true"><i /><i /><i /></span>
              </button>
            </motion.div>
          </motion.div>

          <div className="hero-caption">
            <span className="caption-dot" />
            <span>{slides[activeSlide].location}</span>
            <span className="caption-divider">/</span>
            <span className="caption-note">{slides[activeSlide].note}</span>
          </div>
        </div>

        <div className="hero-bottom">
          <div className="slide-controls" aria-label="Hero image controls">
            <span className="slide-index">0{activeSlide + 1}</span>
            <div className="slide-track">
              {slides.map((slide, index) => (
                <button
                  type="button"
                  key={slide.location}
                  className={index === activeSlide ? "slide-indicator active" : "slide-indicator"}
                  onClick={() => setActiveSlide(index)}
                  aria-label={`Show ${slide.location}`}
                  aria-current={index === activeSlide ? "true" : undefined}
                />
              ))}
            </div>
            <span className="slide-total">06</span>
          </div>
          <a href="#destinations" className="scroll-cue">
            <span>Scroll to wander</span><ArrowDown size={15} />
          </a>
          <span className="hero-time">{timeMood} in Karnataka</span>
        </div>

        <form className="search-panel" action="/explore" method="get" aria-label="Find a homestay">
          <label className="search-field where-field">
            <span className="field-icon"><MapPin size={17} /></span>
            <span className="field-content">
              <span className="field-label">Where to?</span>
              <input aria-label="Destination" name="destination" placeholder="Coorg, Gokarna..." />
            </span>
          </label>
          <label className="search-field date-field">
            <span className="field-icon"><CalendarDays size={17} /></span>
            <span className="field-content">
              <span className="field-label">When</span>
              <input aria-label="Travel dates" name="checkIn" placeholder="Add your dates" type="date" />
            </span>
          </label>
          <div className="search-field guests-field">
            <span className="field-icon"><UsersRound size={17} /></span>
            <span className="field-content">
              <span className="field-label">Who&apos;s coming?</span>
              <span className="guest-stepper">
                <button type="button" aria-label="Remove one guest" onClick={() => setGuests((count) => Math.max(1, count - 1))}><Minus size={13} /></button>
                <span>{guests} guests</span>
                <button type="button" aria-label="Add one guest" onClick={() => setGuests((count) => Math.min(12, count + 1))}><Plus size={13} /></button>
              </span>
              <input type="hidden" name="guests" value={guests} />
            </span>
          </div>
          <div className="search-field vibe-field">
            <span className="field-icon"><Sparkles size={17} /></span>
            <span className="field-content">
              <label className="field-label" htmlFor="vibe-select">Your kind of place</label>
              <select id="vibe-select" name="vibe" value={activeVibe ?? ""} onChange={(event) => setActiveVibe(event.target.value || null)}>
                <option value="">Any kind of stay</option>
                {vibes.map((vibe) => <option key={vibe.value} value={vibe.value}>{vibe.label}</option>)}
              </select>
            </span>
          </div>
          <button type="submit" className="search-submit" aria-label="Search stays">
            <Search size={19} /><span>Find a stay</span>
          </button>
        </form>

        <div className="hero-side-note">STAYS WITH A STORY · KARNATAKA, INDIA</div>
      </section>

      <section className="intro-section" id="our-way">
        <div className="intro-label"><span>01</span><span className="label-rule" /> A different point of view</div>
        <div className="intro-copy">
          <h2>Not just a place to sleep.<br /><em>A place to feel somewhere.</em></h2>
          <div className="intro-right">
            <p>{timeMood} — and somewhere, a host is putting the kettle on. Find stays with people who open their doors, share their stories, and make a new place feel a little like yours.</p>
            <a className="text-link" href="#experiences">The Namma feeling <ArrowRight size={16} /></a>
          </div>
        </div>
        <div className="intro-decoration" aria-hidden="true">ನ</div>
      </section>

      <section className="destinations-section" id="destinations">
        <div className="section-heading">
          <div>
            <p className="eyebrow dark-eyebrow"><span className="eyebrow-line" /> Places with a pulse</p>
            <h2>Where to <em>feel</em> like going?</h2>
          </div>
          <a className="text-link desktop-link" href="#experiences">See all places <ArrowRight size={16} /></a>
        </div>
        <div className="destination-grid">
          {destinations.map((destination, index) => (
            <motion.a
              href="#experiences"
              className={`destination-card destination-card-${index + 1}`}
              key={destination.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.18 }}
              transition={{ duration: 0.65, delay: index * 0.12 }}
            >
              <Image src={destination.image} alt={`${destination.name} landscape`} fill sizes="(max-width: 700px) 90vw, 33vw" className="cover-image destination-image" />
              <span className="card-shade" />
              <span className="destination-count">{destination.count}</span>
              <span className="destination-info">
                <span className="destination-subtitle">{destination.subtitle}</span>
                <span className="destination-name">{destination.name}<ArrowUpRight size={18} /></span>
              </span>
              <span className="card-number">0{index + 1}</span>
            </motion.a>
          ))}
        </div>
        <a className="text-link mobile-link" href="#experiences">See all places <ArrowRight size={16} /></a>
      </section>

      {featuredCollections.length > 0 && <section className="featured-collections-section">
        <div className="section-heading">
          <div><p className="eyebrow dark-eyebrow"><span className="eyebrow-line" /> A few stories to start with</p><h2>Stays we&apos;re <em>loving.</em></h2></div>
          <a className="text-link desktop-link" href="/explore">Explore every stay <ArrowRight size={16} /></a>
        </div>
        <div className="featured-collection-grid">
          {featuredCollections.map((collection, index) => {
            const firstListing = collection.listings[0]?.listing;
            const image = collection.imageUrl || firstListing?.images[0]?.url;
            return <motion.a className={`featured-collection-card featured-collection-${index + 1}`} href={firstListing ? `/listings/${firstListing.slug}` : "/explore"} key={collection.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.6, delay: index * 0.08 }}>
              {image && <Image src={image} alt={collection.name} fill sizes="(max-width: 700px) 90vw, 33vw" className="cover-image" />}
              <span className="featured-collection-shade" /><span className="destination-count">{collection.listings.length} thoughtful stays</span>
              <span className="featured-collection-copy"><strong>{collection.name}</strong><small>{collection.description}</small></span>
              <ArrowUpRight size={19} className="featured-collection-arrow" />
            </motion.a>;
          })}
        </div>
      </section>}

      <section className="dream-section" id="experiences">
        <div className="dream-orb" aria-hidden="true"><span /><span /><span /></div>
        <p className="eyebrow dream-eyebrow"><span className="eyebrow-line" /> Tell us what you&apos;re dreaming of</p>
        <h2>We&apos;ll find your <em>somewhere.</em></h2>
        <p className="dream-description">A long weekend where nobody asks the time? A little house by the sea? Just say the word.</p>
        <NaturalSearch className="dream-search" />
        <p className="dream-hint">A little daydreaming never hurt. <span>Good things start with a feeling.</span></p>
      </section>

      <VibeQuiz />

      <section className="host-section" id="host">
        <div className="host-image">
          <Image
            src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1400&q=85"
            alt="A local host welcoming a guest into her home"
            fill
            sizes="(max-width: 800px) 100vw, 50vw"
            className="cover-image"
          />
          <span className="host-image-caption"><Heart size={13} fill="currentColor" /> Hosted with heart in Kodagu</span>
        </div>
        <div className="host-copy">
          <p className="eyebrow dark-eyebrow"><span className="eyebrow-line" /> For the ones who welcome</p>
          <h2>Your home has a story.<br /><em>Let the world in.</em></h2>
          <p>Extra cups at breakfast. The trail nobody knows about. The stories that make a place stay with you. If you have a little of that to share, there&apos;s room for you here.</p>
          <a className="button button-dark" href="/become-a-host">Come host with us <ArrowRight size={16} /></a>
        </div>
      </section>

      <footer className="site-footer">
        <a className="brand footer-brand" href="#" aria-label="Namma Stay home"><span className="brand-mark">n</span><span className="brand-name">namma<span>stay</span></span></a>
        <span className="footer-note">Made with care, in Karnataka <span>ನಮ್ಮ ಮನೆ</span></span>
        <div className="footer-links"><a href="#our-way">Our story</a><a href="/become-a-host">Host with us</a><a href="mailto:hello@nammastay.example">Say hello</a></div>
        <span className="footer-copy">        © 2026 Namma Stay</span>
      </footer>
    </main>
  );
}

const riseIn = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};
