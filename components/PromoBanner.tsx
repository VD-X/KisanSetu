import React, { useEffect, useMemo, useState } from 'react';

export const PromoBanner: React.FC = () => {
    const fallbackImageUrl = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1200';

    const slides = useMemo(
        () => [
            {
                tag: 'Powered by Fresho!',
                title: "Season's star veggies",
                subtitle: 'Sarso, peas, red carrots & more',
                cta: 'Shop Now',
                accentClass: 'from-emerald-500 to-green-500',
                imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1200',
                imageAlt: 'Fresh vegetables',
            },
            {
                tag: 'Fresh picks',
                title: 'Fruits for the week',
                subtitle: 'Apples, bananas, citrus & berries',
                cta: 'Explore Fruits',
                accentClass: 'from-orange-500 to-amber-500',
                imageUrl: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&q=80&w=1200',
                imageAlt: 'Fresh fruits',
            },
            {
                tag: 'Best value',
                title: 'Bulk buys made easy',
                subtitle: 'Better pricing for larger quantities',
                cta: 'View Deals',
                accentClass: 'from-blue-600 to-indigo-600',
                imageUrl: 'https://images.unsplash.com/photo-1561043433-9265f73e685f?auto=format&fit=crop&q=80&w=1200',
                imageAlt: 'Fresh produce in baskets',
            },
        ],
        []
    );

    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        const id = window.setInterval(() => {
            setActiveIndex((i) => (i + 1) % slides.length);
        }, 5000);
        return () => window.clearInterval(id);
    }, [slides.length]);

    return (
        <div className="mb-8">
            <div className="md:hidden">
                <div className="relative overflow-hidden rounded-[32px] shadow-xl min-h-[190px]">
                    {slides.map((slide, i) => (
                        <div
                            key={slide.title}
                            className={`absolute inset-0 transition-opacity duration-700 ${i === activeIndex ? 'opacity-100' : 'opacity-0'}`}
                        >
                            <div className={`absolute inset-0 bg-gradient-to-r ${slide.accentClass} opacity-35`}></div>
                            <div className="absolute inset-0 bg-gradient-to-r from-gray-900/45 to-gray-900/15"></div>

                            <div className="absolute -top-10 -right-10 w-52 h-52 bg-white/10 rounded-full blur-3xl"></div>
                            <div className="absolute -bottom-12 left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>

                            <div className="relative z-10 p-5 pr-28 text-white">
                                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md text-white text-[9px] font-black px-2.5 py-1 uppercase tracking-widest border border-white/10">
                                    <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${slide.accentClass}`}></span>
                                    {slide.tag}
                                </div>
                                <h2 className="mt-3 text-2xl font-black leading-[1.05] tracking-tight drop-shadow-sm">
                                    {slide.title}
                                </h2>
                                <p className="mt-2 text-xs text-white/90 font-medium">
                                    {slide.subtitle}
                                </p>
                                <button className="mt-4 bg-white text-gray-900 px-5 py-2.5 rounded-[16px] font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 active:scale-95 transition-all shadow-lg">
                                    {slide.cta}
                                </button>
                            </div>

                            <div className="absolute -right-5 -bottom-5 w-40 h-40 rotate-6">
                                <img
                                    src={slide.imageUrl}
                                    alt={slide.imageAlt}
                                    onError={(e) => {
                                        if (e.currentTarget.src !== fallbackImageUrl) {
                                            e.currentTarget.src = fallbackImageUrl;
                                        }
                                    }}
                                    className="w-full h-full object-cover rounded-full border-4 border-white/20 shadow-2xl"
                                />
                                <div className="absolute top-1 right-8">
                                    <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-white shadow-lg bg-gradient-to-r ${slide.accentClass}`}>
                                        Fresh
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    <div className="absolute bottom-4 left-5 z-20 flex items-center gap-0.5">
                        {slides.map((_, i) => (
                            <button
                                key={i}
                                type="button"
                                aria-label={`Go to slide ${i + 1}`}
                                onClick={() => setActiveIndex(i)}
                                className="p-2 -m-2"
                            >
                                <span
                                    className={`block h-1.5 rounded-full transition-all ${i === activeIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/45'}`}
                                />
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="hidden md:block">
                <div className="relative overflow-hidden rounded-[40px] shadow-2xl border border-gray-100 bg-white">
                    <div className="absolute inset-0">
                        {slides.map((slide, i) => (
                            <div
                                key={slide.title}
                                className={`absolute inset-0 transition-opacity duration-700 ${i === activeIndex ? 'opacity-100' : 'opacity-0'}`}
                            >
                                <div className={`absolute inset-0 bg-gradient-to-r ${slide.accentClass} opacity-15`}></div>
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(16,185,129,0.18),transparent_55%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.16),transparent_55%),radial-gradient(circle_at_70%_80%,rgba(245,158,11,0.14),transparent_55%)]"></div>
                                <div className="absolute -right-28 -top-28 w-[520px] h-[520px] rounded-full bg-white/40 blur-3xl"></div>
                                <div className="absolute -left-28 -bottom-28 w-[420px] h-[420px] rounded-full bg-white/30 blur-3xl"></div>
                            </div>
                        ))}
                    </div>

                    <div className="relative z-10 px-10 py-10 lg:px-12 lg:py-12 flex items-center gap-10">
                        <div className="flex-1 min-w-0">
                            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/70 backdrop-blur px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-700">
                                <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${slides[activeIndex].accentClass}`}></span>
                                {slides[activeIndex].tag}
                            </div>

                            <h2 className="mt-4 text-4xl lg:text-5xl font-black tracking-tight text-gray-900 leading-[1.05]">
                                {slides[activeIndex].title}
                            </h2>
                            <p className="mt-3 text-sm lg:text-base font-bold text-gray-600 max-w-xl">
                                {slides[activeIndex].subtitle}
                            </p>

                            <div className="mt-7 flex items-center gap-4">
                                <button className="px-6 py-3 rounded-2xl bg-gray-900 text-white font-black text-[11px] uppercase tracking-widest shadow-lg hover:shadow-xl active:scale-95 transition-all">
                                    {slides[activeIndex].cta}
                                </button>
                                <div className="flex items-center gap-2">
                                    {slides.map((_, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            aria-label={`Go to slide ${i + 1}`}
                                            onClick={() => setActiveIndex(i)}
                                            className={`h-2.5 rounded-full transition-all ${i === activeIndex ? 'w-8 bg-gray-900' : 'w-2.5 bg-gray-300 hover:bg-gray-400'}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="w-[420px] shrink-0">
                            <div className="relative rounded-[32px] overflow-hidden border border-white/40 shadow-2xl bg-white/40 backdrop-blur">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/25 to-white/0"></div>
                                <img
                                    src={slides[activeIndex].imageUrl}
                                    alt={slides[activeIndex].imageAlt}
                                    onError={(e) => {
                                        if (e.currentTarget.src !== fallbackImageUrl) {
                                            e.currentTarget.src = fallbackImageUrl;
                                        }
                                    }}
                                    className="relative w-full h-[240px] object-cover"
                                />
                                <div className="absolute top-4 right-4">
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-lg bg-gradient-to-r ${slides[activeIndex].accentClass}`}>
                                        Fresh
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
