# Modern Delivery UI System - iOS 26 Liquid Glass Design

## Overview

A modern, responsive delivery location and vehicle selection interface featuring iOS 26 liquid glass morphism effects, auto-calculated distance, real-time vehicle pricing, and load capacity information.

## Features

### 🎨 Design Features
- **Liquid Glass Morphism Effect**: Modern frosted glass UI with backdrop blur effects
- **iOS 26 Inspired Design**: Clean, minimal aesthetic with vibrant gradients
- **Responsive Layout**: Optimized for mobile, tablet, and desktop screens
- **Smooth Animations**: Fluid transitions and interactive hover states
- **Dark Mode Optimized**: Premium dark backgrounds with semi-transparent overlays

### 📍 Location Management
- **Clear Pickup & Drop-off Display**: Distinct visual cards for each location
- **Auto Distance Calculation**: Haversine formula-based distance calculation between two coordinates
- **GPS Coordinates Display**: Shows latitude and longitude for each location
- **Location Status Indicators**: Visual feedback for fetching and validation

### 🚗 Vehicle Selection
- **Real-time Pricing**: Dynamic cost calculation based on distance and load
- **Capacity Management**: Visual indicators for vehicle capacity vs. load weight
- **ETA Calculation**: Estimated time of arrival for each vehicle
- **Popular Badge**: Highlights most popular or recommended vehicles
- **Vehicle Details Expansion**: Tap to see full pricing breakdown

### 📊 Trip Information
- **Distance Display**: Clear, large distance metric in kilometers
- **Load Information**: Current cargo weight with capacity warnings
- **Cost Range**: Minimum and maximum delivery costs at a glance
- **Quick Stats Cards**: Colorful metrics cards with icons

## Components

### 1. **DeliveryVehicleSelector** (Main Component)
The primary component that combines all features.

```tsx
<DeliveryVehicleSelector
    vehicles={vehicles}
    selectedVehicle={selectedVehicle}
    onVehicleSelect={handleVehicleSelect}
    pickupLocation={pickupLocation}
    dropLocation={dropLocation}
    distanceKm={calculatedDistance}
    totalKg={100}
    onDistanceCalculated={setDistance}
/>
```

**Props:**
- `vehicles`: Array of VehicleType objects
- `selectedVehicle`: Currently selected vehicle (nullable)
- `onVehicleSelect`: Callback when vehicle is selected
- `pickupLocation`: Location object with address and coordinates
- `dropLocation`: Location object with address and coordinates
- `distanceKm`: Distance in kilometers
- `totalKg`: Total cargo weight in kilograms
- `onDistanceCalculated`: Optional callback for auto-calculated distance

### 2. **LocationCard** (Sub-component)
Displays individual pickup or drop-off location with glass morphism effect.

```tsx
<LocationCard
    label="Pickup"
    address="Farmer Market, Vijayawada"
    district="Krishna"
    state="Andhra Pradesh"
    latitude={16.5062}
    longitude={80.6480}
    onEdit={handleEdit}
    isLoading={false}
/>
```

**Props:**
- `label`: 'Pickup' or 'Drop-off'
- `address`: Full address string
- `district`: District name
- `state`: State name
- `latitude`: Optional GPS latitude
- `longitude`: Optional GPS longitude
- `onEdit`: Optional callback for edit button
- `isLoading`: Show loading state

### 3. **StatCard** (Sub-component)
Reusable statistics card with icon, label, and value.

```tsx
<StatCard
    icon={<svg>...</svg>}
    label="Distance"
    value={42.5}
    unit="km"
    color="blue"
    size="md"
/>
```

**Props:**
- `icon`: React node for icon
- `label`: Card label (uppercase)
- `value`: Main value to display
- `unit`: Optional unit suffix
- `color`: 'blue' | 'yellow' | 'green' | 'purple' | 'orange'
- `size`: 'sm' | 'md' | 'lg'

### 4. **TripStats** (Sub-component)
Combined stats display showing all trip information.

```tsx
<TripStats
    distance={42.5}
    load={100}
    minCost={500}
    maxCost={1200}
    layout="grid"  // or "compact"
/>
```

**Props:**
- `distance`: Distance in km
- `load`: Total weight in kg
- `minCost`: Minimum delivery cost
- `maxCost`: Maximum delivery cost
- `layout`: 'grid' (4-column) or 'compact' (inline)

## Color Scheme

| Color   | Pickup/Start | Drop/End | Pricing | Load |
|---------|--------------|----------|---------|------|
| Green   | ✓ Primary    |          | Min     |      |
| Orange  |              | ✓ Primary|         |      |
| Blue    | Secondary    |          |         |      |
| Yellow  |              |          |         | ✓    |
| Purple  |              |          | Max     |      |

## Glass Morphism Classes

Available CSS utility classes in `glass-morphism.css`:

```css
/* Container Classes */
.glass-container          /* Standard glass container */
.glass-container-hover    /* With hover effects */
.glass-premium           /* Darker, more subtle */
.glass-card              /* With gradient overlay */

/* Backdrop Blur Variations */
.backdrop-xs    /* 2px blur */
.backdrop-sm    /* 4px blur */
.backdrop-md    /* 8px blur */
.backdrop-lg    /* 16px blur */
.backdrop-xl    /* 24px blur */

/* Effects */
.border-glow        /* Glowing border with inset light */
.shadow-ios         /* iOS-style shadow */
.shadow-ios-lg      /* Large iOS shadow */
.animate-fade-in    /* Fade in animation */
.animate-scale-in   /* Scale in animation */
.animate-slide-up   /* Slide up animation */
.animate-pulse-glow /* Pulsing glow effect */
```

