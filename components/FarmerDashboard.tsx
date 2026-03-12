
import React, { useState, useEffect, useRef } from 'react';
import { CROPS, TRANSLATIONS } from '../constants.tsx';
import { Listing, MarketPrice, User, Language, Gender, ListingStatus, Crop, HarvestType } from '../types';
import { geminiService } from '../services/geminiService';
import FarmerOrdersView from './FarmerOrdersView';
import { aiAPI, listingAPI, marketPriceAPI } from '../services/api';
import { socketService } from '../services/socketService';
import StatusBadge from './StatusBadge';
import MarketPricesView from './MarketPricesView';
import WeatherWidget from './WeatherWidget';
import FarmerAnalytics from './FarmerAnalytics';
import { useRoleTranslate } from '../hooks/useRoleTranslate';
import MarketTicker from './MarketTicker';
import { smartCropRectFromRGBA } from '../src/utils/smartCrop';
import { computeQualityMetricsFromRGBA, qualityGradeFromMetrics, QualityMetrics } from '../src/utils/imageQuality';
import { compressImage } from '../utils/imageUtils';
import LocationPicker from './LocationPicker';
import { useNavigate } from 'react-router-dom';
import './FarmerDashboard.css';

interface EnhancedMarketPrice extends MarketPrice {
  msp: number;
  nearbyMandi: string;
  nearbyAvg: number;
}

interface CropRecommendation {
  cropName: string;
  reason: string;
  demand: string;
  trend: string;
}

interface FarmerDashboardProps {
  activeTab: string;
  acceptedDeals: any[];
  onAddDelivery: (delivery: any) => void;
  onDealHandled: (dealId: string) => void;
  user: User;
  onUpdateProfile: (updates: Partial<User>) => void;
  earnings: { total: number; pending: number };
}



type SortOption = 'date-desc' | 'date-asc' | 'price-asc' | 'price-desc' | 'qty-desc' | 'qty-asc';

type CropImageVerification = {
  signature: string;
  status: 'VERIFIED' | 'REJECTED' | 'PENDING' | 'FAILED';
  detectedCrop: string;
  detectedCropId: string | null;
  confidence: number;
  summary: string;
  paragraphSummary: string;
  detailedDescription: string;
  textSymbols: string[];
  primaryBoxes: Array<{ x: number; y: number; w: number; h: number }>;
  grade: 'Premium' | 'Excellent' | 'Good' | 'Fair' | 'Poor' | null;
  gradeReason: string;
  matches: boolean;
  userMessage: string;
};

