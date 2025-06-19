import { useMemo } from 'react';

const icons = [
  (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path d="M11 2a1 1 0 0 1 2 0v3h3a1 1 0 1 1 0 2h-3v3a1 1 0 1 1-2 0V7H8a1 1 0 1 1 0-2h3V2Z" />
    </svg>
  ),
  (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path d="M19.778 4.222a5 5 0 0 0-7.07 0l-8.486 8.486a3 3 0 1 0 4.243 4.243l8.486-8.486a5 5 0 0 0 0-7.07Zm-5.657 1.414a3 3 0 1 1 4.243 4.243l-1.06 1.06-4.243-4.242 1.06-1.061ZM4.93 17.314a1 1 0 0 1-1.414-1.414l.707-.707 1.414 1.414-.707.707Z" />
    </svg>
  ),
];

export default function BackgroundAnimation() {
  const floats = useMemo(() => {
    return Array.from({ length: 25 }).map(() => {
      const size = 50 + Math.random() * 60; // px
      const style = {
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        width: size,
        height: size,
        animation: `float ${8 + Math.random() * 6}s ease-in-out infinite`,
        animationDelay: `${Math.random() * 5}s`,
      };
      const Icon = icons[Math.floor(Math.random() * icons.length)];
      return { style, Icon };
    });
  }, []);

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden text-primary/20">
      {floats.map((f, idx) => (
        <div key={idx} style={f.style} className="absolute opacity-60 hover:opacity-90 transition">
          {f.Icon}
        </div>
      ))}
    </div>
  );
}
