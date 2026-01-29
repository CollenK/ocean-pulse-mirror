'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSavedMPAs } from '@/hooks/useSavedMPAs';
import { Icon } from '@/components/Icon';
import { storeAuthRedirect } from '@/lib/auth-redirect';

interface SaveMPAButtonProps {
  mpaId: string;
  mpaDbId?: string; // Internal UUID for database operations
  variant?: 'icon' | 'button';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SaveMPAButton({
  mpaId,
  mpaDbId,
  variant = 'button',
  size = 'md',
  className = '',
}: SaveMPAButtonProps) {
  const { isAuthenticated, isSaved, toggleSave } = useSavedMPAs();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Use the database UUID for save operations and checking saved state
  const dbId = mpaDbId || mpaId;
  const saved = isSaved(dbId);

  const handleClick = async () => {
    if (!isAuthenticated) {
      storeAuthRedirect(pathname);
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    setIsLoading(true);
    await toggleSave(dbId);
    setIsLoading(false);
  };

  const sizeClasses = {
    sm: variant === 'icon' ? 'w-8 h-8' : 'px-3 py-1.5 text-sm',
    md: variant === 'icon' ? 'w-10 h-10' : 'px-4 py-2',
    lg: variant === 'icon' ? 'w-12 h-12' : 'px-5 py-2.5 text-lg',
  };

  const iconSize = {
    sm: 'sm' as const,
    md: 'md' as const,
    lg: 'lg' as const,
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`
          ${sizeClasses[size]}
          rounded-full flex items-center justify-center
          transition-all duration-200
          ${saved
            ? 'bg-red-50 text-red-500 hover:bg-red-100'
            : 'bg-white/90 text-gray-600 hover:bg-white hover:text-red-500'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
          shadow-md hover:shadow-lg
          ${className}
        `}
        title={saved ? 'Remove from saved' : 'Save MPA'}
        aria-label={saved ? 'Remove from saved' : 'Save MPA'}
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <Icon
            name={saved ? 'heart' : 'heart'}
            size={iconSize[size]}
            className={saved ? 'fill-current' : ''}
          />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`
        ${sizeClasses[size]}
        rounded-full flex items-center justify-center gap-2
        font-medium transition-all duration-200
        ${saved
          ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
          : 'bg-ocean-primary text-white hover:bg-ocean-primary/90'
        }
        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <Icon
          name={saved ? 'heart' : 'heart'}
          size={iconSize[size]}
          className={saved ? 'fill-current' : ''}
        />
      )}
      <span>{saved ? 'Saved' : 'Save'}</span>
    </button>
  );
}
