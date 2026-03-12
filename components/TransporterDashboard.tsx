
import React, { useState, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import { User, Gender } from '../types';
import TransporterDealsView from './TransporterDealsView';
import LocationPicker from './LocationPicker';
import { InvoiceData, invoiceService } from '../services/invoiceService';
import InvoiceModal from './InvoiceModal';
import { socketService } from '../services/socketService';
import { compressImage } from '../utils/imageUtils';
import { generateFakeDL, generateFakeRC } from '../utils/mockDocumentUtils';
import DocumentViewModal from './DocumentViewModal';

interface Vehicle {
  type: string;
  capacity: number;
  costPerKm: number;
  licensePlate: string;
  isRegistered: boolean;
}

interface TransporterDashboardProps {
  activeTab: string;
  user: User;
  onUpdateProfile: (updates: Partial<User>) => void;
  deliveries: any[];
  onUpdateStatus: (id: string, status: string, transporterId?: string) => void;
  averageRating: number;
  totalReviews: number;
  earnings: { total: number; pending: number; today: number; week: number; month: number };
  onRefresh: () => void;
}

const VEHICLE_TYPES = [
  { id: 'mini', label: 'Mini Truck (Tata Ace)', cap: 750, icon: 'fa-truck-front' },
  { id: 'pickup', label: 'Pickup (Mahindra Bolero)', cap: 1500, icon: 'fa-truck-pickup' },
  { id: 'lcv', label: 'LCV (709/909)', cap: 3500, icon: 'fa-truck' },
  { id: 'hcv', label: 'Heavy Truck (12-Wheeler)', cap: 15000, icon: 'fa-truck-moving' },
];

const TransporterDashboard: React.FC<TransporterDashboardProps> = ({
  activeTab,
  user,
  onUpdateProfile,
  deliveries,
  onUpdateStatus,
  averageRating,
  totalReviews: _totalReviews,
  earnings,
  onRefresh
}) => {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  /* New state for detailed profile */
  const [tempProfile, setTempProfile] = useState({
    name: user.name,
    gender: user.gender || Gender.MALE,
    profilePhoto: user.profilePhoto || '',
    phone: user.phone || '',
    email: user.email || '',
    address: user.location?.address || '',
    village: user.location?.village || '',
    district: user.location?.district || '',
    state: user.location?.state || '',
    pincode: user.location?.pincode || '',
    latitude: user.location?.latitude || null,
    longitude: user.location?.longitude || null,
    experience: '5',
    routes: 'Local, Inter-district',
    languages: 'English, Hindi',
    serviceRange: user.transporterProfile?.serviceRange || 50
  });

  // Helper to find vehicle icon
  const getVehicleIcon = (type: string) => {
    const found = VEHICLE_TYPES.find(vt => vt.label === type || vt.id === type);
    return found?.icon || 'fa-truck-front';
  };

  // Vehicle management state - Initialize from fullProfile (from backend) or transporterProfile (legacy)
  const initialVehicle = {
    type: user.fullProfile?.vehicleType || user.transporterProfile?.vehicleType || 'mini',
    capacity: user.fullProfile?.capacity || user.transporterProfile?.capacity || 750,
    costPerKm: user.fullProfile?.pricePerKm || user.transporterProfile?.pricePerKm || 8,
    licensePlate: user.fullProfile?.vehicleNumber || user.transporterProfile?.vehicleNumber || '',
    isRegistered: !!(user.fullProfile?.vehicleNumber || user.transporterProfile?.vehicleNumber)
  };

  const [vehicle, setVehicle] = useState<Vehicle>(initialVehicle);
  const [isEditingVehicle, setIsEditingVehicle] = useState(false);
  const [vehicleForm, setVehicleForm] = useState(vehicle);

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);

  const [docModal, setDocModal] = useState({ isOpen: false, title: '', content: '' });
  const [deliveryFilter, setDeliveryFilter] = useState<'active' | 'history'>('active');
  const [selectedEarningDetail, setSelectedEarningDetail] = useState<any>(null);
  const [showEarningDetail, setShowEarningDetail] = useState(false);

  const handleSaveVehicle = () => {
    setVehicle(vehicleForm);
    setIsEditingVehicle(false);

    // Call onUpdateProfile to persist changes to backend
    onUpdateProfile({
      fleet: {
        vehicleType: vehicleForm.type,
        vehicleNumber: vehicleForm.licensePlate,
        capacity: vehicleForm.capacity,
        pricePerKm: vehicleForm.costPerKm
      }
    } as any);

    geminiService.speak("Vehicle details updated and saved to profile.");
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
      district: user.location?.district || '',
      state: user.location?.state || '',
      pincode: user.location?.pincode || '',
      latitude: user.location?.latitude || null,
      longitude: user.location?.longitude || null,
      experience: '5',
      routes: 'Local, Inter-district',
      languages: 'English, Hindi',
      serviceRange: user.fullProfile?.serviceRange || user.transporterProfile?.serviceRange || 50
    });

    // Also update vehicle state when user data changes (e.g. after backend sync)
    const syncedVehicle = {
      type: user.fullProfile?.vehicleType || user.transporterProfile?.vehicleType || 'mini',
      capacity: user.fullProfile?.capacity || user.transporterProfile?.capacity || 750,
      costPerKm: user.fullProfile?.pricePerKm || user.transporterProfile?.pricePerKm || 8,
      licensePlate: user.fullProfile?.vehicleNumber || user.transporterProfile?.vehicleNumber || '',
      isRegistered: !!(user.fullProfile?.vehicleNumber || user.transporterProfile?.vehicleNumber)
    };
    setVehicle(syncedVehicle);
    setVehicleForm(syncedVehicle);
  }, [user]);

  useEffect(() => {
    socketService.connect();
    socketService.joinUserRoom(user.id);

    // Join vehicle specific room to get targeted delivery requests
    const vType = user.fullProfile?.vehicleType || user.transporterProfile?.vehicleType;
    if (vType) {
      socketService.joinVehicleRoom(vType);
      console.log(`[TransporterDashboard] Joining vehicle room: ${vType}`);
    }

    const handler = (data: any) => {
      const amount = data?.earning?.amount ?? data?.amount;
      if (typeof amount === 'number') {
        geminiService.speak(`Earnings updated. Rupees ${amount} credited.`);
      } else {
        geminiService.speak('Earnings updated.');
      }
      onRefresh();
    };
    socketService.onEarningsUpdated(handler);
    return () => {
      socketService.offEarningsUpdated(handler);
      socketService.leaveUserRoom(user.id);
      if (vType) {
        socketService.leaveVehicleRoom(vType);
        console.log(`[TransporterDashboard] Leaving vehicle room (cleanup): ${vType}`);
      }
    };
  }, [user.id, user.fullProfile?.vehicleType, user.transporterProfile?.vehicleType]); // More specific dependencies to prevent flicker

  // Real-time location sharing for active jobs
  useEffect(() => {
    const activeJobs = deliveries.filter((d: any) =>
      d.transporterId === user.id && (
        d.status === 'TRANSPORTER_ASSIGNED' ||
        d.status === 'IN_TRANSIT' ||
        d.status === 'PICKED_UP' ||
        d.status === 'OUT_FOR_DELIVERY'
      )
    );

    if (activeJobs.length === 0) return;

    activeJobs.forEach(job => socketService.joinOrderRoom(job.id));

    // User requested: "Location is sent via Socket.io every 2 seconds"
    const intervalId = setInterval(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            activeJobs.forEach(job => {
              socketService.emitTransporterLocation(job.id, latitude, longitude);
            });
          },
          (err) => console.error("Geolocation error:", err),
          { enableHighAccuracy: true }
        );
      }
    }, 2000); // 2 seconds

    return () => {
      clearInterval(intervalId);
    };
  }, [deliveries, user.id]);

  // Derived State
  // "My Jobs" are those assigned to me (Transporter)
  const myJobs = deliveries.filter((d: any) => d.transporterId === user.id && d.status !== 'DELIVERED' && d.status !== 'COMPLETED');

  // "Available Jobs" are those waiting for a transporter
  const availableJobs = deliveries.filter((d: any) => d.status === 'WAITING_FOR_TRANSPORTER');

  // "History" are completed jobs
  const history = deliveries.filter((d: any) => d.transporterId === user.id && (d.status === 'DELIVERED' || d.status === 'COMPLETED'));

  const experienceWidthClass = (() => {
    const years = Number.parseInt(tempProfile.experience, 10);
    const percent = Number.isFinite(years) ? Math.min(Math.max(0, years * 10), 100) : 0;
    const widthClasses = [
      'w-0',
      'w-[10%]',
      'w-[20%]',
      'w-[30%]',
      'w-[40%]',
      'w-1/2',
      'w-[60%]',
      'w-[70%]',
      'w-[80%]',
      'w-[90%]',
      'w-full'
    ];
    const idx = Math.min(10, Math.max(0, Math.floor(percent / 10)));
    return widthClasses[idx];
  })();

  const handleAcceptJob = (job: any) => {
    onUpdateStatus(job.id, 'ACCEPTED', user.id);
    geminiService.speak("Job accepted. Navigation details sent to your device.");
  };

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'ACCEPTED': return { label: 'Confirm Pickup', next: 'PICKED_UP', icon: 'fa-box-open' };
      case 'PICKED_UP': return { label: 'Start Transit', next: 'IN_TRANSIT', icon: 'fa-truck-fast' };
      case 'IN_TRANSIT': return { label: 'Mark Delivered', next: 'DELIVERED', icon: 'fa-check-circle' };
      default: return null;
    }
  };

  const handleNextStatus = (id: string, currentStatus: string) => {
    const next = getNextStatus(currentStatus);
    if (next) {
      onUpdateStatus(id, next.next);
      geminiService.speak(`Status updated to ${next.next.replace('_', ' ')}.`);
    }
  };

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await compressImage(file, 800, 0.7) as string;
        setTempProfile(prev => ({ ...prev, profilePhoto: base64 }));
        // Put in immediate update if in edit mode, or just set temp? 
        // Logic says we usually save on "Save Changes", but for photo it's nice to be immediate or waiting.
        // Farmer dashboard did immediate update. Let's do immediate update to temp, and save on save?
        // Actually Farmer did: onUpdateProfile({ profilePhoto: base64 }); immediately.
        // Let's stick to the pattern:
        onUpdateProfile({ profilePhoto: base64 } as any);
        geminiService.speak("Profile photo updated.");
      } catch (error) {
        console.error("Photo upload failed", error);
        alert("Failed to upload photo");
      }
    }
  };

  const handleDownloadInvoice = (job: any) => {
    const commission = Math.round(job.totalCost * 0.15); // 15% platform commission for transporters
    const taxes = Math.round((job.totalCost - commission) * 0.05);

    const data: InvoiceData = {
      invoiceId: invoiceService.formatInvoiceId('TRANSPORTER', job.id),
      orderId: job.orderId || job.id,
      date: new Date().toLocaleDateString(),
      completionDate: new Date(job.updatedAt || new Date()).toLocaleDateString(),
      role: 'TRANSPORTER',
      transporter: {
        name: user.name,
        vehicleType: vehicle.type,
        transporterId: `T-${user.id.substring(0, 6).toUpperCase()}`,
        licensePlate: vehicle.licensePlate
      },
      farmer: {
        name: job.order?.farmer?.name || 'Platform Merchant',
        location: job.pickupLocation?.address || 'Pickup Hub'
      },
      buyer: {
        name: job.order?.buyer?.name || 'End Customer',
        location: job.dropLocation?.address || 'Delivery Hub'
      },
      items: [{
        name: `Logistics Service - ${job.order?.listing?.crop?.name || 'Agri-Produce'}`,
        quantity: 1,
        unit: 'trip',
        pricePerUnit: job.totalCost,
        total: job.totalCost
      }],
      delivery: {
        pickup: job.pickupLocation?.address || 'Origin',
        drop: job.dropLocation?.address || 'Destination',
        distance: job.distance,
        cost: job.totalCost,
        ratePerKm: job.pricePerKm || 15
      },
      breakdown: {
        itemTotal: job.totalCost,
        platformFee: commission,
        taxes: taxes,
        netAmount: job.totalCost - commission - taxes,
        finalTotal: job.totalCost - commission - taxes
      },
      paymentStatus: {
        method: 'KisanSetu Logistics Wallet',
        status: 'PAID',
        transactionId: `TRP-${job.id.substring(0, 8).toUpperCase()}`
      }
    };

    setInvoiceData(data);
    setShowInvoiceModal(true);
  };

  const handleViewDocument = (type: string) => {
    const locString = `${tempProfile.village}, ${tempProfile.district}, ${tempProfile.state} - ${tempProfile.pincode}`;
    let content = '';
    let title = '';

    if (type === 'Driving License') {
      title = 'Driving License';
      content = generateFakeDL(user.name, locString, tempProfile.profilePhoto);
    } else if (type === 'Vehicle RC') {
      title = 'Vehicle Registration Certificate';
      content = generateFakeRC(user.name, vehicle.licensePlate, vehicle.type, locString);
    } else {
      title = 'Insurance Certificate';
      content = generateFakeRC(user.name, vehicle.licensePlate, 'Vehicle Insurance', locString);
    }

    setDocModal({
      isOpen: true,
      title,
      content
    });
    geminiService.speak(`Opening ${title} from vault.`);
  };

  const renderHome = () => (
    <TransporterDealsView
      availableDeals={availableJobs}
      myDeals={[]}
      onRefresh={onRefresh}
      mode="available"
    />
  );

  const renderMyDeliveries = () => (
    <div className="space-y-6">
      {/* Sub-tabs for Deliveries */}
      <div className="flex bg-gray-100/50 p-1.5 rounded-2xl w-fit mx-auto md:mx-0 shadow-sm border border-gray-100/50">
        <button
          onClick={() => setDeliveryFilter('active')}
          className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${deliveryFilter === 'active'
            ? 'bg-white text-blue-600 shadow-md transform scale-105'
            : 'text-gray-500 hover:text-gray-900'
            }`}
        >
          <i className="fas fa-truck-fast mr-2"></i>
          Active Jobs
        </button>
        <button
          onClick={() => setDeliveryFilter('history')}
          className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${deliveryFilter === 'history'
            ? 'bg-white text-emerald-600 shadow-md transform scale-105'
            : 'text-gray-500 hover:text-gray-900'
            }`}
        >
          <i className="fas fa-clock-rotate-left mr-2"></i>
          History
        </button>
      </div>

      <TransporterDealsView
        availableDeals={[]}
        myDeals={deliveryFilter === 'active' ? myJobs : history}
        onRefresh={onRefresh}
        mode={deliveryFilter}
        onViewEarningDetails={(job) => {
          setSelectedEarningDetail(job);
          setShowEarningDetail(true);
        }}
      />
    </div>
  );

  const renderEarnings = () => (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Main Earnings Card */}
        <div className="bg-black text-white p-10 rounded-[48px] shadow-2xl relative overflow-hidden group col-span-1 md:col-span-2">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 mb-2">Total Revenue</p>
                <h2 className="text-6xl font-black tracking-tighter mb-1">₹{(earnings.total / 1000).toFixed(1)}k</h2>
                <p className="text-sm font-bold text-gray-400">Total lifetime earnings</p>
              </div>
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-emerald-400 border border-white/5">
                <i className="fas fa-chart-line text-2xl"></i>
              </div>
            </div>

            {/* Earnings Chart Visualization */}
            <div className="h-24 w-full flex items-end gap-2 mb-8 opacity-50">
              {['h-[40%]', 'h-[65%]', 'h-[45%]', 'h-[80%]', 'h-[55%]', 'h-[90%]', 'h-[70%]', 'h-[85%]', 'h-[60%]', 'h-[95%]', 'h-[75%]', 'h-[100%]'].map((heightClass, i) => (
                <div key={i} className={`flex-1 ${heightClass} bg-gradient-to-t from-emerald-500 to-emerald-300 rounded-t-sm hover:opacity-100 transition-opacity cursor-pointer`} title={`Week ${i + 1}`}></div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/10 p-5 rounded-[24px] backdrop-blur-md border border-white/5 hover:bg-white/15 transition-colors">
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-2">This Month</p>
                <p className="text-2xl font-black">₹{(earnings.month / 1000).toFixed(1)}k</p>
                <div className="mt-2 text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <i className="fas fa-arrow-up"></i> 12%
                </div>
              </div>
              <div className="bg-white/10 p-5 rounded-[24px] backdrop-blur-md border border-white/5 hover:bg-white/15 transition-colors">
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-2">Pending</p>
                <p className="text-2xl font-black">₹{(earnings.pending / 1000).toFixed(1)}k</p>
                <div className="mt-2 text-[10px] text-gray-400 font-bold">Processing</div>
              </div>
              <div className="bg-white/10 p-5 rounded-[24px] backdrop-blur-md border border-white/5 hover:bg-white/15 transition-colors">
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-2">Trips</p>
                <p className="text-2xl font-black">{history.length}</p>
                <div className="mt-2 text-[10px] text-blue-400 font-bold">Completed</div>
              </div>
            </div>
          </div>

          {/* Decorative Gradients */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none group-hover:bg-emerald-500/30 transition-all duration-1000"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        </div>
      </div>

      <div className="flex justify-between items-center px-2 mt-4">
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Transaction History</h3>
        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl">View & Download Below</p>
      </div>

      {history.length === 0 ? (
        <div className="p-12 bg-gray-50 rounded-[32px] border border-gray-100 text-center">
          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-400 mx-auto mb-3">
            <i className="fas fa-file-invoice"></i>
          </div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No transaction history found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((job: any) => (
            <div key={job.id} className="bg-white p-5 rounded-[32px] border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-shadow group">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-emerald-50 rounded-[20px] flex items-center justify-center text-emerald-600 text-xl group-hover:bg-emerald-100 transition-colors shadow-sm">
                  <i className="fas fa-arrow-down-long rotate-45"></i>
                </div>
                <div>
                  <h4 className="font-black text-gray-900 text-base mb-1">{job.order?.listing?.crop?.name || 'Crop'} Transport Payment</h4>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                    <span>#{job.id.substring(0, 8)}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                    <span>{new Date().toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-4 pl-16 md:pl-0">
                <div className="text-right">
                  <p className="font-black text-xl text-gray-900 tracking-tight">+₹{job.totalCost}</p>
                  <div className="flex flex-col gap-1 items-end mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEarningDetail(job);
                        setShowEarningDetail(true);
                      }}
                      className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                    >
                      View Details
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadInvoice(job)}
                      className="text-[9px] font-black text-emerald-600 uppercase tracking-widest hover:underline"
                    >
                      Download Invoice
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {invoiceData && (
        <InvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          data={invoiceData}
        />
      )}
    </div>
  );

  const handleSaveProfile = () => {
    onUpdateProfile({
      name: tempProfile.name,
      gender: tempProfile.gender,
      email: tempProfile.email,
      phone: tempProfile.phone,
      location: {
        address: tempProfile.address,
        village: tempProfile.village,
        district: tempProfile.district,
        state: tempProfile.state,
        pincode: tempProfile.pincode,
        latitude: tempProfile.latitude,
        longitude: tempProfile.longitude
      },
      serviceRange: Number(tempProfile.serviceRange)
    } as any);
    setIsEditingProfile(false);
    geminiService.speak("Profile updated successfully!");
  };

  const renderProfile = () => (
    <div className="space-y-6 pb-24 animate-in slide-in-from-bottom duration-500">
      <div className="bg-white p-8 rounded-[48px] shadow-sm border border-gray-100 relative overflow-hidden group">
        {/* Animated Background Gradients */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-indigo-500/10 to-blue-500/5 rounded-full blur-[80px] group-hover:bg-indigo-500/15 transition-all duration-1000 scale-110 motion-safe:animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-10">
            <div className="flex items-center gap-6">
              <div className="relative group cursor-pointer">
                <div className="absolute inset-0 bg-indigo-500 rounded-[36px] blur opacity-20"></div>
                <div className="relative w-24 h-24 bg-gradient-to-br from-indigo-50 to-white rounded-[36px] flex items-center justify-center text-4xl shadow-lg border border-white overflow-hidden">
                  {tempProfile.profilePhoto ? (
                    <img src={tempProfile.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="scale-110 drop-shadow-sm">🚚</span>
                  )}
                </div>

                {/* Overlay for upload - Only in Edit Mode */}
                {isEditingProfile && (
                  <>
                    <div className="absolute inset-0 bg-black/40 rounded-[36px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <i className="fas fa-camera text-white text-2xl"></i>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
                      onChange={handleProfilePhotoUpload}
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

                {/* Online Status Dot */}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-[3px] border-white rounded-full z-20"></div>
              </div>

              <div>
                <h3 className="text-3xl font-black text-gray-900 tracking-tight leading-none mb-2">{user.name}</h3>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full">
                    <i className="fas fa-certificate text-[10px] text-indigo-600"></i>
                    <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Verified Pro</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-50 border border-yellow-100 rounded-full">
                    <i className="fas fa-star text-[10px] text-yellow-500"></i>
                    <span className="text-[10px] font-black text-yellow-700 uppercase tracking-widest">{averageRating || 4.8} Rating</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => isEditingProfile ? handleSaveProfile() : setIsEditingProfile(true)}
              className={`group flex items-center gap-2 px-5 py-3.5 rounded-2xl transition-all shadow-sm ${isEditingProfile
                ? 'bg-emerald-500 text-white shadow-emerald-200 hover:bg-emerald-600'
                : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              <i className={`fas ${isEditingProfile ? 'fa-check' : 'fa-pen-to-square'} transition-transform group-hover:scale-110`}></i>
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline-block">
                {isEditingProfile ? 'Save Changes' : 'Edit Profile'}
              </span>
            </button>
          </div>

          {/* New Document Vault Section */}
          <div className="mb-8">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs"><i className="fas fa-folder-open"></i></span>
              Document Vault
            </h4>
            <div className="grid grid-cols-3 gap-4">
              {['Driving License', 'Vehicle RC', 'Insurance'].map((doc, i) => (
                <div
                  key={i}
                  onClick={() => handleViewDocument(doc)}
                  className="bg-white border border-gray-200 p-4 rounded-[24px] flex flex-col items-center justify-center gap-3 hover:shadow-md transition-all cursor-pointer group/doc"
                >
                  <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 group-hover/doc:scale-110 transition-transform">
                    <i className={`fas ${i === 0 ? 'fa-id-card' : i === 1 ? 'fa-car' : 'fa-shield-halved'}`}></i>
                  </div>
                  <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wide text-center">{doc}</p>
                  <div className="flex items-center gap-1 text-[9px] text-emerald-500 font-black uppercase tracking-widest">
                    <i className="fas fa-check-circle"></i> Verified
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6">
            {/* Personal Details Section */}
            <div className={`bg-gray-50/60 backdrop-blur-sm p-7 rounded-[36px] border border-gray-100 transition-all duration-300 ${isEditingProfile ? 'ring-2 ring-indigo-100 bg-white shadow-xl' : ''}`}>
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs"><i className="fas fa-user"></i></span>
                Personal Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Name Field */}
                <div className="space-y-1.5 group/field">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest group-hover/field:text-indigo-500 transition-colors">Full Name</label>
                  {isEditingProfile ? (
                    <input type="text" value={tempProfile.name} onChange={e => setTempProfile({ ...tempProfile, name: e.target.value })} className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-gray-900 text-sm border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all outline-none" aria-label="Full Name" />
                  ) : (
                    <p className="text-base font-black text-gray-900">{user.name}</p>
                  )}
                </div>

                {/* Phone Field */}
                <div className="space-y-1.5 group/field">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest group-hover/field:text-indigo-500 transition-colors">Primary Phone</label>
                  <p className="text-base font-black text-gray-900 flex items-center gap-2">
                    {user.phone || '+91 98765 43210'}
                    {isEditingProfile && <span className="text-[9px] bg-gray-100 px-2 py-0.5 rounded text-gray-500">Locked</span>}
                  </p>
                </div>

                {/* Email Field */}
                <div className="space-y-1.5 group/field">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest group-hover/field:text-indigo-500 transition-colors">Email Address</label>
                  {isEditingProfile ? (
                    <input type="email" value={tempProfile.email} onChange={e => setTempProfile({ ...tempProfile, email: e.target.value })} className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-gray-900 text-sm border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all outline-none" placeholder="name@example.com" aria-label="Email Address" />
                  ) : (
                    <p className="text-base font-black text-gray-900 break-all">{user.email || '—'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Location & Operations Section */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className={`bg-gray-50/60 backdrop-blur-sm p-7 rounded-[36px] border border-gray-100 flex flex-col transition-all duration-300 hover:bg-white hover:shadow-lg hover:border-indigo-50`}>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-xs"><i className="fas fa-map-pin"></i></span>
                  Base Location
                </h4>

                <div className="space-y-5 flex-1">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Base Location</label>
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
                            <input type="text" value={tempProfile.address} onChange={e => setTempProfile({ ...tempProfile, address: e.target.value })} className="w-full p-3 bg-white rounded-xl font-bold text-gray-900 text-sm border focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Street, Area, Building" aria-label="Street Address" />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">City/Town</label>
                            <input type="text" value={tempProfile.village} onChange={e => setTempProfile({ ...tempProfile, village: e.target.value })} className="w-full p-3 bg-white rounded-xl font-bold text-gray-900 text-sm border focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="City" aria-label="City" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">District</label>
                            <input type="text" value={tempProfile.district} onChange={e => setTempProfile({ ...tempProfile, district: e.target.value })} className="w-full p-3 bg-white rounded-xl font-bold text-gray-900 text-sm border focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="District" aria-label="District" />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">State</label>
                            <input type="text" value={tempProfile.state} onChange={e => setTempProfile({ ...tempProfile, state: e.target.value })} className="w-full p-3 bg-white rounded-xl font-bold text-gray-900 text-sm border focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="State" aria-label="State" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Pincode</label>
                            <input type="text" value={tempProfile.pincode} onChange={e => setTempProfile({ ...tempProfile, pincode: e.target.value })} className="w-full p-3 bg-white rounded-xl font-bold text-gray-900 text-sm border focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Pincode" aria-label="Pincode" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="text-gray-600 bg-white/50 p-4 rounded-2xl border border-gray-100 flex items-start gap-3">
                          <i className="fas fa-map-marker-alt text-indigo-500 mt-1"></i>
                          <div>
                            <p className="text-sm font-black text-gray-900 leading-tight mb-1">{tempProfile.address || 'No street address'}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{tempProfile.village}, {tempProfile.district}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{tempProfile.state} - {tempProfile.pincode}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className={`bg-gray-50/60 backdrop-blur-sm p-7 rounded-[36px] border border-gray-100 flex flex-col transition-all duration-300 hover:bg-white hover:shadow-lg hover:border-blue-50`}>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs"><i className="fas fa-briefcase"></i></span>
                  Work Profile
                </h4>

                <div className="space-y-5 flex-1">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Experience</label>
                    {isEditingProfile ? (
                      <div className="relative">
                        <input type="text" value={tempProfile.experience} onChange={e => setTempProfile({ ...tempProfile, experience: e.target.value })} className="w-full p-3 pl-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none" aria-label="Experience in years" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 pointer-events-none">Years</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full bg-blue-500 rounded-full ${experienceWidthClass}`}></div>
                        </div>
                        <span className="text-sm font-black text-gray-900 whitespace-nowrap">{tempProfile.experience} Years</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Preferred Routes</label>
                    {isEditingProfile ? (
                      <input type="text" value={tempProfile.routes} onChange={e => setTempProfile({ ...tempProfile, routes: e.target.value })} className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none" aria-label="Preferred Routes" />
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {tempProfile.routes.split(',').map((route, i) => (
                          <span key={i} className="bg-white border border-gray-200 px-2 py-1 rounded-lg text-[10px] font-bold text-gray-600 uppercase tracking-wide shadow-sm">{route.trim()}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Service Range Slider */}
                  <div className="space-y-1.5 pt-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex justify-between">
                      <span>Service Range</span>
                      <span className="text-indigo-600">{tempProfile.serviceRange} km</span>
                    </label>
                    {isEditingProfile ? (
                      <div className="relative pt-1">
                        <input
                          type="range"
                          min="10"
                          max="500"
                          step="10"
                          value={tempProfile.serviceRange}
                          onChange={e => setTempProfile({ ...tempProfile, serviceRange: Number(e.target.value) })}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <div className="flex justify-between text-[8px] font-bold text-gray-400 mt-1 uppercase tracking-wider">
                          <span>10 km</span>
                          <span>500 km</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, (Number(tempProfile.serviceRange) / 500) * 100)}%` }}></div>
                        </div>
                        <span className="text-sm font-black text-gray-900 whitespace-nowrap">{tempProfile.serviceRange} km</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );

  const renderVehicleManagement = () => (
    <div className="space-y-6 pb-24 animate-in slide-in-from-bottom duration-500 delay-100">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Fleet Management</h3>
      </div>

      <div className="bg-gradient-to-br from-indigo-900 to-blue-900 p-8 rounded-[48px] text-white shadow-xl shadow-indigo-200 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-[80px] group-hover:bg-white/20 transition-all duration-700 pointer-events-none skew-x-12"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/30 rounded-full blur-[60px] pointer-events-none"></div>

        <div className="relative z-10 transition-all duration-500">
          <div className="flex justify-between items-start mb-10">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full mb-3 border border-white/10">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-100">Active Vehicle</span>
              </div>
              <h2 className="text-4xl font-black tracking-tight mb-1">{vehicle.type}</h2>
              <p className="text-base font-medium text-indigo-200 flex items-center gap-2">
                <span className="bg-white/10 px-2 py-0.5 rounded text-sm font-mono tracking-wider">{vehicle.licensePlate || 'NO PLATE'}</span>
              </p>
            </div>

            <div className="w-20 h-20 bg-white/10 rounded-[32px] flex items-center justify-center backdrop-blur-md shadow-inner border border-white/20 group-hover:scale-110 transition-transform duration-500">
              <i className={`fas ${getVehicleIcon(vehicle.type)} text-3xl text-white`}></i>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/20 backdrop-blur-md p-5 rounded-[24px] border border-white/10 hover:bg-black/30 transition-colors">
              <p className="text-[9px] font-black text-indigo-200 uppercase tracking-widest mb-1">Max Capacity</p>
              <p className="text-2xl font-black">{vehicle.capacity} <span className="text-sm font-bold opacity-60">kg</span></p>
            </div>
            <div className="bg-black/20 backdrop-blur-md p-5 rounded-[24px] border border-white/10 hover:bg-black/30 transition-colors">
              <p className="text-[9px] font-black text-indigo-200 uppercase tracking-widest mb-1">Base Rate</p>
              <p className="text-2xl font-black">₹{vehicle.costPerKm}<span className="text-sm font-bold opacity-60">/km</span></p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 relative overflow-hidden">
        <div className="flex justify-between items-center mb-8 relative z-10">
          <div>
            <h3 className="text-xl font-black text-gray-900">Vehicle Configuration</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Manage fleet details</p>
          </div>

          <button
            onClick={() => isEditingVehicle ? handleSaveVehicle() : setIsEditingVehicle(true)}
            className={`text-[10px] font-black uppercase tracking-widest px-5 py-3 rounded-2xl transition-all shadow-sm flex items-center gap-2 ${isEditingVehicle
              ? 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700'
              : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
              }`}
          >
            <i className={`fas ${isEditingVehicle ? 'fa-check' : 'fa-sliders'}`}></i>
            {isEditingVehicle ? 'Save Config' : 'Configure'}
          </button>
        </div>

        <div className="space-y-6 relative z-10">
          {isEditingVehicle ? (
            <div className="animate-in fade-in duration-300 space-y-8">
              <div>
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4 block ml-1">Select Vehicle Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {VEHICLE_TYPES.map(vt => (
                    <button
                      key={vt.id}
                      onClick={() => setVehicleForm({ ...vehicleForm, type: vt.label, capacity: vt.cap })}
                      className={`p-5 rounded-[24px] text-left border-2 transition-all flex flex-col gap-3 group ${vehicleForm.type === vt.label
                        ? 'border-indigo-600 bg-indigo-50 shadow-md shadow-indigo-100'
                        : 'border-gray-100 bg-white hover:border-indigo-200 hover:bg-gray-50'
                        }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-colors ${vehicleForm.type === vt.label ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-white group-hover:text-indigo-500'
                        }`}>
                        <i className={`fas ${vt.icon}`}></i>
                      </div>
                      <div>
                        <p className={`text-xs font-black uppercase tracking-wide leading-tight mb-1 ${vehicleForm.type === vt.label ? 'text-indigo-900' : 'text-gray-900'}`}>{vt.label}</p>
                        <p className={`text-[10px] font-bold ${vehicleForm.type === vt.label ? 'text-indigo-500' : 'text-gray-400'}`}>{vt.cap} kg Capacity</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2 group">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1 group-hover:text-indigo-500 transition-colors">License Plate</label>
                  <input type="text" value={vehicleForm.licensePlate} onChange={e => setVehicleForm({ ...vehicleForm, licensePlate: e.target.value })} className="w-full p-4 bg-gray-50 rounded-2xl font-black text-gray-900 text-sm border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all outline-none" placeholder="KA-01-AB-1234" aria-label="License Plate" />
                </div>
                <div className="space-y-2 group">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1 group-hover:text-indigo-500 transition-colors">Rate per KM (₹)</label>
                  <input type="number" value={vehicleForm.costPerKm} onChange={e => setVehicleForm({ ...vehicleForm, costPerKm: Number(e.target.value) })} className="w-full p-4 bg-gray-50 rounded-2xl font-black text-gray-900 text-sm border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all outline-none" aria-label="Rate per KM" />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-5 bg-gradient-to-r from-emerald-50 to-white rounded-[24px] flex items-center justify-between border border-emerald-100 group cursor-pointer hover:shadow-lg hover:shadow-emerald-50 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-xl shadow-sm">
                    <i className="fas fa-check-shield"></i>
                  </div>
                  <div>
                    <p className="text-xs font-black text-gray-900 uppercase tracking-wide">Verification Status</p>
                    <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                      <i className="fas fa-check-circle"></i> Service Ready
                    </p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-emerald-300 border border-emerald-100 group-hover:scale-110 transition-transform">
                  <i className="fas fa-chevron-right text-xs"></i>
                </div>
              </div>

              <div className="p-5 bg-gradient-to-r from-gray-50 to-white rounded-[24px] flex items-center justify-between border border-gray-100 group cursor-pointer hover:bg-gray-50 transition-all opacity-80 hover:opacity-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white text-gray-400 rounded-2xl flex items-center justify-center text-xl shadow-sm border border-gray-100">
                    <i className="fas fa-file-invoice"></i>
                  </div>
                  <div>
                    <p className="text-xs font-black text-gray-900 uppercase tracking-wide">Registration Validity</p>
                    <p className="text-[10px] text-gray-400 font-bold">Valid until Oct 2026</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Registration Details Section - User Requested Change */}
        <div className="mt-12 pt-12 border-t border-gray-100 relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm">
              <i className="fas fa-id-card-clip"></i>
            </div>
            <div>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Registration Info</p>
              <h3 className="text-lg font-black text-gray-900">Registered Details</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Carrier Contact Tile */}
            <div className="bg-gray-50/50 p-6 rounded-[32px] border border-gray-100 group hover:bg-white hover:shadow-xl hover:shadow-indigo-50/50 transition-all duration-500">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <i className="fas fa-user-tie text-indigo-400"></i> Carrier Contact
              </p>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Full Name</p>
                  <p className="text-base font-black text-gray-900">{user.fullProfile?.fullName || user.name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Primary Phone</p>
                  <p className="text-base font-black text-gray-900">{user.fullProfile?.phone || user.phone || 'Not Provided'}</p>
                </div>
              </div>
            </div>

            {/* Base Location Tile */}
            <div className="bg-gray-50/50 p-6 rounded-[32px] border border-gray-100 group hover:bg-white hover:shadow-xl hover:shadow-emerald-50/50 transition-all duration-500">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <i className="fas fa-house-chimney text-emerald-400"></i> Registered Base
              </p>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">City & Pincode</p>
                  <p className="text-base font-black text-gray-900">
                    {user.fullProfile?.city || 'Not Provided'} - {user.fullProfile?.pincode || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Operating State</p>
                  <p className="text-base font-black text-gray-900">{user.fullProfile?.state || 'Not Provided'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 pt-6 w-full mx-auto min-h-screen relative pb-24 md:pb-8">
      {/* Sticky Header for Mobile */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md py-4 -mx-4 px-4 border-b border-gray-100 mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            {activeTab === 'home' || !activeTab ? 'Find Loads' :
              activeTab === 'my_deliveries' ? 'My Deliveries' :
                activeTab === 'earnings' ? 'My Earnings' :
                  'My Profile'}
          </h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {activeTab === 'home' || !activeTab ? 'Marketplace & Orders' :
              activeTab === 'my_deliveries' ? 'Track Active Jobs' :
                activeTab === 'earnings' ? 'Track your revenue' :
                  'Manage account & fleet'}
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-200 shadow-sm overflow-hidden relative">
          {user.profilePhoto ? (
            <img src={user.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <i className={`fas ${activeTab === 'home' || !activeTab ? 'fa-truck-fast' :
              activeTab === 'earnings' ? 'fa-wallet' :
                'fa-user-gear'
              }`}></i>
          )}
        </div>
      </div>

      {(activeTab === 'home' || !activeTab) && renderHome()}
      {activeTab === 'my_deliveries' && renderMyDeliveries()}
      {activeTab === 'earnings' && renderEarnings()}
      {(activeTab === 'profile' || activeTab === 'account' || activeTab === 'vehicle') && (
        <div className="space-y-8 animate-in fade-in slide-in-from-left duration-500">
          {renderProfile()}
          {renderVehicleManagement()}
        </div>
      )}

      <DocumentViewModal
        isOpen={docModal.isOpen}
        onClose={() => setDocModal({ ...docModal, isOpen: false })}
        title={docModal.title}
        htmlContent={docModal.content}
      />

      {/* Earning Detail Modal */}
      {showEarningDetail && selectedEarningDetail && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowEarningDetail(false)}></div>
          <div className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-black text-gray-900">Earning Details</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Transaction Breakdown</p>
                </div>
                <button onClick={() => setShowEarningDetail(false)} className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="space-y-6">
                {/* Status and Amount Header */}
                <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Net Credit</p>
                    <p className="text-3xl font-black text-emerald-700">₹{selectedEarningDetail.totalCost - Math.round(selectedEarningDetail.totalCost * 0.15) - Math.round((selectedEarningDetail.totalCost - Math.round(selectedEarningDetail.totalCost * 0.15)) * 0.05)}</p>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase tracking-widest rounded-full">Success</span>
                    <p className="text-[10px] font-bold text-emerald-600/60 mt-2 uppercase tracking-wide">ID: #{selectedEarningDetail.id.slice(0, 12)}</p>
                  </div>
                </div>

                {/* Participant Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100">
                    <p className="text-[9px] font-black text-orange-600 uppercase mb-1">Farmer (Origin)</p>
                    <p className="text-sm font-black text-gray-900">{selectedEarningDetail.order?.farmer?.name || selectedEarningDetail.order?.listing?.farmer?.name || 'Platform Hub'}</p>
                    <p className="text-[9px] text-gray-400 mt-1 uppercase font-bold">{selectedEarningDetail.pickupLocation?.village || 'Base'}</p>
                  </div>
                  <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                    <p className="text-[9px] font-black text-blue-600 uppercase mb-1">Buyer (Destination)</p>
                    <p className="text-sm font-black text-gray-900">{selectedEarningDetail.order?.buyer?.name || 'End Customer'}</p>
                    <p className="text-[9px] text-gray-400 mt-1 uppercase font-bold">{selectedEarningDetail.dropLocation?.village || 'Delivery Hub'}</p>
                  </div>
                </div>

                {/* Logistics Info */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-2">Logistics Summary</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-2xl">
                      <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Crop Type</p>
                      <p className="text-sm font-black text-gray-900">{selectedEarningDetail.order?.listing?.crop?.name || 'Agri-Produce'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl">
                      <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Distance</p>
                      <p className="text-sm font-black text-gray-900">{selectedEarningDetail.distance} km</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-2xl space-y-3">
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <div className="w-0.5 h-4 bg-gray-200 my-0.5"></div>
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      </div>
                      <div className="flex-1 text-[10px] space-y-2">
                        <p className="font-bold text-gray-400"><span className="text-gray-900">{selectedEarningDetail.pickupLocation?.address || 'Pickup Hub'}</span></p>
                        <p className="font-bold text-gray-400"><span className="text-gray-900">{selectedEarningDetail.dropLocation?.address || 'Drop Hub'}</span></p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Financial Breakdown */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-2">Payment Details</h4>
                  <div className="flex justify-between items-center text-sm font-bold text-gray-600">
                    <span>Trip Fare</span>
                    <span className="text-gray-900 font-black">₹{selectedEarningDetail.totalCost}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold text-gray-600">
                    <span>Platform Commission (15%)</span>
                    <span className="text-red-500 font-black">-₹{Math.round(selectedEarningDetail.totalCost * 0.15)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold text-gray-600">
                    <span>Taxes & Duties (5%)</span>
                    <span className="text-red-500 font-black">-₹{Math.round((selectedEarningDetail.totalCost - Math.round(selectedEarningDetail.totalCost * 0.15)) * 0.05)}</span>
                  </div>
                  <div className="pt-3 border-t-2 border-dashed flex justify-between items-baseline">
                    <span className="text-sm font-black text-gray-900 uppercase tracking-widest">Net Earning</span>
                    <span className="text-2xl font-black text-emerald-600 tracking-tight">₹{selectedEarningDetail.totalCost - Math.round(selectedEarningDetail.totalCost * 0.15) - Math.round((selectedEarningDetail.totalCost - Math.round(selectedEarningDetail.totalCost * 0.15)) * 0.05)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => {
                    handleDownloadInvoice(selectedEarningDetail);
                    setShowEarningDetail(false);
                  }}
                  className="flex-1 bg-black text-white p-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-colors"
                >
                  <i className="fas fa-file-invoice mr-2"></i>
                  Invoice
                </button>
                <button
                  onClick={() => setShowEarningDetail(false)}
                  className="flex-1 bg-gray-100 text-gray-600 p-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

};

export default TransporterDashboard;
