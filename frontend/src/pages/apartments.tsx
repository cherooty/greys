import { useState, useEffect } from "react";
import { Building2, MapPin, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Apartment = { id: number; name: string; address: string };

export default function Apartments() {
  const [apartments, setApartments] = useState<Apartment[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("https://sin-ricky-meaningful-motorola.trycloudflare.com/api/apartments")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setApartments(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch apartments:", err);
        setIsError(true);
        setIsLoading(false);
      });
  }, []);

  const filteredApartments = apartments?.filter((apt) =>
    apt.name.toLowerCase().includes(search.toLowerCase()) ||
    apt.address.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="w-full flex flex-col min-h-full">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full h-[45vh] min-h-[360px] rounded-[2rem] overflow-hidden mb-12 shadow-2xl shadow-black/5"
      >
        <img 
          src={`${import.meta.env.BASE_URL}images/architecture-hero.png`} 
          alt="Modern building architecture" 
          className="absolute inset-0 w-full h-full object-cover scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        
        <div className="absolute bottom-10 left-8 md:left-12 max-w-2xl z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/30 backdrop-blur-md border border-white/10 text-sm font-medium mb-6 text-foreground">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Available Properties
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground mb-4 leading-tight">
              Discover Your <br />
              <span className="text-muted-foreground">Next Home.</span>
            </h1>
            <p className="text-lg text-muted-foreground/90 max-w-lg">
              Explore our exclusive collection of premium properties and architectural marvels.
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Controls / Search */}
      <div className="flex flex-col sm:flex-row items-center gap-4 mb-10">
        <div className="relative w-full sm:max-w-md group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search by name or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-14 pl-12 pr-4 bg-card border-2 border-border/60 rounded-2xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Content State */}
      {isError ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-destructive/5 rounded-3xl border border-destructive/20">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mb-6">
            <Building2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-display font-bold mb-2">Unable to load properties</h2>
          <p className="text-muted-foreground max-w-md">There was a problem connecting to our servers. Please try refreshing the page in a few moments.</p>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 rounded-3xl bg-muted/40 animate-pulse border border-border/50" />
          ))}
        </div>
      ) : filteredApartments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-card/50 rounded-3xl border border-dashed border-border">
          <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center text-muted-foreground mb-6">
            <Search className="w-10 h-10 opacity-50" />
          </div>
          <h2 className="text-2xl font-display font-bold mb-3">No properties found</h2>
          <p className="text-muted-foreground max-w-sm mb-6">
            We couldn't find any apartments matching "{search}". Try adjusting your search terms.
          </p>
          <button 
            onClick={() => setSearch("")}
            className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
            Clear Search
          </button>
        </div>
      ) : (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20"
          layout
        >
          <AnimatePresence mode="popLayout">
            {filteredApartments.map((apartment, index) => (
              <motion.div
                key={apartment.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="group relative flex flex-col bg-card rounded-3xl p-6 border border-border hover:border-primary/30 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-14 h-14 bg-secondary rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300 text-foreground">
                  <Building2 size={24} strokeWidth={1.5} />
                </div>
                
                <h3 className="text-xl font-display font-bold text-foreground tracking-tight mb-3 line-clamp-1">
                  {apartment.name}
                </h3>
                
                <div className="flex items-start text-muted-foreground mt-auto pt-2">
                  <MapPin size={18} className="mr-2.5 shrink-0 mt-0.5 text-primary/70" />
                  <p className="leading-relaxed text-sm line-clamp-2">{apartment.address}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