## Distance Calculation

The component uses the Haversine formula for accurate distance calculation:

$$d = 2R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\text{lat}}{2}\right) + \cos(\text{lat}_1)\cos(\text{lat}_2)\sin^2\left(\frac{\Delta\text{lon}}{2}\right)}\right)$$

Where:
- R = 6371 km (Earth's radius)
- Δlat, Δlon = differences in latitude and longitude (in radians)

## Pricing Calculation

```javascript
deliveryFee = max(
    basePrice,
    distance × perKmPrice + weight × perKgPrice,
    minPrice
)
```

## ETA Calculation

```javascript
eta = baseTime + (distance × timeFactor) + overloadPenalty
```

## Usage Example

### Full Implementation
```tsx
import DeliveryVehicleSelector from './components/DeliveryVehicleSelector';
import { LocationDisplay } from './components/LocationCard';
import { TripStats } from './components/StatCard';

export default function ArrangeDelivery() {
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [distance, setDistance] = useState(0);

    const vehicles = [
        {
            id: 'pickup_1',
            name: 'Pickup Truck',
            icon: 'fas fa-truck-pickup',
            capacity: 500,
            basePrice: 150,
            perKmPrice: 15,
            perKgPrice: 2,
            minPrice: 150,
            popular: true,
        },
        // ... more vehicles
    ];

    const pickupLocation = {
        latitude: 16.5062,
        longitude: 80.6480,
        address: 'Farmer Market',
        district: 'Krishna',
        state: 'Andhra Pradesh',
    };

    const dropLocation = {
        latitude: 16.3067,
        longitude: 80.4365,
        address: 'Central Market',
        district: 'Guntur',
        state: 'Andhra Pradesh',
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900">
            <DeliveryVehicleSelector
                vehicles={vehicles}
                selectedVehicle={selectedVehicle}
                onVehicleSelect={setSelectedVehicle}
                pickupLocation={pickupLocation}
                dropLocation={dropLocation}
                distanceKm={distance}
                totalKg={100}
                onDistanceCalculated={setDistance}
            />
        </div>
    );
}
```

### Import CSS
```tsx
import '../styles/glass-morphism.css';
```

## Responsive Breakpoints

- **Mobile (< 768px)**: Single column layout, compact cards
- **Tablet (768px - 1024px)**: 2-column grid
- **Desktop (> 1024px)**: Full 4-column grid with expanded details

## Accessibility Features

- ✅ Semantic HTML structure
- ✅ High contrast text for readability
- ✅ Clear visual feedback for interactive elements
- ✅ Loading and error states
- ✅ Keyboard navigation support (planned)
- ✅ Screen reader friendly labels

## Performance Optimization

- Memoized components to prevent unnecessary re-renders
- Debounced location input
- Lazy-loaded vehicle details
- Optimized animations using CSS transforms
- Minimal JavaScript calculations

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Mobile 90+)

### Requirements for Glass Effect
- CSS `backdrop-filter` support
- CSS `mix-blend-mode` support
- Modern browser with WebGL support

## Integration with Existing Components

### With DeliveryLocationForm
```tsx
<DeliveryLocationForm 
    onLocationChange={handlePickupLocation}
/>
```

### With LocationPicker
```tsx
<LocationPicker 
    onLocationSelect={setDropLocation}
/>
```

### With Checkout
```tsx
{selectedVehicle && (
    <CheckoutButton 
        vehicle={selectedVehicle}
        deliveryFee={calculateFee(selectedVehicle)}
    />
)}
```

## Customization

### Change Color Scheme
Update `glass-morphism.css` with your brand colors:

```css
.glass-container {
    @apply backdrop-blur-2xl;
    background: rgba(your-color, 0.1);
    border: 1px solid rgba(your-color, 0.2);
}
```

### Adjust Glass Effect Intensity
```css
/* Less intense blur */
.backdrop-blur: blur(4px);

/* More intense blur */
.backdrop-blur: blur(24px);
```

### Custom Gradients
```tsx
const bgGradient = 'from-custom-400 to-custom-600';
```

## Common Patterns

### Show Only Cost Range
```tsx
<StatCard
    label="Est. Cost"
    value={`₹${minCost} - ₹${maxCost}`}
/>
```

### Disable Overloaded Vehicles
```tsx
const isDisabled = totalKg > vehicle.capacity;
```

### Highlight Selected Vehicle
```tsx
{isSelected && (
    <div className="absolute top-4 right-4 w-8 h-8 
                    bg-green-500 rounded-full shadow-lg">
        ✓
    </div>
)}
```

## Troubleshooting

### Glass Effect Not Showing
- Check browser support for `backdrop-filter`
- Ensure fallback background color is set
- Verify CSS is imported

### Distance Not Calculating
- Check if coordinates are valid (not null/0)
- Verify Haversine formula implementation
- Check for coordinate format (lat/lng vs lng/lat)

### Vehicles Not Showing
- Verify vehicle array is not empty
- Check vehicle IDs are unique
- Ensure VehicleType interface is matched

## Future Enhancements

- 🎯 Real-time vehicle location tracking
- 🗺️ Interactive map integration
- 📱 Mobile app bottom sheet optimization
- 🎨 Theme customization
- 🌐 Multi-language support
- 📊 Analytics integration

## License

Part of KisanSetu project.

## Support

For issues or feature requests, contact the development team.
