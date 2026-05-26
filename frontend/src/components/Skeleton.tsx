import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circle' | 'rect';
  className?: string;
  style?: React.CSSProperties;
}

const Skeleton: React.FC<SkeletonProps> = ({ 
  width, 
  height, 
  variant = 'text', 
  className = '',
  style 
}) => {
  const baseClass = variant === 'text' ? 'skeleton' : `skeleton skeleton-${variant}`;
  
  const customStyle: React.CSSProperties = {
    width: width || '100%',
    height: height || (variant === 'text' ? '1rem' : 'auto'),
    ...style
  };

  return (
    <div 
      className={`${baseClass} ${className}`} 
      style={customStyle}
    />
  );
};

export default Skeleton;
