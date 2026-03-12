import React, { useState, useRef, useEffect } from 'react';

interface DropdownOption {
    value: string;
    label: string;
    icon?: string | React.ElementType; // Support string class or React Component
    subLabel?: string;
    image?: string;
    iconColor?: string; // e.g. text-green-600
    iconBg?: string;    // e.g. bg-green-100
    description?: string;
}

type ColorScheme = 'orange' | 'green' | 'blue' | 'purple' | 'gray';

interface ModernDropdownProps {
    options: DropdownOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    required?: boolean;
    className?: string;
    disabled?: boolean;
    direction?: 'top' | 'bottom';
    searchable?: boolean;
    colorScheme?: ColorScheme;
}

const ModernDropdown: React.FC<ModernDropdownProps> = ({
    options,
    value,
    onChange,
    placeholder = 'Select an option',
    label,
    required = false,
    className = '',
    disabled = false,
    direction = 'bottom',
    searchable = false,
    colorScheme = 'orange',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const selectedOption = options.find((opt) => opt.value === value);

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isOpen && searchable && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen, searchable]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleSelect = (optionValue: string) => {
        if (!disabled) {
            onChange(optionValue);
            setIsOpen(false);
            setSearchTerm('');
        }
    };

    const getColorClasses = () => {
        switch (colorScheme) {
            case 'green':
                return {
                    border: 'border-green-500 ring-green-500',
                    hover: 'hover:border-green-400',
                    bg: 'bg-green-50',
                    text: 'text-green-700',
                    icon: 'text-green-600',
                    iconBg: 'bg-green-100'
                };
            case 'blue':
                return {
                    border: 'border-blue-500 ring-blue-500',
                    hover: 'hover:border-blue-400',
                    bg: 'bg-blue-50',
                    text: 'text-blue-700',
                    icon: 'text-blue-600',
                    iconBg: 'bg-blue-100'
                };
            case 'purple':
                return {
                    border: 'border-purple-500 ring-purple-500',
                    hover: 'hover:border-purple-400',
                    bg: 'bg-purple-50',
                    text: 'text-purple-700',
                    icon: 'text-purple-600',
                    iconBg: 'bg-purple-100'
                };
            case 'gray':
                return {
                    border: 'border-gray-500 ring-gray-500',
                    hover: 'hover:border-gray-400',
                    bg: 'bg-gray-50',
                    text: 'text-gray-700',
                    icon: 'text-gray-600',
                    iconBg: 'bg-gray-100'
                };
            default:
                return {
                    border: 'border-orange-500 ring-orange-500',
                    hover: 'hover:border-orange-400',
                    bg: 'bg-orange-50',
                    text: 'text-orange-700',
                    icon: 'text-orange-600',
                    iconBg: 'bg-orange-100'
                };
        }
    };

    const colors = getColorClasses();

    const renderIcon = (option: DropdownOption, isSelected: boolean) => {
        if (option.image) {
            return <img src={option.image} alt="" className="w-6 h-6 rounded-full object-cover" />;
        }

        if (option.icon) {
            const IconTag = typeof option.icon !== 'string' ? option.icon : null;
            // Use custom colors if provided, otherwise fallback to scheme
            const colorClass = option.iconColor || (isSelected ? colors.icon : 'text-gray-500');
            const bgClass = option.iconBg || (isSelected ? colors.iconBg : 'bg-gray-100');

            return (
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${bgClass} ${colorClass}`}>
                    {IconTag ? (
                        <IconTag className="w-4 h-4" />
                    ) : (
                        <i className={`${option.icon} text-sm`}></i>
                    )}
                </div>
            );
        }
        return null;
    };

    const dropdownClasses = direction === 'top'
        ? `bottom-full mb-2 origin-bottom ${isOpen ? 'translate-y-0' : 'translate-y-2'}`
        : `mt-2 origin-top ${isOpen ? 'translate-y-0' : '-translate-y-2'}`;

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {label && (
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}

            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`w-full px-4 py-3 border text-left rounded-xl flex items-center justify-between transition-all duration-300
          ${isOpen
                        ? `${colors.border} ring-2 ring-opacity-50`
                        : `border-gray-300 ${colors.hover}`
                    }
          ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-70' : 'bg-white shadow-sm hover:shadow-md cursor-pointer'}
        `}
            >
                <span className={`flex items-center gap-3 truncate ${!selectedOption ? 'text-gray-400' : 'text-gray-900'}`}>
                    {selectedOption ? (
                        <>
                            {renderIcon(selectedOption, true)}
                            <span className="font-medium truncate">{selectedOption.label}</span>
                            {selectedOption.subLabel && (
                                <span className="text-gray-400 text-xs ml-auto truncate">
                                    ({selectedOption.subLabel})
                                </span>
                            )}
                        </>
                    ) : (
                        placeholder
                    )}
                </span>
                <i
                    className={`fas fa-chevron-down text-gray-400 transition-transform duration-300 ${isOpen ? `rotate-180 ${colors.icon}` : ''
                        }`}
                ></i>
            </button>

            {/* Dropdown Menu */}
            <div
                className={`absolute z-[100] w-full bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden transition-all duration-200 ease-out transform
          ${dropdownClasses}
          ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
        `}
            >
                {searchable && (
                    <div className="p-2 border-b border-gray-100 sticky top-0 bg-white z-10">
                        <div className="relative">
                            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 ${colors.border} ring-opacity-20 outline-none`}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>
                )}
                <div className="max-h-60 overflow-y-auto custom-scrollbar">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => handleSelect(option.value)}
                                className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors border-b border-gray-50 last:border-0 hover:${colors.bg}
                  ${value === option.value ? `${colors.bg}/50` : ''}
                `}
                            >
                                {renderIcon(option, value === option.value)}
                                <div className="flex-1 min-w-0 flex items-baseline justify-between gap-2">
                                    <span className={`font-medium truncate ${value === option.value ? colors.text : 'text-gray-900'}`}>
                                        {option.label}
                                    </span>
                                    {option.subLabel && (
                                        <span className="text-xs text-gray-500 whitespace-nowrap">{option.subLabel}</span>
                                    )}
                                </div>
                                {value === option.value && <i className="fas fa-check text-green-500 ml-2"></i>}
                            </button>
                        ))
                    ) : (
                        <div className="px-4 py-6 text-gray-500 text-sm text-center">
                            <i className="fas fa-search mb-2 opacity-20 text-2xl block"></i>
                            No options found
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ModernDropdown;
