
export enum UserRole {
  FARMER = 'FARMER',
  BUYER = 'BUYER',
  TRANSPORTER = 'TRANSPORTER',
  ADMIN = 'ADMIN'
}

export enum Language {
  ENGLISH = 'en',
  HINDI = 'hi',
  TELUGU = 'te',
  TAMIL = 'ta',
  KANNADA = 'kn'
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER'
}

export enum ListingStatus {
  AVAILABLE = 'AVAILABLE',
  PRICE_AGREED = 'PRICE_AGREED',
  LOCKED = 'LOCKED',
  IN_DELIVERY = 'IN_DELIVERY',
  SOLD = 'SOLD',
  PAUSED = 'PAUSED'
}

export enum HarvestType {
  STANDING_CROP = 'STANDING_CROP',
  HARVESTED_CROP = 'HARVESTED_CROP',
  PROCESSED_CLEANED_CROP = 'PROCESSED_CLEANED_CROP',
  SEED_NURSERY = 'SEED_NURSERY'
}

export enum OrderStatus {
  ORDER_CREATED = 'ORDER_CREATED',
  DELIVERY_PENDING = 'DELIVERY_PENDING',
  IN_DELIVERY = 'IN_DELIVERY',
  AWAITING_PICKUP = 'AWAITING_PICKUP',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum DeliveryStatus {
  WAITING_FOR_TRANSPORTER = 'WAITING_FOR_TRANSPORTER',
  TRANSPORTER_ASSIGNED = 'TRANSPORTER_ASSIGNED',
  PICKED_UP = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED'
}

export interface User {
  id: string;
  phone?: string;
  role: UserRole;
  language: Language;
  name: string;
  gender?: Gender;
  email?: string;
  profilePhoto?: string;
  bio?: string;
  location?: {
    address?: string;
    village: string;    // Used as City/Village for Farmers
    district: string;
    state: string;
    pincode?: string;
    latitude?: number;
    longitude?: number;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  farmerProfile?: FarmerProfile;
  buyerProfile?: BuyerProfile;
  transporterProfile?: TransporterProfile;
  fullProfile?: any; // Generic storage for role-specific profile data
}

export interface FarmerProfile {
  id: string;
  userId: string;
  fullName: string;
  gender: string;
  phone: string;
  landSize: number;
  village: string;
  district: string;
  state: string;
  language: Language;
  latitude?: number;
  longitude?: number;
  locationSource?: string;
  address?: string;
  pincode?: string;
}

export interface BuyerProfile {
  id: string;
  userId: string;
  fullName: string;
  gender: string;
  phone: string;
  city: string;
  state: string;
  language: Language;
  companyName?: string;
  gstNumber?: string;
  latitude?: number;
  longitude?: number;
  locationSource?: string;
  address?: string;
  district?: string;
  pincode?: string;
}

export interface TransporterProfile {
  id: string;
  userId: string;
  fullName: string;
  gender: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  vehicleType: string;
  vehicleNumber: string;
  capacity: number;
  pricePerKm: number;
  approvalStatus: string;
  language: Language;
  documents?: any;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  preferredRoutes?: string[];
  isOnline: boolean;
  totalEarnings: number;
  serviceRange?: number;
  latitude?: number;
  longitude?: number;
}

export interface PublicUser {
  id: string;
  name?: string;
  location?: string;
}

export interface Crop {
  id: string;
  name: string;
  category: string;
  icon: string;
}

export interface Listing {
  id: string;
  farmerId: string;
  cropId: string;
  quantity: number; // in kg
  unit: 'kg' | 'quintal';
  expectedPrice: number; // per kg
  mandiPrice?: number;
  msp?: number;
  grade: string;
  harvestDate: string;
  harvestType?: HarvestType;
  images: string[];
  status: ListingStatus;
  location: string;
  qualitySummary?: string;
  saleDate?: string;
  crop?: Crop;
  farmer?: {
    id: string;
    name?: string;
    phone?: string;
    village?: string;
    district?: string;
    state?: string;
    location?: string;
    farmerProfile?: FarmerProfile;
  };
}

export interface NegotiatingChat {
  id: string;
  listingId: string;
  buyerId: string;
  farmerId: string;
  currentOffer: number;
  status: 'OPEN' | 'ACCEPTED' | 'REJECTED';
  lastMessage: string;
  updatedAt: string;
  orderId?: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  type: 'TEXT' | 'OFFER';
  offerValue?: number;
  timestamp: string;
}

export interface MarketPrice {
  cropId: string;
  mandi: string;
  min: number;
  max: number;
  avg: number;
  date: string;
}

export interface Delivery {
  id: string;
  orderId: string;
  transporterId?: string;
  status: 'PENDING' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED';
  cost: number;
  distance: number;
}

export interface Order {
  id: string;
  listingId: string;
  buyerId: string;
  farmerId: string;
  quantity: number;
  priceFinal: number;
  deliveryResponsibility: 'FARMER_ARRANGED' | 'BUYER_ARRANGED';
  deliveryMode?: 'SELF_PICKUP' | 'ARRANGE_DELIVERY' | null;
  selfPickupOtp?: string | null;
  orderStatus: OrderStatus;
  // Location Data
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  deliveryAddress?: string;
  distanceKm?: number;
  estimatedDuration?: number;
  createdAt: string;
  updatedAt: string;
  listing?: Listing;
  buyer?: User | PublicUser;
  farmer?: User | PublicUser;
  delivery?: DeliveryDeal;
}

export interface Cart {
  id: string;
  buyerId: string;
  items: CartItem[];
}

export interface CartItem {
  id: string;
  cartId: string;
  listingId: string;
  quantity: number;
  lockedAt?: string;
  listing?: Listing & { crop: Crop; farmer: User };
  negotiationId?: string;
  negotiation?: NegotiatingChat;
}

export interface DeliveryDeal {
  id: string;
  orderId: string;
  transporterId?: string;
  declinedBy?: string[];
  pickupLocation: { address: string; lat?: number; lng?: number };
  dropLocation: { address: string; lat?: number; lng?: number };
  pickupOtp?: string;
  deliveryOtp?: string;
  status: DeliveryStatus;
  pricePerKm: number;
  distance: number;
  totalCost: number;
  pickupTimestamp?: string;
  deliveryTimestamp?: string;
  createdAt: string;
  updatedAt: string;
  order?: Order;
  transporter?: User;
  proofPhotos?: string[];
  pickupDistance?: number;
}

export interface VehicleType {
  id: string;
  name: string;
  icon?: string;
  capacity: number;
  basePrice: number;
  perKmPrice: number;
  perKgPrice: number;
  minPrice: number;
  description?: string;
  popular?: boolean;
}
