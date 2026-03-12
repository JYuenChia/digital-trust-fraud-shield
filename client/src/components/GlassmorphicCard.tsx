import React from 'react';

interface GlassmorphicCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: 'cyan' | 'magenta' | 'none';
  onClick?: () => void;
  style?: React.CSSProperties;
}

/**
 * GlassmorphicCard Component
 * 
 * Design Philosophy: Ethereal Cyberpunk Minimalism
 * - Frosted glass effect with backdrop blur
 * - Ultra-thin cyan borders
 * - Subtle drop shadows and glow effects
 * - Smooth hover transitions with enhanced glow
 */
export const GlassmorphicCard: React.FC<GlassmorphicCardProps> = ({
  children,
  className = '',
  glowColor = 'cyan',
  onClick,
  style,
}) => {
  const glowClasses = {
    cyan: 'hover:shadow-[0_0_30px_rgba(0,217,255,0.4)]',
    magenta: 'hover:shadow-[0_0_30px_rgba(255,0,110,0.4)]',
    none: '',
  };

  return (
    <div
      onClick={onClick}
      style={style}
      className={`
        relative rounded-lg overflow-hidden
        bg-[rgba(15,23,42,0.7)] backdrop-blur-md
        border border-[rgba(0,217,255,0.2)]
        shadow-[0_8px_32px_rgba(0,0,0,0.3)]
        transition-all duration-300 ease-out
        ${glowClasses[glowColor]}
        ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''}
        ${className}
      `}
    >
      {/* Inner glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-[rgba(0,217,255,0.05)] to-transparent pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default GlassmorphicCard;
