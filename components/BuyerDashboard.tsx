import React, { useState, useEffect, useRef } from 'react';
import { CROPS, INDIAN_STATES } from '../constants';
import { Listing, UserRole, Language, User, Gender } from '../types';
import { geminiService } from '../services/geminiService';
import { cartAPI, listingAPI, negotiationAPI, default as api } from '../services/api';
import ChatNegotiation from './ChatNegotiation';
import { socketService } from '../services/socketService';
import { useToast } from '../context/ToastContext';
import { useRoleTranslate } from '../hooks/useRoleTranslate';
import ModernDropdown from './common/ModernDropdown';
// ... imports
import OrdersView from './OrdersView';
import CartView from './CartView';
import DeliveryTimeline from './DeliveryTimeline';
import { PromoBanner } from './PromoBanner';
import { CategoryRail } from './CategoryRail';
import { ListingDetailModal } from './ListingDetailModal';
import WishlistView from './WishlistView';
import LocationPicker from './LocationPicker';
import BuyerPaymentsView from './BuyerPaymentsView';
import { useNavigate } from 'react-router-dom';
import { compressImage } from '../utils/imageUtils';


const getAnimDelayClass = (index: number, baseDelay: number = 0) => {
  const delays = ['delay-0', 'delay-75', 'delay-100', 'delay-150', 'delay-200', 'delay-300', 'delay-500', 'delay-700', 'delay-1000'];
  return delays[Math.min(index, delays.length - 1)];
};

interface BuyerDashboardProps {
  activeTab: string;
  user: User;
  onUpdateProfile: (updates: Partial<User>) => void;
  deliveries: any[];
  onRateTransporter: (deliveryId: string, rating: number) => void;
  onNavigate: (tab: string) => void;
  initialCheckout?: boolean;
  onResetAutoCheckout?: () => void;
}

