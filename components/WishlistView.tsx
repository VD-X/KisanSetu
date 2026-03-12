import React, { useState, useEffect } from 'react';
import { Listing } from '../types';
import { default as api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface WishlistViewProps {
    onNavigate: (tab: string) => void;
    onAddToCart: (listing: Listing) => void;
    setDetailListing: (listing: Listing) => void;
    onRemove?: (listingId: string) => void;
}

const WishlistView: React.FC<WishlistViewProps> = ({
    onNavigate,
    onAddToCart,
    setDetailListing,
    onRemove
}) => {
    const [items, setItems] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const { success, error, info } = useToast();

    useEffect(() => {
        loadWishlist();
    }, []);

    const loadWishlist = async () => {
        try {
            setLoading(true);
            const data = await api.wishlist.getAll();
            if (Array.isArray(data)) {
                setItems(data);
            } else {
                setItems([]);
            }
        } catch (err) {
            console.error('Failed to load wishlist', err);
            // error('Failed to load wishlist');
        } finally {
            setLoading(false);
        }
    };

    const removeFromWishlist = async (e: React.MouseEvent, listingId: string) => {
        e.stopPropagation();
        try {
            // Optimistic update
            const newItems = items.filter(item => item.id !== listingId);
            setItems(newItems);

            await api.wishlist.remove(listingId);
            if (onRemove) {
                onRemove(listingId);
            }
            info('Removed from wishlist');
        } catch (err) {
            console.error('Failed to remove from wishlist', err);
            error('Failed to remove item');
            loadWishlist(); // Revert
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 min-h-[50vh]">
                <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
                <p className="text-gray-400 font-bold">Loading your favorites...</p>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center min-h-[50vh]">
                <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6">
                    <i className="far fa-heart text-red-300 text-4xl"></i>
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Your wishlist is empty</h3>
                <p className="text-gray-500 mb-8 max-w-md">
                    Save items you want to buy later by clicking the heart icon on any listing.
                </p>
                <button
                    onClick={() => onNavigate('marketplace')}
                    className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 hover:scale-105 transition-all"
                >
                    Browse Marketplace
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-gray-900">My Wishlist <span className="text-gray-400 font-medium ml-2">({items.length})</span></h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((listing) => (
                    <div key={listing.id} className="bg-white rounded-[24px] p-3 shadow-sm hover:shadow-lg border border-gray-100 transition-all group relative">
                        <div
                            className="relative aspect-[3/2] rounded-[20px] overflow-hidden mb-4 cursor-pointer"
                            onClick={() => setDetailListing(listing)}
                        >
                            <img src={listing.images[0]} alt="Crop" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />

                            <div className="absolute inset-0 bg-black/20 md:bg-gradient-to-t md:from-black/60 md:via-black/20 md:to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-transform">
                                    View Details
                                </span>
                            </div>

                            {/* Remove Button */}
                            <button
                                onClick={(e) => removeFromWishlist(e, listing.id)}
                                className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-md hover:bg-red-50 hover:text-red-500 transition-all text-red-500 group/remove z-10"
                                title="Remove from wishlist"
                            >
                                <i className="fas fa-trash-alt text-xs group-hover/remove:scale-110 transition-transform"></i>
                            </button>

                            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg text-white text-[10px] font-bold uppercase tracking-wider">
                                <i className="fas fa-map-marker-alt mr-1"></i> {listing.location}
                            </div>
                        </div>

                        <div className="px-2 pb-2">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-black text-gray-900 text-lg leading-tight mb-1">{listing.crop?.name || 'Crop'}</h3>
                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded">
                                        Grade {listing.grade}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black text-gray-900 leading-none">₹{listing.expectedPrice}</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">per kg</p>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => onAddToCart(listing)}
                                    className="flex-1 bg-gray-900 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-gray-200"
                                >
                                    Add to Cart
                                </button>

                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WishlistView;
