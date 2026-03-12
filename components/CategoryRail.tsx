import React from 'react';

interface CategoryRailProps {
    onSelect: (category: string | null) => void;
    selected: string | null;
}

const CATEGORIES = [
    { id: 'Vegetable', name: 'Vegetables', icon: '🥦', color: 'bg-green-100 text-green-700' },
    { id: 'Fruit', name: 'Fruits', icon: '🍎', color: 'bg-red-100 text-red-700' },
    { id: 'Grain', name: 'Food Grains', icon: '🌾', color: 'bg-amber-100 text-amber-700' },
    { id: 'Spices', name: 'Spices', icon: '🌶️', color: 'bg-orange-100 text-orange-700' },
    { id: 'Flowers', name: 'Flowers', icon: '🌸', color: 'bg-pink-100 text-pink-700' },
    { id: 'Oilseed', name: 'Oil Seeds', icon: '🌻', color: 'bg-yellow-100 text-yellow-700' },
];

export const CategoryRail: React.FC<CategoryRailProps> = ({ onSelect, selected }) => {
    return (
        <div className="sticky top-[120px] z-10 bg-[#F3F9F6] pt-2 pb-4 -mx-4 px-4 shadow-sm mb-6">
            <div className="flex gap-3 overflow-x-auto no-scrollbar">
                <button
                    onClick={() => onSelect(null)}
                    className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${!selected
                        ? 'bg-emerald-900 border-emerald-900 text-white shadow-lg'
                        : 'bg-white border-transparent text-gray-600 shadow-sm'
                        }`}
                >
                    <span className="text-lg"><i className="fas fa-th-large"></i></span>
                    <span className="text-[11px] font-black uppercase tracking-widest">All</span>
                </button>

                {CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => onSelect(selected === cat.id ? null : cat.id)}
                        className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${selected === cat.id
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg'
                            : 'bg-white border-transparent text-gray-600 shadow-sm'
                            }`}
                    >
                        <span className="text-lg">{cat.icon}</span>
                        <span className={`text-[11px] font-black uppercase tracking-widest`}>
                            {cat.name}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
};