const FarmerDashboard: React.FC<FarmerDashboardProps> = React.memo(({
  activeTab,
  acceptedDeals,
  onAddDelivery,
  onDealHandled,
  user,
  onUpdateProfile,
  earnings,
}) => {
  const { t } = useRoleTranslate();
  const navigate = useNavigate();
  const activeTabRef = useRef(activeTab);
  const [internalView, setInternalView] = useState<'default' | 'add' | 'viewProfile' | 'editProfile' | 'delivery'>('default');
  const [editListingId, setEditListingId] = useState<string | null>(null);
  const [listingToDelete, setListingToDelete] = useState<string | null>(null);
  const [isDeletingListing, setIsDeletingListing] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<CropRecommendation[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [imageValidationError, setImageValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropperContainerRef = useRef<HTMLDivElement>(null);
  const hasFetchedPrices = useRef(false);
  const hasFetchedRecs = useRef(false);
  const isProcessingFiles = useRef(false);
  const verificationRequestId = useRef(0);



  const getAnimDelayClass = (idx: number, stepMs: number) => {
    const ms = Math.min(1500, idx * stepMs);
    return `anim-delay-${ms}`;
  };

  // Combine real accepted deals with some mock history for display
  const soldHistory = [
    ...acceptedDeals.map(d => ({
      id: d.id,
      cropId: d.crop === 'Tomato' ? '1' : '2', // Simple mapper
      cropName: d.crop,
      buyer: d.buyer,
      qty: d.qty,
      price: d.price,
      amount: d.price * d.qty,
      date: d.date,
      timestamp: d.timestamp,
      icon: d.crop === 'Tomato' ? '🍅' : '🌾'
    }))
  ];



  const [tempProfile, setTempProfile] = useState({
    name: user.name,
    gender: user.gender || Gender.MALE,
    email: user.email || '',
    profilePhoto: user.profilePhoto || '',
    address: user.location?.address || '',
    village: user.location?.village || '',
    district: user.location?.district || '',
    state: user.location?.state || '',
    pincode: user.location?.pincode || '',
    latitude: user.location?.latitude || null,
    longitude: user.location?.longitude || null
  });

  const tipsForSuccess = [
    {
      id: 'tip-1',
      title: 'Market Insight',
      desc: 'Tomato prices are expected to rise by 15% next week in Guntur. Consider waiting if your harvest is stable.',
      icon: 'fa-arrow-trend-up',
      color: 'bg-amber-50 border-amber-100 text-amber-700',
      tag: 'Trends'
    },
    {
      id: 'tip-2',
      title: 'Crop Care',
      desc: 'Rising humidity detected. Check your Wheat crops for yellow rust symptoms and apply preventive organic spray.',
      icon: 'fa-seedling',
      color: 'bg-emerald-50 border-emerald-100 text-emerald-700',
      tag: 'Health'
    },
    {
      id: 'tip-3',
      title: 'Sell Faster',
      desc: 'Listings with at least 3 clear photos get 40% more buyer interest. Take photos in daylight for best results!',
      icon: 'fa-camera',
      color: 'bg-indigo-50 border-indigo-100 text-indigo-700',
      tag: 'Strategy'
    }
  ];

  useEffect(() => {
    setTempProfile({
      name: user.name,
      gender: user.gender || Gender.MALE,
      email: user.email || '',
      profilePhoto: user.profilePhoto || '',
      address: user.location?.address || '',
      village: user.location?.village || '',
      district: user.location?.district || '',
      state: user.location?.state || '',
      pincode: user.location?.pincode || '',
      latitude: user.location?.latitude || null,
      longitude: user.location?.longitude || null
    });
  }, [user]);

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await compressImage(file, 800, 0.7) as string;
        setTempProfile(prev => ({ ...prev, profilePhoto: base64 }));
        onUpdateProfile({ profilePhoto: base64 });
        geminiService.speak("Profile photo updated.");
      } catch (error) {
        console.error("Photo upload failed", error);
        alert("Failed to upload photo");
      }
    }
  };

  useEffect(() => {
    if (activeTab === 'home' && aiRecommendations.length === 0) {
      if (!hasFetchedRecs.current) {
        hasFetchedRecs.current = true;
        fetchRecommendations();
      }
    }
  }, [activeTab]);

  const fetchRecommendations = async () => {
    if (isLoadingRecs) return;
    setIsLoadingRecs(true);
    try {
      const location = user.location ? `${user.location.district}, ${user.location.state}` : 'India';
      const recs = await geminiService.getCropRecommendations(location);
      setAiRecommendations(recs);
    } catch (err) {
      console.warn("AI Recommendations failed, using fallback.");
    } finally {
      setIsLoadingRecs(false);
    }
  };

  const [availableCrops, setAvailableCrops] = useState<Crop[]>([]);

  const cropsForUi = availableCrops.length > 0 ? availableCrops : CROPS;

  const [newListing, setNewListing] = useState({
    cropId: '',
    harvestType: HarvestType.HARVESTED_CROP as HarvestType,
    quantity: '',
    unit: 'kg' as 'kg' | 'quintal',
    expectedPrice: '',
    grade: 'Premium',
    harvestDate: new Date().toISOString().split('T')[0],
    saleDate: new Date().toISOString().split('T')[0],
    images: [] as string[]
  });
  const [rawListingImages, setRawListingImages] = useState<string[]>([]);
  const [cropIdOverride, setCropIdOverride] = useState<string | null>(null);

  const [cropperIndex, setCropperIndex] = useState<number | null>(null);
  const [cropperRect, setCropperRect] = useState<{ x: number; y: number; size: number }>({ x: 0.1, y: 0.1, size: 0.8 });
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; rectX: number; rectY: number } | null>(null);
  const cropperRectRef = useRef<HTMLDivElement>(null);

  const [imageVerification, setImageVerification] = useState<CropImageVerification | null>(null);
  const [isVerifyingImages, setIsVerifyingImages] = useState(false);
  const [imageVerificationError, setImageVerificationError] = useState<string | null>(null);
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | null>(null);

  const [listings, setListings] = useState<Listing[]>([]);

  const [marketPrices, setMarketPrices] = useState<EnhancedMarketPrice[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [listingsLoadError, setListingsLoadError] = useState<string | null>(null);
  const [chatsLoadError, setChatsLoadError] = useState<string | null>(null);

  const totalEarned = soldHistory.reduce((sum, item) => sum + item.amount, 0);
  const totalVolume = soldHistory.reduce((sum, item) => sum + item.qty, 0);
  const pendingPayments = earnings.pending;

  useEffect(() => {
    if (!hasFetchedPrices.current) {
      hasFetchedPrices.current = true;
      fetchPrices();
    }
  }, []);

  useEffect(() => {
    if (!cropperRectRef.current) return;
    cropperRectRef.current.style.setProperty('--cropper-x', `${cropperRect.x}`);
    cropperRectRef.current.style.setProperty('--cropper-y', `${cropperRect.y}`);
    cropperRectRef.current.style.setProperty('--cropper-size', `${cropperRect.size}`);
  }, [cropperRect.x, cropperRect.y, cropperRect.size]);

  const loadCrops = async () => {
    try {
      const res = await listingAPI.getCrops();
      const crops = res.crops || [];
      setAvailableCrops(crops);
      if (crops.length > 0) {
        setNewListing(prev => ({ ...prev, cropId: prev.cropId || crops[0].id }));
      }
    } catch (e) {
    }
  };

  const loadMyListings = async () => {
    try {
      setListingsLoadError(null);
      const res = await listingAPI.getMyListings();
      setListings(res.listings || []);
    } catch (e: any) {
      setListings([]);
      const status = typeof e?.status === 'number' ? e.status : null;
      const msg = e?.message || 'Failed to load listings.';
      setListingsLoadError(status === 401 ? 'Session expired. Please login again.' : msg);
    }
  };



  useEffect(() => {
    loadCrops();
    loadMyListings();
  }, []);

  useEffect(() => {
    if (activeTab === 'listings') {
      loadMyListings();
    }
  }, [activeTab]);

  useEffect(() => {

  }, [activeTab]);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    socketService.connect();

  }, []);

  const fetchPrices = async () => {
    setLoadingPrices(true);
    const mock: EnhancedMarketPrice[] = [
      { cropId: '1', mandi: 'Guntur Mandi', min: 20, max: 26, avg: 23, date: 'Today', msp: 18, nearbyMandi: 'Vijayawada', nearbyAvg: 25 },
      { cropId: '3', mandi: 'Guntur Mandi', min: 15, max: 22, avg: 19, date: 'Today', msp: 16, nearbyMandi: 'Kurnool', nearbyAvg: 20 },
      { cropId: '2', mandi: 'Guntur Mandi', min: 21, max: 25, avg: 23, date: 'Today', msp: 21.25, nearbyMandi: 'Tenali', nearbyAvg: 22.5 },
      { cropId: '4', mandi: 'Guntur Mandi', min: 18, max: 24, avg: 21, date: 'Today', msp: 20.40, nearbyMandi: 'Bapatla', nearbyAvg: 20 },
    ];
    setMarketPrices(mock);
    try {
      const p = await geminiService.getMarketPrice("Tomato", "Guntur");
      if (p) {
        setMarketPrices(prev => prev.map(m => m.cropId === '1' ? { ...m, avg: p.avgPrice } : m));
      }
    } catch (error: any) {
      // console.warn("Price fetch failed (Quota?), using mock.");
    } finally {
      setLoadingPrices(false);
    }
  };

  const handlePublish = async () => {
    if (isAnalyzingPhoto || isVerifyingImages) return;
    const listingData = {
      cropId: newListing.cropId,
      harvestType: newListing.harvestType,
      quantity: Number(newListing.quantity),
      unit: newListing.unit,
      expectedPrice: Number(newListing.expectedPrice),
      grade: newListing.grade,
      harvestDate: newListing.harvestDate,
      saleDate: newListing.saleDate,
      qualitySummary: imageVerification?.paragraphSummary || imageVerification?.summary || imageVerification?.detailedDescription || null,
      images: newListing.images,
      location: user.location ? `${user.location.village}, ${user.location.district}` : 'India'
    };

    let cropName = cropsForUi.find(c => c.id === listingData.cropId)?.name || listingData.cropId;

    try {
      if (!listingData.cropId || listingData.cropId.length < 8) {
        throw new Error('Crop list not loaded. Please refresh and try again.');
      }
      if (!Array.isArray(listingData.images) || listingData.images.length === 0) {
        const msg = 'Please add a valid image related to harvest.';
        setImageValidationError(msg);
        throw new Error(msg);
      }

      const signature = getImagesSignature(listingData.images);
      const verified = (imageVerification && imageVerification.signature === signature) ? imageVerification : await verifyListingImages(listingData.images);
      if (!verified || verified.status !== 'VERIFIED') {
        const msg = verified?.userMessage || 'Please upload a clear crop photo so the crop can be detected.';
        setImageVerificationError(msg);
        throw new Error(msg);
      }

      const finalGrade = String(listingData.grade || '').toUpperCase();
      if (finalGrade === 'POOR' || finalGrade.includes('POOR')) {
        const msg = 'Listing Restricted: The quality of this crop has been assessed as "Poor". To maintain marketplace standards, we do not allow listing produce in this condition. Please ensure your harvest meets the minimum quality requirements.';
        setImageVerificationError(msg);
        throw new Error(msg);
      }

      if (verified.detectedCropId && verified.detectedCropId !== listingData.cropId) {
        listingData.cropId = verified.detectedCropId;
        cropName = cropsForUi.find(c => c.id === listingData.cropId)?.name || verified.detectedCrop || listingData.cropId;
      }
      if (verified.grade) {
        listingData.grade = verified.grade as any;
      }
      if (editListingId) {
        await listingAPI.update(editListingId, listingData);
        geminiService.speak(`${cropName} listing updated successfully!`);
      } else {
        await listingAPI.create(listingData);
        geminiService.speak(`Great! Your ${listingData.quantity} ${listingData.unit} of ${cropName} is now listed for ${listingData.expectedPrice} rupees per kg.`);
      }
      await loadMyListings();
    } catch (e: any) {
      const message = e?.message || 'Failed to publish listing.';
      if (message !== 'Please add a valid image related to harvest.') {
        alert(message);
      }
      geminiService.speak(message);
      return;
    }

    setInternalView('default');
    setEditListingId(null);
    setNewListing(prev => ({
      cropId: cropsForUi[0]?.id || prev.cropId,
      harvestType: HarvestType.HARVESTED_CROP,
      quantity: '',
      unit: 'kg',
      expectedPrice: '',
      grade: 'Premium',
      harvestDate: new Date().toISOString().split('T')[0],
      saleDate: new Date().toISOString().split('T')[0],
      images: []
    }));
    setRawListingImages([]);
    setImageVerification(null);
    setImageVerificationError(null);
  };

  const getGradeColor = (grade: string) => {
    const g = grade?.toLowerCase();
    if (g === 'premium') return 'bg-yellow-50 text-yellow-700 border-yellow-100 ring-yellow-400/20';
    if (g === 'excellent') return 'bg-green-50 text-green-700 border-green-100 ring-green-400/20';
    if (g === 'good') return 'bg-blue-50 text-blue-700 border-blue-100 ring-blue-400/20';
    if (g === 'fair') return 'bg-orange-50 text-orange-700 border-orange-100 ring-orange-400/20';
    if (g === 'poor') return 'bg-red-50 text-red-700 border-red-100 ring-red-400/20';
    return 'bg-gray-50 text-gray-500 border-gray-100';
  };

  const getPriceCompetitiveness = (expected: number, cropId: string, listingMandiPrice?: number) => {
    const marketAvg = listingMandiPrice || marketPrices.find(m => m.cropId === cropId)?.avg || 24;
    const diff = ((expected - marketAvg) / marketAvg) * 100;

    if (diff < -5) {
      return {
        label: t('farmer.below_market'),
        color: 'bg-blue-100 text-blue-700',
        barColor: 'bg-blue-500',
        icon: 'fa-bolt',
        advice: `${t('farmer.price_advice_low')} (${Math.abs(Math.round(diff))}% below market).`,
        type: 'below',
        index: 1
      };
    } else if (diff <= 5) {
      return {
        label: t('farmer.competitive'),
        color: 'bg-emerald-100 text-emerald-700',
        barColor: 'bg-emerald-500',
        icon: 'fa-circle-check',
        advice: t('farmer.price_advice_competitive'),
        type: 'competitive',
        index: 2
      };
    } else if (diff <= 15) {
      return {
        label: t('farmer.slightly_above'),
        color: 'bg-amber-100 text-amber-700',
        barColor: 'bg-amber-500',
        icon: 'fa-triangle-exclamation',
        advice: `${t('farmer.price_advice_slightly_high')} (${Math.round(diff)}% premium).`,
        type: 'slightly_above',
        index: 3
      };
    } else {
      return {
        label: t('farmer.significantly_above'),
        color: 'bg-red-100 text-red-700',
        barColor: 'bg-red-500',
        icon: 'fa-circle-up',
        advice: `${t('farmer.price_advice_high')} (${Math.round(diff)}% premium).`,
        type: 'significantly_above',
        index: 4
      };
    }
  };



  const handleSaveProfile = () => {
    const updatedProfile = {
      name: tempProfile.name,
      gender: tempProfile.gender,
      email: tempProfile.email,
      location: {
        address: tempProfile.address,
        village: tempProfile.village,
        district: tempProfile.district,
        state: tempProfile.state,
        pincode: tempProfile.pincode,
        latitude: tempProfile.latitude,
        longitude: tempProfile.longitude
      }
    };

    onUpdateProfile(updatedProfile);

    // Update tempProfile to reflect the saved changes
    setTempProfile(prev => ({
      ...prev,
      name: updatedProfile.name,
      gender: updatedProfile.gender,
      email: updatedProfile.email,
      address: updatedProfile.location.address,
      village: updatedProfile.location.village,
      district: updatedProfile.location.district,
      state: updatedProfile.location.state,
      pincode: updatedProfile.location.pincode,
      latitude: updatedProfile.location.latitude,
      longitude: updatedProfile.location.longitude
    }));

    setInternalView('viewProfile');
    geminiService.speak("Profile updated successfully!");
  };

  const handleEditClick = (l: Listing) => {
    setEditListingId(l.id);
    setNewListing({
      cropId: l.cropId,
      harvestType: l.harvestType || HarvestType.HARVESTED_CROP,
      quantity: String(l.quantity),
      unit: l.unit,
      expectedPrice: String(l.expectedPrice),
      grade: l.grade,
      harvestDate: String(l.harvestDate).includes('T') ? String(l.harvestDate).slice(0, 10) : String(l.harvestDate),
      saleDate: l.saleDate ? (String(l.saleDate).includes('T') ? String(l.saleDate).slice(0, 10) : String(l.saleDate)) : new Date().toISOString().split('T')[0],
      images: l.images
    });
    setRawListingImages(Array.isArray(l.images) ? l.images : []);
    setInternalView('add');
  };

  const confirmDeleteListing = async () => {
    if (!listingToDelete || isDeletingListing) return;
    setIsDeletingListing(true);
    try {
      await listingAPI.delete(listingToDelete);
      setListingToDelete(null);
      await loadMyListings();
      geminiService.speak("Listing deleted.");
    } catch (e: any) {
      const message = e?.message || 'Failed to delete listing.';
      alert(message);
      geminiService.speak(message);
    } finally {
      setIsDeletingListing(false);
    }
  };

  const getImagesSignature = (imgs: string[]) => imgs.map(i => `${i.length}:${i.slice(0, 48)}`).join('|');

  const getCropNameById = (cropId: string) => {
    return cropsForUi.find(c => c.id === cropId)?.name || '';
  };

  const verifyListingImages = async (imgs: any[]) => {
    if (!imgs || imgs.length === 0) return null;
    const signature = getImagesSignature(imgs);
    if (imageVerification?.signature === signature && imageVerification.status === 'VERIFIED') return imageVerification;

    const currentId = ++verificationRequestId.current;
    const expectedCropName = getCropNameById(newListing.cropId);
    setIsVerifyingImages(true);
    setImageVerification(null); // Clear previous result immediately
    setImageVerificationError(null);
    try {
      // Downscale images to 512px for faster AI processing (smaller payload = faster upload + inference)
      const downscaleForAI = (dataUrl: string): Promise<string> => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const maxSide = 768;
            const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
            const w = Math.round(img.width * scale);
            const h = Math.round(img.height * scale);
            const c = document.createElement('canvas');
            c.width = w; c.height = h;
            const ctx = c.getContext('2d');
            if (!ctx) { resolve(dataUrl); return; }
            ctx.drawImage(img, 0, 0, w, h);
            resolve(c.toDataURL('image/jpeg', 0.5));
          };
          img.onerror = () => resolve(dataUrl);
          img.src = dataUrl;
        });
      };
      // Processing first image - handle both Base64 strings and File objects
      let processUrl = '';
      if (typeof imgs[0] === 'string' && imgs[0].startsWith('data:')) {
        processUrl = imgs[0];
      } else if ((imgs[0] as any) instanceof File || (imgs[0] as any) instanceof Blob) {
        processUrl = URL.createObjectURL(imgs[0] as any);
      } else if (typeof imgs[0] === 'string') {
        processUrl = imgs[0]; // Assume it's already a URL
      } else {
        console.error('[Dashboard] Unexpected image type in verifyListingImages:', typeof imgs[0]);
        return null;
      }

      const availableCrops = cropsForUi.map(c => c.name);
      console.log('[Dashboard] Starting analysis for:', processUrl.substring(0, 50) + '...', 'Expected:', expectedCropName);
      const aiImageBase64 = await downscaleForAI(processUrl);
      console.log('[Dashboard] AI Image prepared. Calling visionDetect...');

      const visionRes = await aiAPI.visionDetect({ 
        images: [aiImageBase64], 
        expectedCropName,
        availableCrops
      });
      console.log('[Dashboard] AI Detection result:', visionRes);

      // Guard: Ignore if this is not the latest request
      if (currentId !== verificationRequestId.current) {
        console.warn('[Dashboard] Ignoring stale verification response');
        return null;
      }

      let finalGrade = visionRes.grade || null;

      // First, try to use the mathematical percentage if the model provided it
      if (visionRes.quality_percentage !== undefined && visionRes.quality_percentage !== null) {
        const p = Number(visionRes.quality_percentage);
        if (p >= 90) finalGrade = 'Premium';
        else if (p >= 75) finalGrade = 'Excellent';
        else if (p >= 50) finalGrade = 'Good';
        else if (p >= 25) finalGrade = 'Fair';
        else finalGrade = 'Poor';
      }

      // If no percentage was parsed, fallback to string matching
      if (!finalGrade && visionRes.summary) {
        const lowerSummary = visionRes.summary.toLowerCase();
        if (lowerSummary.includes('grade is poor') || lowerSummary.includes('poor quality')) finalGrade = 'Poor';
        else if (lowerSummary.includes('grade is fair')) finalGrade = 'Fair';
        else if (lowerSummary.includes('grade is good') && !lowerSummary.includes('excellent')) finalGrade = 'Good';
        else if (lowerSummary.includes('grade is excellent')) finalGrade = 'Excellent';
        else if (lowerSummary.includes('grade is premium')) finalGrade = 'Premium';
      }

      const next: CropImageVerification = {
        signature,
        status: 'VERIFIED',
        detectedCrop: visionRes.detectedCrop || 'UNKNOWN',
        detectedCropId: visionRes.detectedCropId || null,
        confidence: typeof visionRes.confidence === 'number' ? visionRes.confidence : 0,
        summary: visionRes.summary || '',
        paragraphSummary: visionRes.summary || '',
        detailedDescription: visionRes.summary || '',
        textSymbols: [],
        primaryBoxes: [],
        grade: finalGrade,
        gradeReason: '',
        matches: true,
        userMessage: '',
      };

      // Auto-select crop ID if detected
      let finalDetectedCrop = next.detectedCrop;
       // Refinement logic: Search the summary for a more specific (longer) match.
      // This handles cases where AI says "Potato" but summary explicitly mentions "Sweet Potato".
      if (next.summary) {
        const summaryLower = next.summary.toLowerCase();
        // Sort crops by name length descending to find the MOST SPECIFIC match first
        const sortedCrops = [...cropsForUi].sort((a, b) => b.name.length - a.name.length);
        
        for (const crop of sortedCrops) {
          const cropLower = crop.name.toLowerCase();
          // Use word boundaries to avoid partial matches
          const regex = new RegExp(`\\b${cropLower}\\b`, 'i');
          if (regex.test(summaryLower)) {
            // Found a match in summary. Prefer it if:
            // 1. Current detection is unknown/empty
            // 2. This match is LONGER/MORE SPECIFIC than current detection
            if (!finalDetectedCrop || finalDetectedCrop === 'UNKNOWN' || crop.name.length > (finalDetectedCrop || '').length) {
              if (finalDetectedCrop !== crop.name) {
                console.log(`[Dashboard] Refining crop name from "${finalDetectedCrop}" to "${crop.name}" based on specific mention in summary.`);
                finalDetectedCrop = crop.name;
              }
              break; 
            }
          }
        }
      }

      if (finalDetectedCrop && finalDetectedCrop !== 'UNKNOWN') {
        // Tight matching: First try exact match, then try specific sub-string ONLY if detection is longer
        const matchingCrop = cropsForUi.find(c => c.name.toLowerCase() === finalDetectedCrop.toLowerCase()) ||
                           cropsForUi.find(c => finalDetectedCrop.toLowerCase().includes(c.name.toLowerCase()) && 
                                               finalDetectedCrop.length > c.name.length);
        
        if (matchingCrop) {
          console.log('[Dashboard] Matched crop ID:', matchingCrop.id, 'for', finalDetectedCrop);
          setNewListing(prev => ({ ...prev, cropId: matchingCrop.id }));
          setCropIdOverride(null);
          next.detectedCropId = matchingCrop.id;
          next.detectedCrop = matchingCrop.name; // Keep it clean
        }
      }

      console.log('[Dashboard] Setting imageVerification state:', next);
      setImageVerification(next);

      if (next.grade) {
        setNewListing(prev => {
          console.log('[Dashboard] Syncing newListing.grade to:', next.grade);
          return { ...prev, grade: next.grade as any };
        });
      }
      return next;
    } catch (e: any) {
      if (currentId !== verificationRequestId.current) return null;
      const msg = e?.message || 'Image verification failed.';
      setImageVerificationError(msg);
      setImageVerification(null);
      return null;
    } finally {
      if (currentId === verificationRequestId.current) {
        setIsVerifyingImages(false);
      }
    }
  };

  const processImageDataUrl = async (dataUrl: string) => {
    try {
      const img = new Image();
      const loaded = await new Promise<HTMLImageElement>((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Image decode failed'));
        img.src = dataUrl;
      });

      const maxSide = 1024;
      const w = loaded.width;
      const h = loaded.height;
      const scale = Math.min(1, maxSide / Math.max(w, h));
      const targetW = Math.max(1, Math.round(w * scale));
      const targetH = Math.max(1, Math.round(h * scale));

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return { original: dataUrl, cropped: dataUrl, metrics: null as QualityMetrics | null, suggestedRect: null as { x: number; y: number; size: number } | null };
      ctx.drawImage(loaded, 0, 0, targetW, targetH);
      const compressed = canvas.toDataURL('image/jpeg', 0.82);
      const base = compressed;

      const analysisSize = 192;
      const aScale = Math.min(1, analysisSize / Math.max(targetW, targetH));
      const aW = Math.max(1, Math.round(targetW * aScale));
      const aH = Math.max(1, Math.round(targetH * aScale));
      const analysisCanvas = document.createElement('canvas');
      analysisCanvas.width = aW;
      analysisCanvas.height = aH;
      const aCtx = analysisCanvas.getContext('2d', { willReadFrequently: true });
      if (!aCtx) return { original: base, cropped: base, metrics: null as QualityMetrics | null, suggestedRect: null as { x: number; y: number; size: number } | null };
      const analysisImg = new Image();
      await new Promise<void>((resolve, reject) => {
        analysisImg.onload = () => resolve();
        analysisImg.onerror = () => reject(new Error('Image decode failed'));
        analysisImg.src = base;
      });
      aCtx.drawImage(analysisImg, 0, 0, aW, aH);
      const imageData = aCtx.getImageData(0, 0, aW, aH);
      const rect = smartCropRectFromRGBA(imageData.data, aW, aH, 1);

      const cropRect = {
        x: Math.round((rect.x / aW) * targetW),
        y: Math.round((rect.y / aH) * targetH),
        w: Math.round((rect.w / aW) * targetW),
        h: Math.round((rect.h / aH) * targetH)
      };

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = cropRect.w;
      cropCanvas.height = cropRect.h;
      const cCtx = cropCanvas.getContext('2d');
      if (!cCtx) return { original: base, cropped: base, metrics: computeQualityMetricsFromRGBA(imageData.data, aW, aH), suggestedRect: null as { x: number; y: number; size: number } | null };
      cCtx.drawImage(canvas, cropRect.x, cropRect.y, cropRect.w, cropRect.h, 0, 0, cropRect.w, cropRect.h);
      const cropped = cropCanvas.toDataURL('image/jpeg', 0.85);
      const metrics = computeQualityMetricsFromRGBA(imageData.data, aW, aH);
      const sizeNorm = Math.min(1, Math.max(cropRect.w / targetW, cropRect.h / targetH));
      const suggestedRect = {
        x: Math.max(0, Math.min(1 - sizeNorm, cropRect.x / targetW)),
        y: Math.max(0, Math.min(1 - sizeNorm, cropRect.y / targetH)),
        size: sizeNorm
      };
      return { original: base, cropped, metrics, suggestedRect };
    } catch {
      return { original: dataUrl, cropped: dataUrl, metrics: null as QualityMetrics | null, suggestedRect: null as { x: number; y: number; size: number } | null };
    }
  };

  const processFiles = async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    const remainingSlots = Math.max(0, 6 - newListing.images.length);
    if (remainingSlots === 0) {
      const msg = 'Maximum 6 photos allowed per listing.';
      setImageValidationError(msg);
      geminiService.speak(msg);
      return;
    }
    const filesToProcess = validFiles.slice(0, remainingSlots);
    if (validFiles.length > filesToProcess.length) {
      const msg = `Only ${remainingSlots} more photo${remainingSlots === 1 ? '' : 's'} can be added. Extra photos were skipped.`;
      setImageValidationError(msg);
      geminiService.speak(msg);
    }

    if (filesToProcess.length === 0) return;

    if (isProcessingFiles.current) {
      console.log('[Dashboard] processFiles BLOCKED - already processing');
      return;
    }
    isProcessingFiles.current = true;
    console.log('[Dashboard] processFiles STARTING');

    try {
      setImageValidationError(null);
      setImageVerificationError(null);
      setQualityMetrics(null);
      setIsAnalyzingPhoto(true);

      const locallyAccepted: File[] = [];
      for (const file of filesToProcess) {
        try {
          const { width, height } = await new Promise<{ width: number; height: number }>((resolve, reject) => {
            if ('createImageBitmap' in window) {
              createImageBitmap(file)
                .then(bitmap => {
                  const size = { width: bitmap.width, height: bitmap.height };
                  bitmap.close();
                  resolve(size);
                })
                .catch(reject);
              return;
            }
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
              const size = { width: img.width, height: img.height };
              URL.revokeObjectURL(url);
              resolve(size);
            };
            img.onerror = () => {
              URL.revokeObjectURL(url);
              reject(new Error('Image load failed'));
            };
            img.src = url;
          });
          locallyAccepted.push(file);
        } catch {
          const msg = 'Photo format not supported. Try JPG or PNG.';
          setImageValidationError(msg);
          geminiService.speak(msg);
        }
      }

      if (locallyAccepted.length === 0) {
        setIsAnalyzingPhoto(false);
        return;
      }

      // Process all images in parallel
      const processedResults = await Promise.all(locallyAccepted.map(async (file) => {
        return new Promise<{ original: string, cropped: string, metrics: QualityMetrics | null }>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const raw = reader.result as string;
            resolve(await processImageDataUrl(raw));
          };
          reader.readAsDataURL(file);
        });
      }));

      const uploadedImages = processedResults.map(r => r.cropped);
      const uploadedRawImages = processedResults.map(r => r.original);
      const metricsCollected = processedResults.map(r => r.metrics).filter((m): m is QualityMetrics => !!m);

      if (metricsCollected.length > 0) {
        const avg = metricsCollected.reduce((acc, m) => ({
          sharpness: acc.sharpness + m.sharpness,
          exposure: acc.exposure + m.exposure,
          contrast: acc.contrast + m.contrast,
          noise: acc.noise + m.noise,
          colorBalance: acc.colorBalance + m.colorBalance,
          highlightsClipped: acc.highlightsClipped + m.highlightsClipped,
          shadowsClipped: acc.shadowsClipped + m.shadowsClipped
        }), { sharpness: 0, exposure: 0, contrast: 0, noise: 0, colorBalance: 0, highlightsClipped: 0, shadowsClipped: 0 });

        const denom = metricsCollected.length;
        const avgMetrics: QualityMetrics = {
          sharpness: avg.sharpness / denom,
          exposure: avg.exposure / denom,
          contrast: avg.contrast / denom,
          noise: avg.noise / denom,
          colorBalance: avg.colorBalance / denom,
          highlightsClipped: avg.highlightsClipped / denom,
          shadowsClipped: avg.shadowsClipped / denom
        };
        setQualityMetrics(avgMetrics);
        const localGrade = qualityGradeFromMetrics(avgMetrics);
        setNewListing(prev => ({ ...prev, grade: localGrade }));
      }

      // Update state and capture the NEW combined list for verification
      const nextImages = [...newListing.images, ...uploadedImages];
      setNewListing(prev => ({ ...prev, images: nextImages }));
      setRawListingImages(prev => [...prev, ...uploadedRawImages]);

      geminiService.speak('Photos uploaded.');

      try {
        await verifyListingImages(nextImages);
      } catch (verifErr) {
        console.error('[Dashboard] verifyListingImages error:', verifErr);
      }

    } finally {
      setIsAnalyzingPhoto(false);
      isProcessingFiles.current = false;
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
  };

  const removeImage = (index: number) => {
    let nextImages: string[] = [];
    let nextRaw: string[] = [];
    setNewListing(prev => {
      nextImages = prev.images.filter((_, i) => i !== index);
      return { ...prev, images: nextImages };
    });
    setRawListingImages(prev => {
      nextRaw = prev.filter((_, i) => i !== index);
      return nextRaw;
    });
    setImageVerification(null);
    setImageVerificationError(null);
    setQualityMetrics(null);
    if (nextImages.length > 0) {
      verifyListingImages(nextImages);
    }
    geminiService.speak("Photo removed.");
  };

  const setAsPrimary = (index: number) => {
    let nextImages: string[] = [];
    let nextRaw: string[] = [];
    setNewListing(prev => {
      const newImages = [...prev.images];
      const [moved] = newImages.splice(index, 1);
      newImages.unshift(moved);
      nextImages = newImages;
      return { ...prev, images: newImages };
    });
    setRawListingImages(prev => {
      const newRaw = [...prev];
      const [moved] = newRaw.splice(index, 1);
      newRaw.unshift(moved);
      nextRaw = newRaw;
      return newRaw;
    });
    setImageVerification(null);
    setImageVerificationError(null);
    setQualityMetrics(null);
    if (nextImages.length > 0) {
      verifyListingImages(nextImages);
    }
    geminiService.speak("Main photo updated.");
  };

  const openCropper = (idx: number) => {
    if (!rawListingImages[idx]) return;
    const b = imageVerification?.primaryBoxes?.[idx];
    if (b && typeof b.x === 'number' && typeof b.y === 'number' && typeof b.w === 'number' && typeof b.h === 'number') {
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      const size = Math.max(0.2, Math.min(1, Math.max(b.w, b.h)));
      const x = Math.max(0, Math.min(1 - size, cx - size / 2));
      const y = Math.max(0, Math.min(1 - size, cy - size / 2));
      setCropperRect({ x, y, size });
    } else {
      setCropperRect({ x: 0.1, y: 0.1, size: 0.8 });
    }
    setCropperIndex(idx);
  };

  const applyCropForIndex = async (idx: number) => {
    const src = rawListingImages[idx];
    if (!src) return;
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Image decode failed'));
      img.src = src;
    });
    const w = img.width;
    const h = img.height;
    const sizePx = Math.max(1, Math.round(cropperRect.size * Math.min(w, h)));
    const xPx = Math.max(0, Math.min(w - sizePx, Math.round(cropperRect.x * w)));
    const yPx = Math.max(0, Math.min(h - sizePx, Math.round(cropperRect.y * h)));
    const canvas = document.createElement('canvas');
    canvas.width = sizePx;
    canvas.height = sizePx;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, xPx, yPx, sizePx, sizePx, 0, 0, sizePx, sizePx);
    const cropped = canvas.toDataURL('image/jpeg', 0.88);

    let nextImages: string[] = [];
    setNewListing(prev => {
      nextImages = [...prev.images];
      nextImages[idx] = cropped;
      return { ...prev, images: nextImages };
    });
    setCropperIndex(null);
    setImageVerification(null);
    setImageVerificationError(null);
    if (nextImages.length > 0) {
      await verifyListingImages(nextImages);
    }
  };






  const renderProfileViewer = () => (
    <div className="space-y-6 animate-in slide-in-from-right duration-300 pb-20">
      <div className="flex items-center gap-4 mb-2 px-1">
        <button
          onClick={() => setInternalView('default')}
          className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-400"
          aria-label="Back"
        >
          <i className="fas fa-chevron-left"></i>
        </button>
        <h2 className="font-black text-2xl tracking-tight">Profile Details</h2>
      </div>

      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 space-y-6">
        {/* Personal Information */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <i className="fas fa-user text-green-500"></i>
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-900">Personal Information</p>
          </div>

          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-100 shadow-sm relative">
              {tempProfile.profilePhoto ? (
                <img src={tempProfile.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-green-50 flex items-center justify-center text-3xl text-green-600 font-black">
                  {tempProfile.name?.charAt(0)}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Full Name</label>
              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="font-bold text-lg">{tempProfile.name || 'Not specified'}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Gender</label>
              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="font-bold text-lg">{tempProfile.gender || 'Not specified'}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Email Address</label>
              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="font-bold text-lg">{tempProfile.email || 'Not provided'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Location Information */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <i className="fas fa-location-dot text-green-500"></i>
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-900">Location Details</p>
          </div>

          <div className="space-y-2">
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="font-medium">{tempProfile.address || 'Address not provided'}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Village/City</label>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="font-bold">{tempProfile.village || 'Not specified'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">District</label>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="font-bold">{tempProfile.district || 'Not specified'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">State</label>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="font-bold">{tempProfile.state || 'Not specified'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Pincode</label>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="font-bold">{tempProfile.pincode || 'Not specified'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Button */}
        <div className="pt-4 border-t border-gray-100">
          <button
            onClick={() => setInternalView('editProfile')}
            className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg uppercase tracking-widest shadow-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
          >
            <i className="fas fa-edit"></i>
            Edit Profile
          </button>
        </div>
      </div>
    </div>
  );

  const renderProfileEditor = () => (
    <div className="space-y-6 animate-in slide-in-from-right duration-300 pb-20">
      <div className="flex items-center gap-4 mb-2 px-1">
        <button
          onClick={() => setInternalView('default')}
          className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-400"
          aria-label="Back"
        >
          <i className="fas fa-chevron-left"></i>
        </button>
        <h2 className="font-black text-2xl tracking-tight">{t('farmer.edit_profile')}</h2>
      </div>

      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 space-y-8">
        <div className="space-y-6">

          {/* Profile Photo Upload */}
          <div className="flex justify-center">
            <div className="relative group cursor-pointer">
              <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-gray-100 shadow-sm relative bg-gray-50">
                {tempProfile.profilePhoto ? (
                  <img src={tempProfile.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">
                    <i className="fas fa-user"></i>
                  </div>
                )}
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <i className="fas fa-camera text-white text-2xl"></i>
                </div>
              </div>
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                onChange={handleProfilePhotoUpload}
              />
              {tempProfile.profilePhoto ? (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    if (window.confirm("Remove profile photo?")) {
                      setTempProfile(prev => ({ ...prev, profilePhoto: '' }));
                      onUpdateProfile({ profilePhoto: '' });
                      geminiService.speak("Profile photo removed.");
                    }
                  }}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-red-500 rounded-full text-white shadow-md flex items-center justify-center z-20 hover:bg-red-600 transition-colors"
                >
                  <i className="fas fa-trash text-xs"></i>
                </button>
              ) : (
                <button className="absolute bottom-0 right-0 w-8 h-8 bg-green-500 rounded-full text-white shadow-md flex items-center justify-center pointer-events-none">
                  <i className="fas fa-pen text-xs"></i>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Full Name</label>
            <div className="relative">
              <i className="fas fa-user absolute left-5 top-1/2 -translate-y-1/2 text-gray-300"></i>
              <input
                type="text"
                value={tempProfile.name}
                onChange={(e) => setTempProfile(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-gray-50 border-0 p-5 pl-14 rounded-2xl font-bold focus:ring-2 focus:ring-green-50 outline-none text-lg"
                placeholder="Enter your name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Gender</label>
            <div className="flex gap-3">
              {[Gender.MALE, Gender.FEMALE, Gender.OTHER].map(g => (
                <button
                  key={g}
                  onClick={() => setTempProfile(prev => ({ ...prev, gender: g }))}
                  className={`flex-1 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 transition-all ${tempProfile.gender === g ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-50 text-gray-400'
                    }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Email Address</label>
            <div className="relative">
              <i className="fas fa-envelope absolute left-5 top-1/2 -translate-y-1/2 text-gray-300"></i>
              <input
                type="email"
                value={tempProfile.email}
                onChange={(e) => setTempProfile(prev => ({ ...prev, email: e.target.value }))}
                className="w-full bg-gray-50 border-0 p-5 pl-14 rounded-2xl font-bold focus:ring-2 focus:ring-green-50 outline-none text-lg"
                placeholder="email@example.com"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6 pt-6 border-t border-gray-50">
          <div className="flex items-center gap-2 px-1">
            <i className="fas fa-location-dot text-green-500"></i>
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-900">Location Details</p>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Location Selection</label>
            <div className="rounded-2xl overflow-hidden border border-gray-100">
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
                    address: loc.fullAddress || '',
                    village: loc.city || loc.town || loc.village || '',
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
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Street Address</label>
            <input
              type="text"
              value={tempProfile.address}
              onChange={(e) => setTempProfile(prev => ({ ...prev, address: e.target.value }))}
              className="w-full bg-gray-50 border-0 p-4 rounded-xl font-bold focus:ring-2 focus:ring-green-50 outline-none"
              placeholder="House, Street, Area"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Village/City</label>
              <input
                type="text"
                value={tempProfile.village}
                onChange={(e) => setTempProfile(prev => ({ ...prev, village: e.target.value }))}
                className="w-full bg-gray-50 border-0 p-4 rounded-xl font-bold focus:ring-2 focus:ring-green-50 outline-none"
                placeholder="Village/City"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">District</label>
              <input
                type="text"
                value={tempProfile.district}
                onChange={(e) => setTempProfile(prev => ({ ...prev, district: e.target.value }))}
                className="w-full bg-gray-50 border-0 p-4 rounded-xl font-bold focus:ring-2 focus:ring-green-50 outline-none"
                placeholder="District"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">State</label>
              <input
                type="text"
                value={tempProfile.state}
                onChange={(e) => setTempProfile(prev => ({ ...prev, state: e.target.value }))}
                className="w-full bg-gray-50 border-0 p-4 rounded-xl font-bold focus:ring-2 focus:ring-green-50 outline-none"
                placeholder="State"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Pincode</label>
              <input
                type="text"
                value={tempProfile.pincode}
                onChange={(e) => setTempProfile(prev => ({ ...prev, pincode: e.target.value }))}
                className="w-full bg-gray-50 border-0 p-4 rounded-xl font-bold focus:ring-2 focus:ring-green-50 outline-none"
                placeholder="Pincode"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleSaveProfile}
          className="w-full bg-gray-900 text-white py-6 rounded-[24px] font-black text-lg uppercase tracking-widest shadow-2xl shadow-gray-200 active:scale-95 transition-all"
        >
          Update Profile
        </button>
      </div>
    </div>
  );


  const renderAddEditListing = () => {
    const qualitySummary = imageVerification?.paragraphSummary || imageVerification?.summary || imageVerification?.detailedDescription || '';
    const detectedCropName = imageVerification?.detectedCrop || (imageVerification?.detectedCropId ? getCropNameById(imageVerification.detectedCropId) : '');
    return (
      <div className="space-y-6 pb-20 animate-in fade-in duration-500">
        <div className="flex items-center gap-4 mb-2">
          <button onClick={() => { setInternalView('default'); setEditListingId(null); }} className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-400" aria-label="Back">
            <i className="fas fa-chevron-left"></i>
          </button>
          <h2 className="font-black text-2xl tracking-tight">{editListingId ? t('common.edit') : t('farmer.add_crop')}</h2>
        </div>

        <div className="bg-white p-6 rounded-[40px] shadow-sm border border-gray-100 space-y-8">
          {/* Crop Selection */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Select Crop</label>
            <div className="crop-selection-grid-container no-scrollbar-style">
              <div className="grid grid-cols-3 gap-2">
                {cropsForUi.map(crop => (
                  <button
                    key={crop.id}
                    onClick={() => {
                      setImageValidationError(null);
                      setImageVerificationError(null);
                      setCropIdOverride(crop.id);
                      setNewListing(prev => ({ ...prev, cropId: crop.id }));
                    }}
                    className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-2 group ${newListing.cropId === crop.id ? 'border-green-600 bg-green-50 shadow-md shadow-green-100' : 'border-gray-50 bg-gray-50/30'}`}
                  >
                    <span className={`text-2xl transition-transform group-active:scale-125 ${newListing.cropId === crop.id ? 'scale-110' : ''}`}>{crop.icon}</span>
                    <span className={`text-[9px] font-black uppercase tracking-tighter ${newListing.cropId === crop.id ? 'text-green-700' : 'text-gray-400'}`}>{crop.name}</span>
                  </button>
                ))}
              </div>
            </div>
            {imageVerification?.detectedCrop && imageVerification.detectedCrop !== 'UNKNOWN' && (
              <div className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3">
                <div>
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Detected Crop</p>
                  <p className="text-[11px] font-bold text-gray-700 mt-1">{imageVerification.detectedCrop}</p>
                  {!imageVerification.detectedCropId && (
                    <p className="text-[8px] text-orange-500 font-bold mt-0.5">Not in crop list — select manually below</p>
                  )}
                </div>
                {imageVerification.detectedCropId && (
                  <button
                    onClick={() => {
                      setCropIdOverride(null);
                      setNewListing(prev => ({ ...prev, cropId: imageVerification.detectedCropId as any }));
                    }}
                    className="shrink-0 bg-gray-900 text-white px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest"
                    aria-label="Use detected crop"
                  >
                    Use Detected
                  </button>
                )}
              </div>
            )}
            {cropIdOverride && (
              <p className="text-[10px] font-bold text-gray-500 px-1">Manual crop selection applied.</p>
            )}
          </div>

          {/* Enhanced Image Upload Area */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Harvest Photos</label>
                <span className="bg-gray-100 px-2 py-0.5 rounded text-[8px] font-black text-gray-500 uppercase">{newListing.images.length}/6</span>
              </div>
              {isAnalyzingPhoto && (
                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1.5">
                  <i className="fas fa-sparkles animate-pulse"></i> Analyzing...
                </span>
              )}
            </div>
            {imageValidationError && (
              <div className="px-1 -mt-2">
                <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">{imageValidationError}</p>
              </div>
            )}

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`flex gap-4 overflow-x-auto no-scrollbar pb-4 pt-1 px-1 transition-all rounded-[36px] ${isDragging ? 'bg-green-50 ring-2 ring-green-400' : ''}`}
            >
              {/* Upload Button */}
              {newListing.images.length < 6 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-32 h-32 rounded-[40px] bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-3 shrink-0 hover:bg-green-50 hover:border-green-400 transition-all active:scale-95 group"
                >
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-gray-300 group-hover:text-green-500 transition-colors shadow-sm">
                    <i className="fas fa-camera text-xl"></i>
                  </div>
                  <div className="text-center">
                    <p className="text-[8px] font-black text-gray-400 group-hover:text-green-600 uppercase">Add photo</p>
                    <p className="text-[6px] font-bold text-gray-300 uppercase mt-0.5">Drag & Drop</p>
                  </div>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                aria-label="Upload crop photos"
                title="Upload crop photos"
              />

              {/* Preview List */}
              {newListing.images.map((img, idx) => (
                <div key={idx} className="relative w-32 h-32 rounded-[40px] overflow-hidden shrink-0 shadow-lg border-2 border-white animate-in zoom-in slide-in-from-right duration-300 group">
                  <img
                    src={img}
                    className="w-full h-full object-cover cursor-pointer transition-transform duration-500 group-hover:scale-110"
                    alt={`Harvest ${idx}`}
                    onClick={() => setPreviewImageUrl(img)}
                  />

                  {/* Image Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                  <button
                    onClick={(e) => { e.stopPropagation(); openCropper(idx); }}
                    className="absolute top-2 left-2 w-8 h-8 bg-black/40 backdrop-blur-md text-white rounded-xl flex items-center justify-center text-[10px] shadow-lg border border-white/20 active:scale-75 transition-all hover:bg-white/30"
                    aria-label="Adjust crop"
                  >
                    <i className="fas fa-crop-simple"></i>
                  </button>

                  {/* Removal Button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                    className="absolute top-2 right-2 w-8 h-8 bg-black/40 backdrop-blur-md text-white rounded-xl flex items-center justify-center text-[10px] shadow-lg border border-white/20 active:scale-75 transition-all hover:bg-red-500"
                    aria-label="Remove photo"
                  >
                    <i className="fas fa-trash-can"></i>
                  </button>

                  {/* Set as Primary Action */}
                  {idx !== 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setAsPrimary(idx); }}
                      className="absolute bottom-2 right-2 px-2 py-1 bg-white/20 backdrop-blur-md text-white rounded-lg text-[6px] font-black uppercase tracking-widest border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Set Main
                    </button>
                  )}

                  {/* Primary Tag */}
                  {idx === 0 && (
                    <div className="absolute bottom-3 left-3 bg-emerald-500 text-white px-2 py-0.5 rounded-lg text-[7px] font-black uppercase tracking-widest shadow-md flex items-center gap-1">
                      <i className="fas fa-star text-[6px]"></i> Main
                    </div>
                  )}
                </div>
              ))}

              {newListing.images.length === 0 && !isAnalyzingPhoto && (
                <div className="flex-grow min-w-[200px] h-32 border-2 border-dashed border-gray-100 rounded-[40px] flex items-center justify-center flex-col gap-2 bg-gray-50/50">
                  <i className="fas fa-images text-gray-200 text-2xl"></i>
                  <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Upload your crop photos</p>
                </div>
              )}
            </div>

            <div className="bg-blue-50/50 p-4 rounded-3xl border border-blue-100 flex items-start gap-3">
              <i className="fas fa-lightbulb text-blue-400 mt-1"></i>
              <p className="text-[9px] font-bold text-blue-700 leading-relaxed uppercase">
                TIP: Listings with bright, clear photos harvested in daylight receive up to 3x more bids.
              </p>
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Summary</label>
              {isVerifyingImages && (
                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1.5">
                  <i className="fas fa-sparkles animate-pulse"></i> Verifying...
                </span>
              )}
            </div>

            {imageVerificationError && (
              <div className="px-1 -mt-2">
                <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">{imageVerificationError}</p>
              </div>
            )}

            <div className="bg-gray-50 border border-gray-100 rounded-3xl p-5 space-y-4">
              {newListing.images.length === 0 && !imageVerification && (
                <div className="bg-white rounded-2xl p-4 border border-gray-100">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Upload Photos</p>
                  <p className="text-[11px] font-bold text-gray-700 mt-2 leading-relaxed">Upload crop photos to auto-detect crop, grade, and generate image summary.</p>
                </div>
              )}


              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-2xl p-4 border border-gray-100">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex justify-between items-center">
                    Detected Grade
                    {imageVerification && (
                      <span className="text-[7px] text-green-500 flex items-center gap-1">
                        <i className="fas fa-check-circle"></i> AI Verified
                      </span>
                    )}
                  </p>
                  <div className="relative mt-1">
                    <select
                      value={isVerifyingImages ? 'Analyzing...' : (newListing.grade || 'Select Grade')}
                      onChange={(e) => setNewListing(prev => ({ ...prev, grade: e.target.value as any }))}
                      disabled={isVerifyingImages}
                      className="w-full bg-transparent border-0 p-0 font-black text-gray-900 text-base appearance-none focus:ring-0 cursor-pointer disabled:opacity-50"
                      aria-label="Crop grade selection"
                    >
                      {isVerifyingImages && <option value="Analyzing...">Analyzing...</option>}
                      <option value="Premium">Premium</option>
                      <option value="Excellent">Excellent</option>
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Poor">Poor</option>
                    </select>
                    {!isVerifyingImages && (
                      <i className="fas fa-chevron-down absolute right-0 top-1/2 -translate-y-1/2 text-[10px] text-gray-300 pointer-events-none"></i>
                    )}
                  </div>
                  {newListing.grade === 'Poor' && !isVerifyingImages && (
                    <div className="mt-3 p-2 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2">
                      <i className="fas fa-circle-exclamation text-red-500 mt-0.5 text-[10px]"></i>
                      <p className="text-[10px] font-bold text-red-600 leading-snug">
                        Quality too low. Crops in "Poor" condition cannot be listed on the platform.
                      </p>
                    </div>
                  )}
                  {imageVerification?.gradeReason && !isVerifyingImages && (
                    <p className="text-[10px] font-bold text-gray-500 mt-2 leading-snug">{imageVerification.gradeReason}</p>
                  )}
                </div>
                <div className="bg-white rounded-2xl p-4 border border-gray-100">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</p>
                  <p className="text-base font-black text-gray-900 mt-1">
                    {isVerifyingImages ? 'VERIFYING...' : (imageVerification?.status || 'PENDING')}
                  </p>
                  {imageVerification?.detectedCropId && imageVerification?.detectedCropId !== newListing.cropId && !isVerifyingImages && (
                    <p className="text-[10px] font-bold text-gray-500 mt-2 leading-snug">Crop updated from image.</p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Quality Summary</p>
                <p className="text-lg font-bold text-gray-700 mt-2 leading-relaxed whitespace-pre-line">
                  {qualitySummary || 'Upload crop photos to generate a quality summary.'}
                </p>
              </div>

              {imageVerification?.textSymbols && imageVerification.textSymbols.length > 0 && (
                <div className="bg-white rounded-2xl p-4 border border-gray-100">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Text / Symbols</p>
                  <p className="text-[11px] font-bold text-gray-700 mt-2 leading-relaxed">{imageVerification.textSymbols.join(', ')}</p>
                </div>
              )}
            </div>
          </div>
          {/* Quantity and Price */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Total Quantity</label>
              <div className="relative">
                <input
                  type="number"
                  value={newListing.quantity}
                  onChange={(e) => setNewListing(prev => ({ ...prev, quantity: e.target.value }))}
                  className="w-full bg-gray-50 border-0 p-5 rounded-2xl font-black focus:ring-2 focus:ring-green-500 outline-none text-lg"
                  placeholder="0"
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 uppercase">KG</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Price per kg</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-gray-400 text-lg">₹</span>
                <input
                  type="number"
                  value={newListing.expectedPrice}
                  onChange={(e) => setNewListing(prev => ({ ...prev, expectedPrice: e.target.value }))}
                  className="w-full bg-gray-50 border-0 p-5 pl-10 rounded-2xl font-black focus:ring-2 focus:ring-green-500 outline-none text-lg"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Harvest Date</label>
              <div className="relative">
                <i className="fas fa-calendar-days absolute left-5 top-1/2 -translate-y-1/2 text-gray-300"></i>
                <input
                  type="date"
                  value={newListing.harvestDate}
                  onChange={(e) => setNewListing(prev => ({ ...prev, harvestDate: e.target.value }))}
                  className="w-full bg-gray-50 border-0 p-5 pl-14 rounded-2xl font-black focus:ring-2 focus:ring-green-500 outline-none"
                  aria-label="Harvest date"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Sale Date</label>
              <div className="relative">
                <i className="fas fa-calendar-check absolute left-5 top-1/2 -translate-y-1/2 text-gray-300"></i>
                <input
                  type="date"
                  value={newListing.saleDate}
                  onChange={(e) => setNewListing(prev => ({ ...prev, saleDate: e.target.value }))}
                  className="w-full bg-gray-50 border-0 p-5 pl-14 rounded-2xl font-black focus:ring-2 focus:ring-green-500 outline-none"
                  aria-label="Sale date"
                />
              </div>
            </div>
          </div>





          <button
            onClick={handlePublish}
            disabled={!newListing.quantity || !newListing.expectedPrice || newListing.images.length === 0 || isAnalyzingPhoto || isVerifyingImages || !!imageValidationError || newListing.grade === 'Poor'}
            className="w-full bg-green-600 text-white py-6 rounded-3xl font-black text-lg uppercase tracking-widest shadow-2xl shadow-green-100 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
          >
            {editListingId ? 'Save Changes' : 'Publish Harvest'}
          </button>
        </div>

        {/* Image Preview Modal */}
        {previewImageUrl && (
          <div className="fixed inset-0 z-[200] bg-gradient-to-br from-[#f8f9fa]/95 via-white/85 to-[#e9ecef]/95 backdrop-blur-xl flex flex-col p-6 animate-in fade-in duration-300">
            <div className="flex justify-end mb-6">
              <button
                onClick={() => setPreviewImageUrl(null)}
                className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center text-xl hover:bg-white/20 active:scale-90 transition-all"
                aria-label="Close preview"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="flex-grow flex items-center justify-center relative">
              <img
                src={previewImageUrl}
                className="max-w-full max-h-[70vh] rounded-[40px] shadow-2xl object-contain animate-in zoom-in-95 duration-500"
                alt="Preview Large"
              />
            </div>
            <div className="py-10 text-center">
              <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Inspection View</p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setPreviewImageUrl(null)}
                  className="bg-white text-gray-900 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px]"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}

        {cropperIndex !== null && rawListingImages[cropperIndex] && (
          <div className="fixed inset-0 z-[210] bg-black/70 backdrop-blur-md flex flex-col p-6 animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <p className="text-white text-[10px] font-black uppercase tracking-[0.3em]">Adjust Crop</p>
              <button
                onClick={() => { setCropperIndex(null); setIsDraggingCrop(false); setDragStart(null); }}
                className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center text-xl hover:bg-white/20 active:scale-90 transition-all"
                aria-label="Close cropper"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="flex-grow flex items-center justify-center">
              <div
                ref={cropperContainerRef}
                className="relative w-full max-w-md aspect-square rounded-[32px] overflow-hidden bg-black/30 border border-white/10"
                onMouseMove={(e) => {
                  if (!isDraggingCrop || !dragStart || !cropperContainerRef.current) return;
                  const rect = cropperContainerRef.current.getBoundingClientRect();
                  const dx = (e.clientX - dragStart.x) / rect.width;
                  const dy = (e.clientY - dragStart.y) / rect.height;
                  const size = cropperRect.size;
                  const x = Math.max(0, Math.min(1 - size, dragStart.rectX + dx));
                  const y = Math.max(0, Math.min(1 - size, dragStart.rectY + dy));
                  setCropperRect(prev => ({ ...prev, x, y }));
                }}
                onMouseUp={() => { setIsDraggingCrop(false); setDragStart(null); }}
                onMouseLeave={() => { setIsDraggingCrop(false); setDragStart(null); }}
              >
                <img src={rawListingImages[cropperIndex]} className="absolute inset-0 w-full h-full object-cover" alt="Crop preview" />
                <div className="absolute inset-0 bg-black/35"></div>

                <div
                  ref={cropperRectRef}
                  className="absolute border-2 border-white rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] cursor-move cropper-rect"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIsDraggingCrop(true);
                    setDragStart({ x: e.clientX, y: e.clientY, rectX: cropperRect.x, rectY: cropperRect.y });
                  }}
                />
              </div>
            </div>

            <div className="mt-6 bg-white/10 rounded-3xl p-4 border border-white/10">
              <div className="flex items-center justify-between gap-4">
                <p className="text-white/80 text-[9px] font-black uppercase tracking-widest">Crop Size</p>
                <p className="text-white text-[10px] font-black uppercase tracking-widest">{Math.round(cropperRect.size * 100)}%</p>
              </div>
              <input
                type="range"
                min={0.2}
                max={1}
                step={0.01}
                value={cropperRect.size}
                onChange={(e) => {
                  const size = Math.max(0.2, Math.min(1, Number(e.target.value)));
                  const x = Math.max(0, Math.min(1 - size, cropperRect.x));
                  const y = Math.max(0, Math.min(1 - size, cropperRect.y));
                  setCropperRect({ x, y, size });
                }}
                className="w-full mt-3"
                aria-label="Crop size"
              />

              <div className="grid grid-cols-2 gap-3 mt-4">
                <button
                  onClick={() => { setCropperIndex(null); setIsDraggingCrop(false); setDragStart(null); }}
                  className="bg-white/10 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={() => cropperIndex !== null && applyCropForIndex(cropperIndex)}
                  className="bg-white text-gray-900 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px]"
                >
                  Save Crop
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderHome = () => (
    <div className="space-y-8">
      <div className="bg-gray-900 text-white p-6 md:p-8 rounded-3xl md:rounded-[40px] shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-green-400 mb-2">{t('common.earnings_balance')}</p>
          <h2 className="text-3xl md:text-4xl font-black mb-6 tracking-tighter">₹{totalEarned.toLocaleString()}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 p-4 rounded-2xl border border-white/5">
              <p className="text-[9px] font-black uppercase opacity-40 mb-1">{t('common.volume_sold')}</p>
              <p className="text-lg font-black">{totalVolume} kg</p>
            </div>
            <div className="bg-white/10 p-4 rounded-2xl border border-white/5">
              <p className="text-[9px] font-black uppercase opacity-40 mb-1">{t('common.pending')}</p>
              <p className="text-lg font-black text-amber-400">₹{pendingPayments.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <i className="fas fa-coins absolute right-[-20px] top-[-20px] text-[150px] opacity-10 rotate-12"></i>
      </div>

      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0 overflow-hidden relative border border-green-100">
            {user.profilePhoto ? (
              <img src={user.profilePhoto} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              user.name.charAt(0)
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-black text-gray-900 leading-tight truncate">{user.name}</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate">
              {user.location?.village}, {user.location?.district}
            </p>
          </div>
        </div>
        <button
          onClick={() => setInternalView('viewProfile')}
          className="bg-gray-50 text-gray-500 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:text-green-600 transition-colors"
        >
          {t('farmer.edit_profile')}
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">AI Crop Suggestions</h3>
          <button
            onClick={fetchRecommendations}
            disabled={isLoadingRecs}
            className="text-[9px] font-black text-green-600 uppercase tracking-widest flex items-center gap-1.5"
          >
            <i className={`fas fa-arrows-rotate ${isLoadingRecs ? 'fa-spin' : ''}`}></i> Refresh
          </button>
        </div>

        {isLoadingRecs ? (
          <div className="grid grid-cols-1 gap-4">
            {[1, 2].map(i => (
              <div key={i} className="bg-white p-6 rounded-[32px] border border-gray-100 animate-pulse space-y-4">
                <div className="flex justify-between">
                  <div className="h-5 w-32 bg-gray-100 rounded-lg"></div>
                  <div className="h-5 w-16 bg-gray-100 rounded-full"></div>
                </div>
                <div className="h-3 w-full bg-gray-50 rounded"></div>
                <div className="h-3 w-2/3 bg-gray-50 rounded"></div>
              </div>
            ))}
          </div>
        ) : aiRecommendations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {aiRecommendations.map((rec, idx) => (
              <div key={idx} className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 relative group overflow-hidden transition-all hover:border-green-100">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-black text-lg text-gray-900 leading-none">{rec.cropName}</h4>
                    <p className={`text-[9px] font-black uppercase tracking-widest mt-2 flex items-center gap-1.5 ${rec.trend.toLowerCase().includes('rising') ? 'text-emerald-500' : 'text-blue-500'
                      }`}>
                      <i className={`fas ${rec.trend.toLowerCase().includes('rising') ? 'fa-arrow-trend-up' : 'fa-chart-line'}`}></i>
                      Trend: {rec.trend}
                    </p>
                  </div>
                  <span className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-green-100 shadow-sm">
                    {rec.demand} Demand
                  </span>
                </div>

                <p className="text-xs font-bold text-gray-500 leading-relaxed mb-4">
                  {rec.reason}
                </p>

                <div className="flex justify-between items-center">
                  <button
                    onClick={() => geminiService.speak(`Suggestion for ${rec.cropName}: ${rec.reason}. Demand is ${rec.demand} and the trend is ${rec.trend}.`)}
                    className="bg-gray-50 hover:bg-green-50 text-gray-400 hover:text-green-600 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                  >
                    <i className="fas fa-volume-high"></i> Listen to Detail
                  </button>
                  <button
                    onClick={() => {
                      const crop = cropsForUi.find(c => c.name.toLowerCase() === rec.cropName.toLowerCase());
                      if (crop) setNewListing(prev => ({ ...prev, cropId: crop.id }));
                      setNewListing(prev => ({ ...prev, saleDate: new Date().toISOString().split('T')[0] }));
                      setInternalView('add');
                    }}
                    className="text-[9px] font-black text-gray-900 uppercase tracking-widest border-b-2 border-gray-100 hover:border-green-600 transition-all"
                  >
                    List this Crop <i className="fas fa-chevron-right ml-1"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white p-8 rounded-[32px] border-2 border-dashed border-gray-100 text-center py-10">
            <i className="fas fa-robot text-gray-100 text-3xl mb-3"></i>
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No recommendations yet</p>
          </div>
        )}
      </div>

      <div className="space-y-5">
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 px-1">{t('common.tips_for_success')}</h3>
        <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-3 md:gap-4">
          {tipsForSuccess.map((tip) => (
            <div key={tip.id} className={`p-6 rounded-[32px] border-2 shadow-sm transition-all hover:shadow-md ${tip.color} flex gap-5 relative overflow-hidden group`}>
              <div className="w-12 h-12 rounded-2xl bg-white/50 backdrop-blur-sm flex items-center justify-center text-xl shrink-0"><i className={`fas ${tip.icon}`}></i></div>
              <div className="min-w-0 flex-grow">
                <h4 className="font-black text-sm tracking-tight mb-1">{tip.title}</h4>
                <p className="text-xs font-bold leading-relaxed opacity-80 mb-4">{tip.desc}</p>
                <button onClick={() => geminiService.speak(`${tip.title}. ${tip.desc}`)} className="flex items-center gap-2 bg-white/60 hover:bg-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">
                  <i className="fas fa-volume-high"></i> Listen to Advice
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <WeatherWidget
        location={user.location}
        coords={user.location?.coordinates || { lat: 16.3067, lng: 80.4365 }}
      />
    </div>
  );

  const renderEarnings = () => (
    <div className="space-y-8 pb-20 px-1 animate-in fade-in duration-500">
      <div className="bg-gray-900 text-white p-6 md:p-8 rounded-[32px] md:rounded-[48px] shadow-2xl relative overflow-hidden border border-white/5">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-green-400 mb-2">Total Accumulated Revenue</p>
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter">₹{totalEarned.toLocaleString()}</h2>
            </div>
            <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/10">
              <i className="fas fa-sack-dollar text-2xl text-green-400"></i>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/5 p-5 rounded-[28px] backdrop-blur-sm">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Crops Liquidated</p>
              <p className="text-xl font-black">{soldHistory.length} Shipments</p>
            </div>
            <div className="bg-white/5 border border-white/5 p-5 rounded-[28px] backdrop-blur-sm">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Stock Out Volume</p>
              <p className="text-xl font-black text-green-400">{totalVolume.toLocaleString()} KG</p>
            </div>
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-green-500/10 rounded-full blur-[80px]"></div>
      </div>

      <div className="space-y-6">
        <div className="flex justify-between items-center px-2">
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Income Ledger</h3>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Real-time stats</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {soldHistory.map((item, idx) => (
            <div key={item.id} className={`bg-white rounded-[32px] p-1 border border-gray-100 shadow-sm transition-all hover:shadow-xl hover:border-green-100 group animate-in slide-in-from-bottom duration-500 ${getAnimDelayClass(idx, 150)}`}>
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-gray-100 group-hover:bg-green-50 transition-colors">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="font-black text-lg text-gray-900 leading-tight">{item.cropName} Sale</h4>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                        <i className="fas fa-calendar-day text-blue-500"></i> {item.date}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-emerald-600 leading-none mb-1">₹{item.amount.toLocaleString()}</p>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Payout Confirmed</p>
                  </div>
                </div>

                <div className="bg-gray-50/50 rounded-2xl p-4 flex flex-col gap-3 border border-gray-50">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <i className="fas fa-user-tie text-gray-300"></i> Buyer
                    </span>
                    <span className="text-xs font-black text-gray-800">{item.buyer}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <i className="fas fa-weight-hanging text-gray-300"></i> Quantity Sold
                    </span>
                    <span className="text-xs font-black text-gray-800">{item.qty.toLocaleString()} KG</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <i className="fas fa-tag text-gray-300"></i> Rate Agreed
                    </span>
                    <span className="text-xs font-black text-gray-800">₹{item.price} / KG</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50/30 border-t border-gray-50 px-6 py-4 flex justify-between items-center rounded-b-[32px]">
                <button className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 hover:text-green-600 transition-colors">
                  <i className="fas fa-file-invoice"></i> View Digital Bill
                </button>
                <div className="flex gap-1">
                  {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-500/20"></div>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {pendingPayments > 0 && (
        <div className="bg-amber-50 border-2 border-amber-100 p-6 rounded-[32px] flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-400 text-white rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-amber-100">
              <i className="fas fa-hourglass-half"></i>
            </div>
            <div>
              <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest leading-none mb-1">Incoming Transit Payout</p>
              <h4 className="font-black text-amber-900 text-lg">₹{pendingPayments.toLocaleString()}</h4>
            </div>
          </div>
          <button className="bg-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-amber-600 shadow-sm border border-amber-200">
            Track Load
          </button>
        </div>
      )}
    </div>
  );

  // Main component return
  if (internalView === 'add') {
    return renderAddEditListing();
  }

  if (internalView === 'editProfile') {
    return renderProfileEditor();
  }

  if (internalView === 'viewProfile' || activeTab === 'account') {
    return renderProfileViewer();
  }

  return (
    <div className="md:p-4 pt-1 w-full mx-auto pb-24 md:pb-8 h-full relative">
      {(activeTab === 'home' || !activeTab) && renderHome()}
      {activeTab === 'orders' && (
        <FarmerOrdersView />
      )}
      {activeTab === 'earnings' && renderEarnings()}

      {activeTab === 'listings' && (
        <div className="space-y-6 pb-20">
          <div className="flex justify-between items-center px-1 mb-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('farmer.my_listings')}</h3>
            <button
              onClick={() => { setInternalView('add'); setEditListingId(null); setRawListingImages([]); setImageVerification(null); setImageVerificationError(null); setQualityMetrics(null); setNewListing({ cropId: '1', harvestType: HarvestType.HARVESTED_CROP, quantity: '', unit: 'kg', expectedPrice: '', grade: 'Premium', harvestDate: new Date().toISOString().split('T')[0], saleDate: new Date().toISOString().split('T')[0], images: [] }); }}
              className="bg-black text-white px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
            >
              <i className="fas fa-plus mr-2"></i> {t('farmer.add_listing')}
            </button>
          </div>

          {listingsLoadError && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-3xl">
              <p className="text-[10px] font-black text-red-700 uppercase tracking-widest">{listingsLoadError}</p>
              <div className="flex gap-3 mt-3">
                <button onClick={loadMyListings} className="bg-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-red-700 border border-red-200">
                  Retry
                </button>
                <button onClick={() => (window.location.href = '/login')} className="bg-red-600 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-white">
                  Login
                </button>
              </div>
            </div>
          )}

          {listings.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200">
              <div className="w-20 h-20 bg-white rounded-3xl mx-auto mb-6 flex items-center justify-center text-gray-300 shadow-sm">
                <i className="fas fa-wheat-awn text-3xl"></i>
              </div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">No listings active</p>
              <button
                onClick={() => { setInternalView('add'); setEditListingId(null); }}
                className="text-green-600 font-bold text-xs uppercase tracking-widest hover:underline"
              >
                Create your first listing
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {listings.map(l => {
                const priceInfo = getPriceCompetitiveness(l.expectedPrice, l.cropId, l.mandiPrice);
                return (
                  <div key={l.id} className="bg-white p-5 rounded-[40px] border shadow-sm hover:border-green-100 transition-all overflow-hidden relative">

                    <div className="flex items-center gap-5">
                      <div className="relative shrink-0">
                        <img src={l.images[0]} className="w-24 h-24 rounded-3xl object-cover border-2 border-gray-50 shadow-sm" alt="Crop" />
                        <div className={`absolute -bottom-2 -left-2 px-2 py-0.5 rounded-lg border shadow-sm text-[8px] font-black uppercase ring-2 ${getGradeColor(l.grade)}`}>
                          Grade {l.grade}
                        </div>
                      </div>

                      <div className="flex-grow min-w-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-black text-xl text-gray-900 leading-none mb-1">{l.crop?.name || cropsForUi.find(c => c.id === l.cropId)?.name}</h4>
                            <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.1em]">{l.quantity} {l.unit} • ₹{l.expectedPrice}/kg</p>
                          </div>
                          <div className="shrink-0">
                            <StatusBadge status={l.status} type="listing" />
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <span className={`${priceInfo.color} px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1`}>
                            <i className={`fas ${priceInfo.icon}`}></i> {priceInfo.label}
                          </span>

                        </div>
                      </div>
                    </div>



                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={async () => {
                          const nextStatus = l.status === ListingStatus.PAUSED ? ListingStatus.AVAILABLE : ListingStatus.PAUSED;
                          try {
                            await listingAPI.update(l.id, { status: nextStatus });
                            await loadMyListings();
                            geminiService.speak(nextStatus === ListingStatus.PAUSED ? "Listing paused." : "Listing active.");
                          } catch (err) {
                            alert("Failed to update status");
                          }
                        }}
                        className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-colors ${l.status === ListingStatus.PAUSED ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                      >
                        <i className={`fas ${l.status === ListingStatus.PAUSED ? 'fa-play' : 'fa-pause'} mr-2`}></i>
                        {l.status === ListingStatus.PAUSED ? 'Resume' : 'Pause'}
                      </button>
                      <button
                        onClick={() => handleEditClick(l)}
                        className="flex-1 bg-gray-50 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        <i className="fas fa-pen mr-2"></i> Edit
                      </button>
                      <button
                        onClick={() => setListingToDelete(l.id)}
                        className="flex-1 bg-red-50 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-100 transition-colors"
                      >
                        <i className="fas fa-trash mr-2"></i> Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {activeTab === 'prices' && (
        <MarketPricesView />
      )}

      {activeTab === 'analytics' && (
        <FarmerAnalytics deals={soldHistory.map(h => ({ ...h, crop: h.cropName })) as any} />
      )}

      {listingToDelete && (
        <div className="fixed inset-0 z-[100] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl">
            <h3 className="text-xl font-black text-gray-900 text-center mb-2">Delete Listing?</h3>
            <p className="text-[11px] text-gray-400 font-bold text-center uppercase tracking-widest mb-8">This action cannot be undone.</p>
            <div className="grid grid-cols-2 gap-4">
              <button disabled={isDeletingListing} onClick={() => setListingToDelete(null)} className="bg-gray-50 py-4 rounded-3xl font-black uppercase text-[10px] tracking-widest text-gray-500 disabled:opacity-50">Cancel</button>
              <button disabled={isDeletingListing} onClick={confirmDeleteListing} className="bg-red-600 text-white py-4 rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-red-100 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale">
                {isDeletingListing ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default FarmerDashboard;
