import React from "react";

// Fixed full-screen blueprint / graph paper backdrop with dashed arcs & diagonals
const BlueprintBackground = () => {
  return (
    <div className="blueprint-bg fixed inset-0 -z-10 pointer-events-none" aria-hidden="true">
      <svg
        className="absolute inset-0 w-full h-full text-neutral-400 dark:text-neutral-600"
        preserveAspectRatio="none"
      >
        {/* big dashed arcs */}
        <circle cx="-5%" cy="85%" r="620" fill="none" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1" strokeDasharray="3 7" />
        <circle cx="-5%" cy="85%" r="430" fill="none" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1" strokeDasharray="3 7" />
        <circle cx="104%" cy="-10%" r="520" fill="none" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1" strokeDasharray="3 7" />
        {/* dashed diagonals */}
        <line x1="-5%" y1="110%" x2="55%" y2="-10%" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="4 8" />
        <line x1="25%" y1="115%" x2="115%" y2="5%" stroke="currentColor" strokeOpacity="0.16" strokeWidth="1" strokeDasharray="4 8" />
        <line x1="-5%" y1="52%" x2="110%" y2="38%" stroke="currentColor" strokeOpacity="0.14" strokeWidth="1" strokeDasharray="4 8" />
      </svg>
    </div>
  );
};

export default BlueprintBackground;
