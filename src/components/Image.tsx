import React, { useState, useEffect } from "react";

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fill?: boolean;
  priority?: boolean;
  quality?: number;
  unoptimized?: boolean;
  sizes?: string;
  className?: string;
  style?: React.CSSProperties;
}

const QUEEN_QUERIES: Record<string, string> = {
  "/routine-morning.png": "cute cat waking up stretching cozy sunny morning bed aesthetic",
  "/routine-breakfast.png": "healthy breakfast oatmeal fruit avocado toast hot tea table detail",
  "/routine-call.png": "fabulous girly hand holding phone texting screen close-up chat bubbles pink background no face",
  "/routine-work-1.png": "girly makeup cosmetics luxury jewelry ring vlog camera laptop screen video editing sequence no human no face",
  "/routine-lunch.png": "nourishing healthy grain bowl salmon greens salad lemon dressing plate top view",
  "/routine-private-reset.png": "cozy warm armchair reading book afternoon sun green plants chill corner",
  "/routine-nap.png": "cozy aesthetic quiet bedroom cozy bed clean sheets soft afternoon shadow sleep rest",
  "/routine-wake-afternoon.png": "cute kitten yawning stretching in soft afternoon light cozy blanket sleep cat no person",
  "/routine-drink-reset.png": "iced matcha latte glass cup green indoor houseplants spraying water mist droplets aesthetic table",
  "/routine-outing.png": "lush green garden courtyard patio iced matcha espresso cup on table summer fresh air no people",
  "/routine-work-2.png": "aesthetic cosmetics jewelry organization desk workspace ringlight vlogging video editing app timeline no person",
  "/routine-movement.png": "home yoga stretching mat glass water bottle plant-filled room calm exercise setup",
  "/routine-dinner.png": "delicious piping hot pasta dinner plate candlelight glass of red wine table flatlay cozy light no fruit no oranges",
  "/routine-personal-care.png": "girly skincare cream serum dropper cosmetics layout elegant vanity table marble shelf no faces no person",
  "/routine-night-call.png": "cozy hand holding smartphone texting chat screen messenger bedside lamp cozy blanket no face",
  "/routine-wind-down.png": "peaceful calming night atmosphere cozy bed warm lamp open book candle relaxing cozy evening bedroom vibes",
  "/routine-sleep.png": "cozy dark serene bedroom moonlight bedding pillows starry night window calming atmosphere deep sleep dream no oranges",
};

export default function Image({
  src,
  alt,
  fill,
  priority,
  quality,
  unoptimized,
  sizes,
  className,
  style,
  ...props
}: ImageProps) {
  const [imgUrl, setImgUrl] = useState<string>("");
  const [credit, setCredit] = useState<{
    photographer: string;
    photographerLink: string;
    pexelsLink: string;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);

  useEffect(() => {
    setImageError(false);
    
    const query = QUEEN_QUERIES[src] || alt || "lifestyle peace relaxation";
    const cacheKey = `pexels_v3_cache_${encodeURIComponent(query)}`;
    
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const ONE_HOUR = 60 * 60 * 1000;
        if (parsed.url && parsed.timestamp && (Date.now() - parsed.timestamp < ONE_HOUR)) {
          setImgUrl(parsed.url);
          setCredit({
            photographer: parsed.photographer,
            photographerLink: parsed.photographerLink,
            pexelsLink: parsed.pexelsLink || parsed.unsplashLink || "https://www.pexels.com"
          });
          return;
        } else {
          localStorage.removeItem(cacheKey);
        }
      } catch (e) {
        localStorage.removeItem(cacheKey);
      }
    }

    let isMounted = true;
    const fetchImage = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/pexels?query=${encodeURIComponent(query)}`);
        if (!response.ok) {
          throw new Error("Pexels API responded status: " + response.status);
        }
        const data = await response.json();
        if (data.url && isMounted) {
          setImgUrl(data.url);
          const creditData = {
            photographer: data.photographer,
            photographerLink: data.photographerLink,
            pexelsLink: data.pexelsLink || "https://www.pexels.com"
          };
          setCredit(creditData);
          localStorage.setItem(cacheKey, JSON.stringify({
            url: data.url,
            ...creditData,
            timestamp: Date.now()
          }));
        }
      } catch (error) {
        console.warn("Failed to retrieve Pexels proxy image.", error);
        if (isMounted) {
          setImageError(true);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchImage();

    return () => {
      isMounted = false;
    };
  }, [src, alt]);

  const handleRefresh = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const query = QUEEN_QUERIES[src] || alt || "lifestyle peace relaxation";
    const cacheKey = `pexels_v3_cache_${encodeURIComponent(query)}`;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/pexels?query=${encodeURIComponent(query)}&cache_bypass=${Date.now()}`);
      if (!response.ok) throw new Error("Pexels API responded status: " + response.status);
      const data = await response.json();
      if (data.url) {
        setImgUrl(data.url);
        const creditData = {
          photographer: data.photographer,
          photographerLink: data.photographerLink,
          pexelsLink: data.pexelsLink || "https://www.pexels.com"
        };
        setCredit(creditData);
        localStorage.setItem(cacheKey, JSON.stringify({
          url: data.url,
          ...creditData,
          timestamp: Date.now()
        }));
        setImageError(false);
      }
    } catch (error) {
      console.warn("Failed to refresh Pexels image:", error);
    } finally {
      setLoading(false);
    }
  };

  const customStyle: React.CSSProperties = fill
    ? {
        position: "absolute",
        height: "100%",
        width: "100%",
        left: 0,
        top: 0,
        objectFit: "cover",
        ...style,
    }
    : { ...style };

  const handleImageError = async () => {
    const query = QUEEN_QUERIES[src] || alt || "lifestyle peace relaxation";
    console.warn("Image load failed. Trying custom key cache bypass fetch for Pexels...");
    
    try {
      const response = await fetch(`/api/pexels?query=${encodeURIComponent(query)}&cache_bypass=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          setImgUrl(data.url);
          setCredit({
            photographer: data.photographer,
            photographerLink: data.photographerLink,
            pexelsLink: data.pexelsLink || "https://www.pexels.com"
          });
          return;
        }
      }
    } catch (err) {
      console.error("Fallback pexels refresh fetch failed:", err);
    }

    setImageError(true);
  };

  if (imageError && !imgUrl) {
    return (
      <div 
        style={customStyle} 
        className={`${className || ""} flex items-center justify-center bg-gradient-to-tr from-stone-200/40 via-amber-200/20 to-neutral-200/30 text-[var(--muted)] font-mono text-xs text-center p-6`}
      >
        <span>{alt || "Routine Element"}</span>
      </div>
    );
  }

  return (
    <div 
      style={{ 
        position: fill ? "absolute" : "relative", 
        width: fill ? "100%" : "auto", 
        height: fill ? "100%" : "auto", 
        top: 0, 
        left: 0,
        overflow: "hidden",
        borderRadius: "inherit"
      }} 
      className="group w-full h-full"
    >
      {loading && (
        <div className="absolute inset-0 bg-neutral-900/10 backdrop-blur-[2px] transition-all flex items-center justify-center z-10 animate-pulse" />
      )}
      
      <img
        src={imgUrl || src}
        alt={alt}
        sizes={sizes}
        className={className}
        style={customStyle}
        onError={handleImageError}
        referrerPolicy="no-referrer"
        {...props}
      />
    </div>
  );
}