const BuyerDashboard: React.FC<BuyerDashboardProps> = React.memo(({
  activeTab,
  user,
  onUpdateProfile,
  deliveries,
  onRateTransporter,
  onNavigate,
  initialCheckout = false,
  onResetAutoCheckout,
}) => {
  const { t } = useRoleTranslate();
  const { success, error, info } = useToast();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCropFilter, setSelectedCropFilter] = useState<string | null>(null);


  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [selectedDeliveryToRate, setSelectedDeliveryToRate] = useState<any>(null);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedStars, setSelectedStars] = useState(0);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [quantityInput, setQuantityInput] = useState('50');


  const [autoCheckout, setAutoCheckout] = useState(false);
  const [detailListing, setDetailListing] = useState<Listing | null>(null);
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'recent' | 'quantity_desc'>('recent');
  const [confirmationView, setConfirmationView] = useState(false);
  const [pendingAction, setPendingAction] = useState<'cart' | 'buy_now' | null>(null);
  const [differentFarmerConflict, setDifferentFarmerConflict] = useState<{ listing: Listing; quantity: number; action: 'cart' | 'buy_now' } | null>(null);

  // Negotiate State
  const [negotiateListing, setNegotiateListing] = useState<Listing | null>(null);
  const [negotiateOffer, setNegotiateOffer] = useState(''); // per-kg price
  const [negotiateQty, setNegotiateQty] = useState('');
  const [negotiateLoading, setNegotiateLoading] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [negotiateMode, setNegotiateMode] = useState<'perkg' | 'total'>('perkg');
  const [negotiateTotal, setNegotiateTotal] = useState(''); // total price
  const activeTabRef = useRef(activeTab);

  // Wishlist State
  // Wishlist State (API based)
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [loadingWishlist, setLoadingWishlist] = useState(false);

  // Load wishlist on mount (graceful when backend is unavailable)
  useEffect(() => {
    if (user.id) {
      setLoadingWishlist(true);
      api.wishlist.getAll()
        .then(items => {
          if (Array.isArray(items)) {
            setWishlist(items.map((item: any) => item.wishlistItemId ? item.id : item.listingId || item.id));
          }
          setLoadingWishlist(false);
        })
        .catch(() => {
          setWishlist([]);
          setLoadingWishlist(false);
        });
    }
  }, [user.id]);

  const toggleWishlist = async (e: React.MouseEvent, listingId: string) => {
    e.stopPropagation();

    // Optimistic UI update
    const isRemoving = wishlist.includes(listingId);
    setWishlist(prev =>
      isRemoving
        ? prev.filter(id => id !== listingId)
        : [...prev, listingId]
    );

    try {
      if (isRemoving) {
        await api.wishlist.remove(listingId);
        info('Removed from wishlist');
      } else {
        await api.wishlist.add(listingId);
        success('Added to wishlist');
      }
    } catch (err) {
      console.error("Wishlist action failed", err);
      // Revert on error
      setWishlist(prev =>
        isRemoving
          ? [...prev, listingId]
          : prev.filter(id => id !== listingId)
      );
    }
  };

  /* New business profile state */
  const [tempProfile, setTempProfile] = useState({
    name: user.name,
    gender: user.gender || Gender.MALE,
    profilePhoto: user.profilePhoto || '',
    phone: user.phone || '',
    email: user.email || '',
    address: user.location?.address || '',
    village: user.location?.village || '',
    mandal: (user.location as any)?.mandal || '',
    district: user.location?.district || '',
    state: user.location?.state || '',
    pincode: user.location?.pincode || '',
    latitude: user.location?.latitude || null,
    longitude: user.location?.longitude || null,
    gstin: '29ABCDE1234F1Z5',
    businessType: 'Wholesale Trader',
    annualVolume: '500 Tons'
  });

  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);

  const getAnimDelayClass = (idx: number, stepMs: number) => {
    const ms = Math.min(1500, idx * stepMs);
    return `anim-delay-${ms}`;
  };

  useEffect(() => {
    setTempProfile({
      name: user.name,
      gender: user.gender || Gender.MALE,
      profilePhoto: user.profilePhoto || '',
      phone: user.phone || '',
      email: user.email || '',
      address: user.location?.address || '',
      village: user.location?.village || '',
      mandal: (user.location as any)?.mandal || '',
      district: user.location?.district || '',
      state: user.location?.state || '',
      pincode: user.location?.pincode || '',
      latitude: user.location?.latitude || null,
      longitude: user.location?.longitude || null,
      gstin: '29ABCDE1234F1Z5',
      businessType: 'Wholesale Trader',
      annualVolume: '500 Tons'
    });
    loadCartCount();
    loadListings();
  }, [user]);



  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    socketService.connect();
    if (user?.id) {
      socketService.joinUserRoom(user.id);
    }

    const handleNegotiationNotify = (data: any) => {
      if (data.type === 'ACCEPTED') {
        success(`Offer Accepted: ${data.message}`);
        geminiService.speak(`Great news! Your offer has been accepted. You have 2 hours to complete the checkout.`);
      } else {
        info(`Negotiation Update: ${data.message}`);
      }
      // Refresh listings or cart count if needed
      loadListings();
    };

    socketService.onNegotiationNotification(handleNegotiationNotify);

    return () => {
      if (user?.id) {
        socketService.leaveUserRoom(user.id);
      }
      // Note: socketService.onNegotiationNotification returns a cleanup function 
      // but we use the helper here
    };
  }, [user?.id]);

  /* New Filter State */
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterState, setFilterState] = useState<string>('');
  const [filterRadius, setFilterRadius] = useState<number>(500);
  const [appliedFilters, setAppliedFilters] = useState({ state: '', radius: 500 });

  /* Updated Load Listings with Filters */
  const loadListings = async () => {
    try {
      setLoadingListings(true);
      const params: any = {};

      if (appliedFilters.state) params.state = appliedFilters.state;
      if (appliedFilters.radius < 500 && user.location?.latitude && user.location?.longitude) {
        params.radius = appliedFilters.radius.toString();
        params.latitude = user.location.latitude.toString();
        params.longitude = user.location.longitude.toString();
      }

      const data = await listingAPI.getAll(params);
      setListings(data.listings || []);
    } catch {
      setListings([]);
    } finally {
      setLoadingListings(false);
    }
  };

  const loadCartCount = async () => {
    try {
      const response = await cartAPI.get();
      setCartItemCount(response.cart?.items?.length || 0);
    } catch {
      setCartItemCount(0);
    }
  };

  useEffect(() => {
    loadListings();
  }, [appliedFilters]); // Reload when filters change

  const handleApplyFilters = () => {
    setAppliedFilters({ state: filterState, radius: filterRadius });
    setShowFilterModal(false);
    geminiService.speak("Filters applied.");
  };

  const handleClearFilters = () => {
    setFilterState('');
    setFilterRadius(500);
    setAppliedFilters({ state: '', radius: 500 });
    setShowFilterModal(false);
    geminiService.speak("Filters cleared.");
  };



  const handleAddToCartClick = (listing: Listing) => {
    setSelectedListing(listing);
    setPendingAction('cart');
    const suggested = Math.max(1, Math.min(5, Math.floor(listing.quantity || 1)));
    setQuantityInput(String(suggested));
    setConfirmationView(false);
    setShowQuantityModal(true);
  };



  const handleProceedToAction = (type: 'cart' | 'buy_now') => {
    const quantity = parseFloat(quantityInput);
    if (isNaN(quantity) || quantity <= 0) {
      error('Please enter a valid quantity');
      return;
    }
    if (selectedListing && quantity > selectedListing.quantity) {
      error(`Only ${selectedListing.quantity} kg available`);
      return;
    }
    setPendingAction(type);
    setConfirmationView(true);
  };

  const handleAddToCart = async (action: 'cart' | 'buy_now') => {
    if (!selectedListing) return;

    const quantity = parseFloat(quantityInput);
    if (isNaN(quantity) || quantity <= 0) {
      error('Please enter a valid quantity');
      return;
    }

    if (quantity > selectedListing.quantity) {
      error(`Only ${selectedListing.quantity} kg available`);
      return;
    }

    try {
      setAddingToCart(selectedListing.id);


      await cartAPI.add(selectedListing.id, quantity);
      await loadCartCount();
      setShowQuantityModal(false);
      setSelectedListing(null);

      if (action === 'buy_now') {
        setAutoCheckout(true);
        onNavigate('cart');
        geminiService.speak("Proceeding to checkout.");
      } else {
        geminiService.speak(`${quantity} kg added to cart successfully!`);
        success(`${quantity} kg added to cart. Tap the cart icon to checkout.`);
      }

    } catch (err: any) {
      // Handle same-farmer conflict
      if (err.body?.code === 'DIFFERENT_FARMER' || (err.message && err.message.includes('another farmer'))) {
        setShowQuantityModal(false);
        setDifferentFarmerConflict({
          listing: selectedListing,
          quantity,
          action
        });
        return;
      }
      error(err.message || 'Failed to add to cart');
    } finally {
      setAddingToCart(null);
    }
  };

  const handleNegotiationCheckout = async (data: { listingId: string, quantity: number, price: number, negotiationId?: string }) => {
    try {
      setAddingToCart(data.listingId);
      await cartAPI.add(data.listingId, data.quantity, data.negotiationId || activeChatId || undefined);
      await loadCartCount();
      setActiveChatId(null);
      setAutoCheckout(true);
      onNavigate('cart');
      geminiService.speak("Negotiated item added to cart. Proceeding to checkout.");
    } catch (err: any) {
      error(err.message || 'Failed to add negotiated item to cart');
    } finally {
      setAddingToCart(null);
    }
  };

  const handleSaveProfile = () => {
    onUpdateProfile({
      name: tempProfile.name,
      phone: tempProfile.phone,
      email: tempProfile.email,
      gender: tempProfile.gender,
      profilePhoto: tempProfile.profilePhoto,
      location: {
        address: tempProfile.address,
        village: tempProfile.village,
        district: tempProfile.district,
        state: tempProfile.state,
        pincode: tempProfile.pincode,
        latitude: tempProfile.latitude,
        longitude: tempProfile.longitude
      }
    });
    setIsEditingProfile(false);
    geminiService.speak("Profile updated successfully!");
    success("Profile updated successfully");
  };



  /* New Filter Logic */
  const filteredListings = listings.filter(l => {
    // Favor the crop data provided by the API
    const cropFromApi = l.crop;
    const cropFromConstants = CROPS.find(c => c.id === l.cropId || c.name.toLowerCase() === l.crop?.name?.toLowerCase());

    const crop = cropFromApi || cropFromConstants;
    if (!crop) return false;

    const cropName = crop.name.toLowerCase();
    const matchesSearch = cropName.includes(searchQuery.toLowerCase()) ||
      l.location.toLowerCase().includes(searchQuery.toLowerCase());

    // Category Rail Filter
    const matchesCategory = !selectedCropFilter || crop.category === selectedCropFilter;

    const isCategory = ['Vegetable', 'Fruit', 'Grain', 'Commercial', 'Oilseed', 'Spices', 'Flowers', 'Cash Crop'].includes(selectedCropFilter || '');
    const matchesRail = !selectedCropFilter || (isCategory ? crop.category === selectedCropFilter : (l.cropId === selectedCropFilter || crop.name === selectedCropFilter));

    return matchesSearch && matchesRail;
  }).sort((a, b) => {

    if (sortBy === 'price_asc') return a.expectedPrice - b.expectedPrice;
    if (sortBy === 'price_desc') return b.expectedPrice - a.expectedPrice;
    if (sortBy === 'quantity_desc') return b.quantity - a.quantity;
    return new Date(b.harvestDate).getTime() - new Date(a.harvestDate).getTime();
  });

  const submitRating = () => {
    if (selectedDeliveryToRate && selectedStars > 0) {
      onRateTransporter(selectedDeliveryToRate.id, selectedStars);
      setRatingModalOpen(false);
      setSelectedStars(0);
      geminiService.speak("Rating submitted. Thank you for your feedback.");
    }
  };

  const renderTracking = (status: string) => {
    const steps = [
      { label: 'Accepted', status: 'PENDING', icon: 'fa-clipboard-check' },
      { label: 'Picked', status: 'PICKED_UP', icon: 'fa-box-open' },
      { label: 'Transit', status: 'IN_TRANSIT', icon: 'fa-truck-fast' },
      { label: 'Arrived', status: 'DELIVERED', icon: 'fa-check-circle' }
    ];
    const currentStepIndex = steps.findIndex(s => s.status === status);
    const progressWidthClass = ['w-0', 'w-0', 'w-1/3', 'w-2/3', 'w-full'][
      Math.min(steps.length, Math.max(0, currentStepIndex + 1))
    ];

    return (
      <div className="relative pt-4 pb-2">
        {/* Progress Bar Background */}
        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -translate-y-1/2 z-0 rounded-full"></div>
        {/* Active Progress Bar */}
        <div
          className={`absolute top-1/2 left-0 h-1 bg-blue-500 -translate-y-1/2 z-0 rounded-full transition-all duration-1000 ${progressWidthClass}`}
        ></div>

        <div className="relative z-10 flex justify-between w-full">
          {steps.map((step, idx) => {
            const isCompleted = idx <= currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <div key={idx} className="flex flex-col items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] transition-all duration-500 ${isCompleted ? 'bg-blue-600 text-white shadow-lg scale-100' : 'bg-white border-2 border-gray-100 text-gray-300'
                  }`}>
                  <i className={`fas ${step.icon} ${isCurrent ? 'animate-bounce' : ''}`}></i>
                </div>
                <span className={`text-[8px] font-black uppercase tracking-widest ${isCompleted ? 'text-blue-600' : 'text-gray-300'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderActiveOrders = () => {
    const activeOrders = deliveries.filter(d => d.buyer === user.name && d.status !== 'DELIVERED');

    return (
      <div className="space-y-6 animate-in slide-in-from-bottom duration-500 pb-20">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Live Deliveries</h3>
          <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
            {activeOrders.length} In Transit
          </span>
        </div>

        {activeOrders.length === 0 ? (
          <div className="bg-white p-12 rounded-[32px] border-2 border-dashed border-gray-100 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 text-2xl mx-auto mb-4">
              <i className="fas fa-truck-fast"></i>
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No active deliveries</p>
          </div>
        ) : (
          activeOrders.map(order => (
            <div key={order.id} className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-xl">
                    {order.crop === 'Tomato' ? '🍅' : order.crop === 'Wheat' ? '🌾' : '📦'}
                  </div>
                  <div>
                    <h4 className="font-black text-lg text-gray-900">{order.crop} Order</h4>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID: #{order.id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${order.status === 'IN_TRANSIT' ? 'bg-blue-600 text-white shadow-lg' :
                    order.status === 'PICKED_UP' ? 'bg-amber-500 text-white' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                    {order.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Tracking UI */}
              <div className="mt-4">
                <DeliveryTimeline currentStatus={order.status} role="BUYER" />
              </div>

              <div className="mt-6 pt-6 border-t border-gray-50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <i className="fas fa-truck-front text-gray-400 text-xs"></i>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Transporter</p>
                    <p className="text-xs font-bold text-gray-900">{order.transporter || 'Assigning...'}</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/tracking/${order.id}`)}
                  className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline"
                >
                  View Map
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  const renderSearch = () => (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24">
      {/* Quick Commerce Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i className="fas fa-search text-gray-400 group-focus-within:text-green-500 transition-colors"></i>
            </div>
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 border-none rounded-xl bg-gray-100 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:bg-white transition-all shadow-sm"
            />
            <button
              type="button"
              title="Voice Search"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              <i className="fas fa-microphone text-xs"></i>
            </button>
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilterModal(true)}
            className={`p-2.5 rounded-xl border transition-all relative ${appliedFilters.state || appliedFilters.radius < 500
              ? 'bg-green-50 border-green-200 text-green-600'
              : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
          >
            <i className="fas fa-sliders-h"></i>
            {(appliedFilters.state || appliedFilters.radius < 500) && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full"></span>
            )}
          </button>

          {/* Cart Button */}
          <button
            type="button"
            title="Go to Cart"
            onClick={() => onNavigate('cart')}
            className="buyer-cart-btn relative flex items-center justify-center w-11 h-11 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:scale-105 active:scale-95 transition-all group"
          >
            <i className="fas fa-shopping-basket text-gray-700 text-lg group-hover:text-emerald-600 transition-colors"></i>
            {cartItemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-sm border-2 border-white">
                {cartItemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Categories & Promo */}
      <div className="animate-in slide-in-from-top-10 duration-700 delay-100">
        <CategoryRail selected={selectedCropFilter} onSelect={setSelectedCropFilter} />
        <PromoBanner />
      </div>

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-gray-900">Filter Listings</h3>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              {/* State Filter */}
              <div className="mb-6">
                <ModernDropdown
                  label="State"
                  value={filterState}
                  options={[
                    { value: '', label: 'All States', icon: 'fas fa-map' },
                    ...INDIAN_STATES.map(s => ({
                      value: s,
                      label: s,
                      icon: 'fas fa-location-dot'
                    }))
                  ]}
                  onChange={(val) => setFilterState(val)}
                  placeholder="Select a State"
                  searchable={true}
                  colorScheme="green"
                />
              </div>

              {/* Radius Filter */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-bold text-gray-700">Distance Radius</label>
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                    {filterRadius >= 500 ? 'Anywhere' : `${filterRadius} km`}
                  </span>
                </div>

                {(!user.location || !user.location.latitude) ? (
                  <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3 flex gap-3 items-start">
                    <i className="fas fa-exclamation-triangle text-yellow-500 mt-1"></i>
                    <p className="text-xs text-yellow-700">
                      Please update your location in profile to use distance filtering.
                    </p>
                  </div>
                ) : (
                  <input
                    type="range"
                    min="10"
                    max="500"
                    step="10"
                    value={filterRadius}
                    onChange={(e) => setFilterRadius(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                  />
                )}
                <div className="flex justify-between text-xs text-gray-400 mt-2 font-medium">
                  <span>10 km</span>
                  <span>500+ km</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleClearFilters}
                  className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Clear All
                </button>
                <button
                  onClick={handleApplyFilters}
                  className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-bold shadow-lg shadow-gray-200 hover:bg-gray-800 active:scale-95 transition-all"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Sort UI */}
      <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Sort By:</span>
        {[
          { id: 'recent', label: 'Freshness', icon: 'fa-leaf' },
          { id: 'price_asc', label: 'Lowest Price', icon: 'fa-arrow-down-wide-short' },
          { id: 'price_desc', label: 'Highest Price', icon: 'fa-arrow-up-wide-short' },
          { id: 'quantity_desc', label: 'Bulk Quantity', icon: 'fa-boxes-stacked' }
        ].map(sort => (
          <button
            key={sort.id}
            onClick={() => setSortBy(sort.id as any)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${sortBy === sort.id
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
              : 'bg-white text-gray-400 border border-gray-100 hover:border-blue-200'
              }`}
          >
            <i className={`fas ${sort.icon}`}></i>
            {sort.label}
          </button>
        ))}
      </div>

      {
        loadingListings ? (
          <div className="flex flex-col items-center justify-center p-20 bg-white rounded-[40px] border-2 border-dashed border-gray-100 italic text-gray-400">
            <i className="fas fa-spinner fa-spin text-4xl mb-4"></i>
            <p className="font-black uppercase tracking-widest text-[10px]">Fetching fresh harvests...</p>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="bg-white p-20 rounded-[40px] border-2 border-dashed border-gray-100 text-center">
            <i className="fas fa-search text-gray-200 text-5xl mb-4"></i>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No matching harvests found</p>
          </div>
        ) : selectedCropFilter ? (
          /* Focused Category View: Clean Grid */
          <div className="animate-in fade-in duration-700">
            <div className="flex items-center gap-4 mb-8">
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                {selectedCropFilter}s <span className="text-gray-400 font-medium ml-2">({filteredListings.length})</span>
              </h3>
              <div className="h-px flex-grow bg-gradient-to-r from-gray-100 to-transparent"></div>
              <button
                type="button"
                onClick={() => setSelectedCropFilter(null)}
                className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline"
              >
                Back to All Categories
              </button>
            </div>

            {/* Focused Grid with Horizontal Emphasis */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
              {filteredListings.map((listing, idx) => {
                const crop = listing.crop || CROPS.find(c => c.id === listing.cropId || c.name.toLowerCase() === listing.crop?.name?.toLowerCase());
                return (
                  <div key={listing.id} className={`bg-white rounded-[24px] md:rounded-[40px] p-2 md:p-3 shadow-sm md:shadow-lg border border-gray-100 hover:shadow-xl md:hover:shadow-2xl md:hover:shadow-emerald-100/50 hover:border-green-100 md:hover:border-emerald-200 transition-all duration-500 group animate-in slide-in-from-bottom ${getAnimDelayClass(idx, 100)}`}>
                    <div
                      className="relative aspect-square md:aspect-[3/2] rounded-[20px] md:rounded-[32px] overflow-hidden mb-2 md:mb-4 cursor-pointer"
                      onClick={() => setDetailListing(listing)}
                    >
                      <img src={listing.images[0]} alt="Crop" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-black/20 md:bg-gradient-to-t md:from-black/60 md:via-black/20 md:to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="bg-white/90 md:bg-white/95 backdrop-blur-md px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-transform">
                          View Details
                        </span>
                      </div>

                      {/* Top Badges */}
                      <div className="absolute top-4 md:top-3 left-4 md:left-3 flex gap-2">
                        <span className="bg-green-500 md:bg-emerald-500 text-white px-2 md:px-2.5 py-1 md:py-1.5 rounded-md md:rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm md:shadow-lg flex items-center gap-1 md:gap-1.5 md:backdrop-blur-sm">
                          <i className="fas fa-check-circle"></i> Verified
                        </span>
                      </div>

                      <div className="absolute bottom-4 md:bottom-3 left-4 md:left-3 bg-black/40 md:bg-black/60 backdrop-blur-md py-1.5 px-3 rounded-xl text-white border border-white/10 md:border-white/20 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 hidden md:flex">
                        <i className="fas fa-map-marker-alt opacity-70"></i>
                        {listing.location}
                      </div>
                    </div>

                    <div className="px-3 pt-2 pb-4 md:hidden">
                      <h4 className="text-sm font-black text-gray-900 mb-2 truncate">{crop?.name}</h4>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-lg font-black text-gray-900 leading-none">₹{listing.expectedPrice}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{listing.quantity} kg</p>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => { setNegotiateListing(listing); setNegotiateOffer(String(listing.expectedPrice)); setNegotiateQty(String(Math.min(5, listing.quantity))); }}
                            className="bg-blue-50 text-blue-600 border border-blue-200 w-8 h-8 rounded-lg flex items-center justify-center"
                          >
                            <i className="fas fa-handshake text-xs"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-12 pb-24">
            {
              (Object.entries(
                filteredListings.reduce((acc, l) => {
                  const crop = l.crop || CROPS.find(c => c.id === l.cropId || c.name.toLowerCase() === l.crop?.name?.toLowerCase());
                  const cat = crop?.category || 'Other';
                  if (!acc[cat]) acc[cat] = [];
                  acc[cat].push(l);
                  return acc;
                }, {} as Record<string, Listing[]>)
              ) as [string, Listing[]][]).map(([category, items], catIdx) => (
                <div key={category} className={`animate-in slide-in-from-bottom-10 duration-700 delay-${catIdx * 150}`}>

                  {/* Playful Section Header */}
                  <div className="flex items-center justify-between mb-6 px-1">
                    <div className="relative">
                      <div className="absolute -left-2 -top-2 w-16 h-16 bg-lime-200/50 rounded-full blur-xl"></div>
                      <h3 className="relative text-xl font-black text-gray-900 tracking-tight uppercase">{category}s</h3>
                    </div>
                    <button
                      onClick={() => setSelectedCropFilter(category)}
                      className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700"
                    >
                      See All <i className="fas fa-chevron-right ml-1"></i>
                    </button>
                  </div>

                  {/* Vertical Product Cards Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                    {items.slice(0, 8).map((listing, idx) => {
                      const crop = listing.crop || CROPS.find(c => c.id === listing.cropId || c.name.toLowerCase() === listing.crop?.name?.toLowerCase());
                      return (
                        <div key={listing.id} className={`bg-white rounded-[24px] md:rounded-[40px] p-2 md:p-3 shadow-sm md:shadow-lg border border-gray-100 hover:shadow-xl md:hover:shadow-2xl md:hover:shadow-emerald-100/50 hover:border-green-100 md:hover:border-emerald-200 transition-all duration-500 group animate-in slide-in-from-bottom ${getAnimDelayClass(idx, 100)}`}>
                          <div
                            className="relative aspect-square md:aspect-[3/2] rounded-[20px] md:rounded-[32px] overflow-hidden mb-2 md:mb-4 cursor-pointer"
                            onClick={() => setDetailListing(listing)}
                          >
                            <img src={listing.images[0]} alt="Crop" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            <div className="absolute inset-0 bg-black/20 md:bg-gradient-to-t md:from-black/60 md:via-black/20 md:to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="bg-white/90 md:bg-white/95 backdrop-blur-md px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-transform">
                                View Details
                              </span>
                            </div>

                            {/* Top Badges */}
                            <div className="absolute top-4 md:top-3 left-4 md:left-3 flex gap-2">
                              <span className="bg-green-500 md:bg-emerald-500 text-white px-2 md:px-2.5 py-1 md:py-1.5 rounded-md md:rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm md:shadow-lg flex items-center gap-1 md:gap-1.5 md:backdrop-blur-sm">
                                <i className="fas fa-check-circle"></i> Verified
                              </span>
                              {listing.grade === 'A' && (
                                <span className="hidden md:inline-flex bg-gradient-to-r from-amber-400 to-orange-500 text-white px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg">
                                  Premium
                                </span>
                              )}
                            </div>

                            {/* Save Button - Desktop Only */}
                            <button
                              type="button"
                              title={wishlist.includes(listing.id) ? "Remove from wishlist" : "Add to wishlist"}
                              aria-label={wishlist.includes(listing.id) ? "Remove from wishlist" : "Add to wishlist"}
                              onClick={(e) => toggleWishlist(e, listing.id)}
                              className="hidden md:flex absolute top-3 right-3 w-9 h-9 bg-white/90 backdrop-blur-md rounded-full items-center justify-center shadow-lg hover:bg-white hover:scale-110 transition-all group/save"
                            >
                              <i className={`${wishlist.includes(listing.id) ? 'fas text-red-500' : 'far text-gray-600'} fa-heart group-hover/save:text-red-500 transition-all text-sm`}></i>
                            </button>

                            {/* Grade Badge - Mobile Only */}
                            <div className="md:hidden absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                              Grade {listing.grade}
                            </div>

                            {/* Location Badge - Desktop */}
                            <div className="absolute bottom-4 md:bottom-3 left-4 md:left-3 bg-black/40 md:bg-black/60 backdrop-blur-md py-1.5 px-3 rounded-xl text-white border border-white/10 md:border-white/20 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 hidden md:flex">
                              <i className="fas fa-map-marker-alt opacity-70"></i>
                              {listing.location}
                            </div>
                          </div>

                          {/* MOBILE VIEW CONTENT (< md) */}
                          <div className="px-3 pt-2 pb-4 md:hidden">
                            <h4 className="text-sm font-black text-gray-900 mb-2 truncate">{crop?.name}</h4>
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-lg font-black text-gray-900 leading-none">₹{listing.expectedPrice}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{listing.quantity} kg left</p>
                              </div>
                              <div className="flex gap-1.5">
                                <button
                                  type="button"
                                  title="Negotiate"
                                  aria-label="Negotiate"
                                  onClick={() => { setNegotiateListing(listing); setNegotiateOffer(String(listing.expectedPrice)); setNegotiateQty(String(Math.min(5, listing.quantity))); }}
                                  className="bg-blue-50 text-blue-600 border border-blue-200 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all active:scale-95"
                                >
                                  <i className="fas fa-handshake text-xs"></i>
                                </button>
                                <button
                                  type="button"
                                  title="Add to cart"
                                  aria-label="Add to cart"
                                  onClick={() => handleAddToCartClick(listing)}
                                  className="bg-emerald-50 text-emerald-600 border border-emerald-200 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all active:scale-95"
                                >
                                  <i className="fas fa-plus text-xs"></i>
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* DESKTOP VIEW CONTENT (>= md) - SIMPLIFIED */}
                          <div className="hidden md:block px-5 pt-3 pb-5">
                            {/* Header: Name & Grade */}
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex-1">
                                <h4 className="text-xl font-black text-gray-900 tracking-tight leading-tight mb-1">{crop?.name}</h4>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded">
                                    <i className="fas fa-certificate"></i> FSSAI
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded">
                                    <i className="fas fa-leaf"></i> Organic
                                  </span>
                                </div>
                              </div>
                              <div className="text-right ml-2">
                                <span className="bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-700 border-2 border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm">
                                  Grade {listing.grade}
                                </span>
                              </div>
                            </div>

                            {/* Price Block - Prominent */}
                            <div className="mb-5 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl p-4 border border-gray-200">
                              <div className="flex justify-between items-end">
                                <div>
                                  <div className="flex items-baseline gap-2 mb-1">
                                    <p className="text-4xl font-black text-gray-900 leading-none">₹{listing.expectedPrice}</p>
                                    <span className="text-base text-gray-400 font-bold">/kg</span>
                                  </div>
                                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                                    <i className="fas fa-arrow-down"></i> 15% below market
                                  </p>
                                </div>
                                <div className="text-right">
                                  <div className="flex items-center gap-1 justify-end mb-0.5">
                                    <i className="fas fa-cubes text-gray-300 text-sm"></i>
                                    <span className="text-xl font-black text-gray-900 leading-none">{listing.quantity}</span>
                                  </div>
                                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Kg Available</p>
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons - Enhanced */}
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                onClick={() => handleAddToCartClick(listing)}
                                className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-gray-300 hover:shadow-xl hover:shadow-gray-400 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 group/btn"
                              >
                                <i className="fas fa-shopping-basket group-hover/btn:scale-110 transition-transform"></i> Add to Cart
                              </button>
                              <button
                                onClick={() => { setNegotiateListing(listing); setNegotiateOffer(String(listing.expectedPrice)); setNegotiateQty(String(Math.min(5, listing.quantity))); }}
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 group/btn"
                              >
                                <i className="fas fa-handshake group-hover/btn:scale-110 transition-transform"></i> Negotiate
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div >
        )
      }
    </div >
  );


  const renderProfile = () => {
    return (
      <div className="space-y-6 animate-in slide-in-from-right duration-500 pb-24 px-1">
        <div className="bg-white p-8 rounded-[48px] shadow-sm border border-gray-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-blue-500/10 transition-colors"></div>

          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-8 mb-12">
              <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-6">
                <div className="relative group cursor-pointer">
                  <div className="w-28 h-28 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-900 rounded-[40px] flex items-center justify-center text-4xl font-black shadow-inner border border-blue-100 overflow-hidden relative ring-4 ring-white shadow-xl">
                    {tempProfile.profilePhoto ? (
                      <img src={tempProfile.profilePhoto} alt="Profile" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      user.name.charAt(0)
                    )}
                  </div>

                  {/* Overlay for upload - Only in Edit Mode */}
                  {isEditingProfile && (
                    <>
                      <div className="absolute inset-0 bg-black/40 rounded-[40px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        <i className="fas fa-camera text-white text-2xl"></i>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const base64 = await compressImage(file, 800, 0.7) as string;
                              setTempProfile(prev => ({ ...prev, profilePhoto: base64 }));
                              onUpdateProfile({ profilePhoto: base64 } as any);
                              geminiService.speak("Profile photo updated.");
                            } catch (error) {
                              console.error("Photo upload failed", error);
                              alert("Failed to upload photo");
                            }
                          }
                        }}
                      />
                      {tempProfile.profilePhoto && (
                        <div className="absolute top-2 right-2 z-40">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (window.confirm("Remove profile photo?")) {
                                setTempProfile(prev => ({ ...prev, profilePhoto: '' }));
                                onUpdateProfile({ profilePhoto: '' } as any);
                                geminiService.speak("Profile photo removed.");
                              }
                            }}
                            className="w-8 h-8 bg-red-500 rounded-full text-white shadow-md flex items-center justify-center hover:bg-red-600 transition-colors"
                          >
                            <i className="fas fa-trash text-xs"></i>
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="space-y-3">
                  <h2 className="text-4xl font-black text-gray-900 tracking-tight">{user.name}</h2>
                  <div className="flex flex-wrap justify-center md:justify-start gap-2">
                    <span className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-1.5 shadow-sm">
                      <i className="fas fa-check-circle text-[12px]"></i> Verified
                    </span>
                    <span className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200 flex items-center gap-1.5">
                      <i className="fas fa-crown text-[12px]"></i> Pro Buyer
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => isEditingProfile ? handleSaveProfile() : setIsEditingProfile(true)}
                className={`w-full md:w-auto flex items-center justify-center gap-2 px-8 py-5 rounded-[24px] transition-all duration-300 font-black uppercase text-[11px] tracking-widest shadow-lg ${isEditingProfile
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-green-200/50 hover:shadow-green-300/50 hover:scale-[1.02] active:scale-[0.98]'
                  : 'bg-white text-gray-900 border border-gray-100 hover:bg-gray-50 hover:border-blue-200 hover:text-blue-600 shadow-gray-100/50 hover:shadow-blue-200/30 active:scale-95'
                  }`}
              >
                <i className={`fas ${isEditingProfile ? 'fa-check-circle' : 'fa-user-pen'} text-base ${!isEditingProfile && 'animate-pulse text-blue-500'}`}></i>
                {isEditingProfile ? 'Save Changes' : 'Manage Profile'}
              </button>
            </div>

            <div className="space-y-6">
              {/* Business Details Section */}
              <div className="bg-white/70 backdrop-blur-xl p-8 rounded-[48px] border border-white/40 shadow-xl shadow-gray-100/30 hover:shadow-2xl hover:shadow-gray-200/40 transition-all duration-500 group/card">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-lg shadow-inner">
                    <i className="fas fa-building"></i>
                  </div>
                  <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Business Information</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {/* Legal Name */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Legal Trading Name</label>
                    {isEditingProfile ? (
                      <input type="text" value={tempProfile.name} onChange={e => setTempProfile({ ...tempProfile, name: e.target.value })} className="w-full p-3 bg-white rounded-xl font-bold text-gray-900 text-sm border focus:ring-2 focus:ring-blue-500 outline-none" aria-label="Legal Trading Name" />
                    ) : (
                      <p className="text-sm font-black text-gray-900">{user.name}</p>
                    )}
                  </div>

                  {/* Business Type */}
                  {isEditingProfile ? (
                    <div className="relative">
                      <ModernDropdown
                        label="Business Type"
                        value={tempProfile.businessType}
                        options={[
                          { value: 'Individual', label: 'Individual' },
                          { value: 'Retailer', label: 'Retailer' },
                          { value: 'Wholesaler', label: 'Wholesaler' },
                          { value: 'Hotel/Restaurant', label: 'Hotel/Restaurant' },
                          { value: 'Other', label: 'Other' }
                        ]}
                        onChange={(value) => setTempProfile({ ...tempProfile, businessType: value })}
                        placeholder="Select Business Type"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Business Type</label>
                      <p className="text-sm font-black text-gray-900">{tempProfile.businessType}</p>
                    </div>
                  )}

                  {/* GSTIN */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">GSTIN / License</label>
                    {isEditingProfile ? (
                      <input type="text" value={tempProfile.gstin} onChange={e => setTempProfile({ ...tempProfile, gstin: e.target.value })} className="w-full p-3 bg-white rounded-xl font-bold text-gray-900 text-sm border focus:ring-2 focus:ring-blue-500 outline-none" aria-label="GSTIN" />
                    ) : (
                      <p className="text-sm font-black text-gray-900 font-mono tracking-tight">{tempProfile.gstin}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact & Location Section */}
              <div className="bg-white/70 backdrop-blur-xl p-8 rounded-[48px] border border-white/40 shadow-xl shadow-gray-100/30 hover:shadow-2xl hover:shadow-gray-200/40 transition-all duration-500 group/card">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-lg shadow-inner">
                    <i className="fas fa-map-marked-alt"></i>
                  </div>
                  <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Contact & Location</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Registered Email</label>
                    {isEditingProfile ? (
                      <input type="email" value={tempProfile.email} onChange={e => setTempProfile({ ...tempProfile, email: e.target.value })} className="w-full p-3 bg-white rounded-xl font-bold text-gray-900 text-sm border focus:ring-2 focus:ring-blue-500 outline-none" aria-label="Registered Email" />
                    ) : (
                      <p className="text-sm font-black text-gray-900">{user.email || '—'}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Phone Number</label>
                    <p className="text-sm font-black text-gray-900">{user.phone || '+91 91234 56789'}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200/50">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Location Selection</label>
                    {isEditingProfile ? (
                      <div className="space-y-4">
                        <div className="rounded-xl overflow-hidden border border-gray-200">
                          <LocationPicker
                            value={{
                              latitude: tempProfile.latitude,
                              longitude: tempProfile.longitude,
                              fullAddress: tempProfile.address,
                              city: tempProfile.village,
                              district: tempProfile.district,
                              state: tempProfile.state,
                              pincode: tempProfile.pincode
                            }}
                            onChange={(loc) => {
                              setTempProfile(prev => ({
                                ...prev,
                                address: loc.fullAddress,
                                village: loc.city || loc.town || loc.village || '',
                                mandal: (loc as any).mandal || '',
                                district: loc.district || '',
                                state: loc.state || '',
                                pincode: loc.pincode || '',
                                latitude: loc.latitude,
                                longitude: loc.longitude
                              }));
                            }}
                            pickupLocation={undefined}
                          />
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Street Address</label>
                            <input type="text" value={tempProfile.address} onChange={e => setTempProfile({ ...tempProfile, address: e.target.value })} className="w-full p-3 bg-white rounded-xl font-bold text-gray-900 text-sm border focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Street, Area, Building" aria-label="Street Address" />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">City/Town</label>
                            <input type="text" value={tempProfile.village} onChange={e => setTempProfile({ ...tempProfile, village: e.target.value })} className="w-full p-3 bg-white rounded-xl font-bold text-gray-900 text-sm border focus:ring-2 focus:ring-blue-500 outline-none" placeholder="City" aria-label="City" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Mandal/Tehsil</label>
                            <input type="text" value={tempProfile.mandal} onChange={e => setTempProfile({ ...tempProfile, mandal: e.target.value })} className="w-full p-3 bg-white rounded-xl font-bold text-gray-900 text-sm border focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Mandal" aria-label="Mandal" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">District</label>
                            <input type="text" value={tempProfile.district} onChange={e => setTempProfile({ ...tempProfile, district: e.target.value })} className="w-full p-3 bg-white rounded-xl font-bold text-gray-900 text-sm border focus:ring-2 focus:ring-blue-500 outline-none" placeholder="District" aria-label="District" />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">State</label>
                            <input type="text" value={tempProfile.state} onChange={e => setTempProfile({ ...tempProfile, state: e.target.value })} className="w-full p-3 bg-white rounded-xl font-bold text-gray-900 text-sm border focus:ring-2 focus:ring-blue-500 outline-none" placeholder="State" aria-label="State" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Pincode</label>
                            <input type="text" value={tempProfile.pincode} onChange={e => setTempProfile({ ...tempProfile, pincode: e.target.value })} className="w-full p-3 bg-white rounded-xl font-bold text-gray-900 text-sm border focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Pincode" aria-label="Pincode" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 text-gray-700 bg-white/80 p-5 rounded-3xl border border-gray-200 shadow-sm mb-4">
                          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shadow-inner">
                            <i className="fas fa-map-marker-alt"></i>
                          </div>
                          <p className="text-sm font-black truncate">{tempProfile.address || 'No street address set'}</p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          <div className="bg-white/80 p-4 rounded-2xl border border-gray-100 shadow-sm group/loc">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1 group-hover/loc:text-blue-400 transition-colors">City</p>
                            <p className="text-sm font-black text-gray-900">{tempProfile.village || '—'}</p>
                          </div>
                          <div className="bg-white/80 p-4 rounded-2xl border border-gray-100 shadow-sm group/loc">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1 group-hover/loc:text-emerald-400 transition-colors">Mandal</p>
                            <p className="text-sm font-black text-gray-900">{tempProfile.mandal || '—'}</p>
                          </div>
                          <div className="bg-white/80 p-4 rounded-2xl border border-gray-100 shadow-sm group/loc">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1 group-hover/loc:text-amber-400 transition-colors">District</p>
                            <p className="text-sm font-black text-gray-900">{tempProfile.district || '—'}</p>
                          </div>
                          <div className="bg-white/80 p-4 rounded-2xl border border-gray-100 shadow-sm group/loc">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1 group-hover/loc:text-indigo-400 transition-colors">State</p>
                            <p className="text-sm font-black text-gray-900">{tempProfile.state || '—'}</p>
                          </div>
                          <div className="bg-white/80 p-4 rounded-2xl border border-gray-100 shadow-sm group/loc">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1 group-hover/loc:text-red-400 transition-colors">Pincode</p>
                            <p className="text-sm font-black text-gray-900">{tempProfile.pincode || '—'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>


              {/* Buying Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[48px] shadow-xl shadow-blue-200/50 relative overflow-hidden group/stat">
                  <div className="absolute top-0 right-0 p-6 opacity-20 transform group-hover/stat:rotate-12 transition-transform duration-500">
                    <i className="fas fa-shopping-basket text-7xl text-white"></i>
                  </div>
                  <p className="text-[10px] font-black text-blue-100 uppercase tracking-[0.3em] mb-3">Total Procurement</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-5xl font-black text-white">{deliveries.length}</p>
                    <p className="text-lg font-bold text-blue-100/60 uppercase">Loads</p>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-[9px] font-bold text-white/50 bg-white/10 w-fit px-3 py-1 rounded-full backdrop-blur-sm">
                    <i className="fas fa-chart-line"></i> +12% this month
                  </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-600 to-green-700 p-8 rounded-[48px] shadow-xl shadow-emerald-200/50 relative overflow-hidden group/stat">
                  <div className="absolute top-0 right-0 p-6 opacity-20 transform group-hover/stat:rotate-12 transition-transform duration-500">
                    <i className="fas fa-hand-holding-dollar text-7xl text-white"></i>
                  </div>
                  <p className="text-[10px] font-black text-emerald-100 uppercase tracking-[0.3em] mb-3">Total Spend</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-5xl font-black text-white">₹{deliveries.reduce((sum, d) => sum + d.totalAmount, 0).toLocaleString()}</p>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-[9px] font-bold text-white/50 bg-white/10 w-fit px-3 py-1 rounded-full backdrop-blur-sm">
                    <i className="fas fa-wallet"></i> Efficient Spending
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 pt-6 w-full mx-auto min-h-screen relative">
      {activeTab === 'home' && renderSearch()}
      {activeTab === 'cart' && (
        <CartView
          onCheckoutComplete={() => { loadCartCount(); onNavigate('orders'); }}
          initialCheckout={initialCheckout || autoCheckout}
          onResetAutoCheckout={() => {
            onResetAutoCheckout?.();
            setAutoCheckout(false);
          }}
        />
      )}
      {activeTab === 'orders' && <OrdersView />}
      {activeTab === 'wishlist' && (
        <WishlistView
          onNavigate={onNavigate}
          onAddToCart={(l) => {
            setSelectedListing(l);
            setPendingAction('cart');
            setQuantityInput('1'); // Default to 1kg or minimum
            setShowQuantityModal(true);
          }}
          setDetailListing={setDetailListing}
        />
      )}
      {activeTab === 'profile' && renderProfile()}
      {activeTab === 'payments' && <BuyerPaymentsView />}


      {/* Detailed Listing Modal */}
      {detailListing && (
        <ListingDetailModal
          listing={detailListing}
          relatedListings={listings.filter(l => l.farmer?.id && l.farmer.id === detailListing.farmer?.id && l.id !== detailListing.id)}
          onListingClick={(l) => setDetailListing(l)}
          isWishlisted={wishlist.includes(detailListing.id)}
          onToggleWishlist={toggleWishlist}
          onClose={() => setDetailListing(null)}
          onAddToCart={(l) => { handleAddToCartClick(l); setDetailListing(null); }}
          onBuyNow={(l) => {
            setSelectedListing(l);
            setPendingAction('buy_now');
            setConfirmationView(false);
            const suggested = Math.max(1, Math.min(5, Math.floor(l.quantity || 1)));
            setQuantityInput(String(suggested));
            setShowQuantityModal(true);
            setDetailListing(null);
          }}
        />
      )}

      {/* Quantity Selection Modal */}
      {showQuantityModal && selectedListing && (
        <div className="fixed inset-0 z-[100] bg-gray-900/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl animate-in zoom-in duration-300 relative overflow-hidden">
            {/* Background Accent */}
            <div className={`absolute top-0 left-0 w-full h-2 ${pendingAction === 'buy_now' ? 'bg-green-500' : 'bg-blue-500'}`}></div>

            {!confirmationView ? (
              /* Step 1: Quantity Selection */
              <div className="animate-in slide-in-from-right duration-300">
                <div className="text-center mb-8">
                  <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-inner bg-blue-50 text-blue-600`}>
                    <i className={`fas fa-weight-hanging`}></i>
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-1">
                    How much do you need?
                  </h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    {selectedListing.crop?.name || CROPS.find(c => c.id === selectedListing.cropId)?.name} • Grade {selectedListing.grade}
                  </p>
                </div>

                <div className="space-y-6 mb-8">
                  <div>
                    <div className="flex justify-between items-end mb-2 px-1">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Desired Quantity</label>
                      <span className="text-[10px] font-bold text-gray-400">Available: {selectedListing.quantity} kg</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        value={quantityInput}
                        onChange={(e) => setQuantityInput(e.target.value)}
                        className="w-full p-6 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-[24px] font-black text-gray-900 text-2xl outline-none transition-all"
                        placeholder="0"
                        min="1"
                        max={selectedListing.quantity}
                      />
                      <span className="absolute right-6 top-1/2 -translate-y-1/2 text-sm font-black text-gray-400 uppercase tracking-widest">kg</span>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-[28px] p-6 border border-gray-100">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Estimated Total
                      </span>
                      <span className="text-2xl font-black text-gray-900">
                        ₹{(parseFloat(quantityInput || '0') * selectedListing.expectedPrice).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => { setShowQuantityModal(false); setSelectedListing(null); }}
                    className="w-full bg-gray-100 text-gray-500 py-5 rounded-[20px] font-black uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleProceedToAction(pendingAction!)}
                    className="w-full bg-gray-900 text-white py-5 rounded-[20px] font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all"
                  >
                    Next Step <i className="fas fa-arrow-right ml-2"></i>
                  </button>
                </div>
              </div>
            ) : (
              /* Step 2: Final Confirmation */
              <div className="animate-in slide-in-from-right duration-300">
                <div className="text-center mb-10">
                  <div className={`w-24 h-24 rounded-[32px] flex items-center justify-center text-4xl mx-auto mb-6 shadow-xl ${pendingAction === 'buy_now' ? 'bg-green-500 text-white shadow-green-200' : 'bg-blue-600 text-white shadow-blue-200'}`}>
                    <i className="fas fa-check-circle"></i>
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-1">
                    Confirm Request
                  </h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Please review your order summary
                  </p>
                </div>

                <div className="space-y-4 mb-10">
                  <div className="flex justify-between items-center py-4 border-b border-gray-100">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Item</span>
                    <span className="text-sm font-black text-gray-900">{selectedListing.crop?.name || CROPS.find(c => c.id === selectedListing.cropId)?.name}</span>
                  </div>
                  <div className="flex justify-between items-center py-4 border-b border-gray-100">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Quantity</span>
                    <span className="text-sm font-black text-gray-900">{quantityInput} kg</span>
                  </div>
                  <div className="flex justify-between items-center py-4 border-b border-gray-100">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Unit Price
                    </span>
                    <span className="text-sm font-black text-gray-900">₹{selectedListing.expectedPrice}/kg</span>
                  </div>
                  <div className="flex justify-between items-center py-6">
                    <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">
                      Total Amount
                    </span>
                    <span className="text-3xl font-black text-blue-600">₹{(parseFloat(quantityInput || '0') * selectedListing.expectedPrice).toLocaleString()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setConfirmationView(false)}
                    className="w-full bg-gray-100 text-gray-500 py-5 rounded-[20px] font-black uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-all font-black"
                  >
                    <i className="fas fa-arrow-left mr-2"></i> Edit
                  </button>
                  <button
                    onClick={() => handleAddToCart(pendingAction!)}
                    disabled={addingToCart === selectedListing.id}
                    className={`w-full text-white py-5 rounded-[20px] font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 ${pendingAction === 'buy_now' ? 'bg-green-600 shadow-green-100' : 'bg-blue-600 shadow-blue-100'}`}
                  >
                    {addingToCart === selectedListing.id ? <i className="fas fa-spinner fa-spin"></i> : <i className={`fas fa-check`}></i>}
                    Confirm & Proceed
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {ratingModalOpen && (
        <div className="fixed inset-0 z-[100] bg-gray-900/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[48px] p-10 shadow-2xl animate-in zoom-in duration-300">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-[28px] flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner">
                <i className="fas fa-star"></i>
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">Delivery Service</h3>
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">Please rate the logistics partner for your {selectedDeliveryToRate?.crop} order.</p>
            </div>

            <div className="flex justify-center gap-3 mb-12">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setSelectedStars(star)}
                  className="text-5xl transition-all active:scale-75"
                  aria-label={`Rate ${star} stars`}
                >
                  <i className={`fas fa-star ${(hoverRating || selectedStars) >= star ? 'text-amber-400' : 'text-gray-100'}`}></i>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setRatingModalOpen(false)}
                className="bg-gray-50 text-gray-400 py-5 rounded-[24px] font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all"
              >
                Skip
              </button>
              <button
                disabled={selectedStars === 0}
                onClick={submitRating}
                className="bg-gray-900 text-white py-5 rounded-[24px] font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-20"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Negotiate Modal ─── */}
      {negotiateListing && !activeChatId && (() => {
        const qty = Number(negotiateQty) || 0;
        const perKg = negotiateMode === 'perkg'
          ? (Number(negotiateOffer) || 0)
          : (qty > 0 ? Math.round((Number(negotiateTotal) || 0) / qty * 100) / 100 : 0);
        const total = negotiateMode === 'total'
          ? (Number(negotiateTotal) || 0)
          : (Number(negotiateOffer) || 0) * qty;
        const listedTotal = negotiateListing.expectedPrice * qty;

        return (
          <div className="fixed inset-0 z-[100] bg-gray-900/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-sm rounded-[48px] p-10 shadow-2xl animate-in zoom-in duration-300">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-[28px] flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner">
                  <i className="fas fa-handshake"></i>
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Negotiate Price</h3>
                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                  {negotiateListing.crop?.name || 'Crop'} · Listed at ₹{negotiateListing.expectedPrice}/kg
                </p>
              </div>

              {/* Quantity */}
              <div className="mb-4">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 block">
                  Quantity (kg)
                </label>
                <input
                  type="number"
                  value={negotiateQty}
                  onChange={e => {
                    setNegotiateQty(e.target.value);
                    // Auto-recalculate total when quantity changes (in perkg mode)
                    if (negotiateMode === 'perkg' && negotiateOffer) {
                      setNegotiateTotal(String(Math.round(Number(negotiateOffer) * Number(e.target.value) * 100) / 100));
                    }
                    if (negotiateMode === 'total' && negotiateTotal) {
                      setNegotiateOffer(String(Number(e.target.value) > 0 ? Math.round(Number(negotiateTotal) / Number(e.target.value) * 100) / 100 : ''));
                    }
                  }}
                  min={1}
                  max={negotiateListing.quantity}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 text-lg font-black text-gray-900 focus:outline-none focus:border-blue-300 transition-all"
                  placeholder={`Max ${negotiateListing.quantity} kg`}
                />
              </div>

              {/* Per-kg / Total Toggle */}
              <div className="flex bg-gray-100 rounded-2xl p-1 mb-4">
                <button
                  type="button"
                  onClick={() => setNegotiateMode('perkg')}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${negotiateMode === 'perkg'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                  <i className="fas fa-tag mr-1.5"></i>Per Kg
                </button>
                <button
                  type="button"
                  onClick={() => setNegotiateMode('total')}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${negotiateMode === 'total'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                  <i className="fas fa-calculator mr-1.5"></i>Total
                </button>
              </div>

              {/* Offer Price Input */}
              <div className="mb-4">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 block">
                  {negotiateMode === 'perkg' ? 'Your Offer (₹/kg)' : 'Total Amount (₹)'}
                </label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-lg font-black text-gray-300">₹</span>
                  <input
                    type="number"
                    value={negotiateMode === 'perkg' ? negotiateOffer : negotiateTotal}
                    onChange={e => {
                      const val = e.target.value;
                      if (negotiateMode === 'perkg') {
                        setNegotiateOffer(val);
                        setNegotiateTotal(String(Math.round(Number(val) * qty * 100) / 100));
                      } else {
                        setNegotiateTotal(val);
                        setNegotiateOffer(String(qty > 0 ? Math.round(Number(val) / qty * 100) / 100 : ''));
                      }
                    }}
                    min={1}
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl pl-10 pr-5 py-4 text-lg font-black text-gray-900 focus:outline-none focus:border-blue-300 transition-all"
                    placeholder={negotiateMode === 'perkg' ? `Listed: ₹${negotiateListing.expectedPrice}` : `Listed total: ₹${listedTotal}`}
                  />
                </div>
              </div>

              {/* Live Summary Card */}
              {qty > 0 && (Number(negotiateOffer) > 0 || Number(negotiateTotal) > 0) && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 mb-6 border border-blue-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-400">Your Offer</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Listed Price</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-2xl font-black text-gray-900">₹{perKg}<span className="text-sm text-gray-400 font-bold">/kg</span></p>
                      <p className="text-xs font-bold text-blue-600 mt-0.5">× {qty} kg = ₹{total.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-400 line-through">₹{negotiateListing.expectedPrice}/kg</p>
                      <p className="text-xs text-gray-300">₹{listedTotal.toLocaleString()} total</p>
                      {perKg < negotiateListing.expectedPrice && (
                        <p className="text-[10px] font-bold text-green-600 mt-0.5">
                          <i className="fas fa-arrow-down mr-0.5"></i>{Math.round((1 - perKg / negotiateListing.expectedPrice) * 100)}% off
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => { setNegotiateListing(null); setNegotiateOffer(''); setNegotiateQty(''); setNegotiateTotal(''); setNegotiateMode('perkg'); }}
                  className="bg-gray-50 text-gray-400 py-5 rounded-[24px] font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  disabled={negotiateLoading || perKg <= 0 || qty <= 0}
                  onClick={async () => {
                    try {
                      setNegotiateLoading(true);
                      const res = await negotiationAPI.start({
                        listingId: negotiateListing.id,
                        quantity: qty,
                        initialOffer: perKg
                      });
                      setActiveChatId(res.id);
                      setNegotiateListing(null);
                      setNegotiateMode('perkg');
                      success('Negotiation started!');
                    } catch (err: any) {
                      const msg = err?.body?.error || err?.message || 'Failed to start negotiation';
                      if (err?.body?.chatId) {
                        setActiveChatId(err.body.chatId);
                        setNegotiateListing(null);
                      } else {
                        error(msg);
                      }
                    } finally {
                      setNegotiateLoading(false);
                    }
                  }}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-5 rounded-[24px] font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-20 flex items-center justify-center gap-2"
                >
                  {negotiateLoading ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-paper-plane"></i> Send</>}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── Active Chat Overlay ─── */}
      {activeChatId && (
        <ChatNegotiation
          chatId={activeChatId}
          userId={user.id}
          userRole="BUYER"
          onClose={() => setActiveChatId(null)}
          onProceedToCheckout={handleNegotiationCheckout}
        />
      )}

      {/* ─── Different Farmer Conflict Modal ─── */}
      {differentFarmerConflict && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 pt-6 pb-4 text-center border-b border-amber-100">
              <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-store text-amber-600 text-xl"></i>
              </div>
              <h3 className="text-lg font-black text-gray-900 mb-1">Different Farmer</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Your cart already has items from another farmer. You can only checkout from one farmer at a time.
              </p>
            </div>

            <div className="p-6 space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center">What would you like to do?</p>

              {/* Option 1: Clear and add */}
              <button
                type="button"
                onClick={async () => {
                  try {
                    // Get all cart items and remove them
                    const cartResp = await cartAPI.get();
                    const cartItems = cartResp.cart?.items || [];
                    await Promise.all(cartItems.map((item: any) => cartAPI.remove(item.id)));

                    // Now add the new item
                    await cartAPI.add(differentFarmerConflict.listing.id, differentFarmerConflict.quantity);
                    await loadCartCount();

                    setDifferentFarmerConflict(null);

                    if (differentFarmerConflict.action === 'buy_now') {
                      setAutoCheckout(true);
                      onNavigate('cart');
                    } else {
                      success(`Cart cleared. ${differentFarmerConflict.quantity} kg added to cart.`);
                    }
                  } catch (err: any) {
                    error(err.message || 'Failed to update cart');
                    setDifferentFarmerConflict(null);
                  }
                }}
                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold text-sm hover:bg-gray-700 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <i className="fas fa-trash-alt"></i>
                Clear Cart & Add This Crop
              </button>

              {/* Option 2: Cancel */}
              <button
                type="button"
                onClick={() => setDifferentFarmerConflict(null)}
                className="w-full bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold text-sm hover:bg-gray-200 active:scale-95 transition-all"
              >
                Keep Current Cart
              </button>

              {/* Option 3: Go to cart */}
              <button
                type="button"
                onClick={() => { setDifferentFarmerConflict(null); onNavigate('cart'); }}
                className="w-full text-sm font-bold text-green-700 hover:underline py-2"
              >
                <i className="fas fa-shopping-cart mr-1"></i>
                View Current Cart
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
});

export default BuyerDashboard;
