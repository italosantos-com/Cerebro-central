'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Globe, Users, Star, ChevronDown } from 'lucide-react';

export type VisibilityType = 'public' | 'followers' | 'premium';

interface VisibilitySelectorProps {
  value: VisibilityType;
  onChange: (value: VisibilityType) => void;
}

export function VisibilitySelector({ value, onChange }: VisibilitySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const options = [
    {
      value: 'public' as VisibilityType,
      label: 'Público',
      description: 'Qualquer pessoa pode ver',
      icon: Globe,
    },
    {
      value: 'followers' as VisibilityType,
      label: 'Seguidores',
      description: 'Apenas seus seguidores',
      icon: Users,
    },
    {
      value: 'premium' as VisibilityType,
      label: 'Premium',
      description: 'Apenas assinantes premium',
      icon: Star,
    },
  ];

  const selectedOption = options.find((opt) => opt.value === value) || options[0];
  const Icon = selectedOption.icon;

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" />
          <span>{selectedOption.label}</span>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg overflow-hidden">
            {options.map((option) => {
              const OptionIcon = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-start gap-3 p-3 hover:bg-gray-50 transition-colors ${
                    value === option.value ? 'bg-blue-50' : ''
                  }`}
                >
                  <OptionIcon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    value === option.value ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                  <div className="flex-1 text-left">
                    <p className={`text-sm font-medium ${
                      value === option.value ? 'text-blue-900' : 'text-gray-900'
                    }`}>
                      {option.label}
                    </p>
                    <p className="text-xs text-gray-500">{option.description}</p>
                  </div>
                  {value === option.value && (
                    <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
