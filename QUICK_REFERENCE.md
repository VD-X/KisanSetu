# Modern Delivery UI - Quick Reference Card

## 🎯 Component Import

```tsx
// Main component
import DeliveryVehicleSelector from './components/DeliveryVehicleSelector';

// Sub-components
import LocationCard, { LocationDisplay } from './components/LocationCard';
import StatCard, { TripStats } from './components/StatCard';

// Utilities
import {
    calculateDistance,
    calculateDeliveryFee,
    calculateETA,
    formatCost,
    getCostRange
} from './utils/deliveryUtils';

// Styles
import './styles/glass-morphism.css';
```

## 💻 Basic Usage

### Simplest Implementation
```tsx
<DeliveryVehicleSelector
    vehicles={vehicles}
    selectedVehicle={selectedVehicle}
    onVehicleSelect={setSelectedVehicle}
    pickupLocation={pickupLocation}
    dropLocation={dropLocation}
    distanceKm={distance}
    totalKg={weight}
/>
```

### With All Props
```tsx
<DeliveryVehicleSelector
    vehicles={vehicles}
    selectedVehicle={selectedVehicle}
    onVehicleSelect={handleVehicleSelect}
    pickupLocation={pickupLocation}
    dropLocation={dropLocation}
    distanceKm={distance}
    totalKg={weight}
    onDistanceCalculated={setDistance}  // Auto-calculate distance
/>
```

## 📍 Location Object Format

```typescript
interface Location {
    latitude: number | null;
    longitude: number | null;
    address: string;
    district: string;
    state: string;
}

const example = {
    latitude: 16.5062,
    longitude: 80.6480,
    address: 'Vijayawada Farmer Market',
    district: 'Krishna',
    state: 'Andhra Pradesh'
};
```

## 🚗 Vehicle Object Format

```typescript
interface VehicleType {
    id: string;
    name: string;
    icon: string;  // Font Awesome class like 'fas fa-truck'
    capacity: number;  // kg
    basePrice: number;  // ₹
    perKmPrice: number;  // ₹/km
    perKgPrice: number;  // ₹/kg
    minPrice: number;  // ₹
    description?: string;
    popular?: boolean;
}

const example = {
    id: 'truck_1',
    name: 'Pickup Truck',
    icon: 'fas fa-truck-pickup',
    capacity: 500,
    basePrice: 150,
    perKmPrice: 15,
    perKgPrice: 2,
    minPrice: 150,
    popular: true
};
```

## 🔢 Calculation Functions

### Distance Between Two Points
```tsx
const distance = calculateDistance(
    16.5062,  // lat1
    80.6480,  // lon1
    16.3067,  // lat2
    80.4365   // lon2
);
// Returns: 42.5 km
```

### Delivery Fee
```tsx
const fee = calculateDeliveryFee(
    42.5,      // distance (km)
    250,       // weight (kg)
    150,       // basePrice (₹)
    15,        // perKmPrice (₹/km)
    2,         // perKgPrice (₹/kg)
    150        // minPrice (₹)
);
// Returns: 637.5 (max of base and calculated)
```

### Estimated Time
```tsx
const eta = calculateETA(
    42.5,      // distance (km)
    250,       // weight (kg)
    500,       // vehicleCapacity (kg)
    40         // avgSpeedKmh (default: 40)
);
// Returns: 70 minutes
```

### Cost Range
```tsx
const range = getCostRange(vehicles, 42.5, 250);
// Returns: { min: 150, max: 850 }
```

## 🎨 Color Theme Props

For StatCard:
```tsx
color="blue"    // or "yellow" | "green" | "purple" | "orange"
size="md"       // or "sm" | "lg"

<StatCard color="blue" size="md" ... />
<StatCard color="yellow" size="lg" ... />
```

## 📦 Component Props Reference

### DeliveryVehicleSelector

| Prop | Type | Required | Default | Notes |
|------|------|----------|---------|-------|
| vehicles | VehicleType[] | ✓ | - | Array of vehicles |
| selectedVehicle | VehicleType \| null | ✓ | - | Currently selected vehicle |
| onVehicleSelect | (v: VehicleType) => void | ✓ | - | Selection callback |
| pickupLocation | Location | ✓ | - | Start location |
| dropLocation | Location | ✓ | - | End location |
| distanceKm | number | ✓ | - | Distance in km |
| totalKg | number | ✓ | - | Total weight in kg |
| onDistanceCalculated | (d: number) => void | - | undefined | Distance callback |

### LocationCard

| Prop | Type | Required | Default |
|------|------|----------|---------|
| label | 'Pickup' \| 'Drop-off' | ✓ | - |
| address | string | ✓ | - |
| district | string | ✓ | - |
| state | string | ✓ | - |
| latitude | number | - | undefined |
| longitude | number | - | undefined |
| onEdit | () => void | - | undefined |
| isLoading | boolean | - | false |

### StatCard

| Prop | Type | Required | Default |
|------|------|----------|---------|
| icon | React.ReactNode | ✓ | - |
| label | string | ✓ | - |
| value | string \| number | ✓ | - |
| unit | string | - | undefined |
| color | 'blue' \| 'yellow' \| 'green' \| 'purple' \| 'orange' | ✓ | - |
| size | 'sm' \| 'md' \| 'lg' | - | 'md' |

## 🎭 CSS Classes

### Glass Effect Classes
```css
.glass-container          /* Standard glass */
.glass-container-hover    /* With hover effect */
.glass-premium           /* Subtle glass */
.glass-card              /* With gradient */
```

### Backdrop Blur Levels
```css
.backdrop-xs    /* 2px blur */
.backdrop-sm    /* 4px blur */
.backdrop-md    /* 8px blur */
.backdrop-lg    /* 16px blur */
.backdrop-xl    /* 24px blur (default) */
```

