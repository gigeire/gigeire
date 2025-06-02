"use client";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  buttonText?: string;
  onButtonClick?: () => void;
  buttonHref?: string;
}

export function EmptyState({
  icon,
  title,
  subtitle,
  buttonText,
  onButtonClick,
  buttonHref,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && <div className="mb-6 text-gray-400" style={{ fontSize: 48 }}>{icon}</div>}
      <h2 className="text-2xl md:text-3xl font-bold mb-2">{title}</h2>
      {subtitle && <p className="text-gray-500 mb-6 max-w-md">{subtitle}</p>}
      {buttonText && (
        buttonHref ? (
          <Button asChild className="bg-black text-white rounded-full px-6 py-2 text-base font-semibold">
            <a href={buttonHref}>{buttonText}</a>
          </Button>
        ) : (
          <Button 
            onClick={onButtonClick} 
            className="bg-black text-white rounded-full px-6 py-2 text-base font-semibold"
          >
            {buttonText}
          </Button>
        )
      )}
    </div>
  );
} 