'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: {
    value: number;
    label?: string;
  };
  icon?: React.ReactNode;
  className?: string;
}

export function KpiCard({ label, value, delta, icon, className }: KpiCardProps) {
  const isPositive = delta && delta.value > 0;
  const isNegative = delta && delta.value < 0;

  return (
    <div className={cn(
      "bg-surface rounded-medium p-6 shadow-card border border-border",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-text-muted">{label}</p>
          <h3 className="text-2xl font-bold text-text-primary mt-2">{value}</h3>
          
          {delta && (
            <div className="flex items-center mt-3 space-x-1">
              <span className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-pill text-xs font-medium",
                isPositive && "bg-green-100 text-success",
                isNegative && "bg-red-100 text-danger",
                !isPositive && !isNegative && "bg-gray-100 text-text-muted"
              )}>
                {isPositive && <TrendingUp className="w-3 h-3 mr-1" />}
                {isNegative && <TrendingDown className="w-3 h-3 mr-1" />}
                {isPositive && '+'}
                {delta.value}%
              </span>
              {delta.label && (
                <span className="text-xs text-text-subtle">{delta.label}</span>
              )}
            </div>
          )}
        </div>
        
        {icon && (
          <div className="w-12 h-12 rounded-medium bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export default KpiCard;