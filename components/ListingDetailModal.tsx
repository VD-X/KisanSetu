
import React, { useState } from 'react';
import { Listing } from '../types';
import { CROPS } from '../constants';

import { geminiService } from '../services/geminiService';

interface ListingDetailModalProps {
    listing: any;
    onClose: () => void;
    onAddToCart: (listing: any) => void;
    onBuyNow: (listing: any) => void;
    isWishlisted?: boolean;
    onToggleWishlist?: (e: React.MouseEvent, listingId: string) => void;
    relatedListings?: Listing[];
    onListingClick?: (listing: Listing) => void;
}

export const ListingDetailModal: React.FC<ListingDetailModalProps> = ({
    listing,
    onClose,
    onAddToCart,
    onBuyNow,
    isWishlisted = false,
    onToggleWishlist,
    relatedListings = [],
    onListingClick
}) => {
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [activeTab, setActiveTab] = useState<'desc' | 'specs' | 'reviews'>('desc');
    const [showCertificate, setShowCertificate] = useState(false);
    const crop = listing.crop || CROPS.find(c => c.id === listing.cropId || c.name.toLowerCase() === listing.crop?.name?.toLowerCase());


    const images = listing.images || [
        'https://images.unsplash.com/photo-1595855759920-7f2878cf6721?w=800&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1592919016334-5393c65df93c?w=800&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1621460241666-000c01bc8945?w=800&auto=format&fit=crop'
    ];

    const getCropColor = (name: string = '') => {
        const n = name.toLowerCase();
        if (n.includes('tomato')) return { from: 'from-red-900/40', via: 'via-rose-950/60', to: 'to-gray-950', accent: 'text-red-500' };
        if (n.includes('wheat') || n.includes('groundnut') || n.includes('soybean')) return { from: 'from-amber-900/40', via: 'via-orange-950/60', to: 'to-gray-950', accent: 'text-amber-500' };
        if (n.includes('onion') || n.includes('brinjal')) return { from: 'from-purple-900/40', via: 'via-fuchsia-950/60', to: 'to-gray-950', accent: 'text-purple-500' };
        if (n.includes('rice') || n.includes('cabbage') || n.includes('peas')) return { from: 'from-emerald-900/40', via: 'via-green-950/60', to: 'to-gray-950', accent: 'text-emerald-500' };
        if (n.includes('mango') || n.includes('carrot')) return { from: 'from-orange-900/40', via: 'via-amber-950/60', to: 'to-gray-950', accent: 'text-orange-500' };
        if (n.includes('cotton')) return { from: 'from-sky-900/40', via: 'via-blue-950/60', to: 'to-gray-950', accent: 'text-sky-500' };
        if (n.includes('banana') || n.includes('corn')) return { from: 'from-yellow-900/40', via: 'via-yellow-950/60', to: 'to-gray-950', accent: 'text-yellow-500' };
        if (n.includes('chili')) return { from: 'from-red-900/40', via: 'via-red-950/60', to: 'to-gray-950', accent: 'text-red-500' };
        return { from: 'from-green-900/40', via: 'via-emerald-950/60', to: 'to-gray-950', accent: 'text-emerald-500' };
    };

    const theme = getCropColor(crop?.name);

    const specs = [
        { label: 'Moisture Content', value: listing.grade === 'A' ? '8-10%' : '12-14%' },
        { label: 'Color Score', value: 'High Vigor' },
        { label: 'Pesticide Residue', value: 'Zero (Tested)' },
        { label: 'Organic Matter', value: 'Rich' },
        { label: 'Packaging', value: '50kg Jute Bags' },
        { label: 'Origin', value: listing.location }
    ];

    const fakeReviews = [
        { name: 'Arun Kumar', rating: 5, text: `Excellent ${crop?.name}. The quality is exactly as described in the grade ${listing.grade} listing.`, date: '2 days ago' },
        { name: 'Rajesh V', rating: 4, text: `Good harvest. Very fresh and well-packed. Fast delivery arrangement.`, date: '1 week ago' },
        { name: 'Suresh Raina', rating: 5, text: `Verified business. The farmer is very professional and the produce is top-notch.`, date: '2 weeks ago' }
    ];

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 md:p-6 animate-in fade-in duration-300 overflow-hidden">
            {/* Dynamic Background */}
            <div className="absolute inset-0 overflow-hidden">
                {/* Blurred Image Layer */}
                <img
                    src={images[0]}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-x-0 inset-y-0 w-full h-full object-cover scale-110 blur-[80px] opacity-40 grayscale-[0.3] transition-all duration-1000"
                />
                {/* Gradient Overlay Layer */}
                <div className={`absolute inset-0 bg-gradient-to-br ${theme.from} ${theme.via} ${theme.to} opacity-90`}></div>
                {/* Animated Particles/Texture Mockup */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] mix-blend-overlay"></div>
            </div>

            <div className="bg-white w-full max-w-6xl h-[100dvh] md:h-[90vh] md:rounded-[48px] overflow-hidden flex flex-col md:flex-row relative animate-in slide-in-from-bottom-20 duration-500 shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/10">

                {/* Close/Back Button - Modern Uniform Style */}
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-6 left-6 z-20 w-12 h-12 bg-white/90 backdrop-blur-md text-gray-900 rounded-full flex items-center justify-center hover:bg-white transition-all shadow-xl group border border-gray-100"
                    title="Close"
                >
                    <i className="fas fa-arrow-left group-hover:-translate-x-1 transition-transform"></i>
                </button>

                {/* Wishlist Button - Detailed View */}
                {onToggleWishlist && (
                    <button
                        type="button"
                        onClick={(e) => onToggleWishlist(e, listing.id)}
                        className="absolute top-6 right-6 md:right-[52%] z-20 w-12 h-12 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-xl hover:bg-white hover:scale-110 transition-all border border-gray-100 group/heart"
                        title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                    >
                        <i className={`${isWishlisted ? 'fas text-red-500' : 'far text-gray-400'} fa-heart transition-colors group-hover/heart:text-red-500 text-lg`}></i>
                    </button>
                )}

                {/* Left: Image Carousel & Gallery */}
                <div className="w-full md:w-1/2 h-[40vh] md:h-full relative group">
                    <img
                        src={images[activeImageIndex]}
                        alt={crop?.name}
                        loading="eager" // First image should be eager
                        decoding="async"
                        className="w-full h-full object-cover transition-all duration-700"
                    />

                    {/* Navigation Arrows */}
                    <div className="absolute inset-0 flex items-center justify-between px-6 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            type="button"
                            title="Previous Image"
                            onClick={() => setActiveImageIndex(prev => (prev === 0 ? images.length - 1 : prev - 1))}
                            className="w-12 h-12 bg-white/20 backdrop-blur-md border border-white/30 rounded-full text-white flex items-center justify-center hover:bg-white/40"
                        >
                            <i className="fas fa-chevron-left"></i>
                        </button>
                        <button
                            type="button"
                            title="Next Image"
                            onClick={() => setActiveImageIndex(prev => (prev === images.length - 1 ? 0 : prev + 1))}
                            className="w-12 h-12 bg-white/20 backdrop-blur-md border border-white/30 rounded-full text-white flex items-center justify-center hover:bg-white/40"
                        >
                            <i className="fas fa-chevron-right"></i>
                        </button>
                    </div>

                    {/* Thumbnails */}
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3 px-6 pointer-events-none">
                        {images.map((img: string, idx: number) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => setActiveImageIndex(idx)}
                                className={`w-16 h-16 rounded-2xl border-2 pointer-events-auto cursor-pointer overflow-hidden transition-all ${idx === activeImageIndex ? 'border-emerald-500 scale-110 shadow-lg' : 'border-white/40 grayscale hover:grayscale-0'}`}
                                title={`View image ${idx + 1}`}
                            >
                                <img
                                    src={img}
                                    className="w-full h-full object-cover"
                                    alt={`Thumbnail ${idx + 1}`}
                                    loading="lazy"
                                    decoding="async"
                                />
                            </button>
                        ))}
                    </div>

                    {/* Verification Badge */}
                    <div className="absolute top-8 right-8">
                        <div className="bg-emerald-500 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl flex items-center gap-2">
                            <i className="fas fa-certificate text-lg animate-pulse"></i>
                            Verified Harvest
                        </div>
                    </div>
                </div>

                {/* Right: Content */}
                <div className="w-full md:w-1/2 flex-1 min-h-0 md:h-full flex flex-col bg-[#fafafa]">
                    <div className="flex-1 overflow-y-auto p-8 md:p-14 custom-scrollbar overscroll-contain">
                        {/* Breadcrumb / Category */}
                        <div className="flex items-center gap-3 mb-6">
                            <span className={`bg-white text-gray-900 border border-gray-100 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm`}>
                                {crop?.category || 'Grain'}
                            </span>
                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                Grade {listing.grade} High Quality
                            </span>
                        </div>

                        <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight leading-tight">
                            Premium {crop?.name} <span className={theme.accent}>Harvest</span>
                        </h1>

                        <div className="flex items-center gap-2 mb-8 text-amber-500">
                            {[1, 2, 3, 4, 5].map(s => (
                                <i key={s} className={`fas fa-star ${s <= 4 ? '' : 'text-gray-200'}`}></i>
                            ))}
                            <span className="text-gray-400 text-sm font-bold ml-2">(12 Reviews)</span>
                        </div>

                        {/* Pricing Board */}
                        <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm mb-10 flex flex-wrap items-center justify-between gap-6">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Price per Kg</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black text-gray-900">₹{listing.expectedPrice}</span>
                                    <span className="text-lg font-bold text-gray-400">/kg</span>
                                </div>
                            </div>
                            <div className="h-12 w-px bg-gray-100 hidden sm:block"></div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Total Available</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-gray-900">{listing.quantity}</span>
                                    <span className="text-lg font-bold text-gray-400">Kg</span>
                                </div>
                            </div>
                        </div>

                        {/* Details Tabs */}
                        <div className="space-y-8 mb-12 flex-grow">
                            <div className="flex gap-8 border-b border-gray-100 pb-2 overflow-x-auto no-scrollbar">
                                {[
                                    { id: 'desc', label: 'Description' },
                                    { id: 'specs', label: 'Specifications' },
                                    { id: 'reviews', label: 'Reviews (12)' }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`text-[11px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap pb-2 border-b-2 ${activeTab === tab.id ? `${theme.accent.replace('text-', 'text-').replace('text-', 'border-')} border-current font-black` : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {activeTab === 'desc' && (
                                <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                                    <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                        <i className={`fas fa-info-circle ${theme.accent}`}></i> AI Quality Summary
                                    </h4>
                                    <p className="text-gray-600 font-medium leading-relaxed mb-6 whitespace-pre-line text-lg">
                                        {listing.qualitySummary || `Experience the finest quality ${crop?.name} directly from the fertile lands of ${listing.location}. Grown using modern sustainable practices, this harvest is ideal for bulk procurement and retail transformation.`}
                                    </p>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-5 rounded-[24px] bg-white border border-gray-100 shadow-sm">
                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 text-center">Harvested On</p>
                                            <p className="text-xs font-black text-gray-800 text-center">{listing.harvestDate ? new Date(listing.harvestDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}</p>
                                        </div>
                                        {listing.saleDate ? (
                                            <div className="p-5 rounded-[24px] bg-emerald-50 border border-emerald-100 shadow-sm">
                                                <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1 text-center font-black">Available for Sale from</p>
                                                <p className="text-xs font-black text-emerald-900 text-center">{new Date(listing.saleDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                            </div>
                                        ) : (
                                            <div className="p-5 rounded-[24px] bg-white border border-gray-100 shadow-sm overflow-hidden relative">
                                                <div className="absolute top-0 right-0 p-2"><i className="fas fa-shield-check text-emerald-500 opacity-20"></i></div>
                                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 text-center">Quality Check</p>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowCertificate(true)}
                                                    className={`w-full text-xs font-black ${theme.accent.replace('text-', 'hover:text-')} ${theme.accent} underline block text-center`}
                                                >
                                                    View Certificate
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'specs' && (
                                <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                                    <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                        <i className={`fas fa-list-check ${theme.accent}`}></i> Technical Specifications
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {specs.map((spec, i) => (
                                            <div key={i} className="flex justify-between items-center p-4 rounded-2xl bg-white border border-gray-50">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{spec.label}</span>
                                                <span className="text-xs font-black text-gray-800">{spec.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'reviews' && (
                                <div className="animate-in fade-in slide-in-from-left-4 duration-500 space-y-4">
                                    <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.2em] mb-2">Authenticated Reviews</h4>
                                    {fakeReviews.map((review, i) => (
                                        <div key={i} className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <p className="text-sm font-black text-gray-800 mb-1">{review.name}</p>
                                                    <div className="flex text-amber-500 text-[10px] gap-0.5">
                                                        {[...Array(5)].map((_, idx) => (
                                                            <i key={idx} className={`fas fa-star ${idx < review.rating ? '' : 'text-gray-200'}`}></i>
                                                        ))}
                                                    </div>
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-400">{review.date}</span>
                                            </div>
                                            <p className="text-xs text-gray-600 font-medium leading-relaxed italic">"{review.text}"</p>
                                            <div className="mt-3 flex items-center gap-2">
                                                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[8px]"><i className="fas fa-check"></i></span>
                                                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Verified Purchase</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Farmer Profile Card - Fixed */}
                        <div className="bg-gray-900 rounded-[32px] p-6 text-white mb-10 group cursor-pointer hover:bg-gray-800 transition-all">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-2xl font-black border border-white/5">
                                        {listing.farmer?.name?.charAt(0) || 'F'}
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-black">{listing.farmer?.name || 'Progressive Farmer'}</h4>
                                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Verified Seller since 2024</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-1 text-amber-400 text-xs font-black">
                                        <i className="fas fa-star"></i> 4.9
                                    </div>
                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Rating</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/10 text-center">
                                <div>
                                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Crops</p>
                                    <p className="text-xs font-black">12</p>
                                </div>
                                <div>
                                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Delivered</p>
                                    <p className="text-xs font-black">450+ Kg</p>
                                </div>
                                <div>
                                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Location</p>
                                    <p className="text-xs font-black truncate px-1">{listing.location}</p>
                                </div>
                            </div>
                        </div>

                        {/* More from this Farmer - Improved Modern UI */}
                        {relatedListings && relatedListings.length > 0 && (
                            <div className="mb-6 animate-in slide-in-from-bottom duration-700 delay-200">
                                <div className="flex items-center justify-between mb-6 px-1">
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                        Live from {listing.farmer?.name?.split(' ')[0] || 'Farmer'}
                                    </h4>
                                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                                        {relatedListings.length} Available
                                    </span>
                                </div>

                                <div className="flex gap-4 overflow-x-auto pb-4 -mx-8 px-8 snap-x scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent hover:scrollbar-thumb-emerald-500 transition-colors">
                                    {relatedListings.map((relListing) => {
                                        const relCrop = relListing.crop || CROPS.find(c => c.id === relListing.cropId || c.name.toLowerCase() === relListing.crop?.name?.toLowerCase());
                                        return (
                                            <div
                                                key={relListing.id}
                                                className="min-w-[200px] md:min-w-[240px] snap-center bg-white rounded-[24px] p-3 shadow-lg shadow-gray-100 border border-gray-100 hover:scale-105 transition-all duration-300 cursor-pointer group"
                                                onClick={() => onListingClick && onListingClick(relListing)}
                                            >
                                                <div className="aspect-[4/3] rounded-[20px] overflow-hidden mb-3 relative">
                                                    <img
                                                        src={relListing.images?.[0] || 'https://images.unsplash.com/photo-1595855759920-7f2878cf6721?w=400&auto=format&fit=crop'}
                                                        alt={relCrop?.name}
                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                    />
                                                    <div className="absolute top-2 right-2 flex gap-1">
                                                        <span className="bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest text-emerald-600 shadow-sm">
                                                            Gr {relListing.grade}
                                                        </span>
                                                    </div>
                                                    <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest text-white flex items-center gap-1">
                                                        <i className="fas fa-clock"></i> Just Now
                                                    </div>
                                                </div>

                                                <div className="px-1">
                                                    <h5 className="font-black text-gray-900 text-lg tracking-tight mb-1">{relCrop?.name}</h5>
                                                    <div className="flex justify-between items-end">
                                                        <div>
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Price</p>
                                                            <p className="text-xl font-black text-gray-900">₹{relListing.expectedPrice}<span className="text-xs text-gray-400 font-bold">/kg</span></p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onAddToCart(relListing);
                                                            }}
                                                            className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center shadow-lg shadow-gray-200 hover:scale-110 active:scale-95 transition-all"
                                                        >
                                                            <i className="fas fa-plus"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                    </div>
                    {/* Actions */}
                    <div className="flex flex-row gap-3 p-4 md:p-8 border-t border-gray-100 bg-white z-10 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                        <button
                            type="button"
                            onClick={() => onAddToCart(listing)}
                            className="flex-1 h-14 md:h-16 rounded-2xl bg-white border-2 border-gray-200 font-black uppercase text-[9px] md:text-[10px] tracking-widest hover:border-emerald-500 transition-all text-gray-900 flex items-center justify-center gap-2 md:gap-3"
                        >
                            <i className="fas fa-shopping-cart text-base md:text-lg"></i>
                            <span className="hidden xs:inline">Add to Cart</span>
                            <span className="xs:hidden">Add</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => onBuyNow(listing)}
                            className="flex-3 h-14 md:h-16 rounded-2xl bg-gray-900 text-white font-black uppercase text-[9px] md:text-[10px] tracking-widest hover:bg-black shadow-xl shadow-gray-200 transition-all flex items-center justify-center gap-2 md:gap-3"
                        >
                            <i className="fas fa-bolt text-base md:text-lg"></i>
                            Instant Buy
                        </button>
                    </div>
                </div>
            </div>

            {/* Quality Certificate Modal Mockup */}
            {showCertificate && (
                <div className="fixed inset-0 z-[200] bg-gradient-to-br from-[#f8f9fa]/95 via-white/85 to-[#e9ecef]/95 backdrop-blur-md flex items-center justify-center p-6 animate-in zoom-in duration-300">
                    <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl relative overflow-hidden border-8 border-gray-50">
                        {/* Certificate Design */}
                        <div className="p-12 border-4 border-double border-blue-100 rounded-[32px] m-4 text-center relative">
                            <div className="absolute top-0 right-0 p-8 opacity-10"><i className="fas fa-stamp text-8xl text-blue-900"></i></div>

                            <div className="flex justify-center mb-8">
                                <div className="w-20 h-20 bg-blue-900 rounded-full flex items-center justify-center text-white text-3xl">
                                    <i className="fas fa-award"></i>
                                </div>
                            </div>

                            <h2 className="text-3xl font-black text-blue-900 uppercase tracking-widest mb-2">Certificate of Quality</h2>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mb-10">KisanSetu Agricultural Standards</p>

                            <div className="space-y-6 mb-12">
                                <p className="text-gray-500 font-medium">This document certifies that the harvest of</p>
                                <h3 className="text-4xl font-black text-gray-900">{crop?.name}</h3>
                                <p className="text-gray-500 font-medium">produced by <span className="text-gray-900 font-black">{listing.farmer?.name || 'Progressive Farmer'}</span></p>
                                <p className="text-sm text-gray-500 px-12 leading-relaxed">
                                    has been inspected and verified against KisanSetu Grade {listing.grade} standards for
                                    purity, freshness, and sustainable farming practices.
                                </p>
                            </div>

                            <div className="flex justify-between items-end pt-12 border-t border-gray-100">
                                <div className="text-left">
                                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-2">ID: KS-{listing.id.slice(-8).toUpperCase()}</p>
                                    <p className="text-xs font-black text-gray-900 italic font-serif">KisanSetu Audit Team</p>
                                    <p className="text-[9px] font-bold text-gray-400">Digital Verification Stamp</p>
                                </div>
                                <div className="w-24 h-24 bg-gray-50 rounded-xl flex items-center justify-center text-gray-200 border-2 border-dashed border-gray-100">
                                    <i className="fas fa-qrcode text-4xl"></i>
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            title="Close Certificate"
                            onClick={() => setShowCertificate(false)}
                            className="absolute top-8 right-8 w-12 h-12 bg-gray-100 text-gray-400 rounded-full hover:bg-gray-200 transition-colors"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