### Animations
```css
.animate-fade-in       /* Fade in */
.animate-scale-in      /* Scale up from center */
.animate-slide-up      /* Slide up from bottom */
.animate-pulse-glow    /* Pulsing glow effect */
```

## 🔐 Validation Functions

### Check Vehicle Capacity
```tsx
const isSufficient = isVehicleCapacitySufficient(250, 500);
// Returns: true

const isValid = isLocationValid(pickupLocation);
// Returns: true if all required fields are valid
```

### Get Weight Warning
```tsx
const status = getWeightWarningStatus(450, 500);
// Returns: 'warning' (90% capacity)

const status = getWeightWarningStatus(550, 500);
// Returns: 'critical' (110% capacity)
```

## 💰 Formatting Functions

### Format Cost
```tsx
formatCost(1234.50)  // "₹1,234.50" or "₹1,235"
formatCost(50)       // "₹50"
```

### Format Distance
```tsx
formatDistance(42.567)  // "42.5 km"
formatDistance(1.234)   // "1.2 km"
```

### Format Coordinates
```tsx
formatCoordinates(16.5062, 80.6480)
// "16.5062°N, 80.6480°E"
```

## 🎯 Integration Patterns

### With useState
```tsx
const [selectedVehicle, setSelectedVehicle] = useState<VehicleType | null>(null);
const [distance, setDistance] = useState(0);

<DeliveryVehicleSelector
    onVehicleSelect={setSelectedVehicle}
    onDistanceCalculated={setDistance}
/>
```

### With API Integration
```tsx
useEffect(() => {
    const fetchVehicles = async () => {
        const res = await api.getVehicles({ distance, weight: totalKg });
        setVehicles(res.data);
    };
    if (distance > 0) fetchVehicles();
}, [distance, totalKg]);
```

### With Checkout
```tsx
const handleCheckout = () => {
    if (!selectedVehicle) return;
    
    const order = {
        vehicleId: selectedVehicle.id,
        pickupLocation,
        dropLocation,
        distance,
        weight: totalKg,
        estimatedCost: calculateDeliveryFee(selectedVehicle, distance, totalKg),
        eta: calculateETA(distance, totalKg, selectedVehicle.capacity)
    };
    
    navigate('/checkout', { state: { order } });
};
```

## 🚀 Performance Tips

1. **Memoize calculations**
   ```tsx
   const fee = useMemo(() => 
       calculateDeliveryFee(...),
       [distance, weight, vehicle]
   );
   ```

2. **Lazy load details**
   ```tsx
   {isExpanded && <ExpandedDetails />}
   ```

3. **Debounce updates**
   ```tsx
   useEffect(() => {
       const timer = setTimeout(handleUpdate, 500);
       return () => clearTimeout(timer);
   }, [dependency]);
   ```

## 📱 Responsive Breakpoints

```css
/* Mobile (default) */
/* < 768px */

/* Tablet */
@media (min-width: 768px) { ... }

/* Desktop */
@media (min-width: 1024px) { ... }
```

## 🎪 Demo Page Routes

```tsx
// Main implementation
<Route path="/arrange-delivery" element={<ArrangeDeliveryModern />} />

// Interactive showcase
<Route path="/delivery-showcase" element={<DeliveryUIShowcase />} />

// Original (if keeping)
<Route path="/arrange-delivery-old" element={<ArrangeDelivery />} />
```

## 🐛 Common Errors & Fixes

### Glass Effect Not Showing
```css
/* Check CSS is imported first */
import './styles/glass-morphism.css';

/* Check browser support */
/* Need: backdrop-filter support */
```

### Distance Always Zero
```tsx
// Check coordinates are valid numbers
if (pickup.latitude && drop.latitude) {
    calculateDistance(...)
}

// Check format (not strings)
latitude: parseFloat(lat)  // ✓
longitude: parseFloat(lon) // ✓
```

### Vehicle Not Selectable
```tsx
// Check vehicle has unique ID
vehicle.id !== otherVehicle.id

// Check onVehicleSelect is passed
<DeliveryVehicleSelector onVehicleSelect={...} />
```

## 📚 Documentation Links

- Full Guide: `DELIVERY_UI_GUIDE.md`
- Integration: `INTEGRATION_GUIDE.md`
- Summary: `IMPLEMENTATION_SUMMARY.md`
- Component Source: `components/DeliveryVehicleSelector.tsx`
- Examples: `pages/ArrangeDeliveryModern.tsx`
- Demo: `pages/DeliveryUIShowcase.tsx`

## 🎯 Unit Specifications

| Unit | Symbol | Usage |
|------|--------|-------|
| Distance | km | `calculateDistance()` |
| Weight | kg | `totalKg` prop |
| Price | ₹ | `perKmPrice`, `basePrice` |
| Time | min | `calculateETA()` |
| Latitude | ° | -90 to 90 |
| Longitude | ° | -180 to 180 |

## 🔄 State Management Patterns

### Simple State
```tsx
const [selected, setSelected] = useState<VehicleType | null>(null);
```

### Context (Optional)
```tsx
const { deliveryState, updateVehicle } = useDeliveryContext();
<DeliveryVehicleSelector onVehicleSelect={updateVehicle} />
```

### Redux (If Using)
```tsx
const selected = useSelector(state => state.delivery.selectedVehicle);
const dispatch = useDispatch();
<DeliveryVehicleSelector 
    onVehicleSelect={(v) => dispatch(setVehicle(v))} 
/>
```

---

**Last Updated**: February 16, 2026
**Version**: 1.0.0
**Quick Reference Card**
