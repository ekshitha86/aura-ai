export function AIFace() {
  return (
    <div className="relative h-72 w-72 sm:h-96 sm:w-96 mx-auto animate-float">
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-neon-blue/30 via-neon-purple/20 to-transparent blur-2xl" />
      <div className="absolute inset-6 rounded-full border border-neon-blue/40 animate-spin-slow" />
      <div
        className="absolute inset-12 rounded-full border border-neon-purple/40 animate-spin-slow"
        style={{ animationDirection: "reverse", animationDuration: "24s" }}
      />
      <div className="absolute inset-20 rounded-full glass grid place-items-center overflow-hidden">
        <div className="text-6xl sm:text-7xl select-none">◔◡◔</div>
        <div className="absolute inset-0 scanline" />
      </div>
      <div className="absolute -inset-2 rounded-full animate-pulse-ring" />
    </div>
  );
}