'use client';

import { ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from './Card';
import { Icon } from '../Icon';

interface CollapsibleCardProps {
  title: string;
  icon?: string;
  iconColor?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: ReactNode;
  className?: string;
  headerClassName?: string;
}

export function CollapsibleCard({
  title,
  icon,
  iconColor = 'text-ocean-primary',
  children,
  defaultOpen = false,
  badge,
  className = '',
  headerClassName = '',
}: CollapsibleCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className={`overflow-hidden ${className}`} padding="none">
      {/* Clickable Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-4 md:p-6 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors group ${headerClassName}`}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          {icon && (
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br from-ocean-primary/10 to-ocean-accent/10 flex items-center justify-center flex-shrink-0`}>
              <Icon name={icon} className={`text-lg ${iconColor}`} />
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg md:text-xl font-semibold text-ocean-deep">
              {title}
            </h3>
            {badge}
          </div>
        </div>

        {/* Expand/Collapse Indicator */}
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ml-2 ${
            isOpen
              ? 'bg-gray-200'
              : 'bg-ocean-primary/20 group-hover:bg-ocean-primary/30'
          }`}
        >
          <Icon
            name="angle-down"
            className={`text-lg ${isOpen ? 'text-gray-600' : 'text-ocean-primary'}`}
          />
        </motion.div>
      </button>

      {/* Collapsible Content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 md:px-6 md:pb-6 border-t border-gray-100">
              <div className="pt-4 md:pt-6">
                {children}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
